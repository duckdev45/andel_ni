import type { Route } from './+types/register'

import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'

import {
  AuthAside,
  AuthHeading,
  AuthLayout,
  safeRedirect,
  TurnstilePlaceholder,
} from '~/components/account/auth-layout'
import { Field, isEmail, isPhone } from '~/components/account/field'
import { Button } from '~/components/ui/button'
import { useAuth, type User, useUser } from '~/lib/auth'
import { privateMeta } from '~/lib/seo'

export const meta: Route.MetaFunction = () => privateMeta('註冊')

const STEPS = ['填寫會員資料', '完成，開始購物']

/**
 * 規格 3.2：填資料 → 註冊完成並登入。
 * ponytail: Email 驗證碼步驟等寄信服務接好再加回來（原型在 git 紀錄）。
 */
export default function Register() {
  const user = useUser()
  const [params] = useSearchParams()
  const from = params.get('redirect')
  const redirect = safeRedirect(from)
  const qs = from ? `?redirect=${encodeURIComponent(redirect)}` : ''
  // 剛註冊完顯示歡迎畫面；已登入的人直接打開 /register 就導回來源頁
  const [joined, setJoined] = useState(false)

  if (user && !joined) return <Navigate replace to={redirect} />

  return (
    <AuthLayout
      aside={
        <AuthAside current={user ? 1 : 0} items={STEPS} title='註冊流程' />
      }
    >
      {user ? (
        <Done hasRedirect={!!from} redirect={redirect} user={user} />
      ) : (
        <RegisterForm loginHref={`/login${qs}`} onJoined={setJoined} />
      )}
    </AuthLayout>
  )
}

function RegisterForm({
  loginHref,
  onJoined,
}: {
  loginHref: string
  onJoined: (joined: boolean) => void
}) {
  const { register } = useAuth()
  const [v, setV] = useState({ email: '', name: '', password: '', phone: '' })
  const [tried, setTried] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const errors = {
    email: !isEmail(v.email) && '請輸入正確的 Email',
    name: !v.name.trim() && '請填寫姓名',
    password: v.password.length < 8 && '密碼至少 8 碼',
    phone: !isPhone(v.phone) && '請填寫 09 開頭的 10 碼手機號碼',
  }
  const err = (k: keyof typeof errors) => tried && errors[k]
  const bind = (k: keyof typeof v) => ({
    name: k,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setV({ ...v, [k]: e.target.value }),
    value: v[k],
  })

  return (
    <>
      <AuthHeading large eyebrow='JOIN — STEP 1 / 2' title='註冊會員'>
        姓名與手機之後結帳會自動帶入。
      </AuthHeading>
      <form
        className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4'
        noValidate
        onSubmit={async (e) => {
          e.preventDefault()
          if (Object.values(errors).some(Boolean)) {
            setTried(true)
            return
          }
          setBusy(true)
          try {
            // 註冊成功即登入，頁面切到歡迎畫面
            onJoined(true)
            await register({
              email: v.email.trim(),
              name: v.name.trim(),
              phone: v.phone.replace(/[\s-]/g, ''),
              password: v.password,
            })
          } catch (err) {
            onJoined(false)
            setError(err instanceof Error ? err.message : '註冊失敗')
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field
          id='reg-name'
          autoComplete='name'
          error={err('name')}
          label='姓名'
          {...bind('name')}
        />
        <Field
          id='reg-phone'
          className='font-mono'
          autoComplete='tel'
          error={err('phone')}
          inputMode='tel'
          label='手機號碼'
          placeholder='09XXXXXXXX'
          {...bind('phone')}
        />
        <div className='col-span-full'>
          <Field
            id='reg-email'
            type='email'
            className='font-mono'
            autoComplete='email'
            error={err('email')}
            hint='用來登入與接收訂單通知'
            label='Email'
            placeholder='you@example.com'
            {...bind('email')}
          />
        </div>
        <div className='col-span-full'>
          <Field
            id='reg-password'
            type='password'
            autoComplete='new-password'
            error={err('password')}
            hint='至少 8 碼'
            label='密碼'
            {...bind('password')}
          />
        </div>
        <div className='col-span-full flex flex-col gap-4'>
          <TurnstilePlaceholder />
          {error && (
            <p className='m-0 text-[13px] text-brand' role='alert'>
              {error}
            </p>
          )}
          <Button
            type='submit'
            className='h-14 justify-between text-base'
            disabled={busy}
            size='lg'
          >
            註冊 <span aria-hidden='true'>→</span>
          </Button>
          <p className='m-0 text-[12.5px] leading-[1.7] text-muted-foreground'>
            註冊即表示你同意會員條款與隱私權政策。
          </p>
        </div>
      </form>
      <p className='m-0 border-t border-border pt-5 text-sm'>
        已經有帳號？
        <Link
          className='ml-1 font-medium underline underline-offset-4'
          to={loginHref}
        >
          登入
        </Link>
      </p>
    </>
  )
}

function Done({
  hasRedirect,
  redirect,
  user,
}: {
  hasRedirect: boolean
  redirect: string
  user: User
}) {
  const btn =
    'flex min-h-[52px] items-center gap-6 px-[18px] text-[15px] font-medium'
  return (
    <>
      <span className='font-mono text-[13px] text-brand'>WELCOME</span>
      <h1 className='m-0 text-[clamp(38px,5vw,72px)] leading-[1.08] font-black tracking-[-0.03em] whitespace-pre-line'>
        {`${user.name}，\n歡迎加入。`}
      </h1>
      <p className='m-0 text-[15px] leading-[1.8]'>
        帳號已建立，你已經登入。下次結帳會自動帶入姓名與手機。
      </p>
      <div className='flex flex-wrap gap-2.5'>
        {hasRedirect && (
          <Link
            className={`${btn} bg-primary text-primary-foreground`}
            to={redirect}
          >
            {redirect.startsWith('/checkout') ? '回到結帳' : '回到剛才的頁面'}
            <span aria-hidden='true'>→</span>
          </Link>
        )}
        <Link
          className={`${btn} ${hasRedirect ? 'border border-line' : 'bg-primary text-primary-foreground'}`}
          to='/account'
        >
          前往會員中心 {!hasRedirect && <span aria-hidden='true'>→</span>}
        </Link>
        <Link className={`${btn} underline underline-offset-4`} to='/'>
          繼續逛逛
        </Link>
      </div>
    </>
  )
}
