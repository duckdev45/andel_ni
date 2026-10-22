import type { Route } from './+types/layout'

import {
  BookOpenText,
  ChartColumn,
  LayoutGrid,
  LogOut,
  Package,
  Plus,
  ReceiptText,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { AdminSheet } from '~/components/admin/admin-sheet'
import { AdminProvider, useAdmin } from '~/components/admin/admin-store'
import { NotFound } from '~/components/store/not-found'
import { SiteFooter } from '~/components/store/site-footer'
import { SiteHeader, TopBar } from '~/components/store/site-header'
import { ADMIN_CLOSED_HEADER } from '~/lib/seo'
import { cn } from '~/lib/utils'

// 存取保護在 Worker 層（workers/auth/admin.ts），見 docs/後台存取保護.md。

export const meta: Route.MetaFunction = ({ error }) => [
  { title: error ? '找不到頁面｜AndelNI' : '後台｜AndelNI' },
  { name: 'robots', content: 'noindex' },
]

// 讓前台用連結切進後台時也會向伺服器發資料請求，經過 Worker 的密碼檢查。
// Worker 判定後台未開放時帶上標頭：回 404，對外看起來就是不存在的頁面。
export function loader({ request }: Route.LoaderArgs) {
  if (request.headers.has(ADMIN_CLOSED_HEADER)) {
    throw new Response('Not Found', { status: 404 })
  }
  return null
}

export function ErrorBoundary() {
  return (
    <>
      <TopBar />
      <SiteHeader />
      <NotFound />
      <SiteFooter />
    </>
  )
}

const NAV = [
  { to: '/admin', label: '總覽', title: '總覽', icon: LayoutGrid },
  { to: '/admin/orders', label: '訂單', title: '訂單管理', icon: ReceiptText },
  { to: '/admin/products', label: '商品', title: '商品管理', icon: Package },
  { to: '/admin/stock', label: '庫存', title: '庫存管理', icon: ChartColumn },
  { to: '/admin/ledger', label: '記帳簿', title: '記帳簿', icon: BookOpenText },
]

export default function AdminLayout() {
  return (
    <AdminProvider>
      <Shell />
      <AdminSheet />
    </AdminProvider>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const { orders, openSheet } = useAdmin()
  const toShip = orders.filter((o) => o.status === 'to_ship').length
  const path = pathname.replace(/\/$/, '') || '/admin'
  const current = NAV.find((n) => n.to === path) ?? NAV[0]

  const action =
    path === '/admin/products'
      ? {
          label: '上架商品',
          run: () => openSheet({ type: 'product', id: null }),
        }
      : path === '/admin/stock' || path === '/admin/ledger'
        ? {
            label: '新增進貨',
            run: () => openSheet({ type: 'purchase', pid: null, opt: null }),
          }
        : null

  return (
    <div className='flex min-h-dvh bg-background'>
      {/* 桌機側欄 */}
      <aside className='hidden w-56 flex-none border-r border-border bg-[#FBFBF9] lg:block'>
        <div className='sticky top-0 flex h-dvh flex-col px-3.5 pt-6 pb-5'>
          <Link className='flex items-center gap-2.5 px-2.5 pb-7' to='/admin'>
            <img
              className='h-[30px] w-auto'
              src='/images/logo-mark.png'
              alt=''
            />
            <span className='flex flex-col gap-0.5'>
              <span className='font-wordmark text-[19px] leading-none font-semibold tracking-[0.22em]'>
                ANDEL NI
              </span>
              <span className='font-mono text-[11px] tracking-[0.04em] text-muted-foreground'>
                ADMIN — 商店後台
              </span>
            </span>
          </Link>
          <nav className='flex flex-col gap-0.5' aria-label='後台'>
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                className={({ isActive }) =>
                  cn(
                    'flex h-[42px] items-center gap-3 px-3 text-sm',
                    isActive
                      ? 'bg-foreground text-background'
                      : 'text-[#45453F] hover:bg-muted'
                  )
                }
                end
                to={n.to}
              >
                <n.icon
                  className='size-[19px]'
                  strokeWidth={1.6}
                  aria-hidden='true'
                />
                <span className='flex-1'>{n.label}</span>
                {n.to === '/admin/orders' && toShip > 0 && (
                  <span className='grid h-5 min-w-5 place-items-center bg-brand px-1.5 font-mono text-[11px] text-brand-foreground'>
                    {toShip}
                    <span className='sr-only'> 筆待出貨</span>
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <Link
            className='mt-auto border-t border-border px-3 pt-3.5 text-[13px] text-muted-foreground hover:text-brand'
            to='/'
          >
            查看前台商店 ↗
          </Link>
          <LogoutButton className='mt-1 flex min-h-11 w-full items-center gap-2 px-2.5 text-[13px] text-muted-foreground hover:text-foreground' />
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='sticky top-0 z-20 flex h-[58px] flex-none items-center justify-between gap-3 border-b border-border bg-[#FBFBF9] pr-3 pl-4 lg:h-[72px] lg:bg-background lg:px-10'>
          <div className='flex items-center gap-2.5'>
            <img
              className='h-[22px] w-auto lg:hidden'
              src='/images/logo-mark.png'
              alt='AndelNI'
            />
            <h1 className='text-[17px] font-black tracking-[-0.01em] whitespace-nowrap lg:text-[22px]'>
              {current.title}
            </h1>
          </div>
          <LogoutButton
            className='ml-auto grid size-11 place-items-center lg:hidden'
            iconOnly
          />
          {action && (
            <button
              type='button'
              className='flex h-11 flex-none items-center gap-1.5 bg-brand pr-4 pl-3 text-[13.5px] text-brand-foreground hover:bg-brand/90 lg:h-10'
              onClick={action.run}
            >
              <Plus className='size-4' strokeWidth={1.8} aria-hidden='true' />
              {action.label}
            </button>
          )}
        </header>

        <main className='flex w-full max-w-[1180px] flex-col gap-4 px-4 pt-4 pb-[calc(66px+28px+env(safe-area-inset-bottom))] lg:gap-5 lg:px-10 lg:pt-7 lg:pb-12'>
          <Outlet />
        </main>
      </div>

      {/* 手機底部分頁 */}
      <nav
        className='fixed inset-x-0 bottom-0 z-30 grid h-[calc(66px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-border bg-[#FBFBF9] pb-[calc(6px+env(safe-area-inset-bottom))] lg:hidden'
        aria-label='後台'
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center gap-[3px] text-[11px]',
                isActive ? 'text-brand' : 'text-muted-foreground'
              )
            }
            end
            to={n.to}
          >
            <n.icon
              className='size-[22px]'
              strokeWidth={1.6}
              aria-hidden='true'
            />
            <span>{n.label}</span>
            {n.to === '/admin/orders' && toShip > 0 && (
              <span className='absolute top-[7px] left-[calc(50%+6px)] grid h-[17px] min-w-[17px] place-items-center bg-brand px-1 font-mono text-[10px] text-brand-foreground'>
                {toShip}
                <span className='sr-only'> 筆待出貨</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

async function logout() {
  await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => null)
  window.location.assign('/admin/login')
}

function LogoutButton({
  className,
  iconOnly,
}: {
  className?: string
  iconOnly?: boolean
}) {
  return (
    <button
      type='button'
      className={className}
      aria-label={iconOnly ? '登出' : undefined}
      onClick={logout}
    >
      <LogOut className='size-4' aria-hidden strokeWidth={1.6} />
      {!iconOnly && '登出'}
    </button>
  )
}
