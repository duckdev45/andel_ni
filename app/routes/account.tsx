import type { Route } from './+types/account'

import { Link, useSearchParams } from 'react-router'

import { Addresses } from '~/components/account/addresses'
import { JoinAside } from '~/components/account/auth-layout'
import { LoginForm } from '~/components/account/login-form'
import { ActiveOrderCard, OrderList, ORDERS } from '~/components/account/orders'
import { AccountSettings } from '~/components/account/settings'
import { ProductCard, ProductGrid } from '~/components/store/product-card'
import { Eyebrow, PageTitle } from '~/components/store/typography'
import { logout, type User, useUser } from '~/lib/auth'
import { useCart } from '~/lib/cart'
import { getProduct } from '~/lib/catalog'
import { isActiveOrder, MOCK_ADDRESSES } from '~/lib/mock/account'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => [{ title: '會員中心｜AndelNI' }]

const TABS = [
  ['overview', '總覽'],
  ['orders', '訂單紀錄'],
  ['wish', '收藏清單'],
  ['address', '收件資訊'],
  ['settings', '帳號設定'],
] as const
type Tab = (typeof TABS)[number][0]

const activeOrders = ORDERS.filter((o) => isActiveOrder(o.status))

export default function Account() {
  const user = useUser()
  return user ? <Member user={user} /> : <LoggedOut />
}

function LoggedOut() {
  return (
    <main className='container-page pb-22'>
      <div className='border-b border-line pt-12 pb-7'>
        <Eyebrow>MEMBER</Eyebrow>
        <PageTitle className='mt-2.5'>登入或註冊</PageTitle>
      </div>
      <div className='flex flex-wrap items-start gap-10 pt-8'>
        <div className='min-w-0 flex-[999_1_480px] sm:max-w-[520px]'>
          <LoginForm />
        </div>
        <JoinAside registerHref='/register?redirect=%2Faccount' />
      </div>
    </main>
  )
}

function Member({ user }: { user: User }) {
  const [params] = useSearchParams()
  const { wish } = useCart()
  const raw = params.get('tab')
  const tab: Tab = TABS.some(([k]) => k === raw) ? (raw as Tab) : 'overview'
  const badges: Partial<Record<Tab, number>> = {
    orders: ORDERS.length,
    wish: wish.length,
  }
  const title = TABS.find(([k]) => k === tab)![1]

  return (
    <main className='container-page pb-22'>
      <div className='flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-b border-line pt-11 pb-7'>
        <div className='flex flex-col gap-2.5'>
          <Eyebrow>MEMBER — 會員中心</Eyebrow>
          <PageTitle className='text-[clamp(34px,4vw,56px)]'>
            {user.name}，你好
          </PageTitle>
        </div>
        <dl className='m-0 grid w-full grid-cols-3 border-t border-line sm:w-auto sm:min-w-[420px]'>
          <Stat label='進行中訂單' value={activeOrders.length} />
          <Stat label='累計訂單' value={ORDERS.length} />
          <Stat brand label='收藏' value={wish.length} />
        </dl>
      </div>

      {!user.emailVerified && (
        <p
          className='m-0 mt-6 flex flex-wrap items-center justify-between gap-3 border border-brand bg-[#FBFBF9] px-[18px] py-3 text-sm'
          role='status'
        >
          <span>你的 Email 尚未驗證，驗證後才能結帳。</span>
          <Link
            className='font-medium text-brand underline underline-offset-4'
            to='/register?step=verify&redirect=%2Faccount'
          >
            輸入驗證碼 →
          </Link>
        </p>
      )}

      <div className='flex flex-col gap-x-10 lg:flex-row lg:items-start'>
        <nav
          className='mt-6 grid shrink-0 grid-cols-3 border-t border-l border-border sm:grid-cols-6 lg:mt-0 lg:flex lg:w-60 lg:flex-col lg:border-0 lg:pt-6'
          aria-label='會員選單'
        >
          {TABS.map(([k, label]) => {
            const on = k === tab
            return (
              <Link
                key={k}
                className={cn(
                  'flex min-h-12 items-center justify-center gap-2 border-r border-b border-border px-3 text-[15px] lg:justify-between lg:border-r-0 lg:px-3.5',
                  on
                    ? 'bg-primary font-bold text-primary-foreground'
                    : 'hover:bg-accent'
                )}
                preventScrollReset
                aria-current={on ? 'page' : undefined}
                to={`?tab=${k}`}
              >
                <span>{label}</span>
                {badges[k] !== undefined && (
                  <span className='font-mono text-xs opacity-80'>
                    {badges[k]}
                  </span>
                )}
              </Link>
            )
          })}
          <button
            type='button'
            className='min-h-12 border-r border-b border-border px-3.5 text-sm text-muted-foreground underline underline-offset-4 lg:border-0 lg:text-left'
            onClick={() => logout()}
          >
            登出
          </button>
        </nav>

        <section
          className='flex min-w-0 flex-1 flex-col gap-8 pt-6'
          aria-labelledby='account-h'
        >
          {tab === 'overview' ? (
            <Overview user={user} wishCount={wish.length} />
          ) : (
            <h2 id='account-h' className='m-0 text-[22px] font-black'>
              {title}
            </h2>
          )}
          {tab === 'orders' && <OrderList orders={ORDERS} />}
          {tab === 'wish' && <Wish ids={wish} />}
          {tab === 'address' && (
            <>
              <p className='-mt-6 mb-0 text-sm text-muted-foreground'>
                結帳時會自動帶入預設的門市與地址。
              </p>
              <Addresses user={user} />
            </>
          )}
          {tab === 'settings' && <AccountSettings user={user} />}
        </section>
      </div>
    </main>
  )
}

function Stat({
  brand,
  label,
  value,
}: {
  brand?: boolean
  label: string
  value: number
}) {
  return (
    <div className='border-r border-border px-4 pt-3 first:pl-0 last:border-r-0 last:pr-0'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd
        className={cn(
          'm-0 mt-1 font-display text-[34px] leading-none font-extrabold [font-stretch:112%]',
          brand && 'text-brand'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function Overview({ user, wishCount }: { user: User; wishCount: number }) {
  const cell =
    'flex flex-col gap-2 border-r border-b border-border p-[18px] text-[15px]'
  const more = 'self-start py-1 text-[13px] underline underline-offset-4'
  return (
    <>
      <div className='flex flex-col gap-3.5'>
        <div className='flex items-baseline justify-between'>
          <h2 id='account-h' className='m-0 text-[22px] font-black'>
            進行中的訂單
          </h2>
          <Link className={more} preventScrollReset to='?tab=orders'>
            全部訂單 →
          </Link>
        </div>
        {activeOrders.map((o) => (
          <ActiveOrderCard key={o.id} order={o} />
        ))}
      </div>
      <div className='grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] border-t border-l border-t-line border-l-border'>
        <div className={cell}>
          <span className='font-mono text-xs text-brand'>常用門市</span>
          <span>{MOCK_ADDRESSES[0].title}</span>
          <Link className={more} preventScrollReset to='?tab=address'>
            管理收件資訊
          </Link>
        </div>
        <div className={cell}>
          <span className='font-mono text-xs text-brand'>聯絡資料</span>
          <span className='font-mono break-all'>{user.email}</span>
          <span className='font-mono'>{user.phone}</span>
        </div>
        <div className={cell}>
          <span className='font-mono text-xs text-brand'>收藏清單</span>
          <span>{wishCount} 件商品</span>
          <Link className={more} preventScrollReset to='?tab=wish'>
            查看收藏
          </Link>
        </div>
      </div>
    </>
  )
}

function Wish({ ids }: { ids: string[] }) {
  const products = ids.map(getProduct).filter((p) => p !== undefined)
  if (!products.length)
    return (
      <p className='m-0 border-t border-line py-8 text-[15px]'>
        還沒有收藏的商品。
        <Link className='ml-1 underline underline-offset-4' to='/'>
          去逛逛 →
        </Link>
      </p>
    )
  return (
    <ProductGrid>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ProductGrid>
  )
}
