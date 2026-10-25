// 下單的輸入檢查與計價（純函式，方便測試）。金額一律以資料庫價格重算，不用前端傳來的（規格 6.1）。

import {
  CUSTOM_MAX_QTY,
  FREE_SHIPPING_THRESHOLD,
  type ProductKind,
  SHIPPING_FEES,
} from '../../app/lib/catalog.ts'

export type ShipId = '711' | 'family' | 'home'
export type PayId = 'apple' | 'atm' | 'bnpl' | 'card'
type Line = { productId: string; variant?: string; qty: number }

export type OrderInput = {
  lines: Line[]
  name: string
  phone: string
  ship: ShipId
  /** 超商門市（ship 是 711／family） */
  store: null | { id: string; name: string; address: string }
  /** 宅配地址（ship 是 home） */
  address: string
  pay: PayId
  note: string
  /** 客訂／代購同意不適用 7 天鑑賞期 */
  consent: boolean
}

const SHIPS: ShipId[] = ['711', 'family', 'home']
const PAYS: PayId[] = ['card', 'apple', 'atm', 'bnpl']
const str = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max
    ? v.trim()
    : null

export function parseOrderInput(
  body: unknown
): { error: string } | { value: OrderInput } {
  const b = (body ?? {}) as Record<string, unknown>
  const lines = b.lines
  if (
    !Array.isArray(lines) ||
    !lines.length ||
    lines.length > 50 ||
    !lines.every(
      (l: Partial<Line>) =>
        typeof l?.productId === 'string' &&
        /^p\d{1,9}$/.test(l.productId) &&
        (l.variant === undefined ||
          (typeof l.variant === 'string' && l.variant.length <= 50)) &&
        Number.isInteger(l.qty) &&
        (l.qty as number) > 0 &&
        (l.qty as number) <= 99
    )
  )
    return { error: '購物車資料不正確，請重新整理' }

  const name = str(b.name, 50)
  if (!name) return { error: '請填寫收件人姓名' }
  const phone = typeof b.phone === 'string' ? b.phone.replace(/[\s-]/g, '') : ''
  if (!/^09\d{8}$/.test(phone))
    return { error: '請填寫 09 開頭的 10 碼手機號碼' }
  if (!SHIPS.includes(b.ship as ShipId)) return { error: '請選擇運送方式' }
  if (!PAYS.includes(b.pay as PayId)) return { error: '請選擇付款方式' }

  const ship = b.ship as ShipId
  let store: OrderInput['store'] = null
  let address = ''
  if (ship === 'home') {
    address = str(b.address, 200) ?? ''
    if (!address) return { error: '請填寫宅配地址' }
  } else {
    const s = (b.store ?? {}) as Record<string, unknown>
    const id = str(s.id, 20)
    const storeName = str(s.name, 50)
    if (!id || !storeName) return { error: '請選擇取貨門市' }
    store = { id, name: storeName, address: str(s.address, 200) ?? '' }
  }
  if (typeof b.note !== 'string' || b.note.length > 500)
    return { error: '備註最多 500 字' }

  return {
    value: {
      lines: lines as Line[],
      name,
      phone,
      ship,
      store,
      address,
      pay: b.pay as PayId,
      note: b.note.trim(),
      consent: b.consent === true,
    },
  }
}

/** 資料庫裡的規格與商品（priceOrder 的輸入） */
export type VariantRow = {
  product_id: number
  option_label: null | string
  variant_id: number
  sku: string
  stock: number
  price: number
  type: ProductKind
  status: string
  name: string
  brand: string
}

export type PricedItem = {
  variantId: number
  sku: string
  name: string
  option: null | string
  kind: '代購' | '客訂' | '現貨'
  qty: number
  price: number
}

/**
 * 對照資料庫計價：已下架、庫存不足、客訂超過上限都擋下。
 * 部分現貨依所選規格有無庫存決定是現貨還是代購（與前台 lineKind 相同）。
 */
export function priceOrder(
  lines: Line[],
  rows: VariantRow[],
  ship: ShipId
):
  | { error: string }
  | { fee: number; items: PricedItem[]; subtotal: number; total: number } {
  const items: PricedItem[] = []
  for (const l of lines) {
    const r = rows.find(
      (x) =>
        `p${String(x.product_id).padStart(2, '0')}` === l.productId &&
        x.option_label === (l.variant ?? null)
    )
    if (!r || r.status !== 'active')
      return { error: '購物車裡有已下架的商品，請回購物車移除後再結帳' }
    const kind =
      r.type === '部分現貨' ? (r.stock > 0 ? '現貨' : '代購') : r.type
    const label = r.option_label ? `${r.name}（${r.option_label}）` : r.name
    if (kind === '現貨' && l.qty > r.stock)
      return {
        error:
          r.stock > 0
            ? `${label} 只剩 ${r.stock} 件，請調整數量`
            : `${label} 已售出，請回購物車移除`,
      }
    if (kind !== '現貨' && l.qty > CUSTOM_MAX_QTY)
      return { error: `${label} 每筆訂單最多 ${CUSTOM_MAX_QTY} 件` }
    if (items.some((i) => i.variantId === r.variant_id))
      return { error: '購物車資料不正確，請重新整理' }
    items.push({
      variantId: r.variant_id,
      sku: r.sku,
      name: `${r.brand} ${r.name}`,
      option: r.option_label,
      kind,
      qty: l.qty,
      price: r.price,
    })
  }
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0)
  const fee =
    subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : ship === 'home'
        ? SHIPPING_FEES.home
        : SHIPPING_FEES.cvs
  return { items, subtotal, fee, total: subtotal + fee }
}
