import { Hono } from 'hono'

import { purchaseCalc } from '../../app/lib/admin'
import { type OrderStatus, STATUS } from '../../app/lib/admin'
import {
  adminId,
  LEDGER_KEY,
  LOW_STOCK_KEY,
} from '../../app/lib/db/admin.server'
import { changeOrderStatus } from '../../app/lib/db/orders.server'
import {
  assignSkus,
  parseLedgerSettings,
  parseProductInput,
  parsePurchaseInput,
  type ProductInput,
  skuPrefix,
} from './admin-input'

// /api/admin/*：後台寫入。登入檢查在 Worker 層（workers/auth/admin.ts），到這裡已通過。
export const admin = new Hono<{ Bindings: Env }>()

const IMAGE_TYPES: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
}
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// 只收 JSON 或照片：一般表單無法跨站送出這兩種格式（同 session API 的做法）
admin.use(async (c, next) => {
  const type = c.req.header('Content-Type') ?? ''
  if (
    c.req.method !== 'GET' &&
    !type.startsWith('application/json') &&
    !(type in IMAGE_TYPES)
  )
    return c.json({ error: 'Unsupported Media Type' }, 415)
  await next()
})

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')

/** 新增或更新商品的寫入語句；商品以 code 對應，整批在同一個交易 */
function saveStatements(
  db: D1Database,
  code: string,
  p: ProductInput,
  skus: string[],
  isNew: boolean
) {
  const pid = `(SELECT id FROM products WHERE code = ?1)`
  const fields = [
    slugify(`${p.brand} ${p.name}`),
    p.brand,
    p.cat,
    p.name,
    p.description,
    p.price,
    p.type,
    p.active ? 'active' : 'inactive',
    p.isNew ? 1 : 0,
    p.variants?.name ?? null,
  ]
  const options = p.variants?.options ?? [{ label: null, stock: p.stock }]
  return [
    // 新品牌直接建立；同名沿用
    db
      .prepare(
        `INSERT INTO brands (name, slug) VALUES (?1, ?2) ON CONFLICT DO NOTHING`
      )
      .bind(p.brand, slugify(p.brand) || p.brand),
    isNew
      ? db
          .prepare(
            `INSERT INTO products (code, slug, brand_id, category_id, name,
               description, price, type, status, is_new, option_name)
             VALUES (?1, ?2, (SELECT id FROM brands WHERE name = ?3),
               (SELECT id FROM categories WHERE slug = ?4), ?5, ?6, ?7, ?8, ?9,
               ?10, ?11)`
          )
          .bind(code, ...fields)
      : db
          .prepare(
            `UPDATE products SET slug = ?2,
               brand_id = (SELECT id FROM brands WHERE name = ?3),
               category_id = (SELECT id FROM categories WHERE slug = ?4),
               name = ?5, description = ?6, price = ?7, type = ?8, status = ?9,
               is_new = ?10, option_name = ?11
             WHERE code = ?1`
          )
          .bind(code, ...fields),
    // ponytail: 已有訂單的規格刪不掉（order_items 外鍵），會整批失敗；接訂單後改成停用規格
    db
      .prepare(
        `DELETE FROM product_variants WHERE product_id = ${pid}
           AND sku NOT IN (SELECT value FROM json_each(?2))`
      )
      .bind(code, JSON.stringify(skus)),
    ...options.map((o, i) =>
      db
        .prepare(
          `INSERT INTO product_variants (product_id, option_label, sku, stock, sort)
           VALUES (${pid}, ?2, ?3, ?4, ?5)
           ON CONFLICT (sku) DO UPDATE SET option_label = excluded.option_label,
             stock = excluded.stock, sort = excluded.sort`
        )
        .bind(code, o.label, skus[i], o.stock, i)
    ),
    // ponytail: 移除的照片只刪資料列，R2 檔案留著；之後要清再加排程
    db
      .prepare(`DELETE FROM product_images WHERE product_id = ${pid}`)
      .bind(code),
    ...p.images.map((key, i) =>
      db
        .prepare(
          `INSERT INTO product_images (product_id, r2_key, sort, alt)
           VALUES (${pid}, ?2, ?3, ?4)`
        )
        .bind(code, key, i, `${p.brand} ${p.name}`)
    ),
  ]
}

admin.post('/products', async (c) => {
  const parsed = parseProductInput(await c.req.json().catch(() => null))
  if ('error' in parsed) return c.json(parsed, 400)
  const p = parsed.value
  const db = c.env.DB

  // 商品編號：目前最大號 +1；商品只下架不刪除，號碼不會重用
  const max = await db
    .prepare(`SELECT MAX(code) AS code FROM products`)
    .first<{ code: null | string }>()
  const code = `AN${String(Number(max?.code?.slice(2) ?? 0) + 1).padStart(4, '0')}`
  const prefix = skuPrefix(p.brand, p.cat, code)
  const skus = p.variants
    ? assignSkus(
        prefix,
        p.variants.options.map((o) => o.label),
        []
      )
    : [prefix]

  await db.batch(saveStatements(db, code, p, skus, true))
  const row = await db
    .prepare(`SELECT id FROM products WHERE code = ?1`)
    .bind(code)
    .first<{ id: number }>()
  return c.json({ code, id: adminId(row!.id) }, 201)
})

admin.put('/products/:code', async (c) => {
  const code = c.req.param('code').toUpperCase()
  const parsed = parseProductInput(await c.req.json().catch(() => null))
  if ('error' in parsed) return c.json(parsed, 400)
  const p = parsed.value
  const db = c.env.DB

  const { results: existing } = await db
    .prepare(
      `SELECT v.option_label AS label, v.sku FROM product_variants v
       JOIN products p ON p.id = v.product_id WHERE p.code = ?1`
    )
    .bind(code)
    .all<{ label: null | string; sku: string }>()
  if (!existing.length) return c.json({ error: '找不到商品' }, 404)

  const prefix = skuPrefix(p.brand, p.cat, code)
  const skus = p.variants
    ? assignSkus(
        prefix,
        p.variants.options.map((o) => o.label),
        existing.filter((e) => e.label != null)
      )
    : [existing.find((e) => e.label == null)?.sku ?? prefix]

  await db.batch(saveStatements(db, code, p, skus, false))
  return c.json({ code })
})

admin.patch('/products/:code', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    active?: unknown
  } | null
  if (typeof body?.active !== 'boolean')
    return c.json({ error: 'active 必須是 true 或 false' }, 400)
  const { meta } = await c.env.DB.prepare(
    `UPDATE products SET status = ?2 WHERE code = ?1`
  )
    .bind(
      c.req.param('code').toUpperCase(),
      body.active ? 'active' : 'inactive'
    )
    .run()
  return meta.changes ? c.body(null, 204) : c.json({ error: '找不到商品' }, 404)
})

/** 盤點修正：庫存 ± delta，不低於 0 */
admin.post('/stock', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    delta?: unknown
    sku?: unknown
  } | null
  if (
    typeof body?.sku !== 'string' ||
    !Number.isInteger(body.delta) ||
    Math.abs(body.delta as number) > 1e5
  )
    return c.json({ error: 'sku 或 delta 不正確' }, 400)
  const row = await c.env.DB.prepare(
    `UPDATE product_variants SET stock = MAX(0, stock + ?2) WHERE sku = ?1
     RETURNING stock`
  )
    .bind(body.sku, body.delta)
    .first<{ stock: number }>()
  return row ? c.json(row) : c.json({ error: '找不到 SKU' }, 404)
})

/** 記一筆進貨（台幣成本伺服器重算）；toStock 時同一個交易加進庫存 */
admin.post('/purchases', async (c) => {
  const r = parsePurchaseInput(await c.req.json().catch(() => null))
  if ('error' in r) return c.json(r, 400)
  const p = r.value
  const variant = await c.env.DB.prepare(
    `SELECT id FROM product_variants WHERE product_id = ?1 AND option_label IS ?2`
  )
    .bind(Number(p.pid.slice(1)), p.opt)
    .first<{ id: number }>()
  if (!variant) return c.json({ error: '找不到商品規格' }, 404)
  const [row] = await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO purchases (variant_id, qty, foreign_price, currency, fx_rate,
         card_fee_rate, twd_cost, purchased_on, note)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) RETURNING id`
    ).bind(
      variant.id,
      p.qty,
      p.unit,
      p.cur,
      p.rate,
      p.fx,
      purchaseCalc(p).total,
      p.date,
      p.note
    ),
    ...(p.toStock
      ? [
          c.env.DB.prepare(
            `UPDATE product_variants SET stock = stock + ?2 WHERE id = ?1`
          ).bind(variant.id, p.qty),
        ]
      : []),
  ])
  return c.json({ id: (row.results[0] as { id: number }).id }, 201)
})

admin.put('/settings/ledger', async (c) => {
  const value = parseLedgerSettings(await c.req.json().catch(() => null))
  if (!value) return c.json({ error: '設定值不正確' }, 400)
  await c.env.DB.prepare(
    `INSERT INTO settings (key, value) VALUES (?1, ?2)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`
  )
    .bind(LEDGER_KEY, JSON.stringify(value))
    .run()
  return c.body(null, 204)
})

admin.put('/settings/low-stock', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    value?: unknown
  } | null
  const value = body?.value
  if (
    !Number.isInteger(value) ||
    (value as number) < 0 ||
    (value as number) > 999
  )
    return c.json({ error: 'value 不正確' }, 400)
  await c.env.DB.prepare(
    `INSERT INTO settings (key, value) VALUES (?1, ?2)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`
  )
    .bind(LOW_STOCK_KEY, String(value))
    .run()
  return c.body(null, 204)
})

/** 改訂單狀態（依規格 6.1 流程）；出貨要附物流單號 */
admin.patch('/orders/:no', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    status?: unknown
    tracking?: unknown
  } | null
  const to = body?.status as OrderStatus
  if (typeof to !== 'string' || !(to in STATUS))
    return c.json({ error: 'status 不正確' }, 400)
  const tracking =
    typeof body?.tracking === 'string' ? body.tracking.trim() : ''
  if (to === 'shipped' && (!tracking || tracking.length > 50))
    return c.json({ error: '請輸入物流單號' }, 400)
  const r = await changeOrderStatus(
    c.env.DB,
    c.req.param('no'),
    to,
    to === 'shipped' ? tracking : null
  )
  if (r === 'not_found') return c.json({ error: '找不到訂單' }, 404)
  if (r !== 'ok')
    return c.json({ error: '訂單狀態已變更，請重新整理後再試' }, 409)
  return c.body(null, 204)
})

/** 此單包材費（記帳簿） */
admin.put('/orders/:no/pack', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    value?: unknown
  } | null
  const value = body?.value
  if (
    !Number.isInteger(value) ||
    (value as number) < 0 ||
    (value as number) > 1e5
  )
    return c.json({ error: 'value 不正確' }, 400)
  const { meta } = await c.env.DB.prepare(
    `UPDATE orders SET pack_cost = ?2 WHERE order_no = ?1`
  )
    .bind(c.req.param('no'), value)
    .run()
  return meta.changes ? c.body(null, 204) : c.json({ error: '找不到訂單' }, 404)
})

/** 照片上傳：瀏覽器已壓縮成 WebP（Safari 是 JPEG），直接存 R2 */
admin.put('/images', async (c) => {
  const type = c.req.header('Content-Type') ?? ''
  const ext = IMAGE_TYPES[type]
  if (!ext) return c.json({ error: '只接受 WebP 或 JPEG' }, 415)
  const body = await c.req.arrayBuffer()
  if (!body.byteLength || body.byteLength > MAX_IMAGE_BYTES)
    return c.json({ error: '照片需小於 5 MB' }, 413)
  const key = `products/${crypto.randomUUID()}.${ext}`
  await c.env.IMAGES.put(key, body, {
    httpMetadata: {
      contentType: type,
      // 鍵是隨機的，內容永不變
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })
  return c.json({ key }, 201)
})
