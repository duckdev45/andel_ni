import { Heart, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useCart } from '~/lib/cart'
import {
  CUSTOM_MAX_QTY,
  FREE_SHIPPING_THRESHOLD,
  isCustomOrder,
  isSoldOut,
  type Product,
  type VariantOption,
} from '~/lib/catalog'
import { cn } from '~/lib/utils'

/** 客訂／代購沒有庫存上限，單次最多訂幾件 */
const LOW_STOCK = 3

const fmt = (n: number) => n.toLocaleString('en-US')

function stockText(o: VariantOption, custom: boolean) {
  if (custom) return { text: '可客訂', low: false }
  if (o.stock === 0) return { text: '已售完', low: false }
  if (o.stock <= LOW_STOCK) return { text: `剩 ${o.stock} 件`, low: true }
  return { text: `庫存 ${o.stock}`, low: false }
}

/** 商品頁右欄：品名、價格、規格、數量、加入購物車、鑑賞期說明 */
export function ProductBuyBox({ product: p }: { product: Product }) {
  const { add, items, subtotal, toggleWish, wish } = useCart()
  const custom = isCustomOrder(p)
  const soldOut = isSoldOut(p)
  const options = p.variants?.options
  const [sel, setSel] = useState(() =>
    options ? options.findIndex((o) => custom || o.stock > 0) : -1
  )
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const variant = options?.[sel]
  const stock = custom ? CUSTOM_MAX_QTY : (variant?.stock ?? p.stock)
  // 購物車裡已有的同規格數量也算進庫存上限
  const inCart =
    items.find((i) => i.productId === p.id && i.variant === variant?.label)
      ?.qty ?? 0
  const remaining = custom ? CUSTOM_MAX_QTY : stock - inCart
  const shownQty = Math.max(1, Math.min(qty, remaining))
  const canAdd = !soldOut && remaining > 0 && (!options || !!variant)
  const lineTotal = p.price * shownQty
  const gap = FREE_SHIPPING_THRESHOLD - subtotal - (added ? 0 : lineTotal)
  const wished = wish.includes(p.id)

  const changeQty = (n: number) => {
    setQty(n)
    setAdded(false)
  }

  return (
    <div className='flex flex-col gap-6'>
      {options && (
        <fieldset className='m-0 flex flex-col gap-2.5 border-0 p-0'>
          <legend className='pb-2.5 text-sm font-medium'>
            {p.variants?.name}
            <span className='ml-3 font-mono text-xs font-normal text-muted-foreground'>
              已選：{variant?.label ?? '—'}
            </span>
          </legend>
          <div className='grid grid-cols-3 border-t border-l border-line'>
            {options.map((o, i) => {
              const on = i === sel
              const s = stockText(o, custom)
              const out = !custom && o.stock === 0
              return (
                <button
                  key={o.label}
                  type='button'
                  className={cn(
                    'flex min-h-[76px] min-w-0 flex-col justify-between gap-2 border-r border-b border-line p-2.5 text-left sm:p-3',
                    on
                      ? 'bg-primary text-primary-foreground'
                      : out
                        ? 'bg-disabled text-disabled-foreground'
                        : 'hover:bg-accent'
                  )}
                  aria-pressed={on}
                  disabled={out}
                  onClick={() => {
                    setSel(i)
                    setAdded(false)
                  }}
                >
                  <span className='flex items-center gap-2 text-[15px] font-medium'>
                    <span
                      className='size-3.5 rounded-full border border-foreground/20'
                      aria-hidden
                      style={{ background: o.swatch }}
                    />
                    {o.label}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs',
                      on
                        ? 'text-primary-foreground'
                        : s.low
                          ? 'text-brand'
                          : 'text-muted-foreground',
                      out && 'line-through'
                    )}
                  >
                    {s.text}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      <div className='flex flex-col gap-2'>
        <div className='flex flex-wrap gap-2.5'>
          <div
            className={cn(
              'flex items-center border border-line',
              !canAdd && 'border-border text-disabled-foreground'
            )}
            aria-label='數量'
            role='group'
          >
            <button
              type='button'
              className='grid h-[52px] w-11 place-items-center disabled:opacity-40'
              aria-label='減少數量'
              disabled={!canAdd || shownQty <= 1}
              onClick={() => changeQty(shownQty - 1)}
            >
              <Minus className='size-4' aria-hidden strokeWidth={1.6} />
            </button>
            <span
              className='min-w-9 text-center font-mono text-base'
              aria-live='polite'
            >
              {shownQty}
            </span>
            <button
              type='button'
              className='grid h-[52px] w-11 place-items-center disabled:opacity-40'
              aria-label='增加數量'
              disabled={!canAdd || shownQty >= remaining}
              onClick={() => changeQty(shownQty + 1)}
            >
              <Plus className='size-4' aria-hidden strokeWidth={1.6} />
            </button>
          </div>
          <button
            type='button'
            className={cn(
              'flex min-h-[54px] flex-[1_1_150px] items-center justify-between gap-3 px-5 text-base font-medium whitespace-nowrap',
              added
                ? 'bg-primary text-primary-foreground'
                : !canAdd
                  ? 'bg-disabled text-disabled-foreground'
                  : 'bg-brand text-brand-foreground hover:bg-brand/90'
            )}
            disabled={!canAdd}
            onClick={() => {
              add(p.id, variant?.label, shownQty)
              setAdded(true)
              setQty(1)
            }}
          >
            <span>
              {soldOut
                ? '已售完'
                : added
                  ? '✓ 已加入購物車'
                  : !canAdd
                    ? '已達庫存上限'
                    : '加入購物車'}
            </span>
            {canAdd && !added && (
              <span className='hidden font-mono text-sm sm:inline'>
                NT$ {fmt(lineTotal)}
              </span>
            )}
          </button>
          <button
            type='button'
            className={cn(
              'grid min-h-[54px] w-[54px] place-items-center border border-line',
              wished && 'text-brand'
            )}
            aria-label={wished ? '取消收藏' : '收藏'}
            aria-pressed={wished}
            onClick={() => toggleWish(p.id)}
          >
            <Heart
              className='size-5'
              aria-hidden
              fill={wished ? 'currentColor' : 'none'}
              strokeWidth={1.6}
            />
          </button>
        </div>
        {!soldOut && (
          <p
            className='m-0 flex flex-wrap justify-between gap-2 font-mono text-xs text-muted-foreground'
            aria-live='polite'
          >
            <span>
              {gap > 0
                ? `${added ? '購物車' : '加入後'}再買 NT$${fmt(gap)} 即可免運`
                : added
                  ? '購物車已達免運門檻'
                  : '加入後即達免運門檻'}
            </span>
            {added && (
              <Link className='border-b border-line text-foreground' to='/cart'>
                前往購物車 →
              </Link>
            )}
          </p>
        )}
      </div>

      {soldOut && (
        <div className='flex flex-wrap items-center justify-between gap-3 border border-line bg-muted px-4 py-3.5'>
          <p className='m-0 text-[13.5px] leading-[1.7]'>
            這件商品已售完，你可以看看下方的相似商品。
          </p>
          <a className='border-b border-line pb-px text-[13px]' href='#related'>
            看相似商品 ↓
          </a>
        </div>
      )}

      <KindNote product={p} />
    </div>
  )
}

/** 客訂／現貨的鑑賞期說明（規格 9：加入購物車處要說明） */
function KindNote({ product: p }: { product: Product }) {
  const custom = isCustomOrder(p)
  return (
    <div className='flex flex-col gap-1.5 border border-line px-4 py-3.5'>
      <span
        className={cn(
          'font-mono text-xs',
          custom ? 'text-brand' : 'text-muted-foreground'
        )}
      >
        {custom ? 'CUSTOM ORDER — 客訂／代購商品' : `IN STOCK — ${p.kind}商品`}
      </span>
      <p className='m-0 text-[13.5px] leading-[1.7]'>
        {custom
          ? '依你的需求海外採購，約 [X] 週到貨。下單後無法取消，不適用 7 天鑑賞期。收到後請於 48 小時內全程開箱錄影，若有重大非人為瑕疵，請憑完整影片聯絡客服。'
          : '享 7 天鑑賞期（非試用期），退回時須保持全新、內容物完整不得缺漏。'}
      </p>
      <Link
        className='self-start border-b border-line pb-px text-[13px]'
        to='/policy/returns'
      >
        退換貨政策 →
      </Link>
    </div>
  )
}
