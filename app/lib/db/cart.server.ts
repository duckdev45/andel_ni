import type { CartLine } from '~/lib/cart'

import { CUSTOM_MAX_QTY } from '~/lib/catalog'

// 會員購物車（carts 表，規格 4）。前台的購物車行用商品 ID（p07）＋規格名稱，這裡換成 product_variants.id。

const productId = (id: number) => `p${String(id).padStart(2, '0')}`
const dbId = (pid: string) => Number(pid.replace(/^p/, ''))

/** 會員購物車，只含上架中的商品 */
export async function getCartLines(db: D1Database, userId: number) {
  const { results } = await db
    .prepare(
      `SELECT v.product_id, v.option_label, c.qty
       FROM carts c
       JOIN product_variants v ON v.id = c.variant_id
       JOIN products p ON p.id = v.product_id
       WHERE c.user_id = ?1 AND p.status = 'active' AND v.active = 1
       ORDER BY c.rowid`
    )
    .bind(userId)
    .all<{ option_label: null | string; product_id: number; qty: number }>()
  return results.map((r): CartLine => ({
    productId: productId(r.product_id),
    variant: r.option_label ?? undefined,
    qty: r.qty,
  }))
}

/** 檢查前端送來的購物車行；不合法的整批拒收 */
export function parseLines(body: unknown): CartLine[] | null {
  const lines = (body as null | { lines?: unknown })?.lines
  if (!Array.isArray(lines) || lines.length > 100) return null
  const ok = lines.every(
    (l: Partial<CartLine>) =>
      typeof l?.productId === 'string' &&
      /^p\d{1,9}$/.test(l.productId) &&
      (l.variant === undefined ||
        (typeof l.variant === 'string' && l.variant.length <= 50)) &&
      Number.isInteger(l.qty) &&
      (l.qty as number) > 0 &&
      (l.qty as number) <= 99
  )
  return ok ? (lines as CartLine[]) : null
}

// 對應不到的規格（商品已刪、規格改名或停用）直接略過
const UPSERT = `INSERT INTO carts (user_id, variant_id, qty, updated_at)
  SELECT ?1, v.id, ?4, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  FROM product_variants v
  WHERE v.product_id = ?2 AND v.option_label IS ?3 AND v.active = 1
  ON CONFLICT (user_id, variant_id) DO UPDATE SET updated_at = excluded.updated_at, qty = `

/** 以前端為準整批取代（已登入時每次改購物車） */
export const replaceCart = (
  db: D1Database,
  userId: number,
  lines: CartLine[]
) =>
  db.batch([
    db.prepare(`DELETE FROM carts WHERE user_id = ?1`).bind(userId),
    ...lines.map((l) =>
      db
        .prepare(UPSERT + 'excluded.qty')
        .bind(userId, dbId(l.productId), l.variant ?? null, l.qty)
    ),
  ])

/**
 * 登入時合併瀏覽器購物車：同商品同規格數量相加，不超過庫存（規格 4）。
 * 客訂、代購（含部分現貨裡沒庫存的規格）上限 CUSTOM_MAX_QTY；至少留 1 件，結帳時再提示已售完。
 */
export async function mergeCart(
  db: D1Database,
  userId: number,
  lines: CartLine[]
) {
  if (!lines.length) return
  await db.batch(
    lines.map((l) =>
      db
        .prepare(
          UPSERT +
            `MAX(1, MIN(carts.qty + excluded.qty, (
              SELECT CASE WHEN p.type IN ('代購', '客訂')
                       OR (p.type = '部分現貨' AND v.stock = 0) THEN ?5
                     ELSE v.stock END
              FROM product_variants v JOIN products p ON p.id = v.product_id
              WHERE v.id = excluded.variant_id)))`
        )
        .bind(
          userId,
          dbId(l.productId),
          l.variant ?? null,
          l.qty,
          CUSTOM_MAX_QTY
        )
    )
  )
}
