import type { CategoryId, Product, ProductKind } from '~/lib/catalog'

// 商品讀取：D1 → 前台既有的 Product 型別，畫面元件不用改。
// React Router 的 loader 與 Hono 的 /api/products 共用。

type ProductRow = {
  id: number
  code: string
  slug: string
  brand: string
  category: CategoryId
  name: string
  description: string
  price: number
  type: ProductKind
  is_new: number
  option_name: null | string
  variant_summary: null | string
  specs: string
  created_at: string
  image: null | string
}

type VariantRow = {
  product_id: number
  option_label: null | string
  sku: string
  stock: number
  swatch: null | string
}

const PRODUCT_SQL = `
  SELECT p.id, p.code, p.slug, b.name AS brand, c.slug AS category, p.name,
         p.description, p.price, p.type, p.is_new, p.option_name,
         p.variant_summary, p.specs, p.created_at,
         (SELECT r2_key FROM product_images i WHERE i.product_id = p.id
           ORDER BY i.sort LIMIT 1) AS image
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  JOIN categories c ON c.id = p.category_id
  WHERE p.status = 'active'`

// ponytail: 站內靜態圖直接用；接 R2 後改成 img.<網域>/<key>（規格 5.2）
const imageUrl = (key: null | string) => key ?? ''

function toProduct(row: ProductRow, variants: VariantRow[]): Product {
  const mine = variants.filter((v) => v.product_id === row.id)
  const single = mine.length === 1 && mine[0].option_label == null
  return {
    // ponytail: 購物車還存在瀏覽器、以舊 ID（p01）記錄；購物車改存 D1（規格 4）後改用數字 ID
    id: `p${String(row.id).padStart(2, '0')}`,
    code: row.code,
    slug: row.slug,
    sku: single ? mine[0].sku : '',
    name: row.name,
    brand: row.brand,
    cat: row.category as Product['cat'],
    price: row.price,
    kind: row.type,
    isNew: row.is_new === 1,
    createdAt: row.created_at.slice(0, 10),
    stock: single ? mine[0].stock : 0,
    image: imageUrl(row.image),
    variantSummary: row.variant_summary ?? undefined,
    variants: single
      ? undefined
      : {
          name: row.option_name ?? '規格',
          options: mine.map((v) => ({
            label: v.option_label ?? '',
            sku: v.sku,
            stock: v.stock,
            swatch: v.swatch ?? undefined,
          })),
        },
    description: row.description,
    specs: JSON.parse(row.specs) as [string, string][],
  }
}

/** 上架中的全部商品，依上架時間新到舊 */
export async function listProducts(db: D1Database): Promise<Product[]> {
  const [products, variants] = await db.batch([
    db.prepare(`${PRODUCT_SQL} ORDER BY p.created_at DESC, p.id DESC`),
    db.prepare(
      `SELECT v.product_id, v.option_label, v.sku, v.stock, v.swatch
       FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE p.status = 'active' ORDER BY v.product_id, v.sort`
    ),
  ])
  const vs = variants.results as VariantRow[]
  return (products.results as ProductRow[]).map((r) => toProduct(r, vs))
}

/** 依商品編號（AN0014）取一件上架中的商品 */
export async function getProductByCode(
  db: D1Database,
  code: string
): Promise<null | Product> {
  const [products, variants] = await db.batch([
    db.prepare(`${PRODUCT_SQL} AND p.code = ?1`).bind(code),
    db
      .prepare(
        `SELECT v.product_id, v.option_label, v.sku, v.stock, v.swatch
         FROM product_variants v JOIN products p ON p.id = v.product_id
         WHERE p.code = ?1 ORDER BY v.sort`
      )
      .bind(code),
  ])
  const row = (products.results as ProductRow[])[0]
  return row ? toProduct(row, variants.results as VariantRow[]) : null
}
