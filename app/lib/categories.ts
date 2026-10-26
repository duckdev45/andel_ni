import type { Category } from '~/lib/catalog'
import type { loader as rootLoader } from '~/root'

import { useRouteLoaderData } from 'react-router'

/** 前台分類：root loader 從 D1 讀（後台「分類品牌」維護），已停用的不含 */
export function useCategories() {
  return useRouteLoaderData<typeof rootLoader>('root')?.categories ?? []
}

/** route meta 用：root loader 的分類（meta 不能用 hook） */
export const categoriesFrom = (matches: readonly unknown[]) =>
  (matches[0] as undefined | { loaderData?: { categories?: Category[] } })
    ?.loaderData?.categories ?? []

export function useCategoryName() {
  const cats = useCategories()
  return (id: string) => cats.find((c) => c.id === id)?.name ?? ''
}
