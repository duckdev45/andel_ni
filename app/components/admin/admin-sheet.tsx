import { X } from 'lucide-react'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '~/components/ui/sheet'
import { cn } from '~/lib/utils'

import { useAdmin } from './admin-store'
import { OrderSheetBody } from './order-sheet'
import { StatusBadge, useIsDesktop } from './parts'
import { ProductSheetBody } from './product-sheet'
import { PurchaseSheetBody } from './purchase-sheet'

/** 桌機從右側滑出 480px，手機從底部滑出 */
export function AdminSheet() {
  const { sheet, sheetOpen, sheetSeq, closeSheet, orders, products } =
    useAdmin()
  const desktop = useIsDesktop()

  const order =
    sheet?.type === 'order' ? orders.find((o) => o.id === sheet.id) : undefined
  const product =
    sheet?.type === 'product' && sheet.id
      ? products.find((p) => p.id === sheet.id)
      : undefined

  const title =
    sheet?.type === 'order'
      ? `訂單 ${sheet.id}`
      : sheet?.type === 'product'
        ? sheet.id
          ? '編輯商品'
          : '上架新商品'
        : '新增進貨'

  return (
    <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()}>
      <SheetContent
        className={cn(
          'gap-0 border-line bg-background p-0 shadow-[0_-10px_40px_rgba(18,18,18,.18)]',
          desktop ? 'w-[480px] sm:max-w-[480px]' : 'max-h-[92dvh]'
        )}
        side={desktop ? 'right' : 'bottom'}
        showCloseButton={false}
      >
        <div className='flex flex-none items-center gap-2.5 border-b border-border py-2 pr-2 pl-5'>
          <SheetTitle className='min-w-0 flex-1 text-base font-medium'>
            {title}
          </SheetTitle>
          <SheetDescription className='sr-only'>
            {sheet?.type === 'order'
              ? '訂單明細與出貨操作'
              : sheet?.type === 'product'
                ? '編輯商品資料、規格與庫存'
                : '記錄進貨成本並入庫'}
          </SheetDescription>
          {order && <StatusBadge className='text-xs' status={order.status} />}
          <SheetClose
            className='grid size-11 place-items-center hover:bg-muted'
            aria-label='關閉'
          >
            <X className='size-5' strokeWidth={1.6} />
          </SheetClose>
        </div>
        {order && <OrderSheetBody key={sheetSeq} order={order} />}
        {sheet?.type === 'product' && (
          <ProductSheetBody key={sheetSeq} product={product} />
        )}
        {sheet?.type === 'purchase' && (
          <PurchaseSheetBody key={sheetSeq} opt={sheet.opt} pid={sheet.pid} />
        )}
      </SheetContent>
    </Sheet>
  )
}
