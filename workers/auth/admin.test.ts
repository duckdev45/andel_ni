import assert from 'node:assert/strict'
import { test } from 'node:test'

import { type AdminEnv, handleAdmin, isAdminPath } from './admin.ts'
import { hashPassword, verifyPassword } from './password.ts'
import { base32Decode, base32Encode, totp, verifyTotp } from './totp.ts'

// RFC 6238 附錄 B 的 SHA-1 測試向量，金鑰為 ASCII "12345678901234567890"
const RFC_SECRET = base32Encode(
  new TextEncoder().encode('12345678901234567890')
)

test('TOTP 符合 RFC 6238 測試向量', async () => {
  assert.equal(RFC_SECRET, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  assert.equal(await totp(RFC_SECRET, 59, 8), '94287082')
  assert.equal(await totp(RFC_SECRET, 1111111109, 8), '07081804')
  assert.equal(await totp(RFC_SECRET, 1234567890, 8), '89005924')
  assert.deepEqual(
    base32Decode(RFC_SECRET),
    new TextEncoder().encode('12345678901234567890')
  )
})

test('TOTP 容許前後 30 秒，其餘拒絕', async () => {
  const now = 1_800_000_000
  const code = await totp(RFC_SECRET, now)
  assert.equal(await verifyTotp(RFC_SECRET, code, now + 30), true)
  assert.equal(await verifyTotp(RFC_SECRET, code, now - 30), true)
  assert.equal(await verifyTotp(RFC_SECRET, code, now + 90), false)
  assert.equal(await verifyTotp(RFC_SECRET, '12345', now), false)
})

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
  ADMIN_TOTP_SECRET: RFC_SECRET,
  SESSION_SECRET: 'session-secret',
  ...extra,
})
const get = (path: string, cookie?: string) =>
  new Request('https://x.dev' + path, {
    headers: cookie ? { Cookie: cookie } : {},
  })
const login = async (password: string, code: string) =>
  new Request('https://x.dev/api/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, code }),
  })

test('沒設 secret：部署環境 404、本機開發放行', async () => {
  assert.equal((await handleAdmin(get('/admin'), {}, false, NOW))?.status, 404)
  assert.equal(await handleAdmin(get('/admin'), {}, true, NOW), null)
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

test('密碼＋驗證碼都對才發 cookie，cookie 可進後台', async () => {
  const e = await env()
  const code = await totp(RFC_SECRET, NOW)
  assert.equal(
    (await handleAdmin(await login('wrong', code), e, false, NOW))?.status,
    401
  )
  assert.equal(
    (await handleAdmin(await login('pw-123456', '000000'), e, false, NOW))
      ?.status,
    401
  )

  const ok = await handleAdmin(await login('pw-123456', code), e, false, NOW)
  assert.equal(ok?.status, 204)
  const setCookie = ok?.headers.get('Set-Cookie') ?? ''
  assert.match(setCookie, /HttpOnly; Secure; SameSite=Lax/)
  const cookie = setCookie.split(';')[0]

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
  const code = await totp(RFC_SECRET, NOW)
  assert.equal(
    (await handleAdmin(await login('pw-123456', code), limited, false, NOW))
      ?.status,
    429
  )

  const form = new Request('https://x.dev/api/admin/session', {
    method: 'POST',
    body: 'a=1',
  })
  assert.equal((await handleAdmin(form, e, false, NOW))?.status, 415)
})
