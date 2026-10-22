import { Heart } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useCart } from '~/lib/cart'
import {
  categoryName,
  formatPrice,
  isCustomOrder,
  isSoldOut,
  type Product,
  productNo,
  productPath,
} from '~/lib/catalog'
import { cn } from '~/lib/utils'

const TONE: Record<Product['cat'], string> = {
  bag: 'bg-tone-table',
  slg: 'bg-tone-scent',
  acc: 'bg-tone-object',
  rtw: 'bg-tone-textile',
  shoes: 'bg-tone-light',
  doll: 'bg-tone-acc',
  beauty: 'bg-tone-object',
}

function stockNote(p: Product) {
  if (isCustomOrder(p)) return { text: '約 [X] 週到貨', low: false }
  if (p.kind === '部分現貨') return { text: '部分現貨', low: false }
  if (isSoldOut(p)) return { text: '可登記到貨通知', low: false }
  if (!p.variantSummary && p.stock <= 4)
    return { text: `剩 ${p.stock} 件`, low: true }
  return { text: p.variantSummary ?? '現貨', low: false }
}

/** 型錄格線卡片：外框由父層 grid 的 border-l / border-t 搭配本身的 border-r / border-b 組成 */
export function ProductCard({ product: p }: { product: Product }) {
  const { add, wish, toggleWish } = useCart()
  const [added, setAdded] = useState(false)
  const soldOut = isSoldOut(p)
  const custom = isCustomOrder(p)
  const wished = wish.includes(p.id)
  const note = stockNote(p)
  const href = productPath(p)
  // 有規格的商品要到商品頁選規格
  const needsVariant = !!p.variants

  return (
    <article className='flex flex-col gap-3 border-r border-b border-border p-3.5 pb-4'>
      <div className='flex justify-between font-mono text-[11.5px] text-muted-foreground'>
        <span>No.{productNo(p)}</span>
        <span>
          {categoryName(p.cat)}・
          <span className={cn(custom && 'text-brand')}>{p.kind}</span>
        </span>
      </div>
      <Link
        className={cn(
          'relative block aspect-square overflow-hidden',
          TONE[p.cat]
        )}
        aria-label={p.name}
        to={href}
      >
        <img
          className='absolute inset-0 size-full object-cover'
          alt={`${p.brand} ${p.name}`}
          loading='lazy'
          src={p.image}
        />
        {p.isNew && (
          <span className='absolute top-2.5 left-2.5 bg-brand px-2 py-1 text-xs font-medium text-brand-foreground'>
            新品
          </span>
        )}
        {soldOut && (
          <span className='absolute inset-0 grid place-items-center bg-background/55'>
            <span className='border border-line bg-background px-3 py-1.5 text-[13px] font-medium'>
              已售完
            </span>
          </span>
        )}
      </Link>
      <div className='flex flex-1 flex-col gap-1'>
        <span className='font-display text-[11.5px] tracking-[0.06em] text-muted-foreground uppercase [font-stretch:112%]'>
          {p.brand}
        </span>
        <Link className='text-base leading-[1.45] font-medium' to={href}>
          {p.name}
        </Link>
      </div>
      <div className='flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-t border-border pt-2.5'>
        <span className='font-mono text-[15px] font-medium'>
          {formatPrice(p.price)}
        </span>
        <span
          className={cn(
            'text-xs',
            note.low ? 'text-brand' : 'text-muted-foreground'
          )}
        >
          {note.text}
        </span>
      </div>
      <div className='flex gap-1.5'>
        {needsVariant && !soldOut ? (
          <Link
            className='flex min-h-11 flex-1 items-center justify-center border border-line text-sm font-medium hover:bg-accent'
            to={href}
          >
            選擇規格
          </Link>
        ) : (
          <button
            type='button'
            className={cn(
              'min-h-11 flex-1 border text-sm font-medium',
              soldOut
                ? 'border-border bg-disabled text-disabled-foreground'
                : added
                  ? 'border-line bg-primary text-primary-foreground'
                  : 'border-line hover:bg-accent'
            )}
            disabled={soldOut}
            onClick={() => {
              add(p.id)
              setAdded(true)
            }}
          >
            {soldOut ? '已售完' : added ? '✓ 已加入' : '+ 加入購物車'}
          </button>
        )}
        <button
          type='button'
          className={cn(
            'grid min-h-11 w-11 place-items-center border border-line',
            wished && 'text-brand'
          )}
          aria-label={`收藏 ${p.name}`}
          aria-pressed={wished}
          onClick={() => toggleWish(p.id)}
        >
          <Heart
            className='size-[18px]'
            aria-hidden
            fill={wished ? 'currentColor' : 'none'}
            strokeWidth={1.6}
          />
        </button>
      </div>
    </article>
  )
}

/** 卡片格線容器 */
export function ProductGrid({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 border-t border-l border-t-line border-l-border sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]',
        className
      )}
      {...props}
    />
  )
}
