import type { CategoryId, ProductKind } from '~/lib/catalog'
import type { AdminProduct } from '~/lib/mock/admin'

// 後台商品讀取：含下架商品、全部照片；寫入在 workers/api/admin.ts。

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

/** 與前台 Product.id 相同格式（p01），記帳簿的假進貨紀錄靠它對應 */
export const adminId = (id: number) => `p${String(id).padStart(2, '0')}`

export const LOW_STOCK_KEY = 'low_stock_at'

export async function listAdminProducts(
  db: D1Database
): Promise<{ lowAt: null | number; products: AdminProduct[] }> {
  const [products, variants, images, low] = await db.batch([
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
       ORDER BY product_id, sort`
    ),
    db.prepare(
      `SELECT product_id, r2_key FROM product_images ORDER BY product_id, sort`
    ),
    db.prepare(`SELECT value FROM settings WHERE key = ?1`).bind(LOW_STOCK_KEY),
  ])
  const vs = variants.results as VariantRow[]
  const is = images.results as ImageRow[]
  const lowRow = (low.results as { value: string }[])[0]

  return {
    lowAt: lowRow ? Number(lowRow.value) : null,
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
