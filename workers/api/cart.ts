import { type Context, Hono } from 'hono'

import {
  mergeCart,
  parseLines,
  replaceCart,
} from '../../app/lib/db/cart.server'
import { getSessionUser } from '../../app/lib/db/users.server'

// /api/cart：會員購物車（規格 4）。未登入的購物車只在瀏覽器，不經過這裡。
export const cart = new Hono<{ Bindings: Env }>()

cart.use(async (c, next) => {
  // 只收 JSON：一般表單無法跨站送出 application/json
  if (!c.req.header('Content-Type')?.startsWith('application/json'))
    return c.json({ error: 'Unsupported Media Type' }, 415)
  await next()
})

const handle =
  (write: typeof replaceCart | typeof mergeCart) =>
  async (c: Context<{ Bindings: Env }>) => {
    const me = await getSessionUser(c.env.DB, c.req.raw)
    if (!me) return c.json({ error: '請先登入' }, 401)
    const lines = parseLines(await c.req.json().catch(() => null))
    if (!lines) return c.json({ error: '購物車資料不正確' }, 400)
    await write(c.env.DB, me.id, lines)
    return c.body(null, 204)
  }

cart.put('/', handle(replaceCart))
cart.post('/merge', handle(mergeCart))
