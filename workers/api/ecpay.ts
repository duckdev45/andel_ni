// 綠界全方位金流（AIO）共用：設定、檢查碼（規格 6.3）。純函式，方便測試。
// 文件：https://developers.ecpay.com.tw/2862/（產生訂單）、/2902/（檢查碼）

export type EcpayEnv = {
  /** staging 設 stage（wrangler.jsonc）；正式站不設 */
  ECPAY_MODE?: string
  // 正式站三個都用 wrangler secret put 設定，不進 repo
  ECPAY_MERCHANT_ID?: string
  ECPAY_HASH_KEY?: string
  ECPAY_HASH_IV?: string
}

export type EcpayConfig = {
  merchantId: string
  hashKey: string
  hashIV: string
  url: string
  stage: boolean
}

/** 綠界公開的測試特店（https://developers.ecpay.com.tw/2856/），不是秘密 */
const STAGE: EcpayConfig = {
  merchantId: '3002607',
  hashKey: 'pwFHCqoQZGmho4w6',
  hashIV: 'EkRm7iFT261dpevs',
  url: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5',
  stage: true,
}

/** 本機與 staging 用測試特店；正式站缺金鑰時直接失敗，絕不退回測試特店 */
export function ecpayConfig(env: EcpayEnv, dev: boolean): EcpayConfig {
  if (dev || env.ECPAY_MODE === 'stage') return STAGE
  const { ECPAY_HASH_IV, ECPAY_HASH_KEY, ECPAY_MERCHANT_ID } = env
  if (!ECPAY_MERCHANT_ID || !ECPAY_HASH_KEY || !ECPAY_HASH_IV)
    throw new Error('綠界金鑰未設定（ECPAY_MERCHANT_ID / HASH_KEY / HASH_IV）')
  return {
    merchantId: ECPAY_MERCHANT_ID,
    hashKey: ECPAY_HASH_KEY,
    hashIV: ECPAY_HASH_IV,
    url: 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5',
    stage: false,
  }
}

/** .NET HttpUtility.UrlEncode 的結果（綠界以它為準）：空白變 +，~ 與 ' 要編碼，全部小寫 */
const dotnetEncode = (s: string) =>
  encodeURIComponent(s)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27')
    .toLowerCase()

/** 檢查碼：參數依名稱排序 → 前後包 HashKey／HashIV → URL encode → 小寫 → SHA256 → 大寫 */
export async function checkMac(
  params: Record<string, string>,
  cfg: Pick<EcpayConfig, 'hashIV' | 'hashKey'>
) {
  const query = Object.keys(params)
    .filter((k) => k !== 'CheckMacValue')
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  const raw = `HashKey=${cfg.hashKey}&${query}&HashIV=${cfg.hashIV}`
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(dotnetEncode(raw))
  )
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/** 綠界送來的通知：檢查碼對才算數 */
export const verifyMac = async (
  params: Record<string, string>,
  cfg: Pick<EcpayConfig, 'hashIV' | 'hashKey'>
) =>
  !!params.CheckMacValue &&
  params.CheckMacValue.toUpperCase() === (await checkMac(params, cfg))

/** 台灣時間 yyyy/MM/dd HH:mm:ss */
export const ecpayDate = (d = new Date()) =>
  new Date(d.getTime() + 8 * 3600_000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
    .replace(/-/g, '/')

const CHOOSE: Record<string, string> = {
  card: 'Credit',
  apple: 'ApplePay',
  atm: 'ATM',
  bnpl: 'BNPL',
}

/** ATM 虛擬帳號可付款天數（到第 N 天 23:59） */
export const ATM_DAYS = 3

/** 產生送往綠界付款頁的表單欄位（含檢查碼） */
export async function checkoutParams(
  cfg: EcpayConfig,
  o: {
    tradeNo: string
    total: number
    pay: string
    items: { name: string; qty: number }[]
    origin: string
    orderNo: string
  }
) {
  const params: Record<string, string> = {
    MerchantID: cfg.merchantId,
    MerchantTradeNo: o.tradeNo,
    MerchantTradeDate: ecpayDate(),
    PaymentType: 'aio',
    TotalAmount: String(o.total),
    TradeDesc: 'AndelNI 訂單',
    // # 是綠界的品項分隔符號，商品名稱裡的要拿掉；超過 400 字綠界會截斷導致檢查碼錯，自己先截
    ItemName: o.items
      .map((i) => `${i.name.replace(/#/g, ' ')} x${i.qty}`)
      .join('#')
      .slice(0, 200),
    ReturnURL: `${o.origin}/api/payments/ecpay/notify`,
    ChoosePayment: CHOOSE[o.pay],
    EncryptType: '1',
    ClientBackURL: `${o.origin}/checkout/done?order=${o.orderNo}`,
    NeedExtraPaidInfo: 'N',
  }
  if (o.pay === 'atm' || o.pay === 'bnpl')
    params.PaymentInfoURL = `${o.origin}/api/payments/ecpay/info`
  if (o.pay === 'atm') {
    params.ExpireDate = String(ATM_DAYS)
    // 取號後直接把帳號帶回完成頁
    params.ClientRedirectURL = `${o.origin}/api/payments/ecpay/result`
  } else if (o.pay !== 'bnpl') {
    // 信用卡、Apple Pay 付款後瀏覽器回到這裡
    params.OrderResultURL = `${o.origin}/api/payments/ecpay/result`
  }
  params.CheckMacValue = await checkMac(params, cfg)
  return params
}
