import type { User } from '~/lib/auth'

// 會員 session（規格 3.3）：隨機 token 放 HttpOnly cookie，D1 只存 token 的 SHA-256，資料庫外洩也拿不到可用的 session。
// root loader 讀（取目前會員），workers/api/auth.ts 寫（登入、登出）。

export const SESSION_COOKIE = 'andelni_session'
export const SESSION_DAYS = 30

type UserRow = {
  id: number
  email: string
  name: string
  phone: string
  email_verified_at: null | string
}

export const toUser = (r: UserRow): User => ({
  name: r.name,
  email: r.email,
  phone: r.phone,
  // ponytail: Email 驗證還沒做（需要網域寄信），先全部視為已驗證；做驗證時改回 r.email_verified_at != null
  emailVerified: true,
})

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export const hashToken = async (token: string) =>
  hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))

export function readSessionToken(request: Request) {
  const raw = request.headers.get('Cookie') ?? ''
  const hit = raw.split(/;\s*/).find((c) => c.startsWith(SESSION_COOKIE + '='))
  return hit?.slice(SESSION_COOKIE.length + 1) || null
}

export const sessionCookie = (token: string, maxAge: number) =>
  `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`

/** 目前登入的會員（含 id，給 API 用）；沒登入或過期回 null */
export async function getSessionUser(db: D1Database, request: Request) {
  const token = readSessionToken(request)
  if (!token) return null
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.phone, u.email_verified_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?1 AND s.expires_at > ?2`
    )
    .bind(await hashToken(token), new Date().toISOString())
    .first<UserRow>()
  return row ? { id: row.id, user: toUser(row) } : null
}

/** 建立 session，回傳要放進 cookie 的 token */
export async function createSession(db: D1Database, userId: number) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer)
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000)
  await db.batch([
    // 順手清掉這位會員過期的 session
    db
      .prepare(`DELETE FROM sessions WHERE user_id = ?1 AND expires_at <= ?2`)
      .bind(userId, new Date().toISOString()),
    db
      .prepare(
        `INSERT INTO sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)`
      )
      .bind(await hashToken(token), userId, expires.toISOString()),
  ])
  return token
}
