import { Link } from 'react-router'

import {
  BRANDS,
  CATEGORIES,
  formatPrice,
  FREE_SHIPPING_THRESHOLD,
  isCustomOrder,
  isSoldOut,
  type Product,
  productNo,
  SHIPPING_FEES,
} from '~/lib/catalog'
import { cn } from '~/lib/utils'

const fmt = (n: number) => n.toLocaleString('en-US')

/** 無規格商品的庫存／到貨提示；有規格的看規格格子 */
function availability(p: Product) {
  if (isCustomOrder(p)) return { text: '可客訂・約 [X] 週到貨', low: false }
  if (isSoldOut(p)) return { text: '已售完', low: false }
  if (p.variants) return null
  if (p.stock <= 3) return { text: `現貨・剩 ${p.stock} 件`, low: true }
  return { text: '現貨', low: false }
}

export function ProductHeading({ product: p }: { product: Product }) {
  const custom = isCustomOrder(p)
  const cat = CATEGORIES.find((c) => c.id === p.cat)
  const note = availability(p)

  return (
    <>
      <div className='flex items-start justify-between gap-3 font-mono text-xs text-muted-foreground'>
        <span>
          No.{productNo(p)} / {cat?.name} / {cat?.en}
        </span>
        <span
          className={cn(
            'shrink-0 border px-2 py-[3px] font-sans',
            custom ? 'border-brand text-brand' : 'border-muted-foreground'
          )}
        >
          {p.kind}
        </span>
      </div>
      <div className='flex flex-col gap-2.5'>
        <Link
          className='self-start font-display text-[13px] font-bold tracking-[0.08em] uppercase [font-stretch:118%]'
          to='/#brands'
        >
          {p.brand} ↗
        </Link>
        <h1
          id='pname'
          className='m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.15] font-black tracking-[-0.02em]'
        >
          {p.name}
        </h1>
        <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
          <span className='font-display text-[30px] font-bold [font-stretch:112%]'>
            {formatPrice(p.price)}
          </span>
          {note && (
            <span
              className={cn(
                'font-mono text-xs',
                note.low ? 'text-brand' : 'text-muted-foreground'
              )}
            >
              {note.text}
            </span>
          )}
        </div>
      </div>
    </>
  )
}

const ROW_DT = 'flex-[0_0_88px] pt-0.5 font-mono text-xs text-muted-foreground'

/** 規格表＋運送付款（規格 6.3／6.4）＋商品說明＋品牌卡 */
export function ProductSpecs({ product: p }: { product: Product }) {
  const rows: [string, string][] = [
    ...p.specs,
    [
      '運送',
      `超商取貨（7-ELEVEN・全家）NT$${SHIPPING_FEES.cvs}・黑貓宅配 NT$${SHIPPING_FEES.home}，滿 NT$${fmt(FREE_SHIPPING_THRESHOLD)} 免運`,
    ],
    [
      '付款',
      '信用卡一次付清・Apple Pay・ATM 虛擬帳號・無卡分期（銀角零卡／裕富）',
    ],
  ]
  const brand = BRANDS.find((b) => b.name === p.brand)

  return (
    <>
      <dl className='m-0 border-t border-line text-sm'>
        {rows.map(([k, v]) => (
          <div key={k} className='flex gap-4 border-b border-border py-3'>
            <dt className={ROW_DT}>{k}</dt>
            <dd className='m-0'>{v}</dd>
          </div>
        ))}
      </dl>

      <div className='flex flex-col gap-2.5'>
        <h2 className='m-0 text-sm font-bold'>商品說明</h2>
        <p className='m-0 text-[15px] leading-[1.85]'>{p.description}</p>
      </div>

      <Link
        className='flex items-center gap-4 bg-inverse p-4 text-inverse-foreground'
        to='/#brands'
      >
        <span className='flex flex-1 flex-col gap-1'>
          <span className='font-display text-lg font-extrabold [font-stretch:118%]'>
            {p.brand}
          </span>
          <span className='text-[13px] leading-[1.6] text-inverse-body'>
            {brand?.blurb ??
              (brand ? `來自${brand.origin}的品牌。` : '[品牌介紹]')}
          </span>
        </span>
        <span className='text-lg text-inverse-accent' aria-hidden>
          →
        </span>
      </Link>
    </>
  )
}
