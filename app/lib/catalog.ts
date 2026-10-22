// ponytail: 後端還沒接，先用設計稿的假資料；之後換成 /api/products 回傳同樣形狀即可。

export type CategoryId =
  'acc' | 'bag' | 'beauty' | 'doll' | 'home' | 'rtw' | 'shoes' | 'slg'

/** 現貨 / 部分現貨（部分規格有現貨）/ 代購・客訂（下單後海外採購，不適用鑑賞期） */
export type ProductKind = '代購' | '客訂' | '現貨' | '部分現貨'

export type VariantOption = { label: string; stock: number; swatch?: string }

export type Product = {
  id: string
  name: string
  brand: string
  cat: Exclude<CategoryId, 'home'>
  price: number
  kind: ProductKind
  isNew: boolean
  createdAt: string
  /** 無規格商品的庫存；有規格時看 variants */
  stock: number
  image: string
  /** 卡片上的規格摘要，例如「4 色」 */
  variantSummary?: string
  variants?: { name: string; options: VariantOption[] }
  description: string
  specs: [string, string][]
}

export type Category = {
  id: CategoryId
  name: string
  en: string
  comingSoon?: boolean
}

export const CATEGORIES: Category[] = [
  { id: 'bag', name: '包包', en: 'Bags' },
  { id: 'slg', name: '小皮件', en: 'Small Leather Goods' },
  { id: 'acc', name: '飾品', en: 'Accessories' },
  { id: 'rtw', name: '衣服褲子', en: 'Ready-to-wear' },
  { id: 'shoes', name: '鞋子', en: 'Shoes' },
  { id: 'doll', name: '娃娃', en: 'Plush' },
  { id: 'beauty', name: '彩妝保養', en: 'Beauty' },
  { id: 'home', name: '家飾', en: 'Coming soon', comingSoon: true },
]

export const BRANDS: { name: string; origin: string; blurb?: string }[] = [
  { name: 'A.P.C.', origin: '法國' },
  { name: 'ACNE STUDIOS', origin: '瑞典' },
  { name: 'AMI PARIS', origin: '法國' },
  { name: 'Balenciaga', origin: '法國' },
  { name: 'Bottega Veneta', origin: '義大利' },
  { name: 'Burberry', origin: '英國' },
  { name: 'CHANEL', origin: '法國' },
  { name: 'DIOR', origin: '法國' },
  {
    name: 'GOYARD',
    origin: '法國',
    blurb: '1853 年創立於巴黎的行李箱品牌，以 Goyardine 印花聞名。',
  },
  { name: 'Jellycat', origin: '英國' },
  { name: 'LEMAIRE', origin: '法國' },
  { name: 'LOEWE', origin: '西班牙' },
  { name: 'Maison Margiela', origin: '法國' },
  { name: 'MIU MIU', origin: '義大利' },
  { name: 'PRADA', origin: '義大利' },
  { name: 'Saint Laurent', origin: '法國' },
  { name: 'Steiff', origin: '德國' },
  { name: 'TOTEME', origin: '瑞典' },
  { name: 'Vivienne Westwood', origin: '英國' },
]

const COMMON_SPECS = (
  material: string,
  brand: string,
  origin: string
): [string, string][] => [
  ['材質', material],
  ['尺寸', '[長 × 高 × 寬 cm]'],
  ['品牌', `${brand}・${origin}`],
  ['配件', '[防塵袋・盒子・購買證明]'],
]

export const PRODUCTS: Product[] = [
  {
    id: 'p01',
    name: 'i18 羽絨手機殼',
    brand: 'Urban Sophistication',
    cat: 'acc',
    price: 1880,
    kind: '部分現貨',
    isNew: true,
    createdAt: '2026-10-15',
    stock: 8,
    variantSummary: '多款',
    image: '/images/products/p01.jpg',
    variants: {
      name: '款式',
      options: [
        { label: '奶油白', stock: 3, swatch: '#EDE6D6' },
        { label: '霧粉', stock: 5, swatch: '#E4C2C0' },
        { label: '黑色', stock: 0, swatch: '#1E1E1E' },
      ],
    },
    description:
      '蓬鬆羽絨質感的手機殼，四角加厚防摔，適用 iPhone 16 / 17 系列。',
    specs: COMMON_SPECS('TPU・聚酯纖維', 'Urban Sophistication', '英國'),
  },
  {
    id: 'p02',
    name: '雙折拉鍊短夾',
    brand: 'Maison Margiela',
    cat: 'slg',
    price: 12800,
    kind: '代購',
    isNew: false,
    createdAt: '2026-10-12',
    stock: 0,
    variantSummary: '4 色',
    image: '/images/products/p02.jpg',
    variants: {
      name: '顏色',
      options: [
        { label: '黑色', stock: 0, swatch: '#1E1E1E' },
        { label: '奶油', stock: 0, swatch: '#E9E1CF' },
        { label: '酒紅', stock: 0, swatch: '#6B1F24' },
        { label: '灰綠', stock: 0, swatch: '#8A9282' },
      ],
    },
    description: '四縫線標誌的雙折短夾，外側拉鍊零錢袋，內有 6 個卡位。',
    specs: COMMON_SPECS('小牛皮', 'Maison Margiela', '法國'),
  },
  {
    id: 'p03',
    name: '單寧／帆布托特包',
    brand: 'A.P.C.',
    cat: 'bag',
    price: 3750,
    kind: '代購',
    isNew: false,
    createdAt: '2026-10-10',
    stock: 0,
    variantSummary: '6 款',
    image: '/images/products/p03.jpg',
    description: '經典 Lou 托特包，單寧與帆布兩種材質，可放 A4 文件。',
    specs: COMMON_SPECS('棉質帆布・單寧', 'A.P.C.', '法國'),
  },
  {
    id: 'p04',
    name: '綁帶漁夫帽',
    brand: 'JACQUEMUS',
    cat: 'acc',
    price: 4980,
    kind: '部分現貨',
    isNew: false,
    createdAt: '2026-10-08',
    stock: 5,
    variantSummary: '多色',
    image: '/images/products/p04.jpg',
    variants: {
      name: '顏色',
      options: [
        { label: '米白', stock: 2, swatch: '#EFE8DA' },
        { label: '黑色', stock: 3, swatch: '#1E1E1E' },
        { label: '卡其', stock: 0, swatch: '#B59E78' },
      ],
    },
    description: 'Le Bob 系列綁帶漁夫帽，下巴綁帶可調整，帽緣略寬。',
    specs: COMMON_SPECS('棉', 'JACQUEMUS', '法國'),
  },
  {
    id: 'p05',
    name: '三折牛皮短夾',
    brand: 'Maison Margiela',
    cat: 'slg',
    price: 12800,
    kind: '代購',
    isNew: false,
    createdAt: '2026-10-06',
    stock: 0,
    image: '/images/products/p05.jpg',
    description: '輕薄三折短夾，外側四縫線，內含零錢袋。',
    specs: COMMON_SPECS('小牛皮', 'Maison Margiela', '法國'),
  },
  {
    id: 'p06',
    name: '荔枝紋皮革卡夾',
    brand: 'Maison Margiela',
    cat: 'slg',
    price: 8500,
    kind: '代購',
    isNew: false,
    createdAt: '2026-10-04',
    stock: 0,
    image: '/images/products/p06.jpg',
    description: '荔枝紋牛皮卡夾，正反面各 2 卡位、中間夾層可放鈔票。',
    specs: COMMON_SPECS('荔枝紋牛皮', 'Maison Margiela', '法國'),
  },
  {
    id: 'p07',
    name: '罌粟花托特包／購物袋',
    brand: 'Marimekko',
    cat: 'bag',
    price: 1550,
    kind: '部分現貨',
    isNew: true,
    createdAt: '2026-10-14',
    stock: 12,
    variantSummary: '多款',
    image: '/images/products/p07.jpg',
    description: 'Unikko 罌粟花印花帆布托特包，肩背也能手提。',
    specs: COMMON_SPECS('棉質帆布', 'Marimekko', '芬蘭'),
  },
  {
    id: 'p08',
    name: '雙折牛皮短夾',
    brand: 'Maison Margiela',
    cat: 'slg',
    price: 13500,
    kind: '代購',
    isNew: false,
    createdAt: '2026-10-02',
    stock: 0,
    image: '/images/products/p08.jpg',
    description: '經典雙折短夾，8 個卡位與鈔票夾層。',
    specs: COMMON_SPECS('小牛皮', 'Maison Margiela', '法國'),
  },
  {
    id: 'p09',
    name: '電腦包 13／15 吋',
    brand: 'The North Face',
    cat: 'bag',
    price: 1650,
    kind: '代購',
    isNew: true,
    createdAt: '2026-10-13',
    stock: 0,
    variantSummary: '4 色',
    image: '/images/products/p09.jpg',
    description: '防潑水尼龍電腦包，內層加厚防震，13 與 15 吋兩種尺寸。',
    specs: COMMON_SPECS('尼龍', 'The North Face', '美國'),
  },
  {
    id: 'p10',
    name: '專業後台幻彩打亮盤／腮紅盤',
    brand: 'DIOR',
    cat: 'beauty',
    price: 1950,
    kind: '代購',
    isNew: false,
    createdAt: '2026-09-28',
    stock: 0,
    image: '/images/products/p10.jpg',
    description: 'Backstage 打亮腮紅盤，四色可疊擦。',
    specs: [
      ['容量', '[g]'],
      ['品牌', 'DIOR・法國'],
      ['保存期限', '[效期]'],
    ],
  },
  {
    id: 'p11',
    name: '粉持久柔霧無瑕粉餅',
    brand: 'Estée Lauder',
    cat: 'beauty',
    price: 1950,
    kind: '代購',
    isNew: false,
    createdAt: '2026-09-26',
    stock: 0,
    image: '/images/products/p11.jpg',
    description: 'Double Wear 粉持久系列粉餅，柔霧控油。',
    specs: [
      ['容量', '[g]'],
      ['品牌', 'Estée Lauder・美國'],
      ['保存期限', '[效期]'],
    ],
  },
  {
    id: 'p12',
    name: 'The Artichaut 棒球帽',
    brand: 'JACQUEMUS',
    cat: 'acc',
    price: 4380,
    kind: '現貨',
    isNew: true,
    createdAt: '2026-10-16',
    stock: 3,
    image: '/images/products/p12.jpg',
    description: '刺繡 Logo 棒球帽，後方金屬扣可調整頭圍。',
    specs: COMMON_SPECS('棉', 'JACQUEMUS', '法國'),
  },
  {
    id: 'p13',
    name: 'Saint-Gabriel 信封三折短夾',
    brand: 'GOYARD',
    cat: 'slg',
    price: 32800,
    kind: '代購',
    isNew: false,
    createdAt: '2026-09-22',
    stock: 0,
    image: '/images/products/p13.jpg',
    description: 'Goyardine 印花信封式三折短夾，按扣開合。',
    specs: COMMON_SPECS('Goyardine 塗層帆布・皮革', 'GOYARD', '法國'),
  },
  {
    id: 'p14',
    name: 'Saint-Sulpice 卡夾',
    brand: 'GOYARD',
    cat: 'slg',
    price: 15500,
    kind: '客訂',
    isNew: false,
    createdAt: '2026-09-20',
    stock: 0,
    variantSummary: '3 色',
    image: '/images/products/p14.jpg',
    variants: {
      name: '顏色',
      options: [
        { label: '灰色', stock: 1, swatch: '#6E6E6E' },
        { label: '黑色', stock: 2, swatch: '#1E1E1E' },
        { label: '黑棕', stock: 1, swatch: '#9C6A3E' },
      ],
    },
    description:
      'GOYARD 經典 Goyardine 印花的輕薄卡夾，三色可選：灰色、黑色、黑棕。',
    specs: COMMON_SPECS('Goyardine 塗層帆布・皮革', 'GOYARD', '法國'),
  },
  {
    id: 'p15',
    name: '純色羊毛圍巾',
    brand: 'ACNE STUDIOS',
    cat: 'acc',
    price: 6880,
    kind: '代購',
    isNew: false,
    createdAt: '2026-09-18',
    stock: 0,
    variantSummary: '多色',
    image: '/images/products/p15.jpg',
    description: 'Canada 系列純羊毛圍巾，流蘇收邊，長度可繞頸兩圈。',
    specs: COMMON_SPECS('羊毛 100%', 'ACNE STUDIOS', '瑞典'),
  },
]

export const FREE_SHIPPING_THRESHOLD = 2000
/** 客訂／代購每單同一規格上限（待確認，先定 5） */
export const CUSTOM_MAX_QTY = 5
export const SHIPPING_FEES = { cvs: 60, home: 100 } as const

export const formatPrice = (n: number) => `NT$ ${n.toLocaleString('en-US')}`

export const isCustomOrder = (p: Pick<Product, 'kind'>) =>
  p.kind === '代購' || p.kind === '客訂'

export const categoryName = (id: CategoryId) =>
  CATEGORIES.find((c) => c.id === id)?.name ?? ''

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id)

/** 目錄編號：依上架順序，對應設計稿的 No.01 */
export const productNo = (p: Product) =>
  String(PRODUCTS.findIndex((q) => q.id === p.id) + 1).padStart(2, '0')

/** 現貨商品且全部售完；代購／客訂永遠可下單 */
export const isSoldOut = (p: Product) =>
  !isCustomOrder(p) &&
  (p.variants ? p.variants.options.every((o) => o.stock === 0) : p.stock === 0)
