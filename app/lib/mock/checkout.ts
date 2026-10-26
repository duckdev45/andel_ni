import type { CartItem } from '~/lib/cart'

import {
  CUSTOM_MAX_QTY,
  FREE_SHIPPING_THRESHOLD,
  isCustomOrder,
  type Product,
  SHIPPING_FEES,
} from '~/lib/catalog'

// 結帳頁的選項與計算（運費、出貨型態）。ponytail: 超商門市還是假資料，綠界物流（規格 6.4）接上後改成電子地圖。

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
