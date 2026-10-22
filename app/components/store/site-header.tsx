import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react'
import { Link } from 'react-router'

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { useCart } from '~/lib/cart'
import { cn } from '~/lib/utils'

export const MAIN_NAV = [
  { to: '/#index', label: '本季選物' },
  { to: '/#cats', label: '分類' },
  { to: '/#brands', label: '品牌' },
  { to: '/#about', label: '關於' },
]

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      className={cn('flex items-center gap-3.5', className)}
      aria-label='AndelNI 首頁'
      to='/'
    >
      <span
        className='block h-[26px] w-[34px] bg-brand logo-mark sm:h-8 sm:w-[42px]'
        aria-hidden='true'
      />
      <span className='font-wordmark text-[22px] leading-none font-semibold tracking-[0.24em]'>
        ANDEL NI
      </span>
    </Link>
  )
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className='py-3 hover:text-brand' to={to}>
      <span className='mr-1.5 text-brand'>+</span>
      {label}
    </Link>
  )
}

export function TopBar() {
  return (
    <div className='border-b border-border bg-inverse font-mono text-[11px] tracking-[0.04em] text-inverse-foreground sm:text-xs'>
      <div className='container-page flex flex-wrap justify-center gap-x-8 gap-y-2 py-2 sm:justify-between'>
        <span className='hidden sm:inline'>2026 秋季選品・持續更新</span>
        <span>滿 NT$2,000 免運・超商 NT$60</span>
        <span className='hidden gap-5 sm:flex'>
          <Link to='/account?tab=orders'>追蹤訂單</Link>
          <a href='#contact'>客服</a>
        </span>
      </div>
    </div>
  )
}

/**
 * full：首頁、商品頁（sticky，含主選單與圖示列）
 * minimal：購物車、結帳、會員、政策頁（不 sticky，只留回到商店與購物車）
 */
export function SiteHeader({
  variant = 'full',
}: {
  variant?: 'full' | 'minimal'
}) {
  const { count, wish } = useCart()

  if (variant === 'minimal') {
    return (
      <header className='border-b border-line bg-background'>
        <div className='container-page flex min-h-[76px] flex-wrap items-center justify-between gap-x-8 gap-y-3 py-2'>
          <Logo />
          <nav
            className='flex flex-wrap gap-x-7 gap-y-1 text-sm'
            aria-label='說明'
          >
            <NavLink label='回到商店' to='/' />
            <NavLink label={`購物車 ${count}`} to='/cart' />
            <NavLink label='會員中心' to='/account' />
          </nav>
        </div>
      </header>
    )
  }

  return (
    <header className='sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur-md'>
      <div className='container-page flex h-[60px] items-center justify-between gap-8 pr-1 lg:h-[76px] lg:pr-10'>
        <Logo />
        <nav className='hidden gap-7 text-sm lg:flex' aria-label='主選單'>
          {MAIN_NAV.map((n) => (
            <NavLink key={n.to} {...n} />
          ))}
        </nav>
        <div className='flex items-center'>
          <button
            type='button'
            className='grid size-11 place-items-center'
            aria-label='搜尋'
          >
            <Search className='size-5' aria-hidden strokeWidth={1.6} />
          </button>
          <Link
            className='hidden size-11 place-items-center sm:grid'
            aria-label='會員中心'
            to='/account'
          >
            <User className='size-5' aria-hidden strokeWidth={1.6} />
          </Link>
          <Link
            className='hidden size-11 place-items-center sm:grid'
            aria-label={`收藏 ${wish.length} 件`}
            to='/account?tab=wish'
          >
            <Heart className='size-5' aria-hidden strokeWidth={1.6} />
          </Link>
          {/* 桌機：墨黑購物車按鈕；手機：圖示＋紅點 */}
          <Link
            className='ml-2 hidden h-11 items-center gap-2.5 border border-line bg-primary px-4 font-mono text-[13px] text-primary-foreground sm:flex'
            aria-label={`購物車 ${count} 件`}
            to='/cart'
          >
            <span>購物車</span>
            <span className='grid h-[22px] min-w-[22px] place-items-center rounded-full bg-brand px-1.5 text-xs text-brand-foreground'>
              {count}
            </span>
          </Link>
          <Link
            className='relative grid size-11 place-items-center sm:hidden'
            aria-label={`購物車 ${count} 件`}
            to='/cart'
          >
            <ShoppingBag className='size-5' aria-hidden strokeWidth={1.6} />
            <span className='absolute top-1.5 right-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand font-mono text-[10.5px] text-brand-foreground'>
              {count}
            </span>
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type='button'
          className='grid size-11 place-items-center lg:hidden'
          aria-label='選單'
        >
          <Menu className='size-5' aria-hidden strokeWidth={1.6} />
        </button>
      </SheetTrigger>
      <SheetContent
        className='w-[86vw] max-w-sm gap-0 bg-background p-0'
        side='right'
      >
        <SheetTitle className='border-b border-line px-5 py-5 text-lg font-black'>
          選單
        </SheetTitle>
        <nav className='flex flex-col' aria-label='手機選單'>
          {[
            ...MAIN_NAV,
            { to: '/account', label: '會員中心' },
            { to: '/cart', label: '購物車' },
            { to: '/policy/returns', label: '退換貨政策' },
          ].map((n) => (
            <Link
              key={n.to}
              className='flex min-h-14 items-center border-b border-border px-5 text-base'
              to={n.to}
            >
              <span className='mr-2 text-brand'>+</span>
              {n.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
