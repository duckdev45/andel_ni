import type { CategoryId, ProductKind } from '~/lib/catalog'

import {
  type AdminBrand,
  type AdminCategory,
  type AdminProduct,
  type Currency,
  LEDGER_DEFAULTS,
  type LedgerSettings,
  type Purchase,
} from '~/lib/admin'

// 後台讀取：商品（含下架、全部照片）、進貨、設定；寫入在 workers/api/admin.ts。

type Row = {
  id: number
  code: string
  name: string
  brand: string
  category: CategoryId
  price: number
  type: ProductKind
  status: string
  is_new: number
  description: string
  option_name: null | string
}

type VariantRow = {
  product_id: number
  option_label: null | string
  sku: string
  stock: number
}

type ImageRow = { product_id: number; r2_key: string }

/** 與前台 Product.id 相同格式（p01）；進貨、訂單明細靠它對應商品 */
export const adminId = (id: number) => `p${String(id).padStart(2, '0')}`

export const LOW_STOCK_KEY = 'low_stock_at'
export const LEDGER_KEY = 'ledger'

type PurchaseRow = {
  id: number
  purchased_on: string
  product_id: number
  option_label: null | string
  qty: number
  currency: Currency
  foreign_price: number
  fx_rate: number
  card_fee_rate: number
  note: string
}

export async function loadAdmin(db: D1Database) {
  const [products, variants, images, settings, purchases, categories, brands] =
    await db.batch([
      db.prepare(
        `SELECT p.id, p.code, p.name, b.name AS brand, c.slug AS category,
              p.price, p.type, p.status, p.is_new, p.description, p.option_name
       FROM products p
       JOIN brands b ON b.id = p.brand_id
       JOIN categories c ON c.id = p.category_id
       ORDER BY p.created_at DESC, p.id DESC`
      ),
      db.prepare(
        `SELECT product_id, option_label, sku, stock FROM product_variants
       WHERE active = 1 ORDER BY product_id, sort`
      ),
      db.prepare(
        `SELECT product_id, r2_key FROM product_images ORDER BY product_id, sort`
      ),
      db
        .prepare(`SELECT key, value FROM settings WHERE key IN (?1, ?2)`)
        .bind(LOW_STOCK_KEY, LEDGER_KEY),
      db.prepare(
        `SELECT pu.id, pu.purchased_on, v.product_id, v.option_label, pu.qty,
              pu.currency, pu.foreign_price, pu.fx_rate, pu.card_fee_rate, pu.note
       FROM purchases pu JOIN product_variants v ON v.id = pu.variant_id
       ORDER BY pu.purchased_on DESC, pu.id DESC`
      ),
      db.prepare(
        `SELECT c.slug AS id, c.name, c.name_en AS en, c.coming_soon, c.active,
              COUNT(p.id) AS count,
              COUNT(CASE WHEN p.status = 'active' THEN 1 END) AS live
       FROM categories c LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id ORDER BY c.sort, c.id`
      ),
      db.prepare(
        `SELECT b.id, b.name, COALESCE(b.origin, '') AS origin,
              COALESCE(b.blurb, '') AS blurb, b.currency, COUNT(p.id) AS count
       FROM brands b LEFT JOIN products p ON p.brand_id = b.id
       GROUP BY b.id ORDER BY b.name COLLATE NOCASE`
      ),
    ])
  const vs = variants.results as VariantRow[]
  const is = images.results as ImageRow[]
  const st = new Map(
    (settings.results as { key: string; value: string }[]).map((r) => [
      r.key,
      r.value,
    ])
  )
  const lowAt = st.get(LOW_STOCK_KEY)

  type CategoryRow = Omit<AdminCategory, 'active' | 'comingSoon'> & {
    active: number
    coming_soon: number
  }
  return {
    lowAt: lowAt ? Number(lowAt) : null,
    categories: (categories.results as CategoryRow[]).map(
      ({ active, coming_soon, ...c }): AdminCategory => ({
        ...c,
        active: active === 1,
        comingSoon: coming_soon === 1,
      })
    ),
    brands: brands.results as AdminBrand[],
    // 預設值墊底：之後新增的設定項目也有值
    settings: {
      ...LEDGER_DEFAULTS,
      ...JSON.parse(st.get(LEDGER_KEY) ?? '{}'),
    } as LedgerSettings,
    purchases: (purchases.results as PurchaseRow[]).map((r): Purchase => ({
      id: `PO${String(r.id).padStart(3, '0')}`,
      date: r.purchased_on,
      pid: adminId(r.product_id),
      opt: r.option_label,
      qty: r.qty,
      cur: r.currency,
      unit: r.foreign_price,
      rate: r.fx_rate,
      fx: r.card_fee_rate,
      note: r.note,
    })),
    products: (products.results as Row[]).map((r): AdminProduct => {
      const mine = vs.filter((v) => v.product_id === r.id)
      const single = mine.length === 1 && mine[0].option_label == null
      return {
        id: adminId(r.id),
        code: r.code,
        sku: single ? mine[0].sku : undefined,
        name: r.name,
        brand: r.brand,
        cat: r.category,
        price: r.price,
        type: r.type,
        active: r.status === 'active',
        isNew: r.is_new === 1,
        description: r.description,
        images: is.filter((i) => i.product_id === r.id).map((i) => i.r2_key),
        stock: single ? mine[0].stock : 0,
        variants: single
          ? null
          : {
              name: r.option_name ?? '規格',
              options: mine.map((v) => ({
                label: v.option_label ?? '',
                sku: v.sku,
                stock: v.stock,
              })),
            },
      }
    }),
  }
}
