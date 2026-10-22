import { Link } from 'react-router'

import { Button } from '~/components/ui/button'
import { SITE } from '~/lib/seo'

export function SiteFooter({
  variant = 'full',
}: {
  variant?: 'full' | 'minimal'
}) {
  if (variant === 'minimal') {
    return (
      <footer className='border-t border-line'>
        <div className='container-page flex flex-wrap justify-between gap-2 py-5 font-mono text-xs text-muted-foreground'>
          <span>© 2026 AndelNI</span>
          <span>
            <Link to='/policy/returns'>退換貨政策</Link>
            ・我們不會打電話要求你操作 ATM
          </span>
        </div>
      </footer>
    )
  }

  return (
    <footer id='contact'>
      <div className='container-page pt-14'>
        <div className='flex flex-wrap justify-between gap-10'>
          <form
            className='flex max-w-[560px] flex-[1_1_420px] flex-col gap-3'
            onSubmit={(e) => e.preventDefault()}
          >
            <label className='text-xl font-bold' htmlFor='nl'>
              新品上架時通知我
            </label>
            <div className='flex border border-line'>
              <input
                id='nl'
                type='email'
                className='min-h-13 min-w-0 flex-1 bg-transparent px-4 font-mono text-sm outline-none'
                placeholder='you@example.com'
              />
              <Button type='submit' className='h-auto px-5.5'>
                訂閱
              </Button>
            </div>
          </form>
          <nav
            className='grid flex-[1_1_420px] grid-cols-3 gap-6 text-sm'
            aria-label='頁尾'
          >
            <FooterCol
              links={[
                ['/#index', '本季選物'],
                ['/#cats', '分類'],
                ['/#brands', '品牌'],
              ]}
              title='選購'
            />
            <FooterCol
              links={[
                ['/account?tab=orders', '追蹤訂單'],
                ['/#about', '運送與付款'],
                ['/policy/returns', '退換貨政策'],
                ['#contact', '聯絡我們'],
              ]}
              title='服務'
            />
            <FooterCol
              links={[
                ['/#about', 'AndelNI'],
                [SITE.instagram, `Instagram ${SITE.instagramHandle}`],
                ['#line', 'LINE 官方帳號'],
              ]}
              title='關於'
            />
          </nav>
        </div>
        <div
          className='mt-14 overflow-hidden border-t border-line pt-3 font-wordmark text-[clamp(72px,17vw,260px)] leading-[0.9] font-medium tracking-[0.01em] whitespace-nowrap'
          aria-hidden='true'
        >
          ANDEL NI<span className='text-brand'>.</span>
        </div>
        <div className='flex flex-wrap justify-between gap-2 pt-4 pb-6 font-mono text-xs text-muted-foreground'>
          <span>© 2026 AndelNI・我們不會打電話要求你操作 ATM</span>
          <span>隱私權政策・服務條款</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: [string, string][]
}) {
  return (
    <div className='flex flex-col gap-2.5'>
      <span className='font-mono text-xs text-muted-foreground'>{title}</span>
      {links.map(([to, label]) =>
        to.startsWith('http') ? (
          <a key={label} href={to} rel='noopener noreferrer' target='_blank'>
            {label}
          </a>
        ) : (
          <Link key={label} to={to}>
            {label}
          </Link>
        )
      )}
    </div>
  )
}
