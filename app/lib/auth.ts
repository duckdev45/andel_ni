import type { loader as rootLoader } from '~/root'

import { useRevalidator, useRouteLoaderData } from 'react-router'

import {
  cartApi,
  clearGuestCart,
  restoreGuestCart,
  takeGuestCart,
} from '~/lib/cart'

// 會員登入狀態：伺服器端 session（HttpOnly cookie，app/lib/db/users.server.ts），root loader 讀出目前會員。
// 登入、登出等動作呼叫 /api/auth/*（workers/api/auth.ts），完成後重新讀取 root loader。

export type User = {
  name: string
  email: string
  phone: string
  /** 規格 3.2：未驗證 Email 可逛、可加購物車，不能結帳 */
  emailVerified: boolean
}

export function useUser() {
  return useRouteLoaderData<typeof rootLoader>('root')?.user ?? null
}

/** 呼叫會員 API；失敗時丟出伺服器的錯誤訊息 */
async function call(path: string, method: string, body: unknown = {}) {
  const res = await fetch(`/api/auth${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.ok) return
  const data = (await res.json().catch(() => null)) as null | {
    error?: string
  }
  throw new Error(data?.error ?? `發生錯誤（${res.status}），請稍後再試`)
}

/** 登入後把瀏覽器購物車合併進會員購物車（規格 4）；失敗就放回瀏覽器，下次登入再合併 */
async function mergeGuestCart() {
  const lines = takeGuestCart()
  if (!lines.length) return
  await cartApi('/merge', 'POST', { lines }).catch(() =>
    restoreGuestCart(lines)
  )
}

export function useAuth() {
  const { revalidate } = useRevalidator()
  const run = async (
    path: string,
    method: string,
    body?: unknown,
    after?: () => unknown
  ) => {
    await call(path, method, body)
    await after?.()
    await revalidate()
  }
  return {
    login: (email: string, password: string) =>
      run('/login', 'POST', { email, password }, mergeGuestCart),
    register: (u: Omit<User, 'emailVerified'> & { password: string }) =>
      run('/register', 'POST', u, mergeGuestCart),
    logout: () => run('/logout', 'POST', undefined, clearGuestCart),
    updateUser: (patch: Pick<User, 'name' | 'phone'>) =>
      run('/me', 'PATCH', patch),
    changePassword: (current: string, next: string) =>
      call('/me/password', 'PUT', { current, next }),
  }
}
