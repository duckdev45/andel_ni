import { createRequestHandler } from 'react-router'

import { isIndexableHost } from '../app/lib/seo'
import { ADMIN_CLOSED_HEADER } from '../app/lib/seo'
import { type AdminEnv, handleAdmin, isAdminPath } from './auth/admin'

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE
)

export default {
  async fetch(request, env) {
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

    let routed: Request = request
    if (notFoundPage) {
      // 同一個網址交給 React Router，由後台 layout 的 loader 丟 404（見 ADMIN_CLOSED_HEADER）
      routed = new Request(request)
      routed.headers.set(ADMIN_CLOSED_HEADER, '1')
    }
    const response = await requestHandler(routed)
    const admin = isAdminPath(url.pathname)
    if (!admin && isIndexableHost(url)) return response

    const headers = new Headers(response.headers)
    // 預覽站（workers.dev、staging、本機）與後台：不讓搜尋引擎收錄
    headers.set('X-Robots-Tag', 'noindex, nofollow')
    // 後台：不讓瀏覽器或 CDN 快取
    if (admin) headers.set('Cache-Control', 'no-store')
    return new Response(response.body, { status: response.status, headers })
  },
} satisfies ExportedHandler<Env>
