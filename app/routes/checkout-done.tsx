import type { Route } from './+types/checkout-done'

import { useMemo, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router'

import { CheckoutSteps } from '~/components/checkout/checkout-steps'
import {
  SummaryPanel,
  SummaryRow,
  SummaryTotal,
} from '~/components/checkout/order-summary'
import { PageTitle } from '~/components/store/typography'
import { formatPrice } from '~/lib/catalog'
import {
  mockAtm,
  type MockOrder,
  PAY_OPTIONS,
  readOrderRaw,
  SHIP_OPTIONS,
} from '~/lib/mock/checkout'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => [{ title: '訂單完成｜AndelNI' }]

const noop = () => () => {}

const PAY_DONE: Record<MockOrder['pay'], string> = {
  card: '信用卡付款已完成，我們會盡快安排出貨。',
  apple: 'Apple Pay 付款已完成，我們會盡快安排出貨。',
  bnpl: '無卡分期申請已送出，審核通過後即完成付款並安排出貨。',
  atm: '',
}

export default function CheckoutDonePage() {
  const [params] = useSearchParams()
  const no = params.get('order') ?? ''
  // undefined：SSR／hydrate 中；null：找不到這筆訂單
  const raw = useSyncExternalStore(
    noop,
    () => readOrderRaw(no),
    () => undefined
  )
  const order = useMemo(
    () => (raw == null ? raw : (JSON.parse(raw) as MockOrder)),
    [raw]
  )

  return (
    <main className='container-page pb-20'>
      <CheckoutSteps loggedIn current={3} />
      {order === undefined ? (
        <div className='min-h-[480px]' aria-busy='true' />
      ) : order === null ? (
        <NotFound no={no} />
      ) : (
        <OrderDone order={order} />
      )}
    </main>
  )
}

function OrderDone({ order }: { order: MockOrder }) {
  const isAtm = order.pay === 'atm'
  const atm = isAtm ? mockAtm(order) : null
  const ship = SHIP_OPTIONS.find((o) => o.id === order.ship)
  const pay = PAY_OPTIONS.find((o) => o.id === order.pay)
  const count = order.lines.reduce((n, l) => n + l.qty, 0)
  const hasCustom = order.lines.some((l) => l.custom)

  return (
    <div className='flex flex-wrap items-start gap-10 pt-14'>
      <section
        className='flex min-w-0 flex-[999_1_620px] flex-col gap-7'
        aria-labelledby='done-h'
      >
        <span className='font-mono text-[13px] text-brand'>
          ORDER CONFIRMED
        </span>
        <PageTitle
          id='done-h'
          className='text-[clamp(44px,6vw,96px)] leading-[1.04] tracking-[-0.03em]'
        >
          謝謝你，
          <br />
          訂單已成立
        </PageTitle>
        <p className='m-0 max-w-[620px] text-[17px] leading-[1.8]'>
          訂單確認信已寄到 <span className='font-mono'>{order.email}</span>。
          {order.ship === 'home'
            ? '出貨後會以 Email 附上宅配單號。'
            : `商品送達 ${order.destination.split('（')[0]} 後，會以簡訊通知你取貨。`}
        </p>

        <div className='flex max-w-[620px] flex-col gap-2.5 border border-line p-5'>
          <span className='font-mono text-xs text-muted-foreground'>
            {isAtm ? 'ATM 轉帳資訊' : '付款狀態'}
          </span>
          {atm ? (
            <>
              <dl className='m-0 grid grid-cols-[96px_1fr] gap-x-4 gap-y-2 text-[15px] sm:grid-cols-[120px_1fr]'>
                <dt className='text-muted-foreground'>銀行代碼</dt>
                <dd className='m-0 font-mono'>{atm.bank}</dd>
                <dt className='text-muted-foreground'>轉帳帳號</dt>
                <dd className='m-0 font-mono'>{atm.account}</dd>
                <dt className='text-muted-foreground'>轉帳金額</dt>
                <dd className='m-0 font-mono font-medium'>
                  {formatPrice(order.total)}
                </dd>
                <dt className='text-muted-foreground'>繳費期限</dt>
                <dd className='m-0 font-mono'>{atm.deadline}</dd>
              </dl>
              <p className='m-0 border-t border-border pt-2.5 text-[13px] leading-[1.7] text-muted-foreground'>
                逾期未付款，訂單會自動取消。
                <strong className='font-medium text-brand'>
                  我們不會打電話要求你操作 ATM。
                </strong>
              </p>
            </>
          ) : (
            <p className='m-0 text-[15px] leading-[1.7]'>
              {PAY_DONE[order.pay]}
            </p>
          )}
        </div>

        <div className='flex flex-wrap gap-2.5'>
          <Link
            className='flex min-h-13 items-center gap-6 bg-primary px-[18px] text-[15px] font-medium text-primary-foreground'
            to='/'
          >
            回到首頁 <span aria-hidden='true'>→</span>
          </Link>
          <Link
            className='flex min-h-13 items-center border border-line px-[18px] text-[15px] font-medium hover:bg-muted'
            to='/account?tab=orders'
          >
            查看訂單狀態
          </Link>
        </div>
      </section>

      <SummaryPanel
        aside={
          <span className='font-display text-[22px] font-extrabold [font-stretch:112%]'>
            {order.no}
          </span>
        }
        aria-label='訂單明細'
        title='訂單編號'
      >
        <ul className='m-0 list-none border-b border-[#E4E4DE] px-5 py-2'>
          {order.lines.map((l) => (
            <li
              key={`${l.productId}-${l.option}`}
              className='flex items-center gap-3 py-2'
            >
              <span
                className='relative size-12 shrink-0 overflow-hidden bg-tone-object'
                aria-hidden='true'
              >
                <img
                  className='absolute inset-0 size-full object-cover'
                  alt=''
                  src={l.image}
                />
              </span>
              <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <span className='text-sm font-medium'>{l.name}</span>
                <span className='text-xs text-muted-foreground'>
                  <span className={cn(l.custom && 'text-brand')}>{l.kind}</span>
                  ・{l.option} × {l.qty}
                </span>
              </span>
              <span className='font-mono text-[13.5px]'>
                {formatPrice(l.price * l.qty)}
              </span>
            </li>
          ))}
        </ul>
        <dl className='m-0 px-5 pt-1 pb-3 text-sm'>
          <SummaryRow label='收件人'>
            <span className='font-sans'>{order.name}</span>・{order.phone}
          </SummaryRow>
          <SummaryRow label='運送'>
            <span className='font-sans'>
              {order.ship === 'home' && `${ship?.label}・`}
              {order.destination}
            </span>
          </SummaryRow>
          <SummaryRow label='付款'>
            <span className='font-sans'>{pay?.label}</span>
          </SummaryRow>
          <SummaryRow label='物件'>{count} 件</SummaryRow>
          <SummaryRow label='小計'>{formatPrice(order.subtotal)}</SummaryRow>
          <SummaryRow label='運費'>
            {order.fee === 0 ? '免運' : formatPrice(order.fee)}
          </SummaryRow>
          {order.note && (
            <SummaryRow label='備註'>
              <span className='font-sans'>{order.note}</span>
            </SummaryRow>
          )}
          <SummaryTotal amount={formatPrice(order.total)} label='合計' />
        </dl>
        {hasCustom && (
          <p className='m-0 px-5 pb-5 text-[12.5px] leading-[1.7] text-muted-foreground'>
            此訂單含客訂／代購商品，你已確認不適用 7 天鑑賞期。
          </p>
        )}
      </SummaryPanel>
    </div>
  )
}

function NotFound({ no }: { no: string }) {
  return (
    <div className='flex flex-col items-start gap-5 pt-14'>
      <PageTitle className='text-[clamp(40px,5vw,72px)]'>
        找不到這筆訂單
      </PageTitle>
      <p className='m-0 max-w-[620px] text-[15px] leading-[1.8]'>
        {no ? (
          <>
            這個頁面只在下單後短暫保留。訂單{' '}
            <span className='font-mono'>{no}</span> 的明細與付款狀態，
          </>
        ) : (
          '訂單明細與付款狀態，'
        )}
        請到會員中心的「訂單」查看。
      </p>
      <Link
        className='flex min-h-13 items-center gap-6 bg-primary px-[18px] text-[15px] font-medium text-primary-foreground'
        to='/account?tab=orders'
      >
        前往會員中心訂單 <span aria-hidden='true'>→</span>
      </Link>
    </div>
  )
}
