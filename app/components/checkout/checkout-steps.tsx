import { Check } from 'lucide-react'

import { cn } from '~/lib/utils'

const STEPS = ['購物車', '登入', '填寫資料', '完成']

/** 結帳步驟：01 購物車 → 02 登入 → 03 填寫資料 → 04 完成 */
export function CheckoutSteps({
  current,
  loggedIn,
}: {
  current: number
  loggedIn?: boolean
}) {
  return (
    <nav className='border-b border-border' aria-label='結帳步驟'>
      <ol className='flex flex-wrap items-center gap-x-3.5 gap-y-1.5 py-3 font-mono text-[12.5px]'>
        {STEPS.map((label, i) => {
          const done = i < current || (i === 1 && loggedIn)
          return (
            <li
              key={label}
              className={cn(
                'flex items-center gap-3.5',
                i === current
                  ? 'font-medium text-foreground'
                  : done
                    ? 'text-muted-foreground'
                    : 'text-[#8E8E87]'
              )}
              aria-current={i === current ? 'step' : undefined}
            >
              <span className='flex items-center gap-1.5'>
                {String(i + 1).padStart(2, '0')} {label}
                {done && i !== current && (
                  <Check
                    className='size-3.5'
                    aria-label='已完成'
                    strokeWidth={1.6}
                  />
                )}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className='w-5 border-t border-border sm:w-8'
                  aria-hidden='true'
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
