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
  const [password, setPassword] = useState('')
  // 驗證碼寄到的信箱；有值表示在第二步
  const [sentTo, setSentTo] = useState('')

  // 沒有 code：密碼對就寄驗證碼；有 code：登入
  async function send(code?: string) {
    setPending(true)
    setError('')
    const res = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, password }),
    }).catch(() => null)
    const body = (await res?.json().catch(() => null)) as {
      email?: string
      error?: string
    } | null
    if (res?.status === 204) {
      // 整頁導向，讓伺服器帶著新 cookie 重新檢查
      window.location.assign(safeNext(params.get('next')))
      return
    }
    if (res?.status === 202) setSentTo(body?.email ?? '')
    else setError(body?.error ?? '連線失敗，請稍後再試')
    setPending(false)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = new FormData(e.currentTarget).get('code')
    void send(code == null ? undefined : String(code))
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
        </div>
        <form className='flex flex-col gap-5 px-6 py-7' onSubmit={onSubmit}>
          <h1 className='text-[28px] font-black tracking-[-0.02em]'>
            登入<span className='text-brand'>。</span>
          </h1>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='admin-password'>密碼</Label>
            <Input
              id='admin-password'
              type='password'
              name='password'
              required
              autoComplete='current-password'
              readOnly={!!sentTo}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {sentTo && (
            <div className='flex flex-col gap-2'>
              <Label htmlFor='admin-code'>Email 驗證碼</Label>
              <Input
                id='admin-code'
                name='code'
                className='font-mono text-lg tracking-[0.3em]'
                required
                // eslint-disable-next-line jsx-a11y/no-autofocus -- 寄出後直接輸入驗證碼
                autoFocus
                autoComplete='one-time-code'
                inputMode='numeric'
                maxLength={6}
                pattern='\d{6}'
                placeholder='000000'
              />
              <p className='text-xs text-muted-foreground'>
                已寄到 {sentTo}，10 分鐘內有效。
                <button
                  type='button'
                  className='ml-1 underline underline-offset-2'
                  disabled={pending}
                  onClick={() => void send()}
                >
                  重新寄送
                </button>
              </p>
            </div>
          )}
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
            {pending ? '請稍候…' : sentTo ? '登入' : '寄驗證碼'}{' '}
            <span aria-hidden='true'>→</span>
          </Button>
        </form>
      </div>
    </main>
  )
}
