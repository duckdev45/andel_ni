import { useState } from 'react'

import {
  CodeField,
  Field,
  isCode,
  isEmail,
  isPhone,
} from '~/components/account/field'
import { Button } from '~/components/ui/button'
import { mockUpdateUser, type User } from '~/lib/auth'

function Section({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className='flex max-w-[760px] flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0'>
      <h3 className='m-0 text-base font-bold'>{title}</h3>
      {children}
    </section>
  )
}

function Saved({ children }: { children: React.ReactNode }) {
  return (
    <span className='text-[13px] text-[#3F5640]' role='status'>
      {children}
    </span>
  )
}

/** 規格 3.6：可改姓名、手機、密碼；改 Email 要對新信箱重新驗證 */
export function AccountSettings({ user }: { user: User }) {
  return (
    <div className='flex flex-col gap-8'>
      <ProfileForm user={user} />
      <EmailChange user={user} />
      <PasswordForm />
    </div>
  )
}

function ProfileForm({ user }: { user: User }) {
  const [v, setV] = useState({ name: user.name, phone: user.phone })
  const [tried, setTried] = useState(false)
  const [saved, setSaved] = useState(false)
  const errors = {
    name: !v.name.trim() && '請填寫姓名',
    phone: !isPhone(v.phone) && '請填寫 09 開頭的 10 碼手機號碼',
  }
  const set =
    (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setV({ ...v, [k]: e.target.value })
      setSaved(false)
    }

  return (
    <Section title='基本資料'>
      <form
        className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4'
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (errors.name || errors.phone) {
            setTried(true)
            return
          }
          mockUpdateUser({
            name: v.name.trim(),
            phone: v.phone.replace(/[\s-]/g, ''),
          })
          setTried(false)
          setSaved(true)
        }}
      >
        <Field
          id='s-name'
          name='name'
          autoComplete='name'
          error={tried && errors.name}
          label='姓名'
          value={v.name}
          onChange={set('name')}
        />
        <Field
          id='s-phone'
          name='phone'
          className='font-mono'
          autoComplete='tel'
          error={tried && errors.phone}
          inputMode='tel'
          label='手機號碼'
          value={v.phone}
          onChange={set('phone')}
        />
        <div className='col-span-full flex flex-wrap items-center gap-x-5 gap-y-3'>
          <Button type='submit' className='h-[52px] px-6 text-[15px]'>
            儲存變更
          </Button>
          {saved && <Saved>已儲存</Saved>}
        </div>
      </form>
    </Section>
  )
}

function EmailChange({ user }: { user: User }) {
  const [stage, setStage] = useState<'code' | 'enter' | 'idle'>('idle')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [tried, setTried] = useState(false)
  const [done, setDone] = useState(false)
  const reset = (to: typeof stage) => {
    setStage(to)
    setTried(false)
    setCode('')
  }

  return (
    <Section title='Email'>
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
        <span className='flex flex-col gap-0.5'>
          <span className='font-mono text-[15px] break-all'>{user.email}</span>
          <span className='text-[12.5px] text-muted-foreground'>
            {user.emailVerified ? '已驗證' : '尚未驗證，驗證後才能結帳'}
          </span>
        </span>
        {stage === 'idle' && (
          <Button
            variant='outline'
            className='h-11 text-[13px]'
            onClick={() => {
              reset('enter')
              setDone(false)
            }}
          >
            更換 Email
          </Button>
        )}
      </div>
      <p className='m-0 text-[13px] leading-[1.7] text-muted-foreground'>
        更換 Email 需要對新信箱重新驗證：我們會寄 6 位數驗證碼到新的
        Email，驗證完成前仍以原本的 Email 登入與接收訂單通知。
      </p>
      {done && <Saved>Email 已更新，之後請用新的 Email 登入</Saved>}
      {stage !== 'idle' && (
        <form
          className='flex flex-col gap-4 border border-[#E4E4DE] bg-[#FBFBF9] p-[18px]'
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (stage === 'enter') {
              if (!isEmail(email)) return setTried(true)
              reset('code')
              return
            }
            if (!isCode(code)) return setTried(true)
            mockUpdateUser({ email: email.trim(), emailVerified: true })
            reset('idle')
            setEmail('')
            setDone(true)
          }}
        >
          {stage === 'enter' ? (
            <Field
              id='s-new-email'
              type='email'
              name='email'
              className='font-mono'
              autoComplete='email'
              error={tried && !isEmail(email) && '請輸入正確的 Email'}
              label='新的 Email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <>
              <p className='m-0 text-sm'>
                驗證碼已寄到{' '}
                <span className='font-mono font-medium break-all'>{email}</span>
                ，10 分鐘內有效。
              </p>
              <CodeField
                id='s-email-code'
                error={tried && !isCode(code) && '請輸入 6 位數字驗證碼'}
                value={code}
                onValue={setCode}
              />
            </>
          )}
          <div className='flex flex-wrap gap-2.5'>
            <Button type='submit' className='h-[52px] px-6 text-[15px]'>
              {stage === 'enter' ? '寄送驗證碼' : '驗證並更換'}
            </Button>
            <Button
              type='button'
              variant='outline'
              className='h-[52px] px-6 text-[15px]'
              onClick={() => reset('idle')}
            >
              取消
            </Button>
          </div>
        </form>
      )}
    </Section>
  )
}

function PasswordForm() {
  const [v, setV] = useState({ confirm: '', current: '', next: '' })
  const [tried, setTried] = useState(false)
  const [saved, setSaved] = useState(false)
  const errors = {
    confirm: v.confirm !== v.next && '兩次輸入的密碼不一致',
    current: !v.current && '請輸入目前的密碼',
    next: v.next.length < 8 && '密碼至少 8 碼',
  }
  const err = (k: keyof typeof errors) => tried && errors[k]
  const set =
    (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setV({ ...v, [k]: e.target.value })
      setSaved(false)
    }

  return (
    <Section title='變更密碼'>
      <form
        className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4'
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (Object.values(errors).some(Boolean)) {
            setTried(true)
            return
          }
          setV({ confirm: '', current: '', next: '' })
          setTried(false)
          setSaved(true)
        }}
      >
        <div className='col-span-full sm:max-w-[calc(50%-8px)]'>
          <Field
            id='s-pw-current'
            type='password'
            name='current'
            autoComplete='current-password'
            error={err('current')}
            label='目前的密碼'
            value={v.current}
            onChange={set('current')}
          />
        </div>
        <Field
          id='s-pw-next'
          type='password'
          name='next'
          autoComplete='new-password'
          error={err('next')}
          hint='至少 8 碼'
          label='新密碼'
          value={v.next}
          onChange={set('next')}
        />
        <Field
          id='s-pw-confirm'
          type='password'
          name='confirm'
          autoComplete='new-password'
          error={err('confirm')}
          label='確認新密碼'
          value={v.confirm}
          onChange={set('confirm')}
        />
        <div className='col-span-full flex flex-wrap items-center gap-x-5 gap-y-3'>
          <Button type='submit' className='h-[52px] px-6 text-[15px]'>
            更新密碼
          </Button>
          {saved && <Saved>密碼已更新，其他裝置已登出</Saved>}
        </div>
      </form>
    </Section>
  )
}
