import type { Product } from '~/lib/catalog'

import { useCallback, useSyncExternalStore } from 'react'

// 前台用的上架商品清單（/api/products），購物車、收藏、加購用來對照商品資料。開站抓一次，購物車與結帳頁再更新。
// ponytail: 抓全部商品，幾百件內沒問題；商品上千件時改成依 id 查詢

let cache: null | Product[] = null
let pending: null | Promise<void> = null
const listeners = new Set<() => void>()

function load() {
  pending ??= fetch('/api/products')
    .then((r) => (r.ok ? (r.json() as Promise<Product[]>) : Promise.reject()))
    .then((ps) => {
      cache = ps
      listeners.forEach((l) => l())
    })
    .catch(() => {
      // 下次訂閱再試
      pending = null
    })
}

/** 重新抓一次（購物車、結帳頁打開時，庫存要是最新的）；還沒載入過就等第一次載入 */
export function refreshProducts() {
  if (!cache) return
  pending = null
  load()
}

/** 上架中的商品；還沒載入時是 null。enabled 為 false 時不發請求 */
export function useProducts(enabled = true) {
  const subscribe = useCallback(
    (listener: () => void) => {
      listeners.add(listener)
      if (enabled) load()
      return () => {
        listeners.delete(listener)
      }
    },
    [enabled]
  )
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => null
  )
}
