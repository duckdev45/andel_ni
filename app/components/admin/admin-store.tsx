import { createContext, useContext, useMemo, useState } from 'react'
import { useRevalidator } from 'react-router'
import { toast } from 'sonner'

import {
  type AdminOrder,
  type AdminProduct,
  canTransition,
  type LedgerSettings,
  LOW_STOCK_DEFAULT,
  type OrderStatus,
  type Purchase,
  SEED_PURCHASES,
  SEED_SETTINGS,
  withStock,
} from '~/lib/mock/admin'

// 商品、庫存、訂單、低庫存門檻：D1（後台 layout 的 loader 讀，/api/admin/* 寫），畫面先更新再送出，失敗就重新讀取。
// ponytail: 進貨、記帳設定仍是前端記憶體的示範資料（重新整理回到示範資料）。

export type SheetState =
  | { id: null | string; type: 'product' }
  | { id: string; type: 'order' }
  | { opt: null | string; pid: null | string; type: 'purchase' }

export type AdminData = {
  lowAt: null | number
  orders: AdminOrder[]
  products: AdminProduct[]
}

type Db = {
  lowAt: number
  orders: AdminOrder[]
  products: AdminProduct[]
  purchases: Purchase[]
  settings: LedgerSettings
}

const fromLoader = (data: AdminData) => ({
  orders: data.orders,
  products: data.products,
  lowAt: data.lowAt ?? LOW_STOCK_DEFAULT,
})

/** 呼叫後台 API；失敗時丟出伺服器的錯誤訊息 */
async function api<T = null>(path: string, method: string, body?: unknown) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok)
    throw new Error(
      (data as null | { error?: string })?.error ?? `儲存失敗（${res.status}）`
    )
  return data as T
}

/** 上傳一張已壓縮的照片，回傳 R2 物件鍵 */
export async function uploadImage(blob: Blob) {
  const res = await fetch('/api/admin/images', {
    method: 'PUT',
    headers: { 'Content-Type': blob.type },
    body: blob,
  })
  const data = (await res.json().catch(() => null)) as null | {
    error?: string
    key?: string
  }
  if (!res.ok || !data?.key)
    throw new Error(data?.error ?? `上傳失敗（${res.status}）`)
  return data.key
}

function useAdminState(data: AdminData) {
  const revalidator = useRevalidator()
  const [db, setDb] = useState<Db>(() => ({
    purchases: SEED_PURCHASES,
    settings: SEED_SETTINGS,
    ...fromLoader(data),
  }))
  // loader 重新讀取後以資料庫為準
  const [synced, setSynced] = useState(data)
  if (synced !== data) {
    setSynced(data)
    setDb((d) => ({ ...d, ...fromLoader(data) }))
  }
  // sheet 關閉時保留最後內容，讓滑出動畫期間不會變空白
  const [sheet, setSheet] = useState<null | SheetState>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetSeq, setSheetSeq] = useState(0)

  return useMemo(() => {
    const fail = (e: unknown) => {
      toast(e instanceof Error ? e.message : '儲存失敗')
      void revalidator.revalidate()
    }
    const skuOf = (pid: string, opt: null | string) => {
      const p = db.products.find((x) => x.id === pid)
      return p?.variants
        ? p.variants.options.find((o) => o.label === opt)?.sku
        : p?.sku
    }
    const adjustStock = (pid: string, opt: null | string, delta: number) => {
      const sku = skuOf(pid, opt)
      if (!sku) return
      setDb((d) => ({
        ...d,
        products: d.products.map((p) =>
          p.id === pid ? withStock(p, opt, (n) => n + delta) : p
        ),
      }))
      api('/stock', 'POST', { sku, delta }).catch(fail)
    }

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
      /** 依狀態流程轉換；不合法的轉換回傳 false。取消、退回放回的庫存在重新讀取後顯示 */
      setOrderStatus(id: string, to: OrderStatus, tracking?: string) {
        const o = db.orders.find((x) => x.id === id)
        if (!o || !canTransition(o.status, to)) return false
        api(`/orders/${id}`, 'PATCH', { status: to, tracking })
          .then(() => revalidator.revalidate())
          .catch(fail)
        setDb((d) => ({
          ...d,
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
      /** 包材欄位離開時存檔 */
      saveOrderPack(id: string) {
        const pack = db.orders.find((x) => x.id === id)?.pack
        if (pack === undefined) return
        api(`/orders/${id}/pack`, 'PUT', {
          value: Math.max(0, Math.round(pack)),
        }).catch(fail)
      },
      toggleActive(pid: string) {
        const p = db.products.find((x) => x.id === pid)
        if (!p) return
        setDb((d) => ({
          ...d,
          products: d.products.map((x) =>
            x.id === pid ? { ...x, active: !x.active } : x
          ),
        }))
        api(`/products/${p.code}`, 'PATCH', { active: !p.active }).catch(fail)
      },
      /** 新增或更新商品；新商品可附首批進貨（記帳簿示範資料）。失敗時丟出錯誤 */
      async saveProduct(
        product: Omit<AdminProduct, 'code' | 'id'> & { id: null | string },
        firstPurchase?: Omit<Purchase, 'id' | 'pid'>
      ) {
        const { id, ...rest } = product
        const body = {
          ...rest,
          variants: rest.variants && {
            name: rest.variants.name,
            options: rest.variants.options.map(({ label, stock }) => ({
              label,
              stock,
            })),
          },
        }
        const code = db.products.find((p) => p.id === id)?.code
        // 新商品回傳編號與 ID
        const saved = await api<{ code: string; id?: string }>(
          code ? `/products/${code}` : '/products',
          code ? 'PUT' : 'POST',
          body
        )
        if (firstPurchase && saved.id) {
          const pid = saved.id
          setDb((d) => ({
            ...d,
            purchases: [
              { ...firstPurchase, id: nextPoId(d.purchases), pid },
              ...d.purchases,
            ],
          }))
        }
        await revalidator.revalidate()
        return saved.code
      },
      adjustStock,
      addPurchase(rec: Omit<Purchase, 'id'>, toStock: boolean) {
        setDb((d) => ({
          ...d,
          purchases: [{ ...rec, id: nextPoId(d.purchases) }, ...d.purchases],
        }))
        if (toStock) adjustStock(rec.pid, rec.opt, rec.qty)
      },
      updateSettings(fn: (s: LedgerSettings) => LedgerSettings) {
        setDb((d) => ({ ...d, settings: fn(d.settings) }))
      },
      setLowAt(n: number) {
        const lowAt = Math.max(0, n)
        setDb((d) => ({ ...d, lowAt }))
        api('/settings/low-stock', 'PUT', { value: lowAt }).catch(fail)
      },
    }
  }, [db, revalidator, sheet, sheetOpen, sheetSeq])
}

const nextPoId = (ps: Purchase[]) =>
  'PO' +
  String(
    ps.reduce((a, p) => Math.max(a, parseInt(p.id.slice(2), 10) || 0), 0) + 1
  ).padStart(3, '0')

type AdminStore = ReturnType<typeof useAdminState>

const AdminContext = createContext<AdminStore | null>(null)

export function AdminProvider({
  children,
  data,
}: {
  children: React.ReactNode
  data: AdminData
}) {
  const store = useAdminState(data)
  return <AdminContext value={store}>{children}</AdminContext>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin 必須在 AdminProvider 內使用')
  return ctx
}
