import type { Route } from './+types/checkout-done'

import { Link } from 'react-router'

import { CheckoutSteps } from '~/components/checkout/checkout-steps'
import {
  SummaryPanel,
  SummaryRow,
  SummaryTotal,
} from '~/components/checkout/order-summary'
import { PageTitle } from '~/components/store/typography'
import { formatPrice } from '~/lib/catalog'
import { dbFrom } from '~/lib/context'
import { listOrders, type OrderDetail } from '~/lib/db/orders.server'
import { getSessionUser } from '~/lib/db/users.server'
import { privateMeta } from '~/lib/seo'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => privateMeta('訂單完成')

// 只能看自己的訂單；沒登入或不是自己的一律顯示找不到
export async function loader({ context, request }: Route.LoaderArgs) {
  const no = new URL(request.url).searchParams.get('order') ?? ''
  const db = dbFrom(context)
  const me = await getSessionUser(db, request)
  const [order] = me && no ? await listOrders(db, me.id, no) : []
  return { no, order: order ?? null }
}

export default function CheckoutDonePage({ loaderData }: Route.ComponentProps) {
  const { no, order } = loaderData
  return (
    <main className='container-page pb-20'>
      <CheckoutSteps loggedIn current={3} />
      {order ? <OrderDone order={order} /> : <NotFound no={no} />}
    </main>
  )
}

function OrderDone({ order }: { order: OrderDetail }) {
  const count = order.items.reduce((n, l) => n + l.qty, 0)
  const hasCustom = order.items.some((l) => l.custom)

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
          {/* ponytail: 寄信服務接好後加回「訂單確認信已寄到 Email」（規格 6.5） */}
          {order.ship === 'home'
            ? '出貨後會以 Email 附上宅配單號。'
            : `商品送達 ${order.destination.split('（')[0]} 後，會以簡訊通知你取貨。`}
        </p>

        <PaymentBox order={order} />

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
          {order.items.map((l) => (
            <li key={l.key} className='flex items-center gap-3 py-2'>
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
                  ・{l.option ?? '單一規格'} × {l.qty}
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
              {order.ship === 'home' && `${order.shipLabel}・`}
              {order.destination}
            </span>
          </SummaryRow>
          <SummaryRow label='付款'>
            <span className='font-sans'>{order.payLabel}</span>
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

/** 付款狀態：待付款可前往綠界；ATM 顯示轉帳帳號；無卡分期審核中 */
function PaymentBox({ order }: { order: OrderDetail }) {
  const info = order.payInfo
  const atm = info && 'account' in info ? info : null
  return (
    <div className='flex max-w-[620px] flex-col gap-2.5 border border-line p-5'>
      <span className='font-mono text-xs text-muted-foreground'>付款狀態</span>
      <p className='m-0 text-[15px] leading-[1.7]'>
        {order.statusLabel}・{order.payLabel}
        {order.status === 'pending_shipment' &&
          '，已收到付款，我們會盡快出貨。'}
        {order.reason && `。${order.reason}`}
      </p>
      {atm ? (
        <dl className='m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 border-t border-border pt-2.5 text-[15px]'>
          <dt className='text-muted-foreground'>銀行代碼</dt>
          <dd className='m-0 font-mono'>{atm.bank}</dd>
          <dt className='text-muted-foreground'>轉帳帳號</dt>
          <dd className='m-0 font-mono text-lg font-medium tracking-wide'>
            {atm.account}
          </dd>
          <dt className='text-muted-foreground'>金額</dt>
          <dd className='m-0 font-mono'>{formatPrice(order.total)}</dd>
          <dt className='text-muted-foreground'>繳費期限</dt>
          <dd className='m-0 font-mono'>{atm.expire} 23:59</dd>
        </dl>
      ) : info ? (
        <p className='m-0 border-t border-border pt-2.5 text-[14px] leading-[1.7]'>
          無卡分期申請已送出，核准約需 1–3
          個工作天，核准後訂單會自動轉為待出貨。
        </p>
      ) : (
        order.status === 'pending_payment' && (
          <div className='flex flex-col items-start gap-3 border-t border-border pt-3'>
            {order.payBy && (
              <p className='m-0 text-[14px] leading-[1.7]'>
                請於 <span className='font-mono'>{order.payBy}</span>{' '}
                前完成付款，逾時訂單會自動取消。
              </p>
            )}
            {/* 一般連結（整頁跳轉）：由伺服器產生送往綠界的表單 */}
            <a
              className='flex min-h-12 items-center gap-6 bg-brand px-[18px] text-[15px] font-medium text-brand-foreground'
              href={`/api/payments/${order.no}/checkout`}
            >
              前往付款 <span aria-hidden='true'>→</span>
            </a>
          </div>
        )
      )}
      <p className='m-0 border-t border-border pt-2.5 text-[13px] leading-[1.7] text-muted-foreground'>
        付款由綠界科技處理，本店不會經手你的卡號。
        <strong className='font-medium text-brand'>
          我們不會打電話要求你操作 ATM。
        </strong>
      </p>
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
        {no && (
          <>
            找不到訂單 <span className='font-mono'>{no}</span>
            ，請確認登入的是下單時的帳號。
          </>
        )}
        所有訂單的明細與付款狀態，都可以在會員中心的「訂單」查看。
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
