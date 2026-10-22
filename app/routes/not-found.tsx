import { Link } from 'react-router'

import { SiteFooter } from '~/components/store/site-footer'
import { SiteHeader } from '~/components/store/site-header'
import { PageTitle } from '~/components/store/typography'

export const meta = () => [{ title: '找不到頁面｜AndelNI' }]

export function loader() {
  throw new Response('Not Found', { status: 404 })
}

export function ErrorBoundary() {
  return (
    <div className='flex min-h-svh flex-col'>
      <SiteHeader variant='minimal' />
      <main className='container-page flex-1 py-16'>
        <PageTitle>找不到頁面</PageTitle>
        <p className='mt-4 text-[15px] leading-relaxed'>
          這個頁面不存在，或商品已下架。
        </p>
        <Link
          className='mt-8 inline-block border-b border-line pb-0.5 text-sm'
          to='/'
        >
          回到商店 →
        </Link>
      </main>
      <SiteFooter variant='minimal' />
    </div>
  )
}

export default function NotFound() {
  return null
}
