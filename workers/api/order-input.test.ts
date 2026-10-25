import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseOrderInput, priceOrder, type VariantRow } from './order-input.ts'

const row = (patch: Partial<VariantRow>): VariantRow => ({
  product_id: 12,
  option_label: null,
  variant_id: 100,
  sku: 'JAC-ACC-CAP',
  stock: 3,
  price: 1200,
  type: '現貨',
  status: 'active',
  name: '棒球帽',
  brand: 'JACQUEMUS',
  ...patch,
})

const input = {
  lines: [{ productId: 'p12', qty: 1 }],
  name: '王小安',
  phone: '0912-345-678',
  ship: '711',
  store: { id: '123456', name: '民生門市', address: '台北市' },
  address: '',
  pay: 'card',
  note: '',
  consent: false,
}

test('parseOrderInput：整理手機、檢查必填', () => {
  const r = parseOrderInput(input)
  assert.ok('value' in r)
  assert.equal(r.value.phone, '0912345678')
  const bad = (patch: object) =>
    'error' in parseOrderInput({ ...input, ...patch })
  assert.ok(bad({ lines: [] }))
  assert.ok(bad({ lines: [{ productId: '12', qty: 1 }] }))
  assert.ok(bad({ lines: [{ productId: 'p12', qty: 0 }] }))
  assert.ok(bad({ ship: 'home', address: ' ' }))
  assert.ok(bad({ store: null }))
  assert.ok(bad({ pay: 'cash' }))
  assert.ok(bad({ phone: '12345' }))
})

test('priceOrder：用資料庫價格計價，未滿 2000 收運費', () => {
  const r = priceOrder([{ productId: 'p12', qty: 2 }], [row({})], '711')
  assert.ok('items' in r)
  assert.deepEqual([r.subtotal, r.fee, r.total], [2400, 0, 2400])
  const one = priceOrder([{ productId: 'p12', qty: 1 }], [row({})], 'home')
  assert.ok('items' in one)
  assert.deepEqual([one.subtotal, one.fee, one.total], [1200, 100, 1300])
})

test('priceOrder：庫存不足、已下架、客訂上限都擋下', () => {
  const err = (lines: object[], rows: VariantRow[]) =>
    'error' in priceOrder(lines as never, rows, '711')
  assert.ok(err([{ productId: 'p12', qty: 4 }], [row({})]))
  assert.ok(err([{ productId: 'p12', qty: 1 }], [row({ stock: 0 })]))
  assert.ok(err([{ productId: 'p12', qty: 1 }], [row({ status: 'inactive' })]))
  assert.ok(err([{ productId: 'p13', qty: 1 }], [row({})]))
  assert.ok(
    err([{ productId: 'p12', qty: 6 }], [row({ type: '客訂', stock: 0 })])
  )
})

test('priceOrder：部分現貨依規格庫存決定現貨或代購', () => {
  const rows = [
    row({ type: '部分現貨', option_label: '黑', stock: 2, variant_id: 1 }),
    row({ type: '部分現貨', option_label: '白', stock: 0, variant_id: 2 }),
  ]
  const r = priceOrder(
    [
      { productId: 'p12', variant: '黑', qty: 1 },
      { productId: 'p12', variant: '白', qty: 3 },
    ],
    rows,
    '711'
  )
  assert.ok('items' in r)
  assert.deepEqual(
    r.items.map((i) => i.kind),
    ['現貨', '代購']
  )
})
