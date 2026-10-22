import { useState } from 'react'

import { type User } from '~/lib/auth'
import { MOCK_ADDRESSES } from '~/lib/mock/account'
import { cn } from '~/lib/utils'

/** 收件資訊：預設門市／地址，結帳時自動帶入 */
export function Addresses({ user }: { user: User }) {
  const [list, setList] = useState(MOCK_ADDRESSES)
  const [def, setDef] = useState(MOCK_ADDRESSES[0].id)

  return (
    <div className='grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4'>
      {list.map((a) => {
        const isDefault = a.id === def
        return (
          <div
            key={a.id}
            className={cn(
              'flex flex-col gap-2 bg-[#FBFBF9] p-[18px]',
              isDefault ? 'border-2 border-line' : 'border border-border'
            )}
          >
            <div className='flex items-baseline justify-between'>
              <span className='font-mono text-xs text-brand'>{a.type}</span>
              {isDefault && (
                <span className='bg-primary px-2 py-0.5 text-xs text-primary-foreground'>
                  預設
                </span>
              )}
            </div>
            <span className='text-base font-medium'>{a.title}</span>
            <span className='text-sm text-caption'>
              {user.name}・<span className='font-mono'>{user.phone}</span>
            </span>
            <div className='mt-auto flex gap-5 pt-1'>
              {!isDefault && (
                <button
                  type='button'
                  className='min-h-11 text-[13px] underline underline-offset-4'
                  onClick={() => setDef(a.id)}
                >
                  設為預設
                </button>
              )}
              <button
                type='button'
                className='min-h-11 text-[13px] text-muted-foreground underline underline-offset-4'
                aria-label={`刪除 ${a.title}`}
                onClick={() => {
                  const rest = list.filter((x) => x.id !== a.id)
                  setList(rest)
                  if (isDefault && rest[0]) setDef(rest[0].id)
                }}
              >
                刪除
              </button>
            </div>
          </div>
        )
      })}
      <p className='m-0 grid min-h-[140px] place-items-center border border-dashed border-[#8E8E87] p-5 text-center text-sm leading-[1.7] text-muted-foreground'>
        結帳時選擇的門市與宅配地址
        <br />
        會自動存到這裡。
      </p>
    </div>
  )
}
