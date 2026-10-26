import type { OrderDetail as Order } from '~/lib/db/orders.server'

import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { formatPrice } from '~/lib/catalog'
import { cn } from '~/lib/utils'

/** 規格 6.1：進行中的訂單才顯示進度條 */
const ORDER_FLOW = ['待付款', '待出貨', '已出貨', '已完成'] as const

export const isActiveOrder = (o: Pick<Order, 'status'>) =>
  o.status === 'pending_payment' ||
  o.status === 'pending_shipment' ||
  o.status === 'shipped'

/** 「品名 等 3 件」；明細存的是「品牌 品名」，標題只留品名 */
const titleOf = (o: Order) => {
  const first = o.items[0]
  const name = first.name.replace(`${first.brand} `, '')
  const count = o.items.reduce((n, l) => n + l.qty, 0)
  return count > 1 ? `${name} 等 ${count} 件` : name
}

export function StatusBadge({
  boxed,
  order,
}: {
  boxed?: boolean
  order: Order
}) {
  const active = isActiveOrder(order)
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
      {order.statusLabel}
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
        src={order.items[0].image}
      />
    </span>
  )
}

/** 待付款提醒（前往付款、ATM 帳號在完成頁），含規格 9 的防詐騙說明 */
function PayNotice({ order }: { order: Order }) {
  if (!order.payBy) return null
  return (
    <p className='m-0 text-[13px] leading-[1.7]'>
      請於 <span className='font-mono'>{order.payBy}</span>{' '}
      前完成付款，逾時訂單將自動取消。
      <span className='text-brand'>我們不會打電話要求你操作 ATM。</span>{' '}
      <Link
        className='border-b border-line font-medium'
        to={`/checkout/done?order=${order.no}`}
      >
        {order.payInfo ? '查看付款資訊' : '前往付款'}
      </Link>
    </p>
  )
}

/** 總覽：進行中的訂單卡片＋進度條 */
export function ActiveOrderCard({ order }: { order: Order }) {
  const stage = ORDER_FLOW.indexOf(
    order.statusLabel as (typeof ORDER_FLOW)[number]
  )
  return (
    <article className='border border-line bg-[#FBFBF9]'>
      <div className='flex flex-wrap justify-between gap-x-5 gap-y-2 border-b border-[#E4E4DE] px-[18px] py-3.5'>
        <span className='font-mono text-[13px]'>
          {order.no}・{order.date}
        </span>
        <StatusBadge order={order} />
      </div>
      <div className='flex flex-wrap items-center gap-4 px-[18px] py-4'>
        <Thumb order={order} size={72} />
        <span className='flex min-w-0 flex-[1_1_200px] flex-col gap-1'>
          <span className='font-display text-[11.5px] tracking-[0.06em] text-muted-foreground uppercase [font-stretch:112%]'>
            {order.items[0].brand}
          </span>
          <span className='text-base font-medium'>{titleOf(order)}</span>
          <span className='text-[13px] text-muted-foreground'>
            {order.shipping}・{order.payLabel}
          </span>
        </span>
        <span className='font-mono text-base font-medium'>
          {formatPrice(order.total)}
        </span>
      </div>
      {order.payBy && (
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
    orders.slice(0, 1).map((o) => o.no)
  )
  const toggle = (id: string) =>
    setOpen((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  if (!orders.length)
    return (
      <p className='m-0 border-t border-line py-8 text-[15px]'>還沒有訂單。</p>
    )
  return (
    <div className='border-t border-line'>
      {orders.map((o) => {
        const isOpen = open.includes(o.no)
        const Icon = isOpen ? Minus : Plus
        return (
          <article key={o.no} className='border-b border-border'>
            <button
              type='button'
              className='flex w-full flex-wrap items-center gap-x-5 gap-y-3 py-[18px] text-left'
              aria-controls={`order-${o.no}`}
              aria-expanded={isOpen}
              onClick={() => toggle(o.no)}
            >
              <Thumb order={o} size={56} />
              <span className='flex min-w-0 flex-[1_1_200px] flex-col gap-1'>
                <span className='font-mono text-[12.5px] text-muted-foreground'>
                  {o.no}・{o.date}
                </span>
                <span className='text-[15px] font-medium'>{titleOf(o)}</span>
              </span>
              <span className='flex items-center gap-x-5 max-sm:w-full max-sm:justify-between max-sm:pl-[76px]'>
                <StatusBadge boxed order={o} />
                <span className='font-mono text-[15px] font-medium sm:w-[120px] sm:text-right'>
                  {formatPrice(o.total)}
                </span>
                <Icon className='size-4' aria-hidden strokeWidth={1.6} />
              </span>
            </button>
            {isOpen && (
              <dl
                id={`order-${o.no}`}
                className='m-0 mb-[18px] grid grid-cols-[88px_1fr] gap-x-4 gap-y-2.5 border border-[#E4E4DE] bg-[#FBFBF9] px-[18px] py-4 text-sm sm:grid-cols-[110px_1fr]'
              >
                <dt className='text-muted-foreground'>商品</dt>
                <dd className='m-0 flex flex-col gap-1'>
                  {o.items.map((l) => (
                    <span key={l.key}>
                      {l.name}
                      {l.option && `（${l.option}）`} ×{l.qty}
                    </span>
                  ))}
                </dd>
                <dt className='text-muted-foreground'>運送</dt>
                <dd className='m-0'>
                  {o.shipping}
                  <span className='text-muted-foreground'>
                    ・運費 {o.fee ? formatPrice(o.fee) : '免運'}
                  </span>
                </dd>
                <dt className='text-muted-foreground'>付款</dt>
                <dd className='m-0'>{o.payLabel}</dd>
                <dt className='text-muted-foreground'>物流單號</dt>
                <dd className='m-0 font-mono'>{o.tracking ?? '—'}</dd>
                {(o.reason || o.payBy) && (
                  <>
                    <dt className='text-muted-foreground'>說明</dt>
                    <dd className='m-0'>
                      {o.reason ?? <PayNotice order={o} />}
                    </dd>
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
