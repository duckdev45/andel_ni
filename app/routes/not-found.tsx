import type { Route } from './+types/not-found'

import { NotFound } from '~/components/store/not-found'

// 掛在商店 layout 底下：保留完整頁首、頁尾，迷路的人還能繼續逛
export const meta: Route.MetaFunction = () => [
  { title: '找不到頁面｜AndelNI' },
  { name: 'robots', content: 'noindex' },
]

// 回真正的 404 狀態碼（規格 5.3）
export function loader() {
  throw new Response('Not Found', { status: 404 })
}

export function ErrorBoundary() {
  return <NotFound />
}

export default function NotFoundRoute() {
  return null
}
