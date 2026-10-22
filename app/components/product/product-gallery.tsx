import type { Product } from '~/lib/catalog'

import { useState } from 'react'

import { cn } from '~/lib/utils'

// 目前每個商品只有一張照片；其餘角度先用色塊佔位，等後台上傳實拍照再換掉
const SHOTS = [
  { name: '主圖', tone: 'bg-tone-table' },
  { name: '正面', tone: 'bg-tone-scent' },
  { name: '背面', tone: 'bg-tone-textile' },
  { name: '細節', tone: 'bg-tone-object' },
] as const

const shotNo = (i: number) => String(i + 1).padStart(2, '0')

export function ProductGallery({
  product: p,
  soldOut,
}: {
  product: Product
  soldOut: boolean
}) {
  const [shot, setShot] = useState(0)
  const cur = SHOTS[shot]
  const alt =
    `${p.brand} ${p.name}` +
    (p.variants ? `，${p.variants.options.map((o) => o.label).join('、')}` : '')

  return (
    <section
      className='flex min-w-0 flex-col gap-3 py-6 lg:border-r lg:border-border lg:pr-6'
      aria-label='商品照片'
    >
      <figure
        className={cn(
          'relative m-0 aspect-square overflow-hidden border border-line',
          cur.tone
        )}
      >
        {shot === 0 ? (
          <img
            className='absolute inset-0 size-full object-cover'
            alt={alt}
            src={p.image}
          />
        ) : (
          <span className='absolute inset-0 grid place-items-center font-mono text-sm text-caption'>
            [商品照] {cur.name}
          </span>
        )}
        {soldOut && (
          <span className='absolute inset-0 grid place-items-center bg-background/55'>
            <span className='border border-line bg-background px-4 py-2 text-base font-medium'>
              已售出
            </span>
          </span>
        )}
        <figcaption className='absolute inset-x-0 bottom-0 flex justify-between border-t border-line bg-background px-3.5 py-2.5 font-mono text-xs'>
          <span>
            FIG.{shotNo(shot)} — {cur.name}
          </span>
          <span>
            {shotNo(shot)} / {shotNo(SHOTS.length - 1)}
          </span>
        </figcaption>
      </figure>

      <div className='grid grid-cols-4 gap-2 sm:gap-3'>
        {SHOTS.map((s, i) => {
          const on = i === shot
          return (
            <button
              key={s.name}
              type='button'
              className={cn(
                'relative flex aspect-square items-end overflow-hidden p-1.5 text-left font-mono text-[11px] leading-tight text-caption sm:p-2',
                s.tone,
                on ? 'border-2 border-line' : 'border border-border'
              )}
              aria-label={`照片 ${shotNo(i)}：${s.name}`}
              aria-pressed={on}
              onClick={() => setShot(i)}
            >
              {i === 0 && (
                <img
                  className='absolute inset-0 size-full object-cover'
                  alt=''
                  loading='lazy'
                  src={p.image}
                />
              )}
              <span
                className={cn('relative', i === 0 && 'bg-background/85 px-1')}
              >
                {shotNo(i)} {s.name}
                {i > 0 && (
                  <span className='hidden sm:inline'>
                    <br />
                    [商品照]
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
