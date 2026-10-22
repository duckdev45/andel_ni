import type { Route } from './+types/robots'

import { isIndexableHost, siteOrigin } from '~/lib/seo'

// 正式網域：開放收錄、擋私人頁；預覽站（workers.dev、staging、本機）：全部擋。
export function loader({ request }: Route.LoaderArgs) {
  const body = isIndexableHost(new URL(request.url))
    ? `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /login
Disallow: /register
Disallow: /forgot-password

Sitemap: ${siteOrigin(request)}/sitemap.xml
`
    : `User-agent: *
Disallow: /
`
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
