import { useState } from 'react'

import { Field, isPhone } from '~/components/account/field'
import { Button } from '~/components/ui/button'
import { useAuth, type User } from '~/lib/auth'
import { SITE } from '~/lib/seo'

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

function Failed({ children }: { children: React.ReactNode }) {
  return (
    <span className='text-[13px] text-brand' role='alert'>
      {children}
    </span>
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
  const { updateUser } = useAuth()
  const [v, setV] = useState({ name: user.name, phone: user.phone })
  const [tried, setTried] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
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
        onSubmit={async (e) => {
          e.preventDefault()
          if (errors.name || errors.phone) {
            setTried(true)
            return
          }
          try {
            await updateUser({
              name: v.name.trim(),
              phone: v.phone.replace(/[\s-]/g, ''),
            })
            setTried(false)
            setError('')
            setSaved(true)
          } catch (err) {
            setError(err instanceof Error ? err.message : '儲存失敗')
          }
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
          {error && <Failed>{error}</Failed>}
        </div>
      </form>
    </Section>
  )
}

// ponytail: 更換 Email 要寄驗證碼到新信箱，等寄信服務接好再開放（規格 3.6）
function EmailChange({ user }: { user: User }) {
  return (
    <Section title='Email'>
      <span className='font-mono text-[15px] break-all'>{user.email}</span>
      <p className='m-0 text-[13px] leading-[1.7] text-muted-foreground'>
        需要更換 Email 請私訊 IG{' '}
        <a
          className='underline underline-offset-4'
          href={SITE.instagram}
          rel='noreferrer'
          target='_blank'
        >
          {SITE.instagramHandle}
        </a>
        。
      </p>
    </Section>
  )
}

function PasswordForm() {
  const { changePassword } = useAuth()
  const [v, setV] = useState({ confirm: '', current: '', next: '' })
  const [tried, setTried] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
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
        onSubmit={async (e) => {
          e.preventDefault()
          if (Object.values(errors).some(Boolean)) {
            setTried(true)
            return
          }
          try {
            await changePassword(v.current, v.next)
            setV({ confirm: '', current: '', next: '' })
            setTried(false)
            setError('')
            setSaved(true)
          } catch (err) {
            setError(err instanceof Error ? err.message : '更新失敗')
          }
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
          {error && <Failed>{error}</Failed>}
        </div>
      </form>
    </Section>
  )
}
