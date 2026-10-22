import {
  index,
  layout,
  prefix,
  route,
  type RouteConfig,
} from '@react-router/dev/routes'

export default [
  // 前台：完整頁首（首頁、商品頁）
  layout('routes/store-layout.tsx', [
    index('routes/home.tsx'),
    route('products/:handle', 'routes/product.tsx'),
  ]),
  // 前台：精簡頁首（購物車、結帳、會員、政策）
  layout('routes/plain-layout.tsx', [
    route('cart', 'routes/cart.tsx'),
    route('checkout', 'routes/checkout.tsx'),
    route('checkout/done', 'routes/checkout-done.tsx'),
    route('login', 'routes/login.tsx'),
    route('register', 'routes/register.tsx'),
    route('forgot-password', 'routes/forgot-password.tsx'),
    route('account', 'routes/account.tsx'),
    route('policy/returns', 'routes/policy-returns.tsx'),
  ]),
  // 後台（登入頁不套後台 layout；存取檢查在 workers/auth/admin.ts）
  route('admin/login', 'routes/admin/login.tsx'),
  ...prefix('admin', [
    layout('routes/admin/layout.tsx', [
      index('routes/admin/dashboard.tsx'),
      route('orders', 'routes/admin/orders.tsx'),
      route('products', 'routes/admin/products.tsx'),
      route('stock', 'routes/admin/stock.tsx'),
      route('ledger', 'routes/admin/ledger.tsx'),
    ]),
  ]),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route('robots.txt', 'routes/robots.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig
