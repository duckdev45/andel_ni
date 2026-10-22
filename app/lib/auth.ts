import { useSyncExternalStore } from 'react'

import { localStore } from '~/lib/local-store'

// ponytail: 後端未接，登入狀態先存瀏覽器假裝有 session；接 Hono 後改成 HttpOnly cookie + /api/me。

export type User = {
  name: string
  email: string
  phone: string
  /** 規格 3.2：未驗證 Email 可逛、可加購物車，不能結帳 */
  emailVerified: boolean
}

const store = localStore<User | null>('andelni:mock-session', null)

export function useUser() {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer)
}

/** 假登入：任何 Email + 8 碼以上密碼都成功 */
export function mockLogin(email: string, name = '王小安') {
  store.set(() => ({
    name,
    email,
    phone: '0912345678',
    emailVerified: true,
  }))
}

export function mockRegister(user: Omit<User, 'emailVerified'>) {
  store.set(() => ({ ...user, emailVerified: false }))
}

export function mockVerifyEmail() {
  store.set((u) => (u ? { ...u, emailVerified: true } : u))
}

export function mockUpdateUser(patch: Partial<User>) {
  store.set((u) => (u ? { ...u, ...patch } : u))
}

export function logout() {
  store.set(() => null)
}
