import type { Route } from './+types/forgot-password'

import { useState } from 'react'
import { Link } from 'react-router'

import {
  AuthAside,
  AuthHeading,
  AuthLayout,
  ResendButton,
  TurnstilePlaceholder,
  useCooldown,
} from '~/components/account/auth-layout'
import { CodeField, Field, isCode, isEmail } from '~/components/account/field'
import { Button } from '~/components/ui/button'
import { useAuth } from '~/lib/auth'
import { privateMeta } from '~/lib/seo'

export const meta: Route.MetaFunction = () => privateMeta('忘記密碼')

const STEPS = [
  '輸入註冊時的 Email',
  '輸入 6 位數驗證碼並設定新密碼',
  '所有裝置登出，用新密碼重新登入',
]

/** 規格 3.4：Email → 固定訊息（不透露帳號是否存在）→ 驗證碼＋新密碼 → 全部裝置登出 */
// ponytail: 還是原型（要寄驗證碼，等寄信服務）；登入頁的「忘記密碼」先改成私訊 IG
export default function ForgotPassword() {
  const { logout } = useAuth()
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')

  return (
    <AuthLayout
      aside={<AuthAside current={step} items={STEPS} title='重設密碼' />}
    >
      {step === 0 && (
        <EmailStep email={email} onEmail={setEmail} onSent={() => setStep(1)} />
      )}
      {step === 1 && (
        <ResetStep
          email={email}
          onBack={() => setStep(0)}
          onDone={() => {
            // 改密碼後該帳號所有裝置強制登出（含這台）
            void logout()
            setStep(2)
          }}
        />
      )}
      {step === 2 && (
        <>
          <span className='font-mono text-[13px] text-brand'>
            PASSWORD RESET
          </span>
          <h1 className='m-0 text-[clamp(38px,5vw,72px)] leading-[1.08] font-black tracking-[-0.03em]'>
            密碼已更新<span className='text-brand'>。</span>
          </h1>
          <p className='m-0 text-[15px] leading-[1.8]'>
            為了安全，這個帳號在所有裝置上都已登出，請用新密碼重新登入。
          </p>
          <Button
            className='h-14 justify-between self-start text-base sm:min-w-[280px]'
            asChild
            size='lg'
          >
            <Link to='/login'>
              前往登入 <span aria-hidden='true'>→</span>
            </Link>
          </Button>
        </>
      )}
    </AuthLayout>
  )
}

function EmailStep({
  email,
  onEmail,
  onSent,
}: {
  email: string
  onEmail: (v: string) => void
  onSent: () => void
}) {
  const [tried, setTried] = useState(false)
  return (
    <>
      <AuthHeading large eyebrow='FORGOT PASSWORD' title='忘記密碼'>
        輸入註冊時的 Email，我們會寄 6 位數驗證碼給你重設密碼。
      </AuthHeading>
      <form
        className='flex flex-col gap-4'
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!isEmail(email)) {
            setTried(true)
            return
          }
          onSent()
        }}
      >
        <Field
          id='fp-email'
          type='email'
          name='email'
          className='font-mono'
          autoComplete='email'
          error={tried && !isEmail(email) && '請輸入正確的 Email'}
          label='Email'
          placeholder='you@example.com'
          value={email}
          onChange={(e) => onEmail(e.target.value)}
        />
        <TurnstilePlaceholder />
        <Button
          type='submit'
          className='h-14 justify-between text-base'
          size='lg'
        >
          寄送驗證碼 <span aria-hidden='true'>→</span>
        </Button>
      </form>
      <p className='m-0 border-t border-border pt-5 text-sm'>
        想起來了？
        <Link
          className='ml-1 font-medium underline underline-offset-4'
          to='/login'
        >
          回到登入
        </Link>
      </p>
    </>
  )
}

function ResetStep({
  email,
  onBack,
  onDone,
}: {
  email: string
  onBack: () => void
  onDone: () => void
}) {
  const [v, setV] = useState({ code: '', confirm: '', password: '' })
  const [tried, setTried] = useState(false)
  const cooldown = useCooldown()
  const errors = {
    code: !isCode(v.code) && '請輸入 6 位數字驗證碼',
    confirm: v.confirm !== v.password && '兩次輸入的密碼不一致',
    password: v.password.length < 8 && '密碼至少 8 碼',
  }
  const err = (k: keyof typeof errors) => tried && errors[k]

  return (
    <>
      <AuthHeading eyebrow='RESET PASSWORD' title='設定新密碼'>
        若此 Email 已註冊，驗證碼已寄出。請到{' '}
        <span className='font-mono font-medium break-all text-foreground'>
          {email}
        </span>{' '}
        收信，驗證碼 10 分鐘內有效。
        <button
          type='button'
          className='ml-1 text-sm underline underline-offset-4'
          onClick={onBack}
        >
          更換 Email
        </button>
      </AuthHeading>
      <form
        className='flex flex-col gap-4'
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (Object.values(errors).some(Boolean)) {
            setTried(true)
            return
          }
          onDone()
        }}
      >
        <CodeField
          id='fp-code'
          error={err('code')}
          value={v.code}
          onValue={(code) => setV({ ...v, code })}
        />
        <div className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4'>
          <Field
            id='fp-password'
            type='password'
            name='password'
            autoComplete='new-password'
            error={err('password')}
            hint='至少 8 碼'
            label='新密碼'
            value={v.password}
            onChange={(e) => setV({ ...v, password: e.target.value })}
          />
          <Field
            id='fp-confirm'
            type='password'
            name='confirm'
            autoComplete='new-password'
            error={err('confirm')}
            label='確認新密碼'
            value={v.confirm}
            onChange={(e) => setV({ ...v, confirm: e.target.value })}
          />
        </div>
        <Button
          type='submit'
          variant='brand'
          className='h-14 justify-between text-base'
          size='lg'
        >
          更新密碼 <span aria-hidden='true'>→</span>
        </Button>
      </form>
      <div className='flex flex-wrap items-center gap-3'>
        <ResendButton left={cooldown.left} onResend={cooldown.restart} />
        <span className='text-[13px] text-muted-foreground'>
          沒收到？請檢查垃圾郵件匣
        </span>
      </div>
      <p className='m-0 font-mono text-[11.5px] text-[#8E8E87]'>
        原型示範：輸入任意 6 位數字即可
      </p>
    </>
  )
}
