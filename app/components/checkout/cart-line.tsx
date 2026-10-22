import { Minus, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { type CartItem, useCart } from '~/lib/cart'
import { formatPrice, getProduct, productNo } from '~/lib/catalog'
import { isCustomLine, lineKind, maxQty, optionText } from '~/lib/mock/checkout'
import { cn } from '~/lib/utils'

export function CartLine({ item }: { item: CartItem }) {
  const { setQty, remove } = useCart()
  const { product: p, variant, qty } = item
  const max = maxQty(item)
  const atMax = qty >= max
  const href = `/products/${p.id}`

  return (
    <article className='flex flex-wrap items-center gap-x-5 gap-y-4 border-b border-border py-5'>
      <Link
        className='relative size-24 shrink-0 overflow-hidden bg-tone-object'
        aria-label={p.name}
        to={href}
      >
        <img
          className='absolute inset-0 size-full object-cover'
          alt=''
          src={p.image}
        />
      </Link>
      <div className='flex min-w-0 flex-[1_1_220px] flex-col gap-1.5'>
        <span className='font-mono text-[11.5px] text-muted-foreground'>
          No.{productNo(p)}・
          <span className='font-display tracking-[0.06em] uppercase [font-stretch:112%]'>
            {p.brand}
          </span>
        </span>
        <Link className='text-[17px] leading-[1.4] font-medium' to={href}>
          {p.name}
        </Link>
        <span className='text-[13px] text-muted-foreground'>
          <span
            className={cn('font-medium', isCustomLine(item) && 'text-brand')}
          >
            {lineKind(item)}
          </span>
          ・{optionText(item)}・單價 {formatPrice(p.price)}
        </span>
        {atMax && (
          <span className='text-xs text-brand'>已達可購買上限（{max} 件）</span>
        )}
      </div>
      <div className='flex shrink-0 items-center gap-4'>
        <div
          className='flex items-center border border-line'
          aria-label={`${p.name} 數量`}
          role='group'
        >
          <button
            type='button'
            className='grid size-11 place-items-center disabled:text-[#B5B5AE]'
            aria-label='減少數量'
            disabled={qty <= 1}
            onClick={() => setQty(p.id, variant, qty - 1)}
          >
            <Minus className='size-4' aria-hidden strokeWidth={1.6} />
          </button>
          <span
            className='min-w-8 text-center font-mono text-[15px]'
            aria-live='polite'
          >
            {qty}
          </span>
          <button
            type='button'
            className='grid size-11 place-items-center disabled:text-[#B5B5AE]'
            aria-label='增加數量'
            disabled={atMax}
            onClick={() => setQty(p.id, variant, qty + 1)}
          >
            <Plus className='size-4' aria-hidden strokeWidth={1.6} />
          </button>
        </div>
        <button
          type='button'
          className='min-h-11 px-1 text-[13px] text-muted-foreground underline'
          aria-label={`移除 ${p.name}`}
          onClick={() => remove(p.id, variant)}
        >
          移除
        </button>
      </div>
      <span className='ml-auto shrink-0 text-right font-mono text-base font-medium sm:basis-[120px]'>
        {formatPrice(p.price * qty)}
      </span>
    </article>
  )
}

/** 「一起帶走」加購：有規格的商品帶第一個有庫存的規格 */
export function AddonItem({ productId }: { productId: string }) {
  const { add } = useCart()
  const p = getProduct(productId)
  if (!p) return null
  const variant = p.variants
    ? (p.variants.options.find((o) => o.stock > 0) ?? p.variants.options[0])
        .label
    : undefined
  const name = variant ? `${p.name}（${variant}）` : p.name

  return (
    <div className='flex items-center gap-3 border-r border-b border-border p-3'>
      <span
        className='relative size-15 shrink-0 overflow-hidden bg-tone-object'
        aria-hidden='true'
      >
        <img
          className='absolute inset-0 size-full object-cover'
          alt=''
          src={p.image}
        />
      </span>
      <span className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='text-sm leading-[1.35] font-medium'>{name}</span>
        <span className='font-mono text-[13px]'>{formatPrice(p.price)}</span>
      </span>
      <button
        type='button'
        className='grid size-11 shrink-0 place-items-center border border-line hover:bg-muted'
        aria-label={`加入 ${name}`}
        onClick={() => add(p.id, variant)}
      >
        <Plus className='size-5' aria-hidden strokeWidth={1.6} />
      </button>
    </div>
  )
}
