import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'

import {
  createSession,
  getSessionUser,
  hashToken,
  readSessionToken,
  SESSION_DAYS,
  sessionCookie,
  toUser,
} from '../../app/lib/db/users.server'
import { hashPassword, verifyPassword } from '../auth/password.ts'

// /api/auth/*：會員註冊、登入、登出、改資料（規格 3）。
// ponytail: Email 驗證、忘記密碼、改 Email 要寄信，等網域與寄信服務再做（規格 3.2、3.5）。
export const auth = new Hono<{ Bindings: Env }>()

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^09\d{8}$/

// 只收 JSON：一般表單無法跨站送出 application/json
auth.use(async (c, next) => {
  if (
    c.req.method !== 'GET' &&
    !c.req.header('Content-Type')?.startsWith('application/json')
  )
    return c.json({ error: 'Unsupported Media Type' }, 415)
  await next()
})

// 註冊、登入：同一 IP 每分鐘 10 次
const limit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'local'
  const { success } = await c.env.LOGIN_LIMIT.limit({ key: ip })
  if (!success) return c.json({ error: '嘗試太多次，請一分鐘後再試' }, 429)
  await next()
})
auth.use('/register', limit)
auth.use('/login', limit)

const body = async (c: { req: { json(): Promise<unknown> } }) =>
  ((await c.req.json().catch(() => null)) ?? {}) as Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const validPassword = (v: unknown): v is string =>
  typeof v === 'string' && v.length >= 8 && v.length <= 200

const signedIn = (token: string) => ({
  'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400),
})

// 帳號不存在時也跑一次雜湊，讓回應時間不透露帳號是否存在
let dummy: Promise<string> | undefined
const dummyHash = () => (dummy ??= hashPassword('not-a-real-password'))

auth.post('/register', async (c) => {
  const b = await body(c)
  const email = str(b.email).toLowerCase()
  const name = str(b.name)
  const phone = str(b.phone).replace(/[\s-]/g, '')
  if (!EMAIL.test(email) || email.length > 200)
    return c.json({ error: '請輸入正確的 Email' }, 400)
  if (!name || name.length > 50) return c.json({ error: '請填寫姓名' }, 400)
  if (!PHONE.test(phone))
    return c.json({ error: '請填寫 09 開頭的 10 碼手機號碼' }, 400)
  if (!validPassword(b.password)) return c.json({ error: '密碼至少 8 碼' }, 400)

  const row = await c.env.DB.prepare(
    `INSERT INTO users (email, password_hash, name, phone) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, name, phone, email_verified_at`
  )
    .bind(email, await hashPassword(b.password), name, phone)
    .first<Parameters<typeof toUser>[0]>()
  if (!row) return c.json({ error: '這個 Email 已經註冊過，請直接登入' }, 409)

  const token = await createSession(c.env.DB, row.id)
  return c.json({ user: toUser(row) }, 201, signedIn(token))
})

auth.post('/login', async (c) => {
  const b = await body(c)
  const row = await c.env.DB.prepare(
    `SELECT id, email, name, phone, email_verified_at, password_hash
     FROM users WHERE email = ?1`
  )
    .bind(str(b.email).toLowerCase())
    .first<Parameters<typeof toUser>[0] & { password_hash: string }>()
  const ok = await verifyPassword(
    typeof b.password === 'string' ? b.password : '',
    row?.password_hash ?? (await dummyHash())
  )
  // 不說是 Email 還是密碼錯
  if (!row || !ok) return c.json({ error: 'Email 或密碼錯誤' }, 401)

  const token = await createSession(c.env.DB, row.id)
  return c.json({ user: toUser(row) }, 200, signedIn(token))
})

auth.post('/logout', async (c) => {
  const token = readSessionToken(c.req.raw)
  if (token)
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?1`)
      .bind(await hashToken(token))
      .run()
  return c.body(null, 204, { 'Set-Cookie': sessionCookie('', 0) })
})

auth.patch('/me', async (c) => {
  const me = await getSessionUser(c.env.DB, c.req.raw)
  if (!me) return c.json({ error: '請先登入' }, 401)
  const b = await body(c)
  const name = str(b.name)
  const phone = str(b.phone).replace(/[\s-]/g, '')
  if (!name || name.length > 50) return c.json({ error: '請填寫姓名' }, 400)
  if (!PHONE.test(phone))
    return c.json({ error: '請填寫 09 開頭的 10 碼手機號碼' }, 400)
  await c.env.DB.prepare(`UPDATE users SET name = ?2, phone = ?3 WHERE id = ?1`)
    .bind(me.id, name, phone)
    .run()
  return c.body(null, 204)
})

/** 改密碼：要輸入目前密碼；成功後其他裝置的登入全部失效 */
auth.put('/me/password', async (c) => {
  const me = await getSessionUser(c.env.DB, c.req.raw)
  if (!me) return c.json({ error: '請先登入' }, 401)
  const b = await body(c)
  if (!validPassword(b.next)) return c.json({ error: '新密碼至少 8 碼' }, 400)
  const row = await c.env.DB.prepare(
    `SELECT password_hash FROM users WHERE id = ?1`
  )
    .bind(me.id)
    .first<{ password_hash: string }>()
  if (
    !row ||
    !(await verifyPassword(
      typeof b.current === 'string' ? b.current : '',
      row.password_hash
    ))
  )
    return c.json({ error: '目前密碼不正確' }, 400)

  const current = await hashToken(readSessionToken(c.req.raw) ?? '')
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE users SET password_hash = ?2, password_changed_at = ?3 WHERE id = ?1`
    ).bind(me.id, await hashPassword(b.next), new Date().toISOString()),
    c.env.DB.prepare(
      `DELETE FROM sessions WHERE user_id = ?1 AND id != ?2`
    ).bind(me.id, current),
  ])
  return c.body(null, 204)
})
