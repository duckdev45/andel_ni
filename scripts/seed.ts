// 從 app/lib/catalog.ts 的示範資料產生 D1 種子 SQL（品牌、分類、商品、規格、照片）。
// 只給本機與 staging 用；正式站不放假資料（規格 11.2）。
//
//   pnpm db:seed           本機
//   pnpm db:seed:staging   staging（遠端）
//
// 可重複執行：先清掉商品相關資料再寫入。

import { writeFileSync } from 'node:fs'

import { BRANDS, CATEGORIES, PRODUCTS } from '../app/lib/catalog.ts'

const q = (v: null | number | string | undefined) =>
  v == null
    ? 'NULL'
    : typeof v === 'number'
      ? String(v)
      : `'${v.replace(/'/g, "''")}'`
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')

// 品牌：型錄品牌清單 ＋ 商品用到但不在清單裡的品牌（產地取規格表「品牌」欄）
const brands = [...BRANDS]
for (const p of PRODUCTS) {
  if (!brands.some((b) => b.name === p.brand)) {
    const origin = p.specs.find(([k]) => k === '品牌')?.[1].split('・')[1]
    brands.push({ name: p.brand, origin: origin ?? '' })
  }
}
const brandId = (name: string) => brands.findIndex((b) => b.name === name) + 1
const categoryId = (slug: string) =>
  CATEGORIES.findIndex((c) => c.id === slug) + 1

const sql: string[] = [
  'DELETE FROM product_images;',
  'DELETE FROM product_variants;',
  'DELETE FROM products;',
  'DELETE FROM categories;',
  'DELETE FROM brands;',
]

brands.forEach((b, i) =>
  sql.push(
    `INSERT INTO brands (id, name, slug, origin, blurb) VALUES (${i + 1}, ${q(b.name)}, ${q(slugify(b.name))}, ${q(b.origin || null)}, ${q(b.blurb)});`
  )
)

CATEGORIES.forEach((c, i) =>
  sql.push(
    `INSERT INTO categories (id, slug, name, name_en, sort, coming_soon) VALUES (${i + 1}, ${q(c.id)}, ${q(c.name)}, ${q(c.en)}, ${i}, ${c.comingSoon ? 1 : 0});`
  )
)

let variantId = 0
PRODUCTS.forEach((p, i) => {
  const id = i + 1
  sql.push(
    `INSERT INTO products (id, code, slug, brand_id, category_id, name, description, price, type, status, is_new, option_name, variant_summary, specs, created_at) VALUES (${id}, ${q(p.code)}, ${q(p.slug)}, ${brandId(p.brand)}, ${categoryId(p.cat)}, ${q(p.name)}, ${q(p.description)}, ${p.price}, ${q(p.kind)}, 'active', ${p.isNew ? 1 : 0}, ${q(p.variants?.name)}, ${q(p.variantSummary)}, ${q(JSON.stringify(p.specs))}, ${q(p.createdAt)});`
  )
  const options = p.variants?.options ?? [
    { label: null, sku: p.sku, stock: p.stock, swatch: undefined },
  ]
  options.forEach((o, sort) =>
    sql.push(
      `INSERT INTO product_variants (id, product_id, option_label, sku, stock, swatch, sort) VALUES (${++variantId}, ${id}, ${q(o.label)}, ${q(o.sku)}, ${o.stock}, ${q(o.swatch)}, ${sort});`
    )
  )
  sql.push(
    `INSERT INTO product_images (product_id, r2_key, sort, alt) VALUES (${id}, ${q(p.image)}, 0, ${q(`${p.brand} ${p.name}`)});`
  )
})

const out = process.argv[2] ?? '.wrangler/seed.sql'
writeFileSync(out, sql.join('\n') + '\n')
console.log(
  `種子 SQL：${out}（${brands.length} 品牌、${CATEGORIES.length} 分類、${PRODUCTS.length} 商品、${variantId} 規格）`
)
