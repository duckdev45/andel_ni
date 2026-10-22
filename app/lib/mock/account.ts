// ponytail: 後端未接，會員中心的訂單與收件資訊先用假資料；之後換成 /api/me/orders、/api/me/addresses。

import { getProduct } from '~/lib/catalog'

/** 規格 6.1 訂單狀態 */
export type OrderStatus =
  '已出貨' | '已完成' | '已取消' | '待出貨' | '待付款' | '退回'

/** 進行中的訂單才顯示進度條 */
export const ORDER_FLOW = ['待付款', '待出貨', '已出貨', '已完成'] as const

export const isActiveOrder = (s: OrderStatus) =>
  s === '待付款' || s === '待出貨' || s === '已出貨'

export type MockOrder = {
  id: string
  date: string
  status: OrderStatus
  lines: { productId: string; variant?: string; qty: number }[]
  shipping: string
  shippingFee: number
  payment: string
  tracking?: string
  /** 待付款（ATM）的繳費期限 */
  payBy?: string
  /** 已取消 / 退回 的原因 */
  note?: string
}

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'AN1048',
    date: '2026-10-21',
    status: '待付款',
    lines: [{ productId: 'p07', qty: 1 }],
    shipping: '超商取貨・7-ELEVEN 民生門市',
    shippingFee: 60,
    payment: 'ATM 虛擬帳號・822 中國信託 9103 5520 1188 4021',
    payBy: '2026-10-24 23:59',
  },
  {
    id: 'AN1042',
    date: '2026-10-18',
    status: '待出貨',
    lines: [
      { productId: 'p05', qty: 1 },
      { productId: 'p12', qty: 1 },
    ],
    shipping: '超商取貨・全家 民生店',
    shippingFee: 0,
    payment: '信用卡一次付清',
  },
  {
    id: 'AN1039',
    date: '2026-10-15',
    status: '已出貨',
    lines: [{ productId: 'p15', qty: 1 }],
    shipping: '宅配・台北市松山區民生東路三段 51 號 3 樓',
    shippingFee: 0,
    payment: '無卡分期・銀角零卡',
    tracking: '黑貓 9024 5507 1126',
  },
  {
    id: 'AN1036',
    date: '2026-10-13',
    status: '已完成',
    lines: [{ productId: 'p02', qty: 1 }],
    shipping: '宅配・台北市松山區民生東路三段 51 號 3 樓',
    shippingFee: 0,
    payment: 'Apple Pay',
    tracking: '黑貓 9024 5507 0981',
  },
  {
    id: 'AN1031',
    date: '2026-10-06',
    status: '退回',
    lines: [{ productId: 'p04', variant: '黑色', qty: 1 }],
    shipping: '超商取貨・全家 民生店',
    shippingFee: 0,
    payment: '信用卡一次付清',
    tracking: '全家 F2210 8873 6650',
    note: '逾期未取件，商品已退回，款項將原路退回',
  },
  {
    id: 'AN1027',
    date: '2026-09-28',
    status: '已取消',
    lines: [{ productId: 'p11', qty: 1 }],
    shipping: '超商取貨・7-ELEVEN 民生門市',
    shippingFee: 60,
    payment: 'ATM 虛擬帳號',
    note: '逾時未付款，訂單已自動取消',
  },
]

export function orderView(o: MockOrder) {
  const items = o.lines.map((l) => ({
    ...l,
    product: getProduct(l.productId)!,
  }))
  const first = items[0].product
  const count = items.reduce((n, l) => n + l.qty, 0)
  return {
    ...o,
    items,
    first,
    title: count > 1 ? `${first.name} 等 ${count} 件` : first.name,
    total:
      items.reduce((n, l) => n + l.product.price * l.qty, 0) + o.shippingFee,
  }
}

export type MockAddress = {
  id: string
  type: '宅配地址' | '超商取貨'
  title: string
}

export const MOCK_ADDRESSES: MockAddress[] = [
  { id: 'cvs-family', type: '超商取貨', title: '全家 民生店' },
  { id: 'cvs-711', type: '超商取貨', title: '7-ELEVEN 民生門市' },
  {
    id: 'home',
    type: '宅配地址',
    title: '台北市松山區民生東路三段 51 號 3 樓',
  },
]
