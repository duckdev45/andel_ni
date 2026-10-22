import type { Route } from './+types/stock'

import { useSearchParams } from 'react-router'

import { useAdmin } from '~/components/admin/admin-store'
import {
  Empty,
  FilterChips,
  PANEL,
  ROW_RULE,
  Stepper,
} from '~/components/admin/parts'
import { type Sku, skusOf } from '~/lib/mock/admin'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => [{ title: '庫存管理｜AndelNI' }]

type Filter = 'all' | 'low' | 'out'

export default function Stock() {
  const { products, lowAt, setLowAt, adjustStock, openSheet } = useAdmin()
  const [params, setParams] = useSearchParams()
  const raw = params.get('filter')
  const filter: Filter = raw === 'low' || raw === 'out' ? raw : 'all'

  const tests: Record<Filter, (k: Sku) => boolean> = {
    all: () => true,
    low: (k) => k.stock > 0 && k.stock <= lowAt,
    out: (k) => k.stock === 0,
  }
  const skus = skusOf(products)
  const list = skus.filter(tests[filter])

  return (
    <>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <FilterChips
          label='庫存狀態'
          items={(
            [
              ['all', '全部'],
              ['low', '庫存偏低'],
              ['out', '缺貨'],
            ] as const
          ).map(([key, label]) => ({
            key,
            label,
            count: skus.filter(tests[key]).length,
          }))}
          value={filter}
          onChange={(k) =>
            setParams(k === 'all' ? {} : { filter: k }, { replace: true })
          }
        />
        <div className='flex items-center gap-2 text-[13px] text-[#2E2E2A]'>
          <span>低庫存提醒 ≤</span>
          <Stepper
            className='h-11 bg-[#FBFBF9] lg:h-9'
            label='低庫存提醒門檻'
            value={lowAt}
            valueClassName='min-w-5 font-normal'
            onChange={(d) => setLowAt(lowAt + d)}
          />
          <span>件</span>
        </div>
      </div>

      <section className={cn(PANEL, 'overflow-hidden')} aria-label='庫存列表'>
        <ul>
          {list.map((k) => {
            const name = `${k.product.name}${k.opt ? ` ${k.opt}` : ''}`
            const out = k.stock === 0
            const low = !out && k.stock <= lowAt
            return (
              <li
                key={k.product.id + (k.opt ?? '')}
                className={cn(
                  'flex items-center gap-2.5 py-2.5 pr-3 pl-4',
                  ROW_RULE,
                  !k.product.active && 'opacity-55'
                )}
              >
                <div className='flex min-w-0 flex-1 flex-col gap-[3px]'>
                  <span className='truncate text-[13.5px]'>
                    {k.product.name}
                  </span>
                  <span className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                    {k.opt ?? '單一規格'}
                    {k.sku && <span className='font-mono'>· {k.sku}</span>}
                    <span className='text-[#8E8E87]'>· {k.product.type}</span>
                    {(out || low) && (
                      <span
                        className={cn(
                          'px-[7px] py-px text-[11px]',
                          out
                            ? 'bg-[#f1e1df] text-brand'
                            : 'bg-[#f3e6cf] text-[#7a4a0c]'
                        )}
                      >
                        {out ? '缺貨' : '庫存偏低'}
                      </span>
                    )}
                    {!k.product.active && <span>· 已下架</span>}
                  </span>
                </div>
                <Stepper
                  label={`${name} 庫存`}
                  value={k.stock}
                  valueClassName={
                    out ? 'text-brand' : low ? 'text-[#7a4a0c]' : ''
                  }
                  onChange={(d) => adjustStock(k.product.id, k.opt, d)}
                />
                <button
                  type='button'
                  className='h-11 flex-none border border-foreground px-3 text-[12.5px] whitespace-nowrap hover:bg-foreground hover:text-[#FBFBF9]'
                  aria-label={`進貨 ${name}`}
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
              </li>
            )
          })}
        </ul>
        {!list.length && <Empty>沒有符合條件的品項</Empty>}
      </section>
      <p className='text-[12.5px] leading-relaxed text-pretty text-muted-foreground'>
        ±
        用於盤點修正，不會記帳。實際進貨請按「進貨」，會同時寫入記帳簿的進貨紀錄。
      </p>
    </>
  )
}
