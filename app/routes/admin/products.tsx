import type { Route } from './+types/products'

import { useState } from 'react'
import { toast } from 'sonner'

import { useAdmin } from '~/components/admin/admin-store'
import {
  AdminSwitch,
  Empty,
  FilterChips,
  PANEL,
  ROW_RULE,
  SearchField,
} from '~/components/admin/parts'
import { categoryName } from '~/lib/catalog'
import { type AdminProduct, avgCost, money, stockOf } from '~/lib/mock/admin'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => [{ title: '商品管理｜AndelNI' }]

const FILTERS = {
  all: { label: '全部', test: () => true },
  on: { label: '上架中', test: (p: AdminProduct) => p.active },
  off: { label: '已下架', test: (p: AdminProduct) => !p.active },
  out: { label: '缺貨', test: (p: AdminProduct) => stockOf(p) === 0 },
}
type Filter = keyof typeof FILTERS

export default function Products() {
  const { products, purchases, lowAt, openSheet, toggleActive } = useAdmin()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  const query = q.trim().toLowerCase()
  const list = products
    .filter(FILTERS[filter].test)
    .filter((p) => !query || (p.name + p.brand).toLowerCase().includes(query))

  return (
    <>
      <div className='flex flex-col gap-3'>
        <SearchField
          label='搜尋商品'
          value={q}
          placeholder='搜尋商品或品牌'
          onChange={setQ}
        />
        <FilterChips
          label='商品狀態'
          items={(Object.keys(FILTERS) as Filter[]).map((k) => ({
            key: k,
            label: FILTERS[k].label,
            count: products.filter(FILTERS[k].test).length,
          }))}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <section className={cn(PANEL, 'overflow-hidden')} aria-label='商品列表'>
        <ul>
          {list.map((p) => {
            const total = stockOf(p)
            const cost = avgCost(purchases, p.id)
            return (
              <li
                key={p.id}
                className={cn('flex items-center gap-3 px-4 py-3', ROW_RULE)}
              >
                <button
                  type='button'
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-3 text-left',
                    !p.active && 'opacity-55'
                  )}
                  onClick={() => openSheet({ type: 'product', id: p.id })}
                >
                  {p.images[0] ? (
                    <img
                      className='block size-[52px] flex-none bg-[#E4E4DE] object-cover'
                      src={p.images[0]}
                      alt=''
                    />
                  ) : (
                    <span className='grid size-[52px] flex-none place-items-center bg-tone-scent font-wordmark text-[26px] font-semibold text-muted-foreground'>
                      {p.brand.charAt(0)}
                    </span>
                  )}
                  <span className='flex min-w-0 flex-col gap-[3px]'>
                    <span className='truncate text-sm font-medium'>
                      {p.name}
                    </span>
                    <span className='truncate text-xs text-muted-foreground'>
                      {p.brand} · {categoryName(p.cat)} · {p.type}
                      {cost
                        ? ` · 毛利 ${Math.round(((p.price - cost) / p.price) * 100)}%`
                        : ''}
                    </span>
                    <span className='flex gap-2.5 font-mono text-[12.5px] tabular-nums'>
                      <span>{money(p.price)}</span>
                      <span
                        className={
                          total === 0
                            ? 'text-brand'
                            : total <= lowAt
                              ? 'text-[#7a4a0c]'
                              : 'text-muted-foreground'
                        }
                      >
                        庫存 {total}
                        {p.variants && `（${p.variants.options.length} 款）`}
                      </span>
                    </span>
                  </span>
                </button>
                <div className='flex min-w-12 flex-none flex-col items-center gap-1'>
                  <AdminSwitch
                    checked={p.active}
                    aria-label={`${p.name} 上架`}
                    onCheckedChange={() => {
                      toggleActive(p.id)
                      toast(
                        p.active ? `已下架：${p.name}` : `已上架：${p.name}`
                      )
                    }}
                  />
                  <span
                    className='text-[11px] text-muted-foreground'
                    aria-hidden='true'
                  >
                    {p.active ? '上架中' : '已下架'}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
        {!list.length && <Empty>沒有符合條件的商品</Empty>}
      </section>
    </>
  )
}
