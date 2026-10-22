import type { MetaDescriptor } from 'react-router'

// 規格 5.3：分享預覽與 SEO。

export const SITE = {
  name: 'AndelNI',
  alternateName: 'Andel Niña',
  description:
    '包包、小皮件、飾品、服裝與鞋履，每一件都標清楚品牌、規格與尺寸，像一本可以直接下單的型錄。',
  instagram: 'https://www.instagram.com/andel__ni/',
  instagramHandle: '@andel__ni',
  locale: 'zh_TW',
}

/**
 * 正式網址：掛上自有網域後，在建置環境設 VITE_SITE_URL（例如 https://andelni.com）。
 * 沒設時用請求的網址，canonical 仍是完整網址。
 */
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(
  /\/$/,
  ''
)

export const siteOrigin = (request: Request) =>
  SITE_URL || new URL(request.url).origin

/**
 * 只有正式網域可被搜尋引擎收錄；workers.dev、staging、本機一律 noindex，
 * 避免預覽站的假資料或重複內容被收錄。
 */
export const isIndexableHost = (url: URL) =>
  !!SITE_URL && new URL(SITE_URL).host === url.host

/** 從 root loader 取正式網址，給各路由的 meta 用 */
export const originFrom = (matches: readonly unknown[]) =>
  (matches[0] as { loaderData?: { origin?: string } } | undefined)?.loaderData
    ?.origin ?? ''

type SeoInput = {
  origin: string
  path: string
  title: string
  description?: string
  image?: string
  imageAlt?: string
  type?: 'product' | 'website'
}

/** title、description、canonical、Open Graph、Twitter card 一次產生 */
export function seoMeta({
  origin,
  path,
  title,
  description = SITE.description,
  image = '/images/hero.jpg',
  imageAlt = title,
  type = 'website',
}: SeoInput): MetaDescriptor[] {
  const url = origin + path
  const imageUrl = image.startsWith('http') ? image : origin + image
  const fullTitle = path === '/' ? title : `${title}｜${SITE.name}`
  return [
    { title: fullTitle },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:site_name', content: SITE.name },
    { property: 'og:locale', content: SITE.locale },
    { property: 'og:type', content: type },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:alt', content: imageAlt },
    { name: 'twitter:card', content: 'summary_large_image' },
  ]
}

/** 購物車、結帳、會員等私人頁：不收錄 */
export const privateMeta = (title: string): MetaDescriptor[] => [
  { title: `${title}｜${SITE.name}` },
  { name: 'robots', content: 'noindex, nofollow' },
]

/** Worker 判定後台未開放時帶給 React Router 的標頭；後台 layout 看到就回 404 頁 */
export const ADMIN_CLOSED_HEADER = 'X-AndelNI-Admin-Closed'
