import type { Route } from './+types/register'

import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'

import {
  AuthAside,
  AuthHeading,
  AuthLayout,
  ResendButton,
  safeRedirect,
  TurnstilePlaceholder,
  useCooldown,
} from '~/components/account/auth-layout'
import {
  CodeField,
  Field,
  isCode,
  isEmail,
  isPhone,
} from '~/components/account/field'
import { Button } from '~/components/ui/button'
import {
  logout,
  mockRegister,
  mockVerifyEmail,
  type User,
  useUser,
} from '~/lib/auth'

export const meta: Route.MetaFunction = () => [{ title: '註冊｜AndelNI' }]

const STEPS = ['填寫會員資料', '輸入 Email 驗證碼，啟用帳號', '完成，開始購物']

/**
 * 規格 3.2：填資料 → 6 位數 Email 驗證碼 → 啟用。
 * 步驟由登入狀態決定：未登入＝填資料；已註冊未驗證＝驗證碼；已驗證＝完成。
 */
export default function Register() {
  const user = useUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const from = params.get('redirect')
  const redirect = safeRedirect(from)
  const wantsVerify = params.get('step') === 'verify'
  const qs = from ? `&redirect=${encodeURIComponent(redirect)}` : ''

  // 已登入的人直接打開 /register：未驗證帶去驗證碼步驟，已驗證導回來源頁
  if (user && !wantsVerify)
    return (
      <Navigate
        replace
        to={user.emailVerified ? redirect : `/register?step=verify${qs}`}
      />
    )

  const step = !user ? 0 : user.emailVerified ? 2 : 1

  return (
    <AuthLayout
      aside={<AuthAside current={step} items={STEPS} title='註冊流程' />}
    >
      {step === 0 &&
        (wantsVerify ? (
          <NeedLogin qs={qs} />
        ) : (
          <RegisterForm loginHref={`/login${qs.replace('&', '?')}`} />
        ))}
      {step === 1 && (
        <VerifyStep
          user={user!}
          onRestart={() => {
            logout()
            navigate(`/register${qs.replace('&', '?')}`, { replace: true })
          }}
        />
      )}
      {step === 2 && (
        <Done hasRedirect={!!from} redirect={redirect} user={user!} />
      )}
    </AuthLayout>
  )
}

function RegisterForm({ loginHref }: { loginHref: string }) {
  const [v, setV] = useState({ email: '', name: '', password: '', phone: '' })
  const [tried, setTried] = useState(false)
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
      <AuthHeading large eyebrow='JOIN — STEP 1 / 3' title='註冊會員'>
        填好資料後，我們會寄 6 位數驗證碼到你的
        Email。姓名與手機之後結帳會自動帶入。
      </AuthHeading>
      <form
        className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4'
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (Object.values(errors).some(Boolean)) {
            setTried(true)
            return
          }
          // 註冊後即為登入狀態（未驗證），頁面會自動進到驗證碼步驟
          mockRegister({
            email: v.email.trim(),
            name: v.name.trim(),
            phone: v.phone.replace(/[\s-]/g, ''),
          })
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
          <Button
            type='submit'
            className='h-14 justify-between text-base'
            size='lg'
          >
            註冊並寄送驗證碼 <span aria-hidden='true'>→</span>
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

function VerifyStep({
  onRestart,
  user,
}: {
  onRestart: () => void
  user: User
}) {
  const [code, setCode] = useState('')
  const [tried, setTried] = useState(false)
  const [resent, setResent] = useState(false)
  const cooldown = useCooldown()
  const codeErr = tried && !isCode(code) && '請輸入 6 位數字驗證碼'

  return (
    <>
      <AuthHeading eyebrow='EMAIL CODE — STEP 2 / 3' title='輸入 Email 驗證碼'>
        驗證碼已寄到{' '}
        <span className='font-mono font-medium break-all text-foreground'>
          {user.email}
        </span>
        ，10 分鐘內有效。
      </AuthHeading>
      <form
        className='flex flex-col gap-4'
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!isCode(code)) {
            setTried(true)
            return
          }
          mockVerifyEmail()
        }}
      >
        <CodeField
          id='reg-code'
          error={codeErr}
          value={code}
          onValue={setCode}
        />
        <Button
          type='submit'
          variant='brand'
          className='h-14 justify-between text-base'
          size='lg'
        >
          驗證並啟用帳號 <span aria-hidden='true'>→</span>
        </Button>
      </form>
      <div className='flex flex-wrap items-center justify-between gap-3 text-[13.5px] text-muted-foreground'>
        <ResendButton
          left={cooldown.left}
          onResend={() => {
            cooldown.restart()
            setResent(true)
          }}
        />
        <button
          type='button'
          className='min-h-11 underline underline-offset-4'
          onClick={onRestart}
        >
          Email 填錯了？重新註冊
        </button>
      </div>
      {resent && (
        <p className='m-0 text-[13px]' role='status'>
          已重新寄出，舊的驗證碼即失效。
        </p>
      )}
      <div className='flex flex-col gap-2 border border-line bg-[#FBFBF9] px-[18px] py-4 text-[13.5px] leading-[1.7]'>
        <span className='font-mono text-xs text-brand'>沒收到？</span>
        <span>
          請檢查垃圾郵件或促銷郵件匣。驗證前可以先逛逛、加入購物車，但結帳前需要完成驗證。
        </span>
        <Link className='self-start underline underline-offset-4' to='/'>
          稍後再驗證，先去逛逛
        </Link>
      </div>
      <p className='m-0 font-mono text-[11.5px] text-[#8E8E87]'>
        原型示範：輸入任意 6 位數字即可
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
        Email 已驗證，帳號已啟用，你已經登入。下次結帳會自動帶入姓名與手機。
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

function NeedLogin({ qs }: { qs: string }) {
  return (
    <>
      <AuthHeading eyebrow='EMAIL CODE' title='請先登入'>
        登入已註冊但尚未驗證的帳號後，就能輸入 Email 驗證碼啟用帳號。
      </AuthHeading>
      <div className='flex flex-wrap gap-2.5'>
        <Button className='h-[52px] gap-6 text-[15px]' asChild size='lg'>
          <Link
            to={`/login?redirect=${encodeURIComponent(`/register?step=verify${qs}`)}`}
          >
            登入 <span aria-hidden='true'>→</span>
          </Link>
        </Button>
        <Button
          variant='outline'
          className='h-[52px] text-[15px]'
          asChild
          size='lg'
        >
          <Link to={`/register${qs.replace('&', '?')}`}>註冊新帳號</Link>
        </Button>
      </div>
    </>
  )
}
