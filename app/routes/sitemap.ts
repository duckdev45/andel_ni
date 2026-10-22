import type { Route } from './+types/sitemap'

import { productPath } from '~/lib/catalog'
import { dbFrom } from '~/lib/context'
import { listProducts } from '~/lib/db/products.server'
import { siteOrigin } from '~/lib/seo'

// 規格 5.3：sitemap.xml。只列公開、可收錄的頁面；完售商品保留（保留搜尋流量，規格 5.1）。
export async function loader({ context, request }: Route.LoaderArgs) {
  const origin = siteOrigin(request)
  const PRODUCTS = await listProducts(dbFrom(context))
  const latest = PRODUCTS.map((p) => p.createdAt)
    .sort()
    .at(-1)
  const urls = [
    { loc: '/', lastmod: latest },
    { loc: '/policy/returns' },
    ...PRODUCTS.map((p) => ({
      loc: productPath(p),
      lastmod: p.createdAt,
    })),
  ]
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${origin}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`
  )
  .join('\n')}
</urlset>
`
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
