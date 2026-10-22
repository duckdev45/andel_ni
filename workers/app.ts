import { createRequestHandler } from 'react-router'

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
    if (!isAdminPath(new URL(request.url).pathname)) return response
    // 後台頁面：不讓搜尋引擎收錄、不讓瀏覽器或 CDN 快取
    const headers = new Headers(response.headers)
    headers.set('X-Robots-Tag', 'noindex, nofollow')
    headers.set('Cache-Control', 'no-store')
    return new Response(response.body, { status: response.status, headers })
  },
} satisfies ExportedHandler<Env>
