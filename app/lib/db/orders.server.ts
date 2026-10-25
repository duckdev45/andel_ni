import type {
  OrderInput,
  PayId,
  PricedItem,
  ShipId,
  VariantRow,
} from '../../../workers/api/order-input'

import { imageUrl } from '~/lib/images'
import { PAY_OPTIONS, SHIP_OPTIONS } from '~/lib/mock/checkout'

// 訂單（規格 6）：下單寫入、會員看自己的訂單、逾時未付款自動取消。後台訂單在第 6b 步接。

export type OrderStatus =
  | 'cancelled'
  | 'completed'
  | 'pending_payment'
  | 'pending_shipment'
  | 'returned'
  | 'shipped'

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: '待付款',
  pending_shipment: '待出貨',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
  returned: '退回',
}

const PAY_DB: Record<PayId, string> = {
  card: 'credit',
  apple: 'apple_pay',
  atm: 'atm',
  bnpl: 'bnpl',
}
const SHIP_DB: Record<ShipId, string> = {
  '711': '711',
  family: 'family',
  home: 'tcat',
}
const fromDb = <K extends string>(map: Record<K, string>, v: string) =>
  (Object.keys(map) as K[]).find((k) => map[k] === v)!

/**
 * 未付款訂單保留庫存的時間（規格 6.2）。
 * 🟡 ATM 72 小時（付款頁寫 3 天內轉帳）；信用卡等在綠界頁面當下付款，2 小時沒付就放回庫存。
 */
const HOLD_HOURS: Record<PayId, number> = {
  atm: 72,
  card: 2,
  apple: 2,
  bnpl: 2,
}

const taipei = (iso: string) =>
  new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString()

/** 訂單編號：台灣日期 YYMMDD＋4 位亂數，例 2610254821（不用 AN 開頭，避免和商品編號混淆） */
const newOrderNo = () =>
  taipei(new Date().toISOString()).slice(2, 10).replace(/-/g, '') +
  String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')

/** 下單要用的規格與商品資料（只查購物車裡的商品） */
export async function variantRows(db: D1Database, productIds: number[]) {
  const { results } = await db
    .prepare(
      `SELECT v.product_id, v.option_label, v.id AS variant_id, v.sku, v.stock,
              p.price, p.type, p.status, p.name, b.name AS brand
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       JOIN brands b ON b.id = p.brand_id
       WHERE v.product_id IN (SELECT value FROM json_each(?1))`
    )
    .bind(JSON.stringify(productIds))
    .all<VariantRow>()
  return results
}

export class StockError extends Error {}

/**
 * 建立訂單：寫訂單、明細、扣庫存、清會員購物車，整批同一個交易。
 * 扣庫存靠 product_variants 的 CHECK (stock >= 0)：同時被別人買走時整批失敗（規格 6.2 條件式扣庫存）。
 */
export async function placeOrder(
  db: D1Database,
  userId: number,
  input: OrderInput,
  priced: { fee: number; items: PricedItem[]; subtotal: number; total: number }
) {
  const now = new Date()
  const hold = new Date(now.getTime() + HOLD_HOURS[input.pay] * 3600_000)
  const oid = `(SELECT id FROM orders WHERE order_no = ?1)`

  for (let attempt = 0; ; attempt++) {
    const no = newOrderNo()
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO orders (order_no, user_id, status, subtotal, shipping_fee,
               total, payment_method, shipping_method, recipient_name,
               recipient_phone, cvs_store_id, cvs_store_name, address,
               consent_no_return, stock_hold_until, note, created_at)
             VALUES (?1, ?2, 'pending_payment', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
               ?11, ?12, ?13, ?14, ?15, ?16)`
          )
          .bind(
            no,
            userId,
            priced.subtotal,
            priced.fee,
            priced.total,
            PAY_DB[input.pay],
            SHIP_DB[input.ship],
            input.name,
            input.phone,
            input.store?.id ?? null,
            input.store?.name ?? null,
            input.store ? input.store.address : input.address,
            input.consent ? 1 : 0,
            hold.toISOString(),
            input.note,
            now.toISOString()
          ),
        ...priced.items.map((i) =>
          db
            .prepare(
              `INSERT INTO order_items (order_id, variant_id, name_snapshot,
                 sku_snapshot, price_snapshot, qty, option_snapshot, kind_snapshot)
               VALUES (${oid}, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
            )
            .bind(
              no,
              i.variantId,
              i.name,
              i.sku,
              i.price,
              i.qty,
              i.option,
              i.kind
            )
        ),
        // 現貨才扣庫存；客訂／代購下單後才採購
        ...priced.items
          .filter((i) => i.kind === '現貨')
          .map((i) =>
            db
              .prepare(
                `UPDATE product_variants SET stock = stock - ?2 WHERE id = ?1`
              )
              .bind(i.variantId, i.qty)
          ),
        db
          .prepare(
            `INSERT INTO order_events (order_id, to_status, note)
             VALUES (${oid}, 'pending_payment', '訂單成立')`
          )
          .bind(no),
        db.prepare(`DELETE FROM carts WHERE user_id = ?1`).bind(userId),
      ])
      return no
    } catch (e) {
      const msg = String(e)
      if (msg.includes('CHECK constraint failed')) throw new StockError()
      // 訂單編號撞號：換一個再試
      if (msg.includes('UNIQUE constraint failed') && attempt < 3) continue
      throw e
    }
  }
}

type OrderRow = {
  id: number
  order_no: string
  status: OrderStatus
  subtotal: number
  shipping_fee: number
  total: number
  payment_method: string
  shipping_method: string
  recipient_name: string
  recipient_phone: string
  cvs_store_name: null | string
  address: null | string
  tracking_no: null | string
  consent_no_return: number
  stock_hold_until: null | string
  note: string
  created_at: string
  email: string
  last_note: null | string
}

type ItemRow = {
  order_id: number
  name_snapshot: string
  sku_snapshot: string
  price_snapshot: number
  qty: number
  option_snapshot: null | string
  kind_snapshot: '代購' | '客訂' | '現貨'
  brand: string
  image: null | string
}

export type OrderDetail = ReturnType<typeof toDetail>

function toDetail(o: OrderRow, items: ItemRow[]) {
  const ship = fromDb(SHIP_DB, o.shipping_method)
  const pay = fromDb(PAY_DB, o.payment_method)
  const shipLabel = SHIP_OPTIONS.find((s) => s.id === ship)!.label
  const chain = shipLabel.replace('取貨', '').trim()
  const mine = items.filter((i) => i.order_id === o.id)
  return {
    no: o.order_no,
    createdAt: o.created_at,
    /** 台灣日期 */
    date: taipei(o.created_at).slice(0, 10),
    status: o.status,
    statusLabel: STATUS_LABEL[o.status],
    name: o.recipient_name,
    phone: o.recipient_phone,
    email: o.email,
    ship,
    shipLabel,
    /** 超商：門市（地址）；宅配：地址 */
    destination:
      ship === 'home'
        ? (o.address ?? '')
        : `${chain} ${o.cvs_store_name}${o.address ? `（${o.address}）` : ''}`,
    /** 會員中心列表用的一行運送說明 */
    shipping:
      ship === 'home'
        ? `宅配・${o.address}`
        : `超商取貨・${chain} ${o.cvs_store_name}`,
    pay,
    payLabel: PAY_OPTIONS.find((p) => p.id === pay)!.label,
    note: o.note,
    /** 待付款：付款期限（台灣時間 YYYY-MM-DD HH:mm） */
    payBy:
      o.status === 'pending_payment' && o.stock_hold_until
        ? taipei(o.stock_hold_until).slice(0, 16).replace('T', ' ')
        : null,
    /** 取消、退回的原因（最後一筆狀態紀錄） */
    reason:
      o.status === 'cancelled' || o.status === 'returned' ? o.last_note : null,
    tracking: o.tracking_no,
    consentNoReturn: o.consent_no_return === 1,
    items: mine.map((i) => ({
      key: i.sku_snapshot,
      name: i.name_snapshot,
      brand: i.brand,
      option: i.option_snapshot,
      kind: i.kind_snapshot,
      custom: i.kind_snapshot !== '現貨',
      qty: i.qty,
      price: i.price_snapshot,
      image: imageUrl(i.image),
    })),
    subtotal: o.subtotal,
    fee: o.shipping_fee,
    total: o.total,
  }
}

/** 會員自己的訂單（新到舊）；給 no 時只取那一筆 */
export async function listOrders(db: D1Database, userId: number, no?: string) {
  const where = `o.user_id = ?1 ${no ? 'AND o.order_no = ?2' : ''}`
  const bind = no ? [userId, no] : [userId]
  const [orders, items] = await db.batch([
    db
      .prepare(
        `SELECT o.*, u.email,
           (SELECT note FROM order_events e WHERE e.order_id = o.id
             ORDER BY e.id DESC LIMIT 1) AS last_note
         FROM orders o JOIN users u ON u.id = o.user_id
         WHERE ${where} ORDER BY o.created_at DESC`
      )
      .bind(...bind),
    db
      .prepare(
        `SELECT i.order_id, i.name_snapshot, i.sku_snapshot, i.price_snapshot,
                i.qty, i.option_snapshot, i.kind_snapshot, b.name AS brand,
                (SELECT r2_key FROM product_images pi
                  WHERE pi.product_id = v.product_id ORDER BY pi.sort LIMIT 1) AS image
         FROM order_items i
         JOIN orders o ON o.id = i.order_id
         JOIN product_variants v ON v.id = i.variant_id
         JOIN products p ON p.id = v.product_id
         JOIN brands b ON b.id = p.brand_id
         WHERE ${where} ORDER BY i.id`
      )
      .bind(...bind),
  ])
  const is = items.results as ItemRow[]
  return (orders.results as OrderRow[]).map((o) => toDetail(o, is))
}

/**
 * 逾時未付款的訂單自動取消，現貨放回庫存（規格 6.2）。由 Worker 的排程（cron）每 15 分鐘執行。
 * 三個語句用同一個時間點、同一個交易，不會重複放回。
 */
export async function expireOrders(db: D1Database, now = new Date()) {
  const t = now.toISOString()
  const expired = `SELECT id FROM orders
    WHERE status = 'pending_payment' AND stock_hold_until < ?1`
  const [restock, , cancel] = await db.batch([
    db
      .prepare(
        `UPDATE product_variants SET stock = stock + (
           SELECT SUM(i.qty) FROM order_items i
           WHERE i.variant_id = product_variants.id AND i.kind_snapshot = '現貨'
             AND i.order_id IN (${expired}))
         WHERE id IN (SELECT variant_id FROM order_items
           WHERE kind_snapshot = '現貨' AND order_id IN (${expired}))`
      )
      .bind(t),
    db
      .prepare(
        `INSERT INTO order_events (order_id, from_status, to_status, note)
         SELECT id, 'pending_payment', 'cancelled', '逾時未付款，訂單已自動取消'
         FROM orders WHERE id IN (${expired})`
      )
      .bind(t),
    db
      .prepare(
        `UPDATE orders SET status = 'cancelled', stock_hold_until = NULL
         WHERE id IN (${expired})`
      )
      .bind(t),
  ])
  return { cancelled: cancel.meta.changes, restocked: restock.meta.changes }
}
