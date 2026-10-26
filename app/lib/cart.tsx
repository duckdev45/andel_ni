import type { loader as rootLoader } from '~/root'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { useRouteLoaderData } from 'react-router'
import { toast } from 'sonner'

import { type Product } from '~/lib/catalog'
import { localStore } from '~/lib/local-store'
import { useProducts } from '~/lib/products-client'

// 規格 4：未登入時購物車存在瀏覽器（localStorage）；登入後以 D1 為準（root loader 讀、/api/cart 寫），
// 登入時把瀏覽器購物車合併進會員購物車（takeGuestCart，見 app/lib/auth.ts）。

export type CartLine = { productId: string; variant?: string; qty: number }
export type CartItem = CartLine & { product: Product }

type CartContextValue = {
  /** 商品資料載入完成（購物車是空的也算） */
  ready: boolean
  lines: CartLine[]
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

const ops = {
  add: (prev: CartLine[], productId: string, variant?: string, qty = 1) =>
    prev.some((l) => sameLine(l, productId, variant))
      ? prev.map((l) =>
          sameLine(l, productId, variant) ? { ...l, qty: l.qty + qty } : l
        )
      : [...prev, { productId, variant, qty }],
  setQty: (
    prev: CartLine[],
    productId: string,
    variant: string | undefined,
    qty: number
  ) =>
    qty <= 0
      ? prev.filter((l) => !sameLine(l, productId, variant))
      : prev.map((l) => (sameLine(l, productId, variant) ? { ...l, qty } : l)),
  remove: (prev: CartLine[], productId: string, variant?: string) =>
    prev.filter((l) => !sameLine(l, productId, variant)),
}

/** 呼叫購物車 API；失敗時丟出錯誤 */
export async function cartApi(path: string, method: string, body: unknown) {
  const res = await fetch(`/api/cart${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`購物車同步失敗（${res.status}）`)
}

/** 取出並清空瀏覽器購物車（登入後合併到會員購物車用） */
export function takeGuestCart() {
  const lines = cartStore.get()
  cartStore.set(() => [])
  return lines
}

/** 放回瀏覽器購物車（合併失敗時） */
export const restoreGuestCart = (lines: CartLine[]) =>
  cartStore.set(() => lines)

/** 登出：清掉瀏覽器暫存（規格 4） */
export const clearGuestCart = () => cartStore.set(() => [])

export function CartProvider({ children }: { children: React.ReactNode }) {
  // 已登入：root loader 給的會員購物車；未登入是 null
  const serverLines =
    useRouteLoaderData<typeof rootLoader>('root')?.cart ?? null
  // SSR 時回傳空購物車，hydrate 後才讀 localStorage
  const guestLines = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.get,
    cartStore.getServer
  )
  const wish = useSyncExternalStore(
    wishStore.subscribe,
    wishStore.get,
    wishStore.getServer
  )

  // 會員購物車：畫面先更新再送出；loader 重新讀取後以資料庫為準
  const [memberLines, setMemberLines] = useState(serverLines)
  const [synced, setSynced] = useState(serverLines)
  if (synced !== serverLines) {
    setSynced(serverLines)
    setMemberLines(serverLines)
  }
  const member = memberLines != null
  const lines = memberLines ?? guestLines
  const products = useProducts(lines.length > 0)

  const value = useMemo(() => {
    const update = (fn: (prev: CartLine[]) => CartLine[]) => {
      if (!member) return cartStore.set(fn)
      const next = fn(lines)
      setMemberLines(next)
      cartApi('', 'PUT', { lines: next }).catch((e: Error) => toast(e.message))
    }
    const items = lines.flatMap((l) => {
      const product = products?.find((p) => p.id === l.productId)
      return product ? [{ ...l, product }] : []
    })
    return {
      ready: lines.length === 0 || products != null,
      lines,
      items,
      // 商品資料還沒載入前先用購物車行數；載入後排除已下架的商品
      count: (products ? items : lines).reduce((n, l) => n + l.qty, 0),
      subtotal: items.reduce((n, i) => n + i.qty * i.product.price, 0),
      wish,
      add: (productId: string, variant?: string, qty = 1) =>
        update((prev) => ops.add(prev, productId, variant, qty)),
      setQty: (productId: string, variant: string | undefined, qty: number) =>
        update((prev) => ops.setQty(prev, productId, variant, qty)),
      remove: (productId: string, variant?: string) =>
        update((prev) => ops.remove(prev, productId, variant)),
      clear: () => update(() => []),
      toggleWish: (productId: string) =>
        wishStore.set((prev) =>
          prev.includes(productId)
            ? prev.filter((id) => id !== productId)
            : [...prev, productId]
        ),
    }
  }, [lines, member, products, wish])

  return <CartContext value={value}>{children}</CartContext>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart 必須在 <CartProvider> 內使用')
  return ctx
}
