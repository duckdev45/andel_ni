import assert from 'node:assert/strict'
import { test } from 'node:test'

import { type AdminEnv, handleAdmin, isAdminPath } from './admin.ts'
import { hashPassword, verifyPassword } from './password.ts'

test('密碼雜湊可驗證、錯誤密碼不通過', async () => {
  const h = await hashPassword('correct horse')
  assert.match(h, /^pbkdf2\$100000\$/)
  assert.equal(await verifyPassword('correct horse', h), true)
  assert.equal(await verifyPassword('wrong', h), false)
  assert.equal(await verifyPassword('x', 'garbage'), false)
})

test('只攔後台路徑', () => {
  for (const p of [
    '/admin',
    '/admin/orders',
    '/admin.data',
    '/admin/orders.data',
    '/api/admin/x',
  ])
    assert.equal(isAdminPath(p), true, p)
  for (const p of [
    '/',
    '/administrator',
    '/api/products',
    '/assets/admin-x.js',
  ])
    assert.equal(isAdminPath(p), false, p)
})

const NOW = 1_800_000_000
const env = async (extra: Partial<AdminEnv> = {}): Promise<AdminEnv> => ({
  ADMIN_PASSWORD_HASH: await hashPassword('pw-123456'),
  RESEND_API_KEY: 're_test',
  SESSION_SECRET: 'session-secret',
  ...extra,
})
const get = (path: string, cookie?: string) =>
  new Request('https://x.dev' + path, {
    headers: cookie ? { Cookie: cookie } : {},
  })
const login = (password: string, code?: string, cookie?: string) =>
  new Request('https://x.dev/api/admin/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ password, code }),
  })

// 攔下寄給 Resend 的信，回傳信裡的驗證碼
function catchMail() {
  const sent: { to: string; text: string }[] = []
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)))
    return new Response('{}')
  }) as typeof fetch
  return sent
}
const codeOf = (text: string) => text.match(/\d{6}/)![0]
const cookieOf = (r: null | Response) =>
  (r?.headers.get('Set-Cookie') ?? '').split(';')[0]

test('沒設 secret：部署環境 404、本機開發放行；沒設寄信金鑰不寄碼', async () => {
  assert.equal((await handleAdmin(get('/admin'), {}, false, NOW))?.status, 404)
  assert.equal(await handleAdmin(get('/admin'), {}, true, NOW), null)
  const noMail = await env({ RESEND_API_KEY: undefined })
  assert.equal(
    (await handleAdmin(login('pw-123456'), noMail, false, NOW))?.status,
    503
  )
})

test('未登入：頁面 302、資料請求用 React Router 轉址、API 401、登入頁放行', async () => {
  const e = await env()
  const page = await handleAdmin(
    get('/admin/orders?status=paid'),
    e,
    false,
    NOW
  )
  assert.equal(page?.status, 302)
  assert.equal(
    page?.headers.get('Location'),
    '/admin/login?next=%2Fadmin%2Forders'
  )
  const data = await handleAdmin(get('/admin/orders.data'), e, false, NOW)
  assert.equal(data?.status, 204)
  assert.equal(
    data?.headers.get('X-Remix-Redirect'),
    '/admin/login?next=%2Fadmin%2Forders'
  )
  assert.equal(
    (await handleAdmin(get('/api/admin/orders'), e, false, NOW))?.status,
    401
  )
  assert.equal(await handleAdmin(get('/admin/login'), e, false, NOW), null)
  assert.equal(await handleAdmin(get('/cart'), e, false, NOW), null)
})

test('密碼對才寄驗證碼；密碼＋信裡的驗證碼都對才發 cookie', async () => {
  const e = await env()
  const sent = catchMail()
  assert.equal((await handleAdmin(login('wrong'), e, false, NOW))?.status, 401)
  assert.equal(sent.length, 0)

  const step1 = await handleAdmin(login('pw-123456'), e, false, NOW)
  assert.equal(step1?.status, 202)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'service@andelni.com')
  const code = codeOf(sent[0].text)
  const otp = cookieOf(step1)
  assert.match(step1?.headers.get('Set-Cookie') ?? '', /HttpOnly; Secure/)

  const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, '0')
  for (const [pw, c, ck, now] of [
    ['pw-123456', wrong, otp, NOW], // 驗證碼錯
    ['wrong', code, otp, NOW], // 密碼錯
    ['pw-123456', code, '', NOW], // 沒有寄碼時的 cookie
    ['pw-123456', code, otp, NOW + 601], // 驗證碼過期
  ] as const)
    assert.equal(
      (await handleAdmin(login(pw, c, ck), e, false, now))?.status,
      401,
      `${pw} ${c} ${ck} ${now}`
    )

  const ok = await handleAdmin(login('pw-123456', code, otp), e, false, NOW)
  assert.equal(ok?.status, 204)
  const setCookies = ok?.headers.getSetCookie() ?? []
  assert.match(setCookies[0], /HttpOnly; Secure; SameSite=Lax/)
  // 用過的驗證碼 cookie 清掉
  assert.match(setCookies[1], /^andelni_admin_otp=;.*Max-Age=0/)
  const cookie = setCookies[0].split(';')[0]

  assert.equal(await handleAdmin(get('/admin', cookie), e, false, NOW), null)
  assert.equal(
    await handleAdmin(get('/api/admin/orders', cookie), e, false, NOW),
    null
  )
  // 竄改、過期、換密碼後都失效
  assert.equal(
    (await handleAdmin(get('/admin', cookie + 'x'), e, false, NOW))?.status,
    302
  )
  assert.equal(
    (await handleAdmin(get('/admin', cookie), e, false, NOW + 8 * 86400))
      ?.status,
    302
  )
  const changed = { ...e, ADMIN_PASSWORD_HASH: await hashPassword('new-pw') }
  assert.equal(
    (await handleAdmin(get('/admin', cookie), changed, false, NOW))?.status,
    302
  )
})

test('登出清 cookie；超過頻率限制回 429；非 JSON 拒收', async () => {
  const e = await env()
  const out = await handleAdmin(
    new Request('https://x.dev/api/admin/session', { method: 'DELETE' }),
    e,
    false,
    NOW
  )
  assert.match(out?.headers.get('Set-Cookie') ?? '', /Max-Age=0/)

  const limited = await env({
    ADMIN_LOGIN_LIMIT: { limit: async () => ({ success: false }) },
  })
  assert.equal(
    (await handleAdmin(login('pw-123456'), limited, false, NOW))?.status,
    429
  )

  const form = new Request('https://x.dev/api/admin/session', {
    method: 'POST',
    body: 'a=1',
  })
  assert.equal((await handleAdmin(form, e, false, NOW))?.status, 415)
})
