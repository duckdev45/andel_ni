import { createRequestHandler } from 'react-router'

import { isIndexableHost } from '../app/lib/seo'
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
    if (handled) return handled

    const response = await requestHandler(request)
    const url = new URL(request.url)
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
