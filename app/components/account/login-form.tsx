import { useState } from 'react'
import { Link } from 'react-router'

import { TurnstilePlaceholder } from '~/components/account/auth-layout'
import { Field, isEmail } from '~/components/account/field'
import { Button } from '~/components/ui/button'
import { mockLogin } from '~/lib/auth'

/**
 * Email＋密碼登入（規格 D7、3.3）。結帳頁的登入視窗與 /login 共用。
 * 失敗訊息一律「Email 或密碼錯誤」，不透露帳號是否存在。
 */
export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [error, setError] = useState('')

  return (
    <form
      className='flex flex-col gap-4'
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const email = String(data.get('email') ?? '').trim()
        const password = String(data.get('password') ?? '')
        if (!isEmail(email) || password.length < 8) {
          setError('Email 或密碼錯誤')
          return
        }
        setError('')
        mockLogin(email)
        onSuccess?.()
      }}
    >
      <Field
        id='login-email'
        type='email'
        name='email'
        className='font-mono'
        required
        autoComplete='email'
        label='Email'
        placeholder='you@example.com'
      />
      <div className='flex flex-col gap-1.5'>
        <Field
          id='login-password'
          type='password'
          name='password'
          required
          autoComplete='current-password'
          label='密碼'
          minLength={8}
        />
        <Link
          className='self-end py-2 text-[13px] underline underline-offset-4'
          to='/forgot-password'
        >
          忘記密碼？
        </Link>
      </div>
      <TurnstilePlaceholder />
      {error && (
        <p className='m-0 text-[13px] text-brand' role='alert'>
          {error}
        </p>
      )}
      <Button
        type='submit'
        className='h-14 justify-between text-base'
        size='lg'
      >
        登入 <span aria-hidden='true'>→</span>
      </Button>
      <p className='m-0 font-mono text-xs text-muted-foreground'>
        登入狀態保留 30 天
      </p>
    </form>
  )
}
