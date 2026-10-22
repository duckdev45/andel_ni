import type { Route } from './+types/login'

import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export const meta: Route.MetaFunction = () => [
  { title: '後台登入｜AndelNI' },
  { name: 'robots', content: 'noindex' },
]

// 只允許導回後台內的路徑
const safeNext = (next: string | null) =>
  next && /^\/admin(\/|$)/.test(next) ? next : '/admin'

export default function AdminLogin() {
  const [params] = useSearchParams()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setPending(true)
    setError('')
    const res = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: data.get('password'),
        code: String(data.get('code') ?? '').replace(/\D/g, ''),
      }),
    }).catch(() => null)
    if (res?.ok) {
      // 整頁導向，讓伺服器帶著新 cookie 重新檢查
      window.location.assign(safeNext(params.get('next')))
      return
    }
    const body = (await res?.json().catch(() => null)) as {
      error?: string
    } | null
    setError(body?.error ?? '連線失敗，請稍後再試')
    setPending(false)
  }

  return (
    <main className='grid min-h-svh place-items-center bg-[#FBFBF9] px-4 py-12'>
      <div className='w-full max-w-sm border border-line bg-background'>
        <div className='flex items-center gap-3 border-b border-line px-6 py-5'>
          <span
            className='block h-6 w-8 bg-brand logo-mark'
            aria-hidden='true'
          />
          <span className='font-wordmark text-lg font-semibold tracking-[0.24em]'>
            ANDEL NI
          </span>
          <span className='ml-auto font-mono text-xs text-muted-foreground'>
            ADMIN
          </span>
        </div>
        <form className='flex flex-col gap-5 px-6 py-7' onSubmit={onSubmit}>
          <h1 className='text-[28px] font-black tracking-[-0.02em]'>
            後台登入<span className='text-brand'>。</span>
          </h1>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='admin-password'>密碼</Label>
            <Input
              id='admin-password'
              type='password'
              name='password'
              required
              autoComplete='current-password'
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='admin-code'>驗證器 App 的 6 位數碼</Label>
            <Input
              id='admin-code'
              name='code'
              className='font-mono text-lg tracking-[0.3em]'
              required
              autoComplete='one-time-code'
              inputMode='numeric'
              maxLength={7}
              pattern='\d{3} ?\d{3}'
              placeholder='000000'
            />
          </div>
          {error && (
            <p className='text-sm text-brand' role='alert'>
              {error}
            </p>
          )}
          <Button
            type='submit'
            className='justify-between'
            disabled={pending}
            size='lg'
          >
            {pending ? '登入中…' : '登入'} <span aria-hidden='true'>→</span>
          </Button>
          <p className='font-mono text-xs leading-relaxed text-muted-foreground'>
            登入保留 7 天。忘記密碼或換手機：用 pnpm admin:setup 重設。
          </p>
        </form>
      </div>
    </main>
  )
}
