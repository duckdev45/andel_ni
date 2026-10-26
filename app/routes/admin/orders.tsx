import type { Route } from './+types/orders'

import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { useAdmin } from '~/components/admin/admin-store'
import {
  Empty,
  FilterChips,
  PANEL,
  ROW_RULE,
  SearchField,
  StatusBadge,
} from '~/components/admin/parts'
import {
  money,
  type OrderStatus,
  orderSummary,
  PAY,
  SHIP,
  STATUS,
  STATUS_ORDER,
} from '~/lib/admin'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => [{ title: '訂單管理｜AndelNI' }]

type Filter = 'all' | OrderStatus

export default function Orders() {
  const { orders, openSheet } = useAdmin()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const raw = params.get('status')
  const filter: Filter =
    raw && STATUS_ORDER.includes(raw as OrderStatus)
      ? (raw as OrderStatus)
      : 'all'

  const query = q.trim().toLowerCase()
  const list = orders
    .filter((o) => filter === 'all' || o.status === filter)
    .filter(
      (o) =>
        !query ||
        (o.id + o.customer.name + o.customer.phone)
          .toLowerCase()
          .includes(query)
    )

  const chips = [
    { key: 'all' as Filter, label: '全部', count: orders.length },
    ...STATUS_ORDER.map((s) => ({
      key: s as Filter,
      label: STATUS[s].label,
      count: orders.filter((o) => o.status === s).length,
    })),
  ]

  return (
    <>
      <div className='flex flex-col gap-3'>
        <SearchField
          label='搜尋訂單'
          value={q}
          placeholder='搜尋訂單編號、姓名、電話'
          onChange={setQ}
        />
        <FilterChips
          label='訂單狀態'
          items={chips}
          value={filter}
          onChange={(k) =>
            setParams(k === 'all' ? {} : { status: k }, { replace: true })
          }
        />
      </div>

      <section className={cn(PANEL, 'overflow-hidden')} aria-label='訂單列表'>
        <ul>
          {list.map((o) => (
            <li key={o.id}>
              <button
                type='button'
                className={cn(
                  'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 text-left hover:bg-background',
                  ROW_RULE
                )}
                onClick={() => openSheet({ type: 'order', id: o.id })}
              >
                <span className='truncate text-[14.5px] font-medium'>
                  {o.customer.name}{' '}
                  <span className='font-mono text-xs font-normal text-muted-foreground tabular-nums'>
                    {o.id} · {o.date.slice(5)}
                  </span>
                </span>
                <span className='justify-self-end font-mono text-[14.5px] font-medium tabular-nums'>
                  {money(o.total)}
                </span>
                <span className='truncate text-[13px] text-[#2E2E2A]'>
                  {orderSummary(o)}
                </span>
                <StatusBadge className='justify-self-end' status={o.status} />
                <span className='text-xs text-[#6B6B65]'>
                  {PAY[o.pay]} · {SHIP[o.ship.method]}
                  {o.tracking && (
                    <span className='hidden sm:inline'> · {o.tracking}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!list.length && <Empty>沒有符合條件的訂單</Empty>}
      </section>
    </>
  )
}
