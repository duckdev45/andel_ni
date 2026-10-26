import assert from 'node:assert/strict'
import { test } from 'node:test'

import { checkMac, ecpayConfig, verifyMac } from './ecpay.ts'

const stage = ecpayConfig({ ECPAY_MODE: 'stage' }, false)

// 綠界文件的範例（https://developers.ecpay.com.tw/2902/）
const example = {
  TradeDesc: '促銷方案',
  PaymentType: 'aio',
  MerchantTradeDate: '2023/03/12 15:30:23',
  MerchantTradeNo: 'ecpay20230312153023',
  MerchantID: '3002607',
  ReturnURL: 'https://www.ecpay.com.tw/receive.php',
  ItemName: 'Apple iphone 15',
  TotalAmount: '30000',
  ChoosePayment: 'ALL',
  EncryptType: '1',
}

test('checkMac：與綠界文件範例相同', async () => {
  assert.equal(
    await checkMac(example, stage),
    '6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840'
  )
})

test('verifyMac：竄改金額就不通過', async () => {
  const signed = { ...example, CheckMacValue: await checkMac(example, stage) }
  assert.equal(await verifyMac(signed, stage), true)
  assert.equal(await verifyMac({ ...signed, TotalAmount: '1' }, stage), false)
  assert.equal(await verifyMac(example, stage), false)
})

test('ecpayConfig：正式站缺金鑰直接失敗，不會用測試特店', () => {
  assert.throws(() => ecpayConfig({}, false))
  assert.equal(ecpayConfig({}, true).stage, true)
  const prod = ecpayConfig(
    { ECPAY_MERCHANT_ID: 'm', ECPAY_HASH_KEY: 'k', ECPAY_HASH_IV: 'v' },
    false
  )
  assert.equal(prod.stage, false)
  assert.match(prod.url, /^https:\/\/payment\.ecpay/)
})
