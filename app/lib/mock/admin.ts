// ponytail: 後台假資料與計算公式（搬自 Admin.dc.html 與其資料檔），之後換成 API 回傳同樣形狀即可。
// 商品基本資料沿用 ~/lib/catalog，避免前後台兩份商品名稱/圖片不一致。

import { type CategoryId, isCustomOrder, PRODUCTS } from '~/lib/catalog'

/** 示範資料的「今天」 */
export const TODAY = '2026-10-16'
export const TODAY_LABEL = '2026 年 10 月 16 日 星期五'
export const THIS_MONTH = '2026-10'

// ── 訂單狀態（規格 6.1） ──────────────────────────────

export type OrderStatus =
  'cancelled' | 'done' | 'pending_pay' | 'returned' | 'shipped' | 'to_ship'

export const STATUS: Record<
  OrderStatus,
  { bg: string; fg: string; label: string }
> = {
  pending_pay: { label: '待付款', fg: '#7a4a0c', bg: '#f3e6cf' },
  to_ship: { label: '待出貨', fg: '#7a1618', bg: '#f1e1df' },
  shipped: { label: '已出貨', fg: '#3f5640', bg: '#dfe6dc' },
  done: { label: '已完成', fg: '#4a423c', bg: '#e8e3dc' },
  cancelled: { label: '已取消', fg: '#6f655e', bg: '#efece8' },
  returned: { label: '退回', fg: '#55554f', bg: '#e4e4de' },
}

export const STATUS_ORDER: OrderStatus[] = [
  'pending_pay',
  'to_ship',
  'shipped',
  'done',
  'cancelled',
  'returned',
]

/** 只能依此表轉換：待付款 → 待出貨 → 已出貨 → 已完成；待付款 → 已取消；已出貨 → 退回 */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending_pay: ['to_ship', 'cancelled'],
  to_ship: ['shipped'],
  shipped: ['done', 'returned'],
  done: [],
  cancelled: [],
  returned: [],
}

export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  NEXT_STATUS[from].includes(to)

// ── 付款與物流（規格 6.3 / 6.4） ─────────────────────

export type PayMethod = 'applepay' | 'atm' | 'bnpl' | 'card'
export const PAY: Record<PayMethod, string> = {
  card: '信用卡',
  applepay: 'Apple Pay',
  atm: 'ATM 虛擬帳號',
  bnpl: '無卡分期',
}

export type ShipMethod = '711' | 'family' | 'home'
export const SHIP: Record<ShipMethod, string> = {
  '711': '7-ELEVEN 取貨',
  family: '全家取貨',
  home: '黑貓宅配',
}
const SHIP_FEE: Record<ShipMethod, number> = {
  '711': 60,
  family: 60,
  home: 100,
}
const FREE_SHIP_AT = 2000

// ── 幣別與匯率 ──────────────────────────────────────

export type Currency = 'EUR' | 'GBP' | 'JPY' | 'TWD' | 'USD'
export const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'EUR', label: '歐元' },
  { code: 'GBP', label: '英鎊' },
  { code: 'JPY', label: '日圓' },
  { code: 'USD', label: '美元' },
  { code: 'TWD', label: '新台幣' },
]
export const currencyLabel = (c: Currency) =>
  CURRENCIES.find((x) => x.code === c)?.label ?? c

/** 品牌預設進貨幣別 */
const BRAND_CUR: Record<string, Currency> = {
  'A.P.C.': 'EUR',
  'ACNE STUDIOS': 'EUR',
  'Estée Lauder': 'USD',
  'Maison Margiela': 'EUR',
  'The North Face': 'JPY',
  'Urban Sophistication': 'USD',
  Burberry: 'GBP',
  DIOR: 'EUR',
  GOYARD: 'EUR',
  JACQUEMUS: 'EUR',
  Jellycat: 'GBP',
  Marimekko: 'EUR',
}
export const brandCurrency = (brand: string): Currency =>
  BRAND_CUR[brand] ?? 'EUR'

// ── 商品 ─────────────────────────────────────────────

/** 規格 8：products.type 只有現貨／客訂兩種 */
export type ProductType = '客訂' | '現貨'

export type AdminVariant = { label: string; stock: number }

export type AdminProduct = {
  id: string
  name: string
  brand: string
  cat: CategoryId
  price: number
  type: ProductType
  active: boolean
  isNew: boolean
  description: string
  images: string[]
  /** 單一規格的庫存；多規格時看 variants */
  stock: number
  variants: null | { name: string; options: AdminVariant[] }
}

/** 設計稿後台的單一規格庫存（前台型錄多半是 0，後台示範用這組） */
const STOCK_SEED: Record<string, number> = {
  p03: 4,
  p05: 2,
  p06: 3,
  p07: 12,
  p08: 2,
  p09: 4,
  p10: 3,
  p11: 2,
  p12: 3,
  p13: 1,
  p15: 3,
}

export const SEED_PRODUCTS: AdminProduct[] = PRODUCTS.map((p) => ({
  id: p.id,
  name: p.name,
  brand: p.brand,
  cat: p.cat,
  price: p.price,
  type: isCustomOrder(p) ? '客訂' : '現貨',
  active: true,
  isNew: p.isNew,
  description: p.description,
  images: [p.image],
  stock: p.variants ? 0 : (STOCK_SEED[p.id] ?? p.stock),
  variants: p.variants
    ? {
        name: p.variants.name,
        options: p.variants.options.map((o) => ({
          label: o.label,
          stock: o.stock,
        })),
      }
    : null,
}))

export const stockOf = (p: AdminProduct, opt?: null | string) => {
  if (!p.variants) return p.stock
  if (opt != null)
    return p.variants.options.find((o) => o.label === opt)?.stock ?? 0
  return p.variants.options.reduce((a, o) => a + o.stock, 0)
}

export type Sku = { opt: null | string; product: AdminProduct; stock: number }

export const skusOf = (products: AdminProduct[]): Sku[] =>
  products.flatMap((p): Sku[] =>
    p.variants
      ? p.variants.options.map((o) => ({
          product: p,
          opt: o.label,
          stock: o.stock,
        }))
      : [{ product: p, opt: null, stock: p.stock }]
  )

/** 不可變更新：回傳調整後的商品 */
export const withStock = (
  p: AdminProduct,
  opt: null | string,
  next: (n: number) => number
): AdminProduct =>
  p.variants
    ? {
        ...p,
        variants: {
          ...p.variants,
          options: p.variants.options.map((o) =>
            o.label === opt ? { ...o, stock: Math.max(0, next(o.stock)) } : o
          ),
        },
      }
    : { ...p, stock: Math.max(0, next(p.stock)) }

// ── 訂單 ─────────────────────────────────────────────

export type OrderItem = {
  pid: string
  name: string
  opt: null | string
  price: number
  qty: number
}

export type AdminOrder = {
  id: string
  date: string
  customer: { email: string; name: string; phone: string }
  ship: { address: string; method: ShipMethod }
  pay: PayMethod
  atm?: { account: string; bank: string; due: string }
  items: OrderItem[]
  subtotal: number
  shipFee: number
  total: number
  status: OrderStatus
  tracking: string
  /** 此單包材費，未填用設定值 */
  pack?: number
}

const item = (pid: string, opt: null | string, qty: number): OrderItem => {
  const p = PRODUCTS.find((x) => x.id === pid)!
  return { pid, name: p.name, opt, price: p.price, qty }
}

const order = (
  id: string,
  date: string,
  customer: AdminOrder['customer'],
  ship: AdminOrder['ship'],
  pay: PayMethod,
  items: OrderItem[],
  status: OrderStatus,
  tracking = ''
): AdminOrder => {
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0)
  const shipFee = subtotal >= FREE_SHIP_AT ? 0 : SHIP_FEE[ship.method]
  return {
    id,
    date,
    customer,
    ship,
    pay,
    items,
    subtotal,
    shipFee,
    total: subtotal + shipFee,
    status,
    tracking,
  }
}

const lin = { name: '林語安', phone: '0912345678', email: 'yuan.lin@mail.com' }

export const SEED_ORDERS: AdminOrder[] = [
  order(
    'AN1041',
    '2026-10-16 10:24',
    { name: '陳柏宇', phone: '0933221144', email: 'bychen@mail.com' },
    { method: 'home', address: '台北市大安區仁愛路四段 112 號 6 樓' },
    'card',
    [item('p13', null, 1)],
    'to_ship'
  ),
  {
    ...order(
      'AN1040',
      '2026-10-16 08:02',
      { name: '黃思涵', phone: '0955678123', email: 'sihan@mail.com' },
      { method: '711', address: '7-ELEVEN 信義門市' },
      'atm',
      [item('p07', null, 2), item('p01', '霧粉', 1)],
      'pending_pay'
    ),
    atm: {
      bank: '822 中國信託',
      account: '9103 1042 2026 1016',
      due: '2026/10/19 23:59',
    },
  },
  order(
    'AN1039',
    '2026-10-15 22:41',
    lin,
    { method: 'family', address: '全家 民生店' },
    'bnpl',
    [item('p05', null, 1)],
    'to_ship'
  ),
  order(
    'AN1038',
    '2026-10-15 14:10',
    { name: '張凱婷', phone: '0921009876', email: 'kt.chang@mail.com' },
    { method: 'home', address: '新北市板橋區文化路一段 25 號' },
    'applepay',
    [item('p15', null, 1)],
    'to_ship'
  ),
  order(
    'AN1037',
    '2026-10-14 19:55',
    { name: '吳承恩', phone: '0978123456', email: 'ce.wu@mail.com' },
    { method: 'home', address: '台中市西區公益路 68 號' },
    'card',
    [item('p14', '黑色', 1), item('p12', null, 1)],
    'shipped',
    '黑貓 9024 5512 0381'
  ),
  order(
    'AN1036',
    '2026-10-13 11:30',
    lin,
    { method: 'home', address: '台北市松山區民生東路三段 51 號 3 樓' },
    'card',
    [item('p02', '黑色', 1)],
    'done',
    '黑貓 9024 5507 1126'
  ),
  order(
    'AN1035',
    '2026-10-12 16:18',
    { name: '李孟哲', phone: '0910556677', email: 'mz.lee@mail.com' },
    { method: '711', address: '7-ELEVEN 敦化門市' },
    'bnpl',
    [item('p06', null, 1)],
    'done',
    '7-ELEVEN 交貨便 F8812034'
  ),
  order(
    'AN1034',
    '2026-10-11 09:47',
    { name: '周芷若', phone: '0987654321', email: 'zr.chou@mail.com' },
    { method: 'family', address: '全家 新光店' },
    'atm',
    [item('p10', null, 1)],
    'cancelled'
  ),
  order(
    'AN1033',
    '2026-10-10 20:05',
    { name: '許家豪', phone: '0939111222', email: 'jh.hsu@mail.com' },
    { method: 'home', address: '高雄市苓雅區四維三路 6 號' },
    'card',
    [item('p08', null, 1)],
    'done',
    '黑貓 9024 5498 3307'
  ),
  order(
    'AN1032',
    '2026-10-08 13:22',
    { name: '蔡宜蓁', phone: '0952334455', email: 'yz.tsai@mail.com' },
    { method: 'family', address: '全家 師大店' },
    'card',
    [item('p04', '米白', 1)],
    'returned',
    '全家店到店 2203 8812'
  ),
]

/** 列表用：第一件商品＋件數 */
export function orderSummary(o: AdminOrder) {
  const n = o.items.reduce((a, i) => a + i.qty, 0)
  const f = o.items[0]
  if (!f) return ''
  return (
    f.name +
    (f.opt ? `（${f.opt}）` : '') +
    (o.items.length > 1 ? ` 等 ${n} 件` : ` ×${f.qty}`)
  )
}

// ── 進貨 ─────────────────────────────────────────────

export type Purchase = {
  id: string
  date: string
  pid: string
  opt: null | string
  qty: number
  cur: Currency
  /** 外幣單價 */
  unit: number
  rate: number
  /** 刷卡手續費 % */
  fx: number
  note: string
}

const po = (
  id: string,
  date: string,
  pid: string,
  qty: number,
  cur: Currency,
  unit: number,
  rate: number,
  note = ''
): Purchase => ({
  id,
  date,
  pid,
  opt: null,
  qty,
  cur,
  unit,
  rate,
  fx: 1.5,
  note,
})

export const SEED_PURCHASES: Purchase[] = [
  po('PO113', '2026-10-09', 'p12', 4, 'EUR', 75, 35.4),
  po('PO112', '2026-10-05', 'p07', 15, 'EUR', 25, 35.3),
  po('PO111', '2026-10-02', 'p01', 10, 'USD', 38, 32.0, '三款混裝'),
  po('PO110', '2026-09-30', 'p05', 3, 'EUR', 245, 35.3),
  po('PO109', '2026-09-28', 'p13', 2, 'EUR', 640, 35.1),
  po('PO108', '2026-09-28', 'p14', 4, 'EUR', 300, 35.1, '三色'),
  po('PO107', '2026-09-03', 'p02', 3, 'EUR', 250, 35.0),
  po('PO106', '2026-08-25', 'p15', 5, 'EUR', 130, 34.9),
  po('PO105', '2026-08-20', 'p06', 4, 'EUR', 160, 34.9),
  po('PO104', '2026-07-22', 'p08', 3, 'EUR', 265, 34.8),
  po('PO103', '2026-07-22', 'p03', 6, 'EUR', 70, 34.8),
  po('PO102', '2026-07-20', 'p09', 6, 'JPY', 5500, 0.211, '日本購入'),
  po('PO101', '2026-07-10', 'p10', 5, 'EUR', 32, 34.9),
  po('PO100', '2026-07-08', 'p11', 4, 'USD', 42, 31.8),
  po('PO099', '2026-07-01', 'p04', 6, 'EUR', 95, 34.7, '米白・黑色・卡其'),
]

/** 外幣 × 匯率 → 台幣，再加刷卡手續費 */
export const purchaseCalc = (r: {
  fx: number
  qty: number
  rate: number
  unit: number
}) => {
  const foreign = r.unit * r.qty
  const base = foreign * r.rate
  const fee = (base * r.fx) / 100
  const total = base + fee
  return {
    foreign,
    base: Math.round(base),
    fee: Math.round(fee),
    total: Math.round(total),
    unitTwd: r.qty ? Math.round(total / r.qty) : 0,
  }
}

/** 依進貨紀錄加權平均的單位成本 */
export const avgCost = (purchases: Purchase[], pid: string) => {
  const ps = purchases.filter((p) => p.pid === pid)
  const q = ps.reduce((a, p) => a + p.qty, 0)
  if (!q) return 0
  return Math.round(ps.reduce((a, p) => a + purchaseCalc(p).total, 0) / q)
}

// ── 記帳設定 ─────────────────────────────────────────

export type LedgerSettings = {
  /** 各付款方式：售出金額 × pct% ＋ fixed */
  payFee: Record<PayMethod, { fixed: number; pct: number }>
  /** 預設每單包材 */
  pack: number
  /** 實際物流成本 */
  shipCost: Record<ShipMethod, number>
  /** 海外刷卡手續費 %（進貨） */
  cardFx: number
  rates: Record<Currency, number>
}

export const SEED_SETTINGS: LedgerSettings = {
  payFee: {
    card: { pct: 2.8, fixed: 0 },
    applepay: { pct: 2.8, fixed: 0 },
    atm: { pct: 1, fixed: 0 },
    bnpl: { pct: 0, fixed: 0 },
  },
  pack: 45,
  shipCost: { '711': 60, family: 60, home: 110 },
  cardFx: 1.5,
  rates: { EUR: 35.6, GBP: 41.5, JPY: 0.213, USD: 32.1, TWD: 1 },
}

/** 已收款且未取消／退回的訂單才入帳 */
export const isBooked = (o: AdminOrder) =>
  o.status === 'to_ship' || o.status === 'shipped' || o.status === 'done'

/** 每筆淨利 = 售價 − 成本 − 金流手續費 − 包材費 − 運費 */
export const orderLedger = (
  o: AdminOrder,
  purchases: Purchase[],
  st: LedgerSettings
) => {
  const sale = o.total
  const cogs = o.items.reduce(
    (a, i) => a + avgCost(purchases, i.pid) * i.qty,
    0
  )
  const f = st.payFee[o.pay]
  const fee = Math.round((sale * f.pct) / 100 + f.fixed)
  const pack = Math.round(o.pack ?? st.pack)
  const ship = Math.round(st.shipCost[o.ship.method])
  return { sale, cogs, fee, pack, ship, net: sale - cogs - fee - pack - ship }
}

// ── 格式 ─────────────────────────────────────────────

export const money = (n: number) =>
  (n < 0 ? '−' : '') + 'NT$' + Math.abs(Math.round(n)).toLocaleString('en-US')
/** 支出：前面加負號 */
export const minus = (n: number) => (n ? '−' : '') + money(n)
export const percent = (a: number, b: number) =>
  b ? `${Math.round((a / b) * 1000) / 10}%` : '—'
export const foreign = (cur: Currency, v: number) =>
  `${cur} ${v.toLocaleString('en-US', { maximumFractionDigits: cur === 'JPY' ? 0 : 2 })}`
/** 表單數字欄位 → 數字 */
export const num = (v: number | string) => {
  const n = parseFloat(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export const LOW_STOCK_DEFAULT = 3
