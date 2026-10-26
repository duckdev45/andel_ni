import { createRequestHandler, RouterContextProvider } from 'react-router'

import { cloudflareContext } from '../app/lib/context'
import { expireOrders } from '../app/lib/db/orders.server'
import { ADMIN_CLOSED_HEADER, isIndexableHost } from '../app/lib/seo'
import { api } from './api'
import { type AdminEnv, handleAdmin, isAdminPath } from './auth/admin'

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE
)

// 商品照片（R2）：本機開發用；正式與 staging 的照片走 R2 自訂網域（app/lib/images.ts）
async function image(env: Env, key: string) {
  const obj = await env.IMAGES.get(key)
  if (!obj) return new Response('Not Found', { status: 404 })
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('ETag', obj.httpEtag)
  return new Response(obj.body, { headers })
}

async function route(request: Request, env: Env, ctx: ExecutionContext) {
  const handled = await handleAdmin(
    request,
    env as Env & AdminEnv,
    import.meta.env.DEV
  )
  const url = new URL(request.url)
  // 後台未開放（404）：頁面請求改顯示網站的 404 頁，API 維持純文字
  const notFoundPage =
    handled?.status === 404 &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.endsWith('.data')
  if (handled && !notFoundPage) return handled

  if (url.pathname.startsWith('/api/')) return api.fetch(request, env, ctx)
  if (url.pathname.startsWith('/img/')) return image(env, url.pathname.slice(5))

  let routed: Request = request
  if (notFoundPage) {
    // 同一個網址交給 React Router，由後台 layout 的 loader 丟 404（見 ADMIN_CLOSED_HEADER）
    routed = new Request(request)
    routed.headers.set(ADMIN_CLOSED_HEADER, '1')
  }
  const context = new RouterContextProvider()
  context.set(cloudflareContext, { env, ctx })
  return requestHandler(routed, context)
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    // www 統一轉到主網域，避免同一頁有兩個網址
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4)
      return Response.redirect(url.toString(), 301)
    }
    const response = await route(request, env, ctx)
    const admin = isAdminPath(url.pathname)
    if (!admin && isIndexableHost(url)) return response

    const headers = new Headers(response.headers)
    // 預覽站（workers.dev、staging、本機）與後台：不讓搜尋引擎收錄
    headers.set('X-Robots-Tag', 'noindex, nofollow')
    // 後台：不讓瀏覽器或 CDN 快取
    if (admin) headers.set('Cache-Control', 'no-store')
    return new Response(response.body, { status: response.status, headers })
  },
  // 排程（wrangler.jsonc triggers.crons）：逾時未付款的訂單自動取消、放回庫存
  async scheduled(_controller, env) {
    const r = await expireOrders(env.DB)
    if (r.cancelled) console.log('逾時取消訂單', r)
  },
} satisfies ExportedHandler<Env>
