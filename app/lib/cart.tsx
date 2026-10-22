import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'

import { getProduct, type Product } from '~/lib/catalog'
import { localStore } from '~/lib/local-store'

// 規格 D9：未登入時購物車存在瀏覽器（localStorage）。登入合併、結帳清除等之後接後端再做。

export type CartLine = { productId: string; variant?: string; qty: number }
export type CartItem = CartLine & { product: Product }

type CartContextValue = {
  items: CartItem[]
  count: number
  subtotal: number
  add: (productId: string, variant?: string, qty?: number) => void
  setQty: (productId: string, variant: string | undefined, qty: number) => void
  remove: (productId: string, variant?: string) => void
  clear: () => void
  wish: string[]
  toggleWish: (productId: string) => void
}

const CartContext = createContext<CartContextValue | null>(null)

const EMPTY_LINES: CartLine[] = []
const EMPTY_WISH: string[] = []
const cartStore = localStore('andelni:cart', EMPTY_LINES)
const wishStore = localStore('andelni:wish', EMPTY_WISH)

const sameLine = (l: CartLine, productId: string, variant?: string) =>
  l.productId === productId && l.variant === variant

const actions = {
  add: (productId: string, variant?: string, qty = 1) =>
    cartStore.set((prev) =>
      prev.some((l) => sameLine(l, productId, variant))
        ? prev.map((l) =>
            sameLine(l, productId, variant) ? { ...l, qty: l.qty + qty } : l
          )
        : [...prev, { productId, variant, qty }]
    ),
  setQty: (productId: string, variant: string | undefined, qty: number) =>
    cartStore.set((prev) =>
      qty <= 0
        ? prev.filter((l) => !sameLine(l, productId, variant))
        : prev.map((l) => (sameLine(l, productId, variant) ? { ...l, qty } : l))
    ),
  remove: (productId: string, variant?: string) =>
    cartStore.set((prev) =>
      prev.filter((l) => !sameLine(l, productId, variant))
    ),
  clear: () => cartStore.set(() => []),
  toggleWish: (productId: string) =>
    wishStore.set((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    ),
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // SSR 時回傳空購物車，hydrate 後才讀 localStorage
  const lines = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.get,
    cartStore.getServer
  )
  const wish = useSyncExternalStore(
    wishStore.subscribe,
    wishStore.get,
    wishStore.getServer
  )

  const value = useMemo(() => {
    const items = lines.flatMap((l) => {
      const product = getProduct(l.productId)
      return product ? [{ ...l, product }] : []
    })
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.qty * i.product.price, 0),
      wish,
      ...actions,
    }
  }, [lines, wish])

  return <CartContext value={value}>{children}</CartContext>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart 必須在 <CartProvider> 內使用')
  return ctx
}
