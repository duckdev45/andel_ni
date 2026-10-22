import type { Route } from './+types/login'

import { Link, Navigate, useSearchParams } from 'react-router'

import {
  AuthHeading,
  AuthLayout,
  JoinAside,
  safeRedirect,
} from '~/components/account/auth-layout'
import { LoginForm } from '~/components/account/login-form'
import { useUser } from '~/lib/auth'
import { privateMeta } from '~/lib/seo'

export const meta: Route.MetaFunction = () => privateMeta('會員登入')

export default function Login() {
  const user = useUser()
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))

  // 已登入（含剛登入成功）就導回來源頁
  if (user) return <Navigate replace to={redirect} />

  const registerHref = params.get('redirect')
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : '/register'

  return (
    <AuthLayout aside={<JoinAside registerHref={registerHref} />}>
      <AuthHeading large eyebrow='SIGN IN' title='會員登入'>
        用註冊時的 Email 與密碼登入。
      </AuthHeading>
      <LoginForm />
      <p className='m-0 border-t border-border pt-5 text-sm'>
        還沒有帳號？
        <Link
          className='ml-1 font-medium underline underline-offset-4'
          to={registerHref}
        >
          註冊會員
        </Link>
      </p>
    </AuthLayout>
  )
}
