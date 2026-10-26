import { Hono } from 'hono'

import {
  placeOrder,
  StockError,
  variantRows,
} from '../../app/lib/db/orders.server'
import { getSessionUser } from '../../app/lib/db/users.server'
import { parseOrderInput, priceOrder } from './order-input'

// /api/orders：會員下單（規格 6）。付款（綠界）在第 7 步接，現在訂單成立後停在「待付款」。
export const orders = new Hono<{ Bindings: Env }>()

orders.post('/', async (c) => {
  // 只收 JSON：一般表單無法跨站送出 application/json
  if (!c.req.header('Content-Type')?.startsWith('application/json'))
    return c.json({ error: 'Unsupported Media Type' }, 415)
  const me = await getSessionUser(c.env.DB, c.req.raw)
  if (!me) return c.json({ error: '請先登入' }, 401)

  const parsed = parseOrderInput(await c.req.json().catch(() => null))
  if ('error' in parsed) return c.json(parsed, 400)
  const input = parsed.value

  const ids = [...new Set(input.lines.map((l) => Number(l.productId.slice(1))))]
  const priced = priceOrder(
    input.lines,
    await variantRows(c.env.DB, ids),
    input.ship
  )
  if ('error' in priced) return c.json(priced, 409)
  if (priced.items.some((i) => i.kind !== '現貨') && !input.consent)
    return c.json({ error: '請勾選「已了解客訂商品不適用 7 天鑑賞期」' }, 400)

  try {
    const no = await placeOrder(c.env.DB, me.id, input, priced)
    return c.json({ no }, 201)
  } catch (e) {
    if (e instanceof StockError)
      return c.json({ error: '有商品剛被買走，庫存不足，請回購物車確認' }, 409)
    throw e
  }
})
