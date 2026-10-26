import { fromDb, PAY_DB, type PayInfo } from '~/lib/db/orders.server'

// 綠界付款的訂單更新（規格 6.3）：前往付款、取號、付款成功。API 在 workers/api/payments.ts。
// 綠界交易編號（MerchantTradeNo）= 訂單編號 10 碼＋兩位付款次數，例 261026490701。

export const orderNoOf = (tradeNo: string) => tradeNo.slice(0, 10)

const iso = (ms: number) => new Date(ms).toISOString()

/**
 * 前往付款：本人的待付款訂單才行；ATM 已取號就不再重新取號。
 * 付款次數 +1，保留庫存至少再 1 小時（客人在綠界頁面付款中不會被排程取消）。不能付款回 null。
 */
export async function startPayment(db: D1Database, userId: number, no: string) {
  const row = await db
    .prepare(
      `UPDATE orders SET pay_attempts = pay_attempts + 1,
         stock_hold_until = MAX(stock_hold_until, ?3)
       WHERE order_no = ?1 AND user_id = ?2 AND status = 'pending_payment'
         AND pay_info IS NULL AND pay_attempts < 99
       RETURNING id, total, payment_method, pay_attempts`
    )
    .bind(no, userId, iso(Date.now() + 3600_000))
    .first<{
      id: number
      pay_attempts: number
      payment_method: string
      total: number
    }>()
  if (!row) return null
  const { results: items } = await db
    .prepare(
      `SELECT name_snapshot AS name, qty FROM order_items WHERE order_id = ?1 ORDER BY id`
    )
    .bind(row.id)
    .all<{ name: string; qty: number }>()
  return {
    tradeNo: no + String(row.pay_attempts).padStart(2, '0'),
    total: row.total,
    pay: fromDb(PAY_DB, row.payment_method),
    items,
  }
}

/**
 * 取號結果：ATM 存帳號、保留庫存到繳費期限（第 N 天 23:59）後 1 小時；無卡分期送出申請後保留 7 天（核准要 1–3 個工作天）。
 * ponytail: 無卡分期申請被拒時綠界的通知格式文件沒寫清楚，一律保留 7 天，逾時由排程取消。
 */
export async function savePayInfo(
  db: D1Database,
  tradeNo: string,
  info: PayInfo
) {
  const until =
    'bnpl' in info
      ? Date.now() + 7 * 86400_000
      : new Date(
          `${info.expire.replace(/\//g, '-')}T23:59:59+08:00`
        ).getTime() + 3600_000
  await db
    .prepare(
      `UPDATE orders SET pay_info = ?2, stock_hold_until = MAX(stock_hold_until, ?3)
       WHERE order_no = ?1 AND status = 'pending_payment'`
    )
    .bind(orderNoOf(tradeNo), JSON.stringify(info), iso(until))
    .run()
}

/**
 * 付款成功（已驗過檢查碼）：記一筆 payments、待付款 → 待出貨。重複通知不重複處理。
 * 金額對不上不改狀態。訂單已被取消（逾時或店家取消）才付款：不自動恢復，記在訂單紀錄（客人和後台都看得到取消原因），店家到綠界後台退款。
 */
export async function markPaid(
  db: D1Database,
  p: { amount: number; ecpayTradeNo: string; raw: string; tradeNo: string }
) {
  const no = orderNoOf(p.tradeNo)
  const order = await db
    .prepare(`SELECT id, total, status FROM orders WHERE order_no = ?1`)
    .bind(no)
    .first<{ id: number; status: string; total: number }>()
  if (!order) return 'unknown_order'
  const dup = await db
    .prepare(
      `SELECT 1 FROM payments WHERE provider = 'ecpay' AND trade_no = ?1`
    )
    .bind(p.ecpayTradeNo)
    .first()
  if (dup) return 'duplicate'
  const ok = p.amount === order.total
  await db.batch([
    db
      .prepare(
        `INSERT INTO payments (order_id, provider, trade_no, amount, status, raw)
         VALUES (?1, 'ecpay', ?2, ?3, ?4, ?5) ON CONFLICT DO NOTHING`
      )
      .bind(
        order.id,
        p.ecpayTradeNo,
        p.amount,
        ok ? 'paid' : 'amount_mismatch',
        p.raw
      ),
    ...(ok
      ? [
          db
            .prepare(
              `INSERT INTO order_events (order_id, from_status, to_status, note)
               SELECT id, status, status, ?2 FROM orders
               WHERE id = ?1 AND status = 'cancelled'`
            )
            .bind(
              order.id,
              `訂單取消後才收到付款 NT$${p.amount}（綠界 ${p.ecpayTradeNo}），店家會為你辦理退款`
            ),
          db
            .prepare(
              `INSERT INTO order_events (order_id, from_status, to_status, note)
               SELECT id, 'pending_payment', 'pending_shipment', ?2 FROM orders
               WHERE id = ?1 AND status = 'pending_payment'`
            )
            .bind(order.id, `付款成功（綠界 ${p.ecpayTradeNo}）`),
          db
            .prepare(
              `UPDATE orders SET status = 'pending_shipment', paid_at = ?2,
                 stock_hold_until = NULL
               WHERE id = ?1 AND status = 'pending_payment'`
            )
            .bind(order.id, new Date().toISOString()),
        ]
      : []),
  ])
  if (!ok) return 'amount_mismatch'
  return order.status === 'pending_payment' ? 'ok' : 'not_pending'
}
