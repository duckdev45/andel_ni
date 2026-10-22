import { cn } from '~/lib/utils'

/** 頁面大標：粗黑體＋品牌色句點，例如「購物車。」 */
export function PageTitle({
  children,
  className,
  ...props
}: React.ComponentProps<'h1'>) {
  return (
    <h1
      className={cn(
        'm-0 text-[clamp(36px,4.4vw,60px)] leading-[1.1] font-black tracking-[-0.02em]',
        className
      )}
      {...props}
    >
      {children}
      <span className='text-brand'>。</span>
    </h1>
  )
}

/** 區塊標題：中文粗體＋寬體英文小標，例如「分類 CATEGORIES」 */
export function SectionTitle({
  children,
  en,
  className,
  ...props
}: React.ComponentProps<'h2'> & { en?: string }) {
  return (
    <h2
      className={cn('m-0 text-[28px] font-black tracking-[-0.01em]', className)}
      {...props}
    >
      {children}
      {en && (
        <span className='ml-2 font-display text-sm font-semibold tracking-[0.06em] text-muted-foreground [font-stretch:125%]'>
          {en}
        </span>
      )}
    </h2>
  )
}

/** 等寬小字標籤，例如「01 / 運送」「RETURNS & EXCHANGES」 */
export function Eyebrow({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('font-mono text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}
