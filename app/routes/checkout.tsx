import type { Route } from './+types/checkout'

import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { LoginForm } from '~/components/account/login-form'
import { CheckoutForm } from '~/components/checkout/checkout-form'
import { RegisterHint, VerifyNotice } from '~/components/checkout/checkout-gate'
import { CheckoutSteps } from '~/components/checkout/checkout-steps'
import { useHydrated } from '~/components/checkout/use-hydrated'
import { PageTitle } from '~/components/store/typography'
import { useUser } from '~/lib/auth'
import { useCart } from '~/lib/cart'
import { stockIssue } from '~/lib/mock/checkout'
import { refreshProducts } from '~/lib/products-client'
import { privateMeta } from '~/lib/seo'

export const meta: Route.MetaFunction = () => privateMeta('填寫資料')

export default function CheckoutPage() {
  const hydrated = useHydrated()
  const user = useUser()
  const { clear, items, ready: cartReady } = useCart()
  useEffect(refreshProducts, [])
  // 送出後購物車會清空；避免跳轉前閃一下「購物車是空的」
  const [placed, setPlaced] = useState(false)

  const ready = hydrated && !!user?.emailVerified
  const title =
    !hydrated || ready ? '填寫資料' : user ? '驗證 Email' : '登入後結帳'

  return (
    <main className='container-page pb-20'>
      <CheckoutSteps current={ready ? 2 : 1} loggedIn={ready} />
      <div className='flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pt-10 pb-6'>
        <PageTitle className='text-[clamp(40px,5vw,72px)] leading-[1.05] tracking-[-0.03em]'>
          {title}
        </PageTitle>
        <Link className='min-h-11 border-b border-line pt-3 text-sm' to='/cart'>
          ← 返回購物車
        </Link>
      </div>

      {!hydrated || placed || !cartReady ? (
        <div className='min-h-[320px]' aria-busy='true' />
      ) : !user ? (
        <Panel
          step='STEP 02'
          text='本店不提供訪客結帳。登入後會帶入你的收件資料，並回到這一頁。'
        >
          <LoginForm />
          <RegisterHint />
        </Panel>
      ) : !user.emailVerified ? (
        <Panel step='STEP 02' text='已登入，但 Email 尚未驗證。'>
          <VerifyNotice />
        </Panel>
      ) : items.length === 0 ? (
        <div className='flex flex-col items-start gap-5 border-y border-line py-16'>
          <p className='m-0 text-xl font-bold'>
            購物車是空的，沒有可以結帳的物件。
          </p>
          <Link
            className='flex min-h-13 items-center gap-6 bg-primary px-[18px] text-[15px] font-medium text-primary-foreground'
            to='/#index'
          >
            瀏覽本季選物 <span aria-hidden='true'>→</span>
          </Link>
        </div>
      ) : items.some((i) => stockIssue(i)) ? (
        <div className='flex flex-col items-start gap-5 border-y border-line py-16'>
          <p className='m-0 text-xl font-bold'>
            購物車裡有商品庫存不足，請先回購物車移除。
          </p>
          <Link
            className='flex min-h-13 items-center gap-6 bg-primary px-[18px] text-[15px] font-medium text-primary-foreground'
            to='/cart'
          >
            回購物車 <span aria-hidden='true'>→</span>
          </Link>
        </div>
      ) : (
        <CheckoutForm
          key={user.email}
          items={items}
          user={user}
          onPlaced={(no) => {
            setPlaced(true)
            // 伺服器已清空會員購物車；這裡同步畫面，再前往綠界付款頁（整頁跳轉）
            clear()
            window.location.assign(`/api/payments/${no}/checkout`)
          }}
        />
      )}
    </main>
  )
}

function Panel({
  step,
  text,
  children,
}: {
  step: string
  text: string
  children: React.ReactNode
}) {
  return (
    <div className='flex max-w-[560px] flex-col gap-6'>
      <div className='flex items-baseline gap-3 border border-line px-[18px] py-3.5 text-sm leading-[1.7]'>
        <span className='shrink-0 font-mono text-xs text-brand'>{step}</span>
        <span>{text}</span>
      </div>
      {children}
    </div>
  )
}
