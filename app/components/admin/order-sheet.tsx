import { useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  type AdminOrder,
  isBooked,
  minus,
  money,
  orderLedger,
  type OrderStatus,
  PAY,
  SHIP,
} from '~/lib/admin'
import { cn } from '~/lib/utils'

import { useAdmin } from './admin-store'
import { FIELD, NumInput, PANEL } from './parts'

const ROW = 'flex justify-between gap-3 text-[13px] text-[#2E2E2A]'

export function OrderSheetBody({ order: o }: { order: AdminOrder }) {
  const { purchases, settings, saveOrderPack, setOrderPack, setOrderStatus } =
    useAdmin()
  const [track, setTrack] = useState('')
  const [trackErr, setTrackErr] = useState(false)
  const l = orderLedger(o, purchases, settings)
  const home = o.ship.method === 'home'

  const go = (to: OrderStatus, msg: string, tracking?: string) => {
    // 轉換後 sheet 保持開啟，直接看到下一步
    toast(setOrderStatus(o.id, to, tracking) ? msg : '此訂單狀態不能這樣轉換')
  }

  return (
    <>
      <div className='flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-5 pt-4 pb-5'>
        <div className='flex flex-col gap-1 text-[13.5px]'>
          <span className='font-mono text-xs text-muted-foreground'>
            {o.date}
          </span>
          <span className='text-[15px] font-medium'>{o.customer.name}</span>
          <span className='text-[#2E2E2A]'>
            {o.customer.phone} · {o.customer.email}
          </span>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div className={cn(PANEL, 'flex flex-col gap-1 p-3 text-[13px]')}>
            <span className='text-xs text-muted-foreground'>
              配送 · {SHIP[o.ship.method]}
            </span>
            <span className='leading-normal'>{o.ship.address}</span>
            {o.tracking && (
              <span className='text-xs text-[#3f5640]'>{o.tracking}</span>
            )}
          </div>
          <div className={cn(PANEL, 'flex flex-col gap-1 p-3 text-[13px]')}>
            <span className='text-xs text-muted-foreground'>付款</span>
            <span>{PAY[o.pay]}</span>
          </div>
        </div>

        {o.note && (
          <p className={cn(PANEL, 'p-3 text-[13px] whitespace-pre-line')}>
            <span className='block text-xs text-muted-foreground'>
              客人備註
            </span>
            {o.note}
          </p>
        )}

        <div className='flex flex-col'>
          <ul>
            {o.items.map((i) => (
              <li
                key={i.pid + (i.opt ?? '')}
                className='flex gap-3 border-b border-border py-2.5 text-[13.5px]'
              >
                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span>{i.name}</span>
                  <span className='text-xs text-muted-foreground'>
                    {[
                      i.kind !== '現貨' && i.kind,
                      i.opt,
                      `${money(i.price)} × ${i.qty}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <span className='font-mono tabular-nums'>
                  {money(i.price * i.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div className={cn(ROW, 'pt-2.5 pb-1')}>
            <span>小計</span>
            <span className='font-mono tabular-nums'>{money(o.subtotal)}</span>
          </div>
          <div className={cn(ROW, 'py-1')}>
            <span>運費</span>
            <span className='font-mono tabular-nums'>
              {o.shipFee ? money(o.shipFee) : '免運'}
            </span>
          </div>
          <div className='flex justify-between pt-1.5 text-[15px] font-medium'>
            <span>合計</span>
            <span className='font-mono tabular-nums'>{money(o.total)}</span>
          </div>
        </div>

        <div className={cn(PANEL, 'px-3.5 py-1')}>
          <div className='flex items-center justify-between pt-2.5 pb-2 text-[13px] font-medium'>
            <span>帳務</span>
            <span className='text-xs font-normal text-muted-foreground'>
              {isBooked(o)
                ? '已入帳'
                : o.status === 'pending_payment'
                  ? '收款後計入'
                  : '不計入'}
            </span>
          </div>
          {[
            ['售出金額', money(l.sale)],
            ['商品成本', minus(l.cogs)],
            [`金流手續費（${PAY[o.pay]}）`, minus(l.fee)],
            ['物流成本', minus(l.ship)],
          ].map(([k, v]) => (
            <div key={k} className={cn(ROW, 'border-t border-[#E4E4DE] py-2')}>
              <span>{k}</span>
              <span className='font-mono tabular-nums'>{v}</span>
            </div>
          ))}
          <div
            className={cn(ROW, 'items-center border-t border-[#E4E4DE] py-1.5')}
          >
            <label htmlFor={`pack-${o.id}`}>包材（此單）</label>
            <span className='flex items-center gap-1.5'>
              −NT$
              <NumInput
                id={`pack-${o.id}`}
                className='h-[34px] w-16'
                value={o.pack ?? settings.pack}
                onCommit={() => saveOrderPack(o.id)}
                onValue={(n) => setOrderPack(o.id, n)}
              />
            </span>
          </div>
          <div className='flex justify-between border-t border-border py-2.5 text-[14.5px] font-medium'>
            <span>淨利</span>
            <span
              className={cn(
                'font-mono tabular-nums',
                l.net < 0 ? 'text-brand' : 'text-[#3f5640]'
              )}
            >
              {money(l.net)}
            </span>
          </div>
        </div>
      </div>

      <div className='flex flex-none flex-col gap-2.5 border-t border-border bg-[#FBFBF9] px-5 pt-3 pb-[18px]'>
        {o.status === 'pending_payment' && (
          <>
            <SheetAction onClick={() => go('pending_shipment', '已確認收款')}>
              確認已收款
            </SheetAction>
            <ConfirmButton
              title={`取消訂單 ${o.id}？`}
              description='取消後訂單商品會放回庫存，此動作無法復原。'
              confirmLabel='確定取消'
              onConfirm={() => go('cancelled', '訂單已取消，庫存已歸還')}
            >
              取消訂單
            </ConfirmButton>
          </>
        )}
        {o.status === 'pending_shipment' && (
          <>
            <label className='sr-only' htmlFor={`track-${o.id}`}>
              物流單號
            </label>
            <Input
              id={`track-${o.id}`}
              className={cn(FIELD, 'bg-background')}
              value={track}
              placeholder={
                home
                  ? '黑貓宅配單號，例：9024 5512 0381'
                  : '超商物流編號，例：F8812034'
              }
              aria-describedby={trackErr ? `track-err-${o.id}` : undefined}
              aria-invalid={trackErr}
              onChange={(e) => {
                setTrack(e.target.value)
                setTrackErr(false)
              }}
            />
            {trackErr && (
              <span
                id={`track-err-${o.id}`}
                className='-mt-1 text-xs text-brand'
              >
                請輸入物流單號
              </span>
            )}
            <SheetAction
              onClick={() => {
                if (!track.trim()) return setTrackErr(true)
                go('shipped', '已標記出貨', track.trim())
              }}
            >
              標記為已出貨
            </SheetAction>
          </>
        )}
        {o.status === 'shipped' && (
          <>
            <SheetAction onClick={() => go('completed', '訂單已完成')}>
              標記為已完成
            </SheetAction>
            <ConfirmButton
              title={`將訂單 ${o.id} 標記為退回？`}
              description='用於未取件或拒收。商品會放回庫存，此筆不再計入營收。'
              confirmLabel='確定退回'
              onConfirm={() => go('returned', '已標記退回，庫存已歸還')}
            >
              未取件／拒收退回
            </ConfirmButton>
          </>
        )}
        {(o.status === 'completed' ||
          o.status === 'cancelled' ||
          o.status === 'returned') && (
          <p className='py-1.5 text-center text-[13px] text-muted-foreground'>
            {o.status === 'completed'
              ? '此訂單已完成'
              : o.status === 'cancelled'
                ? (o.reason ?? '此訂單已取消，庫存已歸還')
                : (o.reason ?? '此訂單已退回，庫存已歸還')}
          </p>
        )}
      </div>
    </>
  )
}

function SheetAction({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type='button'
      className='h-12 rounded-none text-[15px] font-normal'
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function ConfirmButton({
  title,
  description,
  confirmLabel,
  children,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  children: React.ReactNode
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className='h-11 rounded-none border-brand text-sm font-normal text-brand hover:bg-brand hover:text-brand-foreground'
        >
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className='rounded-none border-line'>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='rounded-none font-normal'>
            返回
          </AlertDialogCancel>
          <AlertDialogAction
            variant='brand'
            className='rounded-none font-normal'
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
