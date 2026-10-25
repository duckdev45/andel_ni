import { Hono } from 'hono'

import {
  getProductByCode,
  listProducts,
} from '../../app/lib/db/products.server'
import { admin } from './admin'
import { auth } from './auth'
import { cart } from './cart'
import { orders } from './orders'

// /api/*：Hono（規格 D3）。後台 API（/api/admin/*）會先經過 workers/auth/admin.ts 的檢查。
export const api = new Hono<{ Bindings: Env }>().basePath('/api')

api.get('/health', (c) => c.json({ ok: true }))

api.get('/products', async (c) => c.json(await listProducts(c.env.DB)))

api.get('/products/:code', async (c) => {
  const product = await getProductByCode(
    c.env.DB,
    c.req.param('code').toUpperCase()
  )
  return product ? c.json(product) : c.json({ error: 'Not Found' }, 404)
})

api.route('/admin', admin)
api.route('/auth', auth)
api.route('/cart', cart)
api.route('/orders', orders)

api.notFound((c) => c.json({ error: 'Not Found' }, 404))

api.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})
