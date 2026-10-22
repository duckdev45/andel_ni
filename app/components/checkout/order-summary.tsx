import { Link } from 'react-router'

import { cn } from '~/lib/utils'

/** 右側訂單摘要外框：墨黑邊框＋淡底 */
export function SummaryPanel({
  title,
  aside,
  children,
  className,
  ...props
}: React.ComponentProps<'aside'> & { aside?: React.ReactNode }) {
  return (
    <aside
      className={cn(
        'min-w-0 flex-[1_1_340px] border border-line bg-[#FBFBF9]',
        className
      )}
      {...props}
    >
      <div className='flex items-baseline justify-between gap-3 border-b border-line px-5 py-[18px]'>
        <h2 className='m-0 text-lg font-black'>{title}</h2>
        {aside}
      </div>
      {children}
    </aside>
  )
}

export function SummaryRow({
  label,
  children,
  className,
}: {
  label: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex justify-between gap-3 border-b border-[#E4E4DE] py-3',
        className
      )}
    >
      <dt className='shrink-0'>{label}</dt>
      <dd className='m-0 text-right font-mono'>{children}</dd>
    </div>
  )
}

export function SummaryTotal({
  label,
  amount,
}: {
  label: string
  amount: string
}) {
  return (
    <div className='flex items-baseline justify-between gap-3 pt-4 pb-3.5'>
      <dt className='font-bold'>{label}</dt>
      <dd className='m-0 font-display text-[28px] font-extrabold [font-stretch:112%]'>
        {amount}
      </dd>
    </div>
  )
}

/** 規格 9：含客訂／代購商品時的鑑賞期說明 */
export function CustomOrderNotice({
  children,
}: {
  children?: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-1.5 border border-brand px-3.5 py-3 text-[13px] leading-[1.7]'>
      <span className='font-mono text-[11.5px] text-brand'>
        含客訂／代購商品
      </span>
      <span>
        客訂商品依需求海外採購，下單後無法取消，不適用 7 天鑑賞期。收到後請於 48
        小時內全程開箱錄影。
      </span>
      <Link className='self-start underline' to='/policy/returns'>
        退換貨政策
      </Link>
      {children}
    </div>
  )
}
