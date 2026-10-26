import type { Route } from './+types/cart'

import { useEffect } from 'react'
import { Link } from 'react-router'

import { AddonItem, CartLine } from '~/components/checkout/cart-line'
import { CheckoutButton } from '~/components/checkout/checkout-gate'
import { CheckoutSteps } from '~/components/checkout/checkout-steps'
import {
  CustomOrderNotice,
  SummaryPanel,
  SummaryRow,
  SummaryTotal,
} from '~/components/checkout/order-summary'
import { useHydrated } from '~/components/checkout/use-hydrated'
import { PageTitle } from '~/components/store/typography'
import { useUser } from '~/lib/auth'
import { useCart } from '~/lib/cart'
import {
  formatPrice,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEES,
} from '~/lib/catalog'
import { ADDON_IDS, isCustomLine, stockIssue } from '~/lib/mock/checkout'
import { refreshProducts } from '~/lib/products-client'
import { privateMeta } from '~/lib/seo'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => privateMeta('購物車')

export default function CartPage() {
  const user = useUser()
  const { items, count, ready, subtotal } = useCart()
  const hydrated = useHydrated() && ready
  useEffect(refreshProducts, [])
  const blocked = items.some((i) => stockIssue(i))

  const free = subtotal >= FREE_SHIPPING_THRESHOLD
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  const hasCustom = items.some(isCustomLine)
  const addons = ADDON_IDS.filter(
    (id) => !items.some((i) => i.productId === id)
  )

  return (
    <main className='container-page pb-20'>
      <CheckoutSteps current={0} loggedIn={!!user} />
      <div className='flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pt-10 pb-6'>
        <PageTitle className='text-[clamp(40px,5vw,72px)] leading-[1.05] tracking-[-0.03em]'>
          購物車
        </PageTitle>
        {hydrated && (
          <span className='font-mono text-[13px] text-muted-foreground'>
            {items.length} 項・共 {count} 件
          </span>
        )}
      </div>

      {!hydrated ? (
        <div className='min-h-[320px] border-t border-line' aria-busy='true' />
      ) : items.length === 0 ? (
        <div className='flex flex-col items-start gap-5 border-y border-line py-16'>
          <p className='m-0 text-xl font-bold'>購物車裡還沒有東西。</p>
          <Link
            className='flex min-h-13 items-center gap-6 bg-primary px-[18px] text-[15px] font-medium text-primary-foreground'
            to='/#index'
          >
            瀏覽本季選物 <span aria-hidden='true'>→</span>
          </Link>
        </div>
      ) : (
        <div className='flex flex-wrap items-start gap-10'>
          <section
            className='flex min-w-0 flex-[999_1_620px] flex-col gap-7'
            aria-label='購物車商品'
          >
            <div className='flex flex-col gap-3 border border-line px-[18px] py-4'>
              <div className='flex flex-wrap justify-between gap-2 text-sm'>
                <span className='font-medium'>
                  {free
                    ? '已達免運門檻，這筆訂單免運費。'
                    : `再買 NT$${(FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString('en-US')}，即可享免運。`}
                </span>
                <span className='font-mono text-xs text-muted-foreground'>
                  免運門檻 NT$2,000
                </span>
              </div>
              <div className='h-1.5 bg-[#E4E4DE]' aria-hidden='true'>
                <div
                  className='h-1.5 bg-brand'
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className='border-t border-line'>
              <div className='flex justify-between border-b border-border py-2.5 font-mono text-xs text-muted-foreground'>
                <span>物件</span>
                <span>小計</span>
              </div>
              {items.map((item) => (
                <CartLine
                  key={`${item.productId}-${item.variant ?? ''}`}
                  item={item}
                />
              ))}
            </div>

            {addons.length > 0 && (
              <section
                className='flex flex-col gap-3.5'
                aria-labelledby='addon-h'
              >
                <div className='flex items-baseline justify-between gap-3'>
                  <h2 id='addon-h' className='m-0 text-xl font-black'>
                    一起帶走
                    <span className='ml-2 font-display text-xs font-semibold tracking-[0.06em] text-muted-foreground [font-stretch:125%]'>
                      ADD-ONS
                    </span>
                  </h2>
                  <span className='font-mono text-xs text-muted-foreground'>
                    {free ? '已免運' : '加購即可免運'}
                  </span>
                </div>
                <div className='grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] border-t border-l border-t-line border-l-border'>
                  {addons.map((id) => (
                    <AddonItem key={id} productId={id} />
                  ))}
                </div>
              </section>
            )}
          </section>

          <SummaryPanel
            aside={
              <span className='font-mono text-xs text-muted-foreground'>
                {count} 件
              </span>
            }
            title='訂單摘要'
          >
            <dl className='m-0 px-5 py-1 text-sm'>
              <SummaryRow label='小計'>{formatPrice(subtotal)}</SummaryRow>
              <SummaryRow label='運費'>
                <span className={cn(free && 'text-brand')}>
                  {free ? '免運' : `NT$${SHIPPING_FEES.cvs} 起`}
                </span>
              </SummaryRow>
              <SummaryTotal
                amount={formatPrice(subtotal + (free ? 0 : SHIPPING_FEES.cvs))}
                label='預估合計'
              />
            </dl>
            <div className='flex flex-col gap-3 px-5 pb-5'>
              {hasCustom && <CustomOrderNotice />}
              {blocked && (
                <p className='m-0 text-[13px] leading-[1.7] font-medium text-brand'>
                  購物車裡有商品庫存不足，請先依提示調整或移除，才能結帳。
                </p>
              )}
              <CheckoutButton disabled={blocked} />
              <p className='m-0 text-[12.5px] leading-[1.7] text-muted-foreground'>
                運費以超商取貨估算，可於下一步改選宅配。付款：信用卡・Apple
                Pay・ATM 虛擬帳號・無卡分期。
              </p>
            </div>
          </SummaryPanel>
        </div>
      )}
    </main>
  )
}
