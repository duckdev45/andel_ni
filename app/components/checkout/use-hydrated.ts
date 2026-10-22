import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/** SSR 與 hydrate 時為 false；之後為 true。用來避免購物車／登入狀態閃一下空畫面 */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
}
