// 後台存取保護：密碼＋寄到店家信箱的 6 位數驗證碼，單一管理員，不需要資料庫。
// 在 Worker 進 React Router 之前擋 /admin* 與 /api/admin*，說明見 docs/後台存取保護.md。

import { type MailEnv, sendMail } from '../mail.ts'
import { verifyPassword } from './password.ts'

export type AdminEnv = MailEnv & {
  ADMIN_PASSWORD_HASH?: string
  SESSION_SECRET?: string
  ADMIN_LOGIN_LIMIT?: {
    limit(o: { key: string }): Promise<{ success: boolean }>
  }
}
type Cfg = AdminEnv & { ADMIN_PASSWORD_HASH: string; SESSION_SECRET: string }

// ponytail: 寄到公開的客服信箱，Cloudflare Email Routing 轉到店家 Gmail，個人信箱不進公開的 repo
const ADMIN_EMAIL = 'service@andelni.com'
const COOKIE = 'andelni_admin'
// 寄出的驗證碼不存資料庫：簽章放在這個 cookie，10 分鐘有效
const OTP_COOKIE = 'andelni_admin_otp'
const OTP_SEC = 600
const SESSION_DAYS = 7
const LOGIN_PAGE = '/admin/login'
const SESSION_API = '/api/admin/session'

// /admin、/admin/*、/admin.data（React Router 資料請求）、/api/admin/*
const ADMIN_PATH = /^\/(api\/)?admin(\/|\.data$|$)/
export const isAdminPath = (pathname: string) => ADMIN_PATH.test(pathname)

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

async function sign(env: Cfg, exp: number, code = '') {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  // 簽進密碼雜湊：換密碼後舊的登入自動失效；有 code 時是驗證碼 cookie
  const msg = new TextEncoder().encode(
    code
      ? `otp.${exp}.${code}.${env.ADMIN_PASSWORD_HASH}`
      : `${exp}.${env.ADMIN_PASSWORD_HASH}`
  )
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)))
}

const sameString = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function readCookie(request: Request, name = COOKIE) {
  const raw = request.headers.get('Cookie') ?? ''
  const hit = raw.split(/;\s*/).find((c) => c.startsWith(name + '='))
  return hit?.slice(name.length + 1)
}

const cookieHeader = (value: string, maxAge: number, name = COOKIE) =>
  `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`

/** cookie 值「到期時間.簽章」是否有效；code 用來驗驗證碼 cookie */
async function validCookie(
  value: string | undefined,
  env: Cfg,
  nowSec: number,
  code?: string
) {
  const [exp, sig] = (value ?? '').split('.')
  if (!exp || !sig || Number(exp) <= nowSec) return false
  return sameString(sig, await sign(env, Number(exp), code))
}

function randomCode() {
  const [n] = crypto.getRandomValues(new Uint32Array(1))
  return String(n % 1_000_000).padStart(6, '0')
}

const json = (status: number, body: object, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })

async function sessionApi(
  request: Request,
  env: Cfg,
  isDev: boolean,
  nowSec: number
) {
  if (request.method === 'DELETE') {
    return new Response(null, {
      status: 204,
      headers: { 'Set-Cookie': cookieHeader('', 0) },
    })
  }
  if (request.method !== 'POST')
    return json(405, { error: 'Method Not Allowed' })
  // 只收 JSON：一般表單無法跨站送出 application/json
  if (!request.headers.get('Content-Type')?.includes('application/json')) {
    return json(415, { error: 'Unsupported Media Type' })
  }
  if (env.ADMIN_LOGIN_LIMIT) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
    const { success } = await env.ADMIN_LOGIN_LIMIT.limit({ key: ip })
    if (!success) return json(429, { error: '嘗試太多次，請一分鐘後再試' })
  }
  const body = (await request.json().catch(() => ({}))) as {
    password?: unknown
    code?: unknown
  }
  const passOk = await verifyPassword(
    String(body.password ?? ''),
    env.ADMIN_PASSWORD_HASH
  )

  // 第一步：只送密碼 → 寄驗證碼
  if (body.code == null) {
    if (!passOk) return json(401, { error: '密碼錯誤' })
    if (!env.RESEND_API_KEY && !isDev) {
      return json(503, { error: '寄信服務未設定（RESEND_API_KEY）' })
    }
    const code = randomCode()
    const exp = nowSec + OTP_SEC
    try {
      await sendMail(env, {
        subject: `AndelNI 後台登入驗證碼 ${code}`,
        text: `後台登入驗證碼：${code}\n\n10 分鐘內有效。不是你本人登入的話，請立刻用 pnpm admin:setup --only=password 換密碼。`,
        to: ADMIN_EMAIL,
      })
    } catch (e) {
      console.error(e)
      return json(502, { error: '驗證碼寄送失敗，請稍後再試' })
    }
    return json(
      202,
      { email: ADMIN_EMAIL },
      {
        'Set-Cookie': cookieHeader(
          `${exp}.${await sign(env, exp, code)}`,
          OTP_SEC,
          OTP_COOKIE
        ),
      }
    )
  }

  // 第二步：密碼＋驗證碼
  const code = String(body.code).replace(/\D/g, '')
  const codeOk =
    code.length === 6 &&
    (await validCookie(readCookie(request, OTP_COOKIE), env, nowSec, code))
  // 不說是哪一個錯
  if (!passOk || !codeOk) return json(401, { error: '密碼或驗證碼錯誤' })

  const exp = nowSec + SESSION_DAYS * 86400
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  headers.append(
    'Set-Cookie',
    cookieHeader(`${exp}.${await sign(env, exp)}`, SESSION_DAYS * 86400)
  )
  headers.append('Set-Cookie', cookieHeader('', 0, OTP_COOKIE))
  return new Response(null, { status: 204, headers })
}

function toLogin(url: URL) {
  if (url.pathname.startsWith('/api/'))
    return json(401, { error: '需要登入後台' })
  const page = url.pathname.replace(/\.data$/, '') || '/admin'
  const login = `${LOGIN_PAGE}?next=${encodeURIComponent(page)}`
  // React Router 的資料請求不能直接 302，要用它認得的轉址標頭
  if (url.pathname.endsWith('.data')) {
    return new Response(null, {
      status: 204,
      headers: {
        'X-Remix-Redirect': login,
        'X-Remix-Status': '302',
        'X-Remix-Reload-Document': 'true',
      },
    })
  }
  return new Response(null, { status: 302, headers: { Location: login } })
}

/**
 * 回傳 Response 表示由這裡處理（擋下或登入 API）；回傳 null 表示交給 React Router。
 * 密碼、session 兩個 secret 沒設齊時：本機開發放行，部署環境一律 404（fail closed）。
 */
export async function handleAdmin(
  request: Request,
  env: AdminEnv,
  isDev: boolean,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<Response | null> {
  const url = new URL(request.url)
  if (!isAdminPath(url.pathname)) return null

  const { ADMIN_PASSWORD_HASH, SESSION_SECRET } = env
  if (!ADMIN_PASSWORD_HASH || !SESSION_SECRET) {
    return isDev ? null : new Response('Not Found', { status: 404 })
  }
  const cfg = { ...env, ADMIN_PASSWORD_HASH, SESSION_SECRET }

  if (url.pathname === SESSION_API) {
    return sessionApi(request, cfg, isDev, nowSec)
  }
  if (url.pathname === LOGIN_PAGE || url.pathname === LOGIN_PAGE + '.data') {
    return null
  }
  return (await validCookie(readCookie(request), cfg, nowSec))
    ? null
    : toLogin(url)
}
