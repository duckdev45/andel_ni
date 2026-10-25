// 後台商品表單的伺服器端檢查與 SKU 產生（純函式，方便測試）。

import {
  CATEGORIES,
  type CategoryId,
  type ProductKind,
} from '../../app/lib/catalog.ts'

export const MAX_IMAGES = 8
const KINDS: ProductKind[] = ['現貨', '部分現貨', '代購', '客訂']
// R2 上傳的鍵（/api/admin/images 產生），或種子資料的站內路徑
const IMAGE_KEY = /^(products\/[0-9a-f-]{36}\.(webp|jpg)|\/[\w./-]+)$/

export type ProductInput = {
  name: string
  brand: string
  cat: CategoryId
  price: number
  type: ProductKind
  active: boolean
  isNew: boolean
  description: string
  images: string[]
  /** 單一規格的庫存 */
  stock: number
  variants: null | { name: string; options: { label: string; stock: number }[] }
}

const count = (v: unknown) =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1e7
const text = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max

export function parseProductInput(
  body: unknown
): { error: string } | { value: ProductInput } {
  const b = (body ?? {}) as Record<string, unknown>
  if (!text(b.name, 200)) return { error: '請輸入商品名稱' }
  if (!text(b.brand, 100)) return { error: '請輸入品牌' }
  if (!CATEGORIES.some((c) => c.id === b.cat)) return { error: '分類不正確' }
  if (!count(b.price) || b.price === 0) return { error: '請輸入售價' }
  if (!KINDS.includes(b.type as ProductKind)) return { error: '類型不正確' }
  if (typeof b.description !== 'string' || b.description.length > 5000)
    return { error: '描述太長' }
  const images = b.images
  if (
    !Array.isArray(images) ||
    images.length > MAX_IMAGES ||
    !images.every((k) => typeof k === 'string' && IMAGE_KEY.test(k))
  )
    return { error: '照片不正確' }

  let variants: ProductInput['variants'] = null
  if (b.variants != null) {
    const v = b.variants as Record<string, unknown>
    const options = Array.isArray(v.options)
      ? (v.options as Record<string, unknown>[])
      : []
    if (!text(v.name, 50)) return { error: '請輸入規格名稱' }
    if (!options.length || options.length > 50)
      return { error: '至少需要一個選項' }
    if (!options.every((o) => text(o.label, 50) && count(o.stock)))
      return { error: '選項名稱或庫存不正確' }
    const labels = options.map((o) => (o.label as string).trim())
    if (new Set(labels).size !== labels.length) return { error: '選項名稱重複' }
    variants = {
      name: (v.name as string).trim(),
      options: options.map((o, i) => ({
        label: labels[i],
        stock: o.stock as number,
      })),
    }
  } else if (!count(b.stock)) return { error: '庫存不正確' }

  return {
    value: {
      name: (b.name as string).trim(),
      brand: (b.brand as string).trim(),
      cat: b.cat as CategoryId,
      price: b.price as number,
      type: b.type as ProductKind,
      active: b.active === true,
      isNew: b.isNew === true,
      description: b.description,
      images: images as string[],
      stock: variants ? 0 : (b.stock as number),
      variants,
    },
  }
}

/**
 * 新 SKU：品牌縮寫-分類-商品編號，例：GOY-SLG-AN0016。
 * ponytail: 規格 5.1a 的「款式-顏色」中文無法自動縮寫，先用商品編號代替；要自訂 SKU 時再加欄位。
 */
export const skuPrefix = (brand: string, cat: CategoryId, code: string) =>
  [
    brand
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 3) || 'XXX',
    cat.toUpperCase(),
    code,
  ].join('-')

/** 依選項名稱沿用舊 SKU；新選項接在最大流水號後面（-01、-02…），刪掉的號碼不重用 */
export function assignSkus(
  prefix: string,
  labels: string[],
  existing: { label: null | string; sku: string }[]
) {
  const tail = new RegExp(
    `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`
  )
  let next =
    existing.reduce(
      (n, e) => Math.max(n, Number(tail.exec(e.sku)?.[1] ?? 0)),
      0
    ) + 1
  return labels.map(
    (label) =>
      existing.find((e) => e.label === label)?.sku ??
      `${prefix}-${String(next++).padStart(2, '0')}`
  )
}
