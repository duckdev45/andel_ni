import type { Route } from './+types/dashboard'

import { Link } from 'react-router'

import { useAdmin } from '~/components/admin/admin-store'
import { Empty, PANEL, PanelHead, ROW_RULE } from '~/components/admin/parts'
import {
  isBooked,
  money,
  orderLedger,
  orderSummary,
  PAY,
  percent,
  SHIP,
  skusOf,
  taipeiDate,
} from '~/lib/admin'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => [{ title: '總覽｜AndelNI' }]

export default function Dashboard() {
  const { orders, products, purchases, settings, lowAt, openSheet } = useAdmin()

  const today = taipeiDate()
  const live = orders.filter(
    (o) => o.status !== 'cancelled' && o.status !== 'returned'
  )
  const todays = live.filter((o) => o.date.startsWith(today))
  const toShip = orders.filter((o) => o.status === 'pending_shipment')
  const pendPay = orders.filter((o) => o.status === 'pending_payment').length
  const month = orders
    .filter((o) => isBooked(o) && o.date.startsWith(today.slice(0, 7)))
    .map((o) => orderLedger(o, purchases, settings))
  const mNet = month.reduce((a, l) => a + l.net, 0)
  const mSale = month.reduce((a, l) => a + l.sale, 0)
  const low = skusOf(products).filter(
    (k) => k.product.active && k.stock <= lowAt
  )

  const kpis = [
    {
      label: '今日訂單',
      value: String(todays.length),
      sub: `營收 ${money(todays.reduce((a, o) => a + o.total, 0))}`,
      to: '/admin/orders',
      tone: '',
    },
    {
      label: '待出貨',
      value: String(toShip.length),
      sub: '筆訂單',
      to: '/admin/orders?status=pending_shipment',
      tone: toShip.length ? 'text-brand' : '',
    },
    {
      label: '待付款',
      value: String(pendPay),
      sub: '筆訂單',
      to: '/admin/orders?status=pending_payment',
      tone: '',
    },
    {
      label: '本月淨利',
      value: money(mNet),
      sub: `淨利率 ${percent(mNet, mSale)}`,
      to: '/admin/ledger',
      tone: mNet < 0 ? 'text-brand' : 'text-[#3f5640]',
    },
  ]

  // 近 7 日（含今天）營收
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = taipeiDate(6 - i)
    return {
      key,
      label: `${+key.slice(5, 7)}/${+key.slice(8)}`,
      v: live
        .filter((o) => o.date.startsWith(key))
        .reduce((a, o) => a + o.total, 0),
    }
  })
  const max = Math.max(1, ...days.map((x) => x.v))

  return (
    <>
      <p className='text-[13px] text-muted-foreground'>
        {new Intl.DateTimeFormat('zh-TW', {
          dateStyle: 'full',
          timeZone: 'Asia/Taipei',
        }).format(new Date())}
      </p>

      <div className='grid grid-cols-2 gap-2.5 lg:grid-cols-4'>
        {kpis.map((k) => (
          <Link
            key={k.label}
            className={cn(
              PANEL,
              'flex min-w-0 flex-col gap-1.5 p-4 hover:border-foreground'
            )}
            to={k.to}
          >
            <span className='text-[12.5px] text-muted-foreground'>
              {k.label}
            </span>
            <span
              className={cn(
                'truncate font-display text-[22px] font-extrabold [font-stretch:112%] tabular-nums lg:text-[28px]',
                k.tone
              )}
            >
              {k.value}
            </span>
            <span className='text-xs text-muted-foreground'>{k.sub}</span>
          </Link>
        ))}
      </div>

      <div className='grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]'>
        <section className={cn(PANEL, 'overflow-hidden')}>
          <PanelHead title='待出貨'>
            <Link
              className='py-1.5 text-[12.5px] text-brand hover:underline'
              to='/admin/orders?status=pending_shipment'
            >
              全部訂單 →
            </Link>
          </PanelHead>
          {toShip.slice(0, 5).map((o) => (
            <div
              key={o.id}
              className={cn('flex items-center gap-3 px-4 py-3', ROW_RULE)}
            >
              <button
                type='button'
                className='flex min-w-0 flex-1 flex-col gap-[3px] text-left'
                onClick={() => openSheet({ type: 'order', id: o.id })}
              >
                <span className='text-sm font-medium'>
                  {o.customer.name}{' '}
                  <span className='font-mono text-xs font-normal text-muted-foreground'>
                    {o.id} · {o.date.slice(5)}
                  </span>
                </span>
                <span className='truncate text-[12.5px] text-[#2E2E2A]'>
                  {orderSummary(o)}
                </span>
                <span className='text-xs text-[#6B6B65]'>
                  {PAY[o.pay]} · {SHIP[o.ship.method]}
                </span>
              </button>
              <button
                type='button'
                className='h-11 flex-none bg-foreground px-3.5 text-[12.5px] whitespace-nowrap text-[#FBFBF9] hover:bg-foreground/85 lg:h-9'
                aria-label={`出貨 ${o.id}`}
                onClick={() => openSheet({ type: 'order', id: o.id })}
              >
                出貨
              </button>
            </div>
          ))}
          {!toShip.length && <Empty>目前沒有待出貨訂單</Empty>}
        </section>

        <div className='flex min-w-0 flex-col gap-4'>
          <section className={cn(PANEL, 'overflow-hidden')}>
            <PanelHead title='庫存警示'>
              <Link
                className='py-1.5 text-[12.5px] text-brand hover:underline'
                to='/admin/stock?filter=low'
              >
                庫存管理 →
              </Link>
            </PanelHead>
            {low.slice(0, 6).map((k) => (
              <div
                key={k.product.id + (k.opt ?? '')}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5',
                  ROW_RULE
                )}
              >
                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span className='truncate text-[13.5px]'>
                    {k.product.name}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {k.opt ?? '單一規格'}
                  </span>
                </div>
                <span
                  className={cn(
                    'font-mono text-[13px] font-medium tabular-nums',
                    k.stock === 0 ? 'text-brand' : 'text-[#7a4a0c]'
                  )}
                >
                  {k.stock === 0 ? '缺貨' : `剩 ${k.stock}`}
                </span>
                <button
                  type='button'
                  className='h-11 flex-none border border-foreground px-3 text-[12.5px] whitespace-nowrap hover:bg-foreground hover:text-[#FBFBF9] lg:h-[34px]'
                  aria-label={`進貨 ${k.product.name}${k.opt ? ` ${k.opt}` : ''}`}
                  onClick={() =>
                    openSheet({
                      type: 'purchase',
                      pid: k.product.id,
                      opt: k.opt,
                    })
                  }
                >
                  進貨
                </button>
              </div>
            ))}
            {!low.length && <Empty>庫存都很充足</Empty>}
          </section>

          <section
            className={cn(PANEL, 'flex flex-col gap-3.5 px-4 pt-3.5 pb-4')}
          >
            <div className='flex items-baseline justify-between'>
              <h2 className='text-[14.5px] font-bold'>近 7 日營收</h2>
              <span className='font-mono text-[13px] tabular-nums'>
                {money(days.reduce((a, x) => a + x.v, 0))}
              </span>
            </div>
            <ol className='grid h-[132px] grid-cols-7 items-end gap-2'>
              {days.map((x) => (
                <li
                  key={x.key}
                  className='flex h-full flex-col items-center justify-end gap-1'
                >
                  <span className='flex w-full flex-1 flex-col items-center justify-end gap-1'>
                    <span className='font-mono text-[10.5px] text-muted-foreground tabular-nums'>
                      {x.v
                        ? x.v >= 1000
                          ? `${(x.v / 1000).toFixed(1)}k`
                          : x.v
                        : ''}
                    </span>
                    <span
                      className={cn(
                        'block w-full max-w-7',
                        x.key === today ? 'bg-brand' : 'bg-border'
                      )}
                      style={{ height: `${Math.max(2, (x.v / max) * 82)}%` }}
                      aria-hidden='true'
                    />
                  </span>
                  <span className='text-[11px] text-muted-foreground'>
                    {x.label}
                  </span>
                  <span className='sr-only'>{money(x.v)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  )
}
