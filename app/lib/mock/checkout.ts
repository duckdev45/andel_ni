import type { CartItem } from '~/lib/cart'

import {
  CUSTOM_MAX_QTY,
  FREE_SHIPPING_THRESHOLD,
  isCustomOrder,
  type Product,
  SHIPPING_FEES,
} from '~/lib/catalog'

// ponytail: 後端未接，訂單只存 sessionStorage 給完成頁讀；之後改成 POST /api/orders 回傳訂單編號。

export type ShipId = '711' | 'family' | 'home'
export type PayId = 'apple' | 'atm' | 'bnpl' | 'card'

export const SHIP_OPTIONS: {
  id: ShipId
  label: string
  sub: string
  fee: number
}[] = [
  {
    id: '711',
    label: '7-ELEVEN 取貨',
    sub: '超商取貨，到店簡訊通知',
    fee: SHIPPING_FEES.cvs,
  },
  {
    id: 'family',
    label: '全家取貨',
    sub: '超商取貨，到店簡訊通知',
    fee: SHIPPING_FEES.cvs,
  },
  {
    id: 'home',
    label: '黑貓宅配',
    sub: '宅配到府，送達前聯繫',
    fee: SHIPPING_FEES.home,
  },
]

export const PAY_OPTIONS: {
  id: PayId
  label: string
  sub: string
  note: string
  submit: string
}[] = [
  {
    id: 'card',
    label: '信用卡一次付清',
    sub: 'VISA・Mastercard・JCB',
    note: '按下確認後將前往綠界安全付款頁輸入卡號（3D 驗證）。',
    submit: '確認下單並付款',
  },
  {
    id: 'apple',
    label: 'Apple Pay',
    sub: '支援的裝置與瀏覽器',
    note: '按下確認後將前往綠界付款頁，以 Apple Pay 完成付款。',
    submit: '確認下單並付款',
  },
  {
    id: 'atm',
    label: 'ATM 虛擬帳號',
    sub: '下單後取得轉帳帳號',
    note: '下單後會顯示轉帳帳號，請於 3 天內完成轉帳，逾期訂單自動取消。',
    submit: '確認下單',
  },
  {
    id: 'bnpl',
    label: '無卡分期',
    sub: '銀角零卡・裕富，免信用卡',
    note: '按下確認後將前往無卡分期申請頁，審核通過即完成付款。',
    submit: '確認下單並申請分期',
  },
]

/** 購物車「一起帶走」加購區的候選商品 */
export const ADDON_IDS = ['p07', 'p01', 'p15']

/** 假的超商門市：按「選擇門市」時依序輪替，假裝從電子地圖選回來 */
export const MOCK_STORES: Record<
  Exclude<ShipId, 'home'>,
  { id: string; name: string; address: string }[]
> = {
  '711': [
    {
      id: '123456',
      name: '民生門市',
      address: '台北市松山區民生東路三段 51 號',
    },
    { id: '234567', name: '富錦門市', address: '台北市松山區富錦街 102 號' },
  ],
  family: [
    {
      id: '012345',
      name: '台北民生店',
      address: '台北市松山區民生東路四段 80 號',
    },
    {
      id: '023456',
      name: '台北光復店',
      address: '台北市大安區光復南路 290 號',
    },
  ],
}

export type StoreChoice = {
  chain: Exclude<ShipId, 'home'>
} & (typeof MOCK_STORES)['711'][number]

/** 規格選項的庫存；無規格時看商品庫存 */
const optionStock = (p: Product, variant?: string) =>
  p.variants
    ? (p.variants.options.find((o) => o.label === variant)?.stock ?? 0)
    : p.stock

/** 這一行實際的出貨型態：部分現貨依所選規格有無庫存決定 */
export function lineKind(item: Pick<CartItem, 'product' | 'variant'>) {
  const { product: p, variant } = item
  if (p.kind !== '部分現貨') return p.kind
  return optionStock(p, variant) > 0 ? '現貨' : '代購'
}

export const isCustomLine = (item: Pick<CartItem, 'product' | 'variant'>) =>
  isCustomOrder({ kind: lineKind(item) })

/** 可購買上限：現貨看庫存，客訂／代購每單最多 5 件 */
export function maxQty(item: Pick<CartItem, 'product' | 'variant'>) {
  return isCustomLine(item)
    ? CUSTOM_MAX_QTY
    : optionStock(item.product, item.variant)
}

export const optionText = (item: Pick<CartItem, 'product' | 'variant'>) =>
  item.variant && item.product.variants
    ? `${item.product.variants.name}：${item.variant}`
    : '單一規格'

export const shippingFee = (subtotal: number, ship: ShipId) =>
  subtotal >= FREE_SHIPPING_THRESHOLD
    ? 0
    : (SHIP_OPTIONS.find((o) => o.id === ship)?.fee ?? 0)

export type OrderLine = {
  productId: string
  name: string
  brand: string
  image: string
  option: string
  kind: string
  /** 客訂／代購 */
  custom: boolean
  qty: number
  price: number
}

export type MockOrder = {
  no: string
  createdAt: string
  name: string
  phone: string
  email: string
  ship: ShipId
  /** 超商：門市；宅配：地址 */
  destination: string
  pay: PayId
  note: string
  lines: OrderLine[]
  subtotal: number
  fee: number
  total: number
  /** 規格 9：客訂／代購同意不適用 7 天鑑賞期（consent_no_return） */
  consentNoReturn: boolean
}

const orderKey = (no: string) => `andelni:order:${no}`

export function createOrder(
  input: Omit<
    MockOrder,
    'createdAt' | 'fee' | 'lines' | 'no' | 'subtotal' | 'total'
  >,
  items: CartItem[]
): MockOrder {
  const subtotal = items.reduce((n, i) => n + i.qty * i.product.price, 0)
  const fee = shippingFee(subtotal, input.ship)
  const order: MockOrder = {
    ...input,
    no: `AN${String(Date.now()).slice(-6)}`,
    createdAt: new Date().toISOString(),
    lines: items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      brand: i.product.brand,
      image: i.product.image,
      option: optionText(i),
      kind: lineKind(i),
      custom: isCustomLine(i),
      qty: i.qty,
      price: i.product.price,
    })),
    subtotal,
    fee,
    total: subtotal + fee,
  }
  try {
    sessionStorage.setItem(orderKey(order.no), JSON.stringify(order))
  } catch {
    // 無痕模式：完成頁會顯示找不到訂單，仍可到會員中心查
  }
  return order
}

/** 給 useSyncExternalStore 用：回傳原始字串（穩定），解析交給呼叫端 */
export function readOrderRaw(no: string) {
  try {
    return sessionStorage.getItem(orderKey(no))
  } catch {
    return null
  }
}

/** ATM 虛擬帳號（假資料）：由訂單編號推出 14 碼帳號，期限 3 天 */
export function mockAtm(order: MockOrder) {
  const digits = order.no.replace(/\D/g, '')
  const account = `91030${digits}`.padEnd(14, '0').slice(0, 14)
  const deadline = new Date(order.createdAt)
  deadline.setDate(deadline.getDate() + 3)
  deadline.setHours(23, 59, 0, 0)
  return {
    bank: '822 中國信託',
    account: account.replace(/(\d{4})(?=\d)/g, '$1 '),
    deadline: deadline.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }
}
