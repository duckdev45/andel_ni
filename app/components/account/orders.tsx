import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'

import { formatPrice } from '~/lib/catalog'
import {
  isActiveOrder,
  MOCK_ORDERS,
  ORDER_FLOW,
  type OrderStatus,
  orderView,
} from '~/lib/mock/account'
import { cn } from '~/lib/utils'

type Order = ReturnType<typeof orderView>

export const ORDERS = MOCK_ORDERS.map(orderView)

export function StatusBadge({
  boxed,
  status,
}: {
  boxed?: boolean
  status: OrderStatus
}) {
  const active = isActiveOrder(status)
  return (
    <span
      className={cn(
        'shrink-0 text-[12.5px] font-medium',
        boxed && 'border px-2.5 py-1',
        active
          ? 'border-brand text-brand'
          : 'border-muted-foreground text-muted-foreground'
      )}
    >
      {status}
    </span>
  )
}

function Thumb({ order, size }: { order: Order; size: number }) {
  return (
    <span
      className='relative shrink-0 overflow-hidden bg-[#E3DED6]'
      style={{ height: size, width: size }}
      aria-hidden='true'
    >
      <img
        className='absolute inset-0 size-full object-cover'
        alt=''
        src={order.first.image}
      />
    </span>
  )
}

/** 待付款（ATM）提醒，含規格 9 的防詐騙說明 */
function PayNotice({ order }: { order: Order }) {
  if (order.status !== '待付款' || !order.payBy) return null
  return (
    <p className='m-0 text-[13px] leading-[1.7]'>
      請於 <span className='font-mono'>{order.payBy}</span>{' '}
      前完成轉帳，逾時訂單將自動取消。
      <span className='text-brand'>我們不會打電話要求你操作 ATM。</span>
    </p>
  )
}

/** 總覽：進行中的訂單卡片＋進度條 */
export function ActiveOrderCard({ order }: { order: Order }) {
  const stage = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number])
  return (
    <article className='border border-line bg-[#FBFBF9]'>
      <div className='flex flex-wrap justify-between gap-x-5 gap-y-2 border-b border-[#E4E4DE] px-[18px] py-3.5'>
        <span className='font-mono text-[13px]'>
          {order.id}・{order.date}
        </span>
        <StatusBadge status={order.status} />
      </div>
      <div className='flex flex-wrap items-center gap-4 px-[18px] py-4'>
        <Thumb order={order} size={72} />
        <span className='flex min-w-0 flex-[1_1_200px] flex-col gap-1'>
          <span className='font-display text-[11.5px] tracking-[0.06em] text-muted-foreground uppercase [font-stretch:112%]'>
            {order.first.brand}
          </span>
          <span className='text-base font-medium'>{order.title}</span>
          <span className='text-[13px] text-muted-foreground'>
            {order.shipping}・{order.payment.split('・')[0]}
          </span>
        </span>
        <span className='font-mono text-base font-medium'>
          {formatPrice(order.total)}
        </span>
      </div>
      {order.status === '待付款' && (
        <div className='px-[18px] pb-4'>
          <PayNotice order={order} />
        </div>
      )}
      <ol
        className='m-0 grid list-none grid-cols-4 gap-2 border-t border-[#E4E4DE] px-[18px] pt-3.5 pb-[18px]'
        aria-label='訂單進度'
      >
        {ORDER_FLOW.map((label, i) => (
          <li
            key={label}
            className='flex flex-col gap-2'
            aria-current={i === stage ? 'step' : undefined}
          >
            <span
              className={cn('h-1', i <= stage ? 'bg-line' : 'bg-[#E4E4DE]')}
              aria-hidden='true'
            />
            <span
              className={cn(
                'text-[12.5px]',
                i === stage
                  ? 'font-bold'
                  : i < stage
                    ? 'text-muted-foreground'
                    : 'text-[#8E8E87]'
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </article>
  )
}

/** 訂單紀錄：可展開的列表 */
export function OrderList({ orders }: { orders: Order[] }) {
  const [open, setOpen] = useState<string[]>(
    orders.slice(0, 1).map((o) => o.id)
  )
  const toggle = (id: string) =>
    setOpen((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  return (
    <div className='border-t border-line'>
      {orders.map((o) => {
        const isOpen = open.includes(o.id)
        const Icon = isOpen ? Minus : Plus
        return (
          <article key={o.id} className='border-b border-border'>
            <button
              type='button'
              className='flex w-full flex-wrap items-center gap-x-5 gap-y-3 py-[18px] text-left'
              aria-controls={`order-${o.id}`}
              aria-expanded={isOpen}
              onClick={() => toggle(o.id)}
            >
              <Thumb order={o} size={56} />
              <span className='flex min-w-0 flex-[1_1_200px] flex-col gap-1'>
                <span className='font-mono text-[12.5px] text-muted-foreground'>
                  {o.id}・{o.date}
                </span>
                <span className='text-[15px] font-medium'>{o.title}</span>
              </span>
              <span className='flex items-center gap-x-5 max-sm:w-full max-sm:justify-between max-sm:pl-[76px]'>
                <StatusBadge boxed status={o.status} />
                <span className='font-mono text-[15px] font-medium sm:w-[120px] sm:text-right'>
                  {formatPrice(o.total)}
                </span>
                <Icon className='size-4' aria-hidden strokeWidth={1.6} />
              </span>
            </button>
            {isOpen && (
              <dl
                id={`order-${o.id}`}
                className='m-0 mb-[18px] grid grid-cols-[88px_1fr] gap-x-4 gap-y-2.5 border border-[#E4E4DE] bg-[#FBFBF9] px-[18px] py-4 text-sm sm:grid-cols-[110px_1fr]'
              >
                <dt className='text-muted-foreground'>商品</dt>
                <dd className='m-0 flex flex-col gap-1'>
                  {o.items.map((l) => (
                    <span key={l.productId + (l.variant ?? '')}>
                      {l.product.brand} {l.product.name}
                      {l.variant && `（${l.variant}）`} ×{l.qty}
                    </span>
                  ))}
                </dd>
                <dt className='text-muted-foreground'>運送</dt>
                <dd className='m-0'>
                  {o.shipping}
                  <span className='text-muted-foreground'>
                    ・運費 {o.shippingFee ? formatPrice(o.shippingFee) : '免運'}
                  </span>
                </dd>
                <dt className='text-muted-foreground'>付款</dt>
                <dd className='m-0'>{o.payment}</dd>
                <dt className='text-muted-foreground'>物流單號</dt>
                <dd className='m-0 font-mono'>{o.tracking ?? '—'}</dd>
                {(o.note || o.status === '待付款') && (
                  <>
                    <dt className='text-muted-foreground'>說明</dt>
                    <dd className='m-0'>{o.note ?? <PayNotice order={o} />}</dd>
                  </>
                )}
              </dl>
            )}
          </article>
        )
      })}
    </div>
  )
}
