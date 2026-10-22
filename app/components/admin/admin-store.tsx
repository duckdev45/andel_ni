import { createContext, useContext, useMemo, useState } from 'react'

import {
  type AdminOrder,
  type AdminProduct,
  canTransition,
  type LedgerSettings,
  LOW_STOCK_DEFAULT,
  type OrderStatus,
  type Purchase,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_PURCHASES,
  SEED_SETTINGS,
  withStock,
} from '~/lib/mock/admin'

// ponytail: 後台資料只存在前端記憶體（切換分頁不會遺失，重新整理回到示範資料）；接後端時改成 loader / action。

export type SheetState =
  | { id: null | string; type: 'product' }
  | { id: string; type: 'order' }
  | { opt: null | string; pid: null | string; type: 'purchase' }

type Db = {
  lowAt: number
  orders: AdminOrder[]
  products: AdminProduct[]
  purchases: Purchase[]
  settings: LedgerSettings
}

const SEED: Db = {
  products: SEED_PRODUCTS,
  orders: SEED_ORDERS,
  purchases: SEED_PURCHASES,
  settings: SEED_SETTINGS,
  lowAt: LOW_STOCK_DEFAULT,
}

function useAdminState() {
  const [db, setDb] = useState<Db>(SEED)
  // sheet 關閉時保留最後內容，讓滑出動畫期間不會變空白
  const [sheet, setSheet] = useState<null | SheetState>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetSeq, setSheetSeq] = useState(0)

  return useMemo(() => {
    const restock = (products: AdminProduct[], o: AdminOrder) =>
      o.items.reduce(
        (ps, i) =>
          ps.map((p) =>
            p.id === i.pid ? withStock(p, i.opt, (n) => n + i.qty) : p
          ),
        products
      )

    return {
      ...db,
      sheet,
      sheetOpen,
      sheetSeq,
      openSheet(next: SheetState) {
        setSheet(next)
        setSheetOpen(true)
        setSheetSeq((n) => n + 1)
      },
      closeSheet() {
        setSheetOpen(false)
      },
      /** 依狀態流程轉換；不合法的轉換回傳 false */
      setOrderStatus(id: string, to: OrderStatus, tracking?: string) {
        const o = db.orders.find((x) => x.id === id)
        if (!o || !canTransition(o.status, to)) return false
        setDb((d) => ({
          ...d,
          // 取消或退回：商品放回庫存
          products:
            to === 'cancelled' || to === 'returned'
              ? restock(d.products, o)
              : d.products,
          orders: d.orders.map((x) =>
            x.id === id
              ? { ...x, status: to, tracking: tracking ?? x.tracking }
              : x
          ),
        }))
        return true
      },
      setOrderPack(id: string, pack: number) {
        setDb((d) => ({
          ...d,
          orders: d.orders.map((x) => (x.id === id ? { ...x, pack } : x)),
        }))
      },
      toggleActive(pid: string) {
        setDb((d) => ({
          ...d,
          products: d.products.map((p) =>
            p.id === pid ? { ...p, active: !p.active } : p
          ),
        }))
      },
      /** 新增或更新商品；新商品可附首批進貨 */
      saveProduct(
        product: Omit<AdminProduct, 'id'> & { id: null | string },
        firstPurchase?: Omit<Purchase, 'id' | 'pid'>
      ) {
        setDb((d) => {
          if (product.id) {
            const saved = { ...product, id: product.id }
            return {
              ...d,
              products: d.products.map((p) => (p.id === saved.id ? saved : p)),
            }
          }
          const n =
            d.products.reduce(
              (a, p) => Math.max(a, parseInt(p.id.slice(1), 10) || 0),
              0
            ) + 1
          const pid = `p${String(n).padStart(2, '0')}`
          return {
            ...d,
            products: [{ ...product, id: pid }, ...d.products],
            purchases: firstPurchase
              ? [
                  { ...firstPurchase, id: nextPoId(d.purchases), pid },
                  ...d.purchases,
                ]
              : d.purchases,
          }
        })
      },
      adjustStock(pid: string, opt: null | string, delta: number) {
        setDb((d) => ({
          ...d,
          products: d.products.map((p) =>
            p.id === pid ? withStock(p, opt, (n) => n + delta) : p
          ),
        }))
      },
      addPurchase(rec: Omit<Purchase, 'id'>, toStock: boolean) {
        setDb((d) => ({
          ...d,
          purchases: [{ ...rec, id: nextPoId(d.purchases) }, ...d.purchases],
          products: toStock
            ? d.products.map((p) =>
                p.id === rec.pid ? withStock(p, rec.opt, (n) => n + rec.qty) : p
              )
            : d.products,
        }))
      },
      updateSettings(fn: (s: LedgerSettings) => LedgerSettings) {
        setDb((d) => ({ ...d, settings: fn(d.settings) }))
      },
      setLowAt(n: number) {
        setDb((d) => ({ ...d, lowAt: Math.max(0, n) }))
      },
    }
  }, [db, sheet, sheetOpen, sheetSeq])
}

const nextPoId = (ps: Purchase[]) =>
  'PO' +
  String(
    ps.reduce((a, p) => Math.max(a, parseInt(p.id.slice(2), 10) || 0), 0) + 1
  ).padStart(3, '0')

type AdminStore = ReturnType<typeof useAdminState>

const AdminContext = createContext<AdminStore | null>(null)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const store = useAdminState()
  return <AdminContext value={store}>{children}</AdminContext>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin 必須在 AdminProvider 內使用')
  return ctx
}
