import assert from 'node:assert/strict'
import { test } from 'node:test'

import { assignSkus, parseProductInput, skuPrefix } from './admin-input.ts'

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
  assert.ok(bad({ cat: 'car' }))
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
