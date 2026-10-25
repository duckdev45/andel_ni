import { Minus, Plus, Search } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'

import { Badge } from '~/components/ui/badge'
import { Switch } from '~/components/ui/switch'
import { num, type OrderStatus, STATUS } from '~/lib/admin'
import { cn } from '~/lib/utils'

/** 設計稿後台面板底色 */
export const PANEL = 'border border-border bg-[#FBFBF9]'
/** 面板內分隔線 */
export const ROW_RULE = 'border-b border-[#E4E4DE]'
/** 表單欄位外觀（設計稿：淺灰框、面板底） */
export const FIELD =
  'h-[46px] border-[#BDBDB6] bg-[#FBFBF9] text-[15px] md:text-[15px]'

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  const s = STATUS[status]
  return (
    <Badge
      className={cn(
        'rounded-none px-2.5 py-0.5 text-[11.5px] font-normal',
        className
      )}
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </Badge>
  )
}

export function FilterChips<K extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: { count: number; key: K; label: string }[]
  value: K
  onChange: (k: K) => void
}) {
  return (
    <div
      className='-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5'
      role='group'
      aria-label={label}
    >
      {items.map((c) => {
        const on = c.key === value
        return (
          <button
            key={c.key}
            type='button'
            className={cn(
              'h-11 flex-none border px-3.5 text-[13px] whitespace-nowrap lg:h-9',
              on
                ? 'border-foreground bg-foreground text-[#FBFBF9]'
                : 'border-[#BDBDB6] bg-[#FBFBF9] hover:border-foreground'
            )}
            aria-pressed={on}
            onClick={() => onChange(c.key)}
          >
            {c.label} <span className='font-mono'>{c.count}</span>
          </button>
        )
      })}
    </div>
  )
}

export function SearchField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <label className='flex h-11 items-center gap-2 border border-[#BDBDB6] bg-[#FBFBF9] px-3.5 focus-within:border-foreground'>
      <Search
        className='size-[18px] flex-none text-muted-foreground'
        strokeWidth={1.6}
        aria-hidden='true'
      />
      <span className='sr-only'>{label}</span>
      <input
        type='search'
        className='h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8E8E87]'
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function PanelHead({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn('flex items-center justify-between px-4 py-3.5', ROW_RULE)}
    >
      <h2 className='text-[14.5px] font-bold'>{title}</h2>
      {children}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className='px-4 py-10 text-center text-[13px] text-muted-foreground'>
      {children}
    </p>
  )
}

/** − 數量 + */
export function Stepper({
  label,
  value,
  className,
  valueClassName,
  onChange,
}: {
  label: string
  value: number
  className?: string
  valueClassName?: string
  onChange: (delta: number) => void
}) {
  return (
    <div
      className={cn(
        'flex h-11 flex-none items-center border border-[#BDBDB6]',
        className
      )}
      role='group'
      aria-label={label}
    >
      <button
        type='button'
        className='grid h-full w-10 place-items-center hover:bg-muted'
        aria-label='減少'
        onClick={() => onChange(-1)}
      >
        <Minus className='size-4' strokeWidth={1.6} />
      </button>
      <span
        className={cn(
          'min-w-[26px] text-center font-mono text-sm font-medium tabular-nums',
          valueClassName
        )}
        aria-live='polite'
      >
        {value}
      </span>
      <button
        type='button'
        className='grid h-full w-10 place-items-center hover:bg-muted'
        aria-label='增加'
        onClick={() => onChange(1)}
      >
        <Plus className='size-4' strokeWidth={1.6} />
      </button>
    </div>
  )
}

/** 設計稿的開關：44×26、開啟為墨綠 */
export function AdminSwitch(props: React.ComponentProps<typeof Switch>) {
  return (
    <Switch
      {...props}
      className={cn(
        'h-[26px]! w-11! border-0 shadow-none data-[state=checked]:bg-[#3f5640] data-[state=unchecked]:bg-[#C8C8C1]',
        '[&>span]:size-[22px]! [&>span]:bg-white! [&>span]:shadow-[0_1px_2px_rgba(0,0,0,.2)] [&>span]:data-[state=checked]:translate-x-5! [&>span]:data-[state=unchecked]:translate-x-0.5!',
        props.className
      )}
    />
  )
}

/** 數字輸入：保留輸入中的字串（例如「2.」），同時回報數值；離開欄位且有改動時呼叫 onCommit */
export function NumInput({
  value,
  className,
  onValue,
  onCommit,
  ...props
}: Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> & {
  value: number
  onValue: (n: number) => void
  onCommit?: () => void
}) {
  const [text, setText] = useState(String(value))
  const [dirty, setDirty] = useState(false)
  return (
    <input
      className={cn(
        'h-[38px] border border-[#BDBDB6] bg-background px-2 text-right font-mono text-sm tabular-nums outline-none focus:border-foreground',
        className
      )}
      inputMode='decimal'
      value={text}
      onBlur={() => {
        if (dirty) onCommit?.()
        setDirty(false)
      }}
      onChange={(e) => {
        setText(e.target.value)
        setDirty(true)
        onValue(num(e.target.value))
      }}
      {...props}
    />
  )
}

const subscribeDesktop = (cb: () => void) => {
  const m = window.matchMedia('(min-width: 1024px)')
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

/** 桌機（lg）以上 */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => true
  )
}

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className='flex min-w-0 flex-col gap-1.5'>
      <label className='text-[12.5px] text-muted-foreground' htmlFor={id}>
        {label}
      </label>
      {children}
      {error && <span className='text-xs text-brand'>{error}</span>}
    </div>
  )
}
