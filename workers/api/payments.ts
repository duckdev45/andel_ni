import type { PayInfo } from '../../app/lib/db/orders.server'

import { type Context, Hono } from 'hono'

import {
  markPaid,
  orderNoOf,
  savePayInfo,
  startPayment,
} from '../../app/lib/db/payments.server'
import { getSessionUser } from '../../app/lib/db/users.server'
import {
  checkoutParams,
  ecpayConfig,
  type EcpayConfig,
  type EcpayEnv,
  verifyMac,
} from './ecpay'

// /api/payments/*：綠界付款（規格 6.3）。
// 綠界的通知是一般表單 POST，不走 JSON 限制；改以檢查碼驗證來源，商店代號也要對。
export const payments = new Hono<{ Bindings: Env }>()

type C = Context<{ Bindings: Env }>
const cfgOf = (c: C) =>
  ecpayConfig(c.env as Env & EcpayEnv, import.meta.env.DEV)
const done = (no: string) => `/checkout/done?order=${encodeURIComponent(no)}`

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!
  )

/** 前往綠界付款頁：產生表單自動送出（綠界規定要由瀏覽器送出） */
payments.get('/:no/checkout', async (c) => {
  const no = c.req.param('no')
  if (!/^\d{10}$/.test(no)) return c.redirect('/account?tab=orders', 303)
  const me = await getSessionUser(c.env.DB, c.req.raw)
  // 不是本人、已付款、已取消、ATM 已取號：回完成頁看狀態
  const order = me && (await startPayment(c.env.DB, me.id, no))
  if (!order) return c.redirect(done(no), 303)

  const cfg = cfgOf(c)
  const params = await checkoutParams(cfg, {
    ...order,
    origin: new URL(c.req.url).origin,
    orderNo: no,
  })
  const inputs = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`)
    .join('')
  c.header('Cache-Control', 'no-store')
  return c.html(
    `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>前往付款｜AndelNI</title>` +
      `<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">` +
      `<body style="font-family:system-ui;padding:24px"><form method="post" action="${cfg.url}" accept-charset="UTF-8">${inputs}` +
      `<p>正在前往綠界付款頁…</p><noscript><button type="submit">前往付款</button></noscript></form>` +
      `<script>document.forms[0].submit()</script></body></html>`
  )
})

/** 綠界送來的表單；檢查碼或商店代號不對回 null */
async function verified(c: C, cfg: EcpayConfig) {
  const body = await c.req.parseBody()
  const p = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, String(v)])
  )
  if (p.MerchantID !== cfg.merchantId || !(await verifyMac(p, cfg))) {
    console.warn('綠界通知驗證失敗', p.MerchantTradeNo)
    return null
  }
  return p
}

/** 付款結果：成功才改訂單；正式站的「模擬付款」不算數 */
async function onPaid(c: C, cfg: EcpayConfig, p: Record<string, string>) {
  if (p.RtnCode !== '1') {
    console.log('綠界付款未成功', p.MerchantTradeNo, p.RtnCode, p.RtnMsg)
    return
  }
  if (p.SimulatePaid === '1' && !cfg.stage) return
  const r = await markPaid(c.env.DB, {
    tradeNo: p.MerchantTradeNo,
    ecpayTradeNo: p.TradeNo,
    amount: Number(p.TradeAmt),
    raw: JSON.stringify(p),
  })
  if (r !== 'ok' && r !== 'duplicate')
    console.error('綠界付款需要人工確認', p.MerchantTradeNo, r)
}

/** 取號結果：ATM（RtnCode 2）存帳號；無卡分期記下已送出申請 */
async function onInfo(c: C, p: Record<string, string>) {
  let info: null | PayInfo = null
  if (p.PaymentType?.startsWith('ATM') && p.RtnCode === '2')
    info = { bank: p.BankCode, account: p.vAccount, expire: p.ExpireDate }
  else if (p.PaymentType?.startsWith('BNPL')) info = { bnpl: true }
  if (info) await savePayInfo(c.env.DB, p.MerchantTradeNo, info)
  else console.log('綠界取號未成功', p.MerchantTradeNo, p.RtnCode, p.RtnMsg)
}

// 伺服器對伺服器：付款結果（ReturnURL）
payments.post('/ecpay/notify', async (c) => {
  const cfg = cfgOf(c)
  const p = await verified(c, cfg)
  if (!p) return c.text('0|CheckMacValue Error', 400)
  await onPaid(c, cfg, p)
  return c.text('1|OK')
})

// 伺服器對伺服器：ATM 取號、無卡分期申請（PaymentInfoURL）
payments.post('/ecpay/info', async (c) => {
  const p = await verified(c, cfgOf(c))
  if (!p) return c.text('0|CheckMacValue Error', 400)
  await onInfo(c, p)
  return c.text('1|OK')
})

// 瀏覽器回站：信用卡付款後（OrderResultURL）、ATM 取號後（ClientRedirectURL）。
// 和伺服器通知誰先到不一定，兩邊都處理（重複的會略過），處理完導到完成頁。
payments.post('/ecpay/result', async (c) => {
  const cfg = cfgOf(c)
  const p = await verified(c, cfg)
  if (!p) return c.redirect('/account?tab=orders', 303)
  if (p.RtnCode === '1') await onPaid(c, cfg, p)
  else await onInfo(c, p)
  return c.redirect(done(orderNoOf(p.MerchantTradeNo)), 303)
})
