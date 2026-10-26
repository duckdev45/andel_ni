import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  assignSkus,
  CATEGORY_SLUG,
  parseBrandInput,
  parseCategoryInput,
  parseLedgerSettings,
  parseProductInput,
  parsePurchaseInput,
  skuPrefix,
} from './admin-input.ts'

const base = {
  name: ' Saint-Sulpice 卡夾 ',
  brand: 'GOYARD',
  cat: 'slg',
  price: 12800,
  type: '現貨',
  active: true,
  isNew: false,
  description: '',
  images: ['products/0b9f2c1e-8a4d-4c3b-9e7f-1a2b3c4d5e6f.webp', '/p/a.jpg'],
  stock: 2,
  variants: null,
}

test('parseProductInput：合法輸入會修剪文字', () => {
  const r = parseProductInput(base)
  assert.ok('value' in r)
  assert.equal(r.value.name, 'Saint-Sulpice 卡夾')
  assert.equal(r.value.stock, 2)
})

test('parseProductInput：擋下不合法的欄位', () => {
  const bad = (patch: object) =>
    'error' in parseProductInput({ ...base, ...patch })
  assert.ok(bad({ name: ' ' }))
  assert.ok(bad({ price: 0 }))
  assert.ok(bad({ price: 1.5 }))
  assert.ok(bad({ cat: 'Bag!' }))
  assert.ok(bad({ cat: 7 }))
  assert.ok(bad({ type: '預購' }))
  assert.ok(bad({ images: ['https://evil.example/x.webp'] }))
  assert.ok(bad({ images: ['products/../secret.webp'] }))
  assert.ok(bad({ stock: -1 }))
  assert.ok(bad({ variants: { name: '顏色', options: [] } }))
  assert.ok(
    bad({
      variants: {
        name: '顏色',
        options: [
          { label: '黑', stock: 1 },
          { label: '黑 ', stock: 1 },
        ],
      },
    })
  )
  assert.ok('error' in parseProductInput(null))
})

test('skuPrefix 與 assignSkus：沿用舊 SKU，新選項接最大流水號', () => {
  const prefix = skuPrefix('Maison Margiela', 'slg', 'AN0016')
  assert.equal(prefix, 'MAI-SLG-AN0016')
  assert.equal(skuPrefix('無印良品', 'home', 'AN0001'), 'XXX-HOME-AN0001')
  const skus = assignSkus(
    prefix,
    ['黑', '白', '紅'],
    [
      { label: '黑', sku: 'GOY-SLG-STSULPICE-BLK' },
      { label: '藍', sku: `${prefix}-03` },
    ]
  )
  assert.deepEqual(skus, [
    'GOY-SLG-STSULPICE-BLK',
    `${prefix}-04`,
    `${prefix}-05`,
  ])
})

const purchase = {
  pid: 'p04',
  opt: '黑色',
  date: '2026-10-25',
  qty: 3,
  cur: 'EUR',
  unit: 95,
  rate: 35.6,
  fx: 1.5,
  note: ' 三色 ',
  toStock: true,
}

test('parsePurchaseInput：合法輸入、擋掉數量與日期錯誤', () => {
  const r = parsePurchaseInput(purchase)
  assert.ok('value' in r)
  assert.equal(r.value.note, '三色')
  assert.ok('error' in parsePurchaseInput({ ...purchase, qty: 0 }))
  assert.ok('error' in parsePurchaseInput({ ...purchase, qty: 1.5 }))
  assert.ok('error' in parsePurchaseInput({ ...purchase, date: '10/25' }))
  assert.ok('error' in parsePurchaseInput({ ...purchase, cur: 'BTC' }))
})

const ledger = {
  payFee: {
    card: { pct: 2.8, fixed: 0 },
    apple: { pct: 2.8, fixed: 0 },
    atm: { pct: 1, fixed: 0 },
    bnpl: { pct: 0, fixed: 0 },
  },
  pack: 45,
  shipCost: { '711': 60, family: 60, home: 110 },
  cardFx: 1.5,
  rates: { EUR: 35.6, GBP: 41.5, JPY: 0.213, USD: 32.1, TWD: 1 },
}

test('parseLedgerSettings：合法通過、多餘欄位丟掉、缺欄位或負數擋下', () => {
  assert.deepEqual(parseLedgerSettings({ ...ledger, evil: 1 }), ledger)
  assert.equal(parseLedgerSettings({ ...ledger, pack: -1 }), null)
  assert.equal(
    parseLedgerSettings({ ...ledger, rates: { ...ledger.rates, JPY: 0 } }),
    null
  )
  const { atm: _, ...noAtm } = ledger.payFee
  assert.equal(parseLedgerSettings({ ...ledger, payFee: noAtm }), null)
})

test('分類代碼、分類與品牌輸入', () => {
  assert.ok(CATEGORY_SLUG.test('home'))
  assert.ok(CATEGORY_SLUG.test('bag2'))
  for (const bad of ['b', 'Bag', '2bag', 'bag-x', 'abcdefghijklm'])
    assert.ok(!CATEGORY_SLUG.test(bad), bad)

  const c = parseCategoryInput({ name: ' 家飾 ', en: 'Home', comingSoon: true })
  assert.deepEqual(c, {
    value: { name: '家飾', en: 'Home', comingSoon: true, active: true },
  })
  assert.ok('error' in parseCategoryInput({ name: '', en: 'Home' }))

  const brand = { name: ' GOYARD ', origin: '法國', blurb: '', currency: 'EUR' }
  const b = parseBrandInput(brand)
  assert.ok('value' in b && b.value.name === 'GOYARD')
  assert.ok('error' in parseBrandInput({ ...brand, currency: 'CNY' }))
  assert.ok('error' in parseBrandInput({ ...brand, blurb: 'x'.repeat(301) }))
})
