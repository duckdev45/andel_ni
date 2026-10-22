// 後台存取保護：密碼＋驗證器 App（TOTP），單一管理員，不需要資料庫。
// 在 Worker 進 React Router 之前擋 /admin* 與 /api/admin*，說明見 docs/後台存取保護.md。

import { verifyPassword } from './password.ts'
import { verifyTotp } from './totp.ts'

export type AdminEnv = {
  ADMIN_PASSWORD_HASH?: string
  ADMIN_TOTP_SECRET?: string
  SESSION_SECRET?: string
  ADMIN_LOGIN_LIMIT?: {
    limit(o: { key: string }): Promise<{ success: boolean }>
  }
}

const COOKIE = 'andelni_admin'
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

async function sign(
  env: Required<Omit<AdminEnv, 'ADMIN_LOGIN_LIMIT'>>,
  exp: number
) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  // 簽進密碼雜湊：換密碼後舊的登入自動失效
  const msg = new TextEncoder().encode(`${exp}.${env.ADMIN_PASSWORD_HASH}`)
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)))
}

const sameString = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function readCookie(request: Request) {
  const raw = request.headers.get('Cookie') ?? ''
  const hit = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))
  return hit?.slice(COOKIE.length + 1)
}

const cookieHeader = (value: string, maxAge: number) =>
  `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`

async function hasSession(
  request: Request,
  env: Required<Omit<AdminEnv, 'ADMIN_LOGIN_LIMIT'>>,
  nowSec: number
) {
  const [exp, sig] = (readCookie(request) ?? '').split('.')
  if (!exp || !sig || Number(exp) <= nowSec) return false
  return sameString(sig, await sign(env, Number(exp)))
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
  env: AdminEnv & Required<Omit<AdminEnv, 'ADMIN_LOGIN_LIMIT'>>,
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
  const [passOk, codeOk] = await Promise.all([
    verifyPassword(String(body.password ?? ''), env.ADMIN_PASSWORD_HASH),
    verifyTotp(env.ADMIN_TOTP_SECRET, String(body.code ?? ''), nowSec),
  ])
  // 不說是哪一個錯
  if (!passOk || !codeOk) return json(401, { error: '密碼或驗證碼錯誤' })

  const exp = nowSec + SESSION_DAYS * 86400
  return new Response(null, {
    status: 204,
    headers: {
      'Set-Cookie': cookieHeader(
        `${exp}.${await sign(env, exp)}`,
        SESSION_DAYS * 86400
      ),
      'Cache-Control': 'no-store',
    },
  })
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
 * 三個 secret 沒設齊時：本機開發放行，部署環境一律 404（fail closed）。
 */
export async function handleAdmin(
  request: Request,
  env: AdminEnv,
  isDev: boolean,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<Response | null> {
  const url = new URL(request.url)
  if (!isAdminPath(url.pathname)) return null

  const { ADMIN_PASSWORD_HASH, ADMIN_TOTP_SECRET, SESSION_SECRET } = env
  if (!ADMIN_PASSWORD_HASH || !ADMIN_TOTP_SECRET || !SESSION_SECRET) {
    return isDev ? null : new Response('Not Found', { status: 404 })
  }
  const cfg = { ...env, ADMIN_PASSWORD_HASH, ADMIN_TOTP_SECRET, SESSION_SECRET }

  if (url.pathname === SESSION_API) return sessionApi(request, cfg, nowSec)
  if (url.pathname === LOGIN_PAGE || url.pathname === LOGIN_PAGE + '.data') {
    return null
  }
  return (await hasSession(request, cfg, nowSec)) ? null : toLogin(url)
}
