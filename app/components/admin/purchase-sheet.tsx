import { useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  type AdminProduct,
  CURRENCIES,
  type Currency,
  foreign,
  type LedgerSettings,
  money,
  num,
  purchaseCalc,
  taipeiDate,
} from '~/lib/admin'
import { cn } from '~/lib/utils'

import { useAdmin } from './admin-store'
import { AdminSwitch, Field, FIELD, PANEL } from './parts'

const defaults = (
  p: AdminProduct,
  opt: null | string,
  st: LedgerSettings,
  cur: Currency
) => ({
  pid: p.id,
  opt: opt ?? p.variants?.options[0]?.label ?? null,
  cur,
  rate: String(st.rates[cur]),
  fx: cur === 'TWD' ? '0' : String(st.cardFx),
})

export function PurchaseSheetBody({
  pid,
  opt,
}: {
  pid: null | string
  opt: null | string
}) {
  const { products, settings, addPurchase, brandCurrency, closeSheet } =
    useAdmin()
  const ids = useId()
  const [d, setD] = useState(() => {
    const p = products.find((x) => x.id === pid) ?? products[0]
    return {
      date: taipeiDate(),
      qty: '',
      unit: '',
      note: '',
      toStock: true,
      ...defaults(p, opt, settings, brandCurrency(p.brand)),
    }
  })
  const [err, setErr] = useState<Record<string, boolean>>({})
  const set = (patch: Partial<typeof d>) => setD((x) => ({ ...x, ...patch }))
  const product = products.find((p) => p.id === d.pid)
  const c = purchaseCalc({
    qty: num(d.qty),
    unit: num(d.unit),
    rate: num(d.rate),
    fx: num(d.fx),
  })
  const hasErr = Object.values(err).some(Boolean)

  const save = () => {
    const e = {
      qty: !(num(d.qty) > 0),
      unit: !(num(d.unit) > 0),
      rate: !(num(d.rate) > 0),
    }
    setErr(e)
    if (Object.values(e).some(Boolean)) return
    addPurchase(
      {
        date: d.date || taipeiDate(),
        pid: d.pid,
        opt: d.opt,
        qty: Math.round(num(d.qty)),
        cur: d.cur,
        unit: num(d.unit),
        rate: num(d.rate),
        fx: num(d.fx),
        note: d.note,
      },
      d.toStock
    )
    closeSheet()
    toast(d.toStock ? '已記錄進貨並入庫' : '已記錄進貨')
  }

  return (
    <>
      <div className='flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-5 pt-4 pb-5'>
        <Field id={`${ids}-pid`} label='商品'>
          <Select
            value={d.pid}
            onValueChange={(v) => {
              const p = products.find((x) => x.id === v)
              if (p) set(defaults(p, null, settings, brandCurrency(p.brand)))
            }}
          >
            <SelectTrigger
              id={`${ids}-pid`}
              className={cn(FIELD, 'w-full rounded-none shadow-none')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='max-h-80 rounded-none'>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}｜{p.brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {product?.variants && (
          <Field id={`${ids}-opt`} label={product.variants.name}>
            <Select value={d.opt ?? ''} onValueChange={(v) => set({ opt: v })}>
              <SelectTrigger
                id={`${ids}-opt`}
                className={cn(FIELD, 'w-full rounded-none shadow-none')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-none'>
                {product.variants.options.map((o) => (
                  <SelectItem key={o.label} value={o.label}>
                    {o.label}（現有 {o.stock}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <div className='grid grid-cols-2 gap-3'>
          <Field id={`${ids}-date`} label='進貨日期'>
            <Input
              id={`${ids}-date`}
              type='date'
              className={FIELD}
              value={d.date}
              onChange={(e) => set({ date: e.target.value })}
            />
          </Field>
          <Field id={`${ids}-qty`} label='數量'>
            <Input
              id={`${ids}-qty`}
              className={cn(FIELD, err.qty && 'border-brand')}
              value={d.qty}
              inputMode='numeric'
              placeholder='0'
              aria-invalid={err.qty}
              onChange={(e) => set({ qty: e.target.value })}
            />
          </Field>
          <Field id={`${ids}-cur`} label='幣別'>
            <Select
              value={d.cur}
              onValueChange={(v) => {
                const cur = v as Currency
                set({
                  cur,
                  rate: String(settings.rates[cur]),
                  fx: cur === 'TWD' ? '0' : String(settings.cardFx),
                })
              }}
            >
              <SelectTrigger
                id={`${ids}-cur`}
                className={cn(FIELD, 'w-full rounded-none shadow-none')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-none'>
                {CURRENCIES.map((x) => (
                  <SelectItem key={x.code} value={x.code}>
                    {x.code} {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id={`${ids}-unit`} label={`購入單價（${d.cur}）`}>
            <Input
              id={`${ids}-unit`}
              className={cn(FIELD, err.unit && 'border-brand')}
              value={d.unit}
              inputMode='decimal'
              placeholder='0'
              aria-invalid={err.unit}
              onChange={(e) => set({ unit: e.target.value })}
            />
          </Field>
          <Field id={`${ids}-rate`} label='當下匯率'>
            <Input
              id={`${ids}-rate`}
              className={cn(FIELD, err.rate && 'border-brand')}
              value={d.rate}
              inputMode='decimal'
              aria-invalid={err.rate}
              onChange={(e) => set({ rate: e.target.value })}
            />
          </Field>
          <Field id={`${ids}-fx`} label='刷卡手續費 %'>
            <Input
              id={`${ids}-fx`}
              className={FIELD}
              value={d.fx}
              inputMode='decimal'
              onChange={(e) => set({ fx: e.target.value })}
            />
          </Field>
        </div>
        {hasErr && (
          <span className='text-xs text-brand' role='alert'>
            請填寫數量、購入單價與匯率
          </span>
        )}

        <Field id={`${ids}-note`} label='備註'>
          <Input
            id={`${ids}-note`}
            className={FIELD}
            value={d.note}
            placeholder='供應商、收據號碼…'
            onChange={(e) => set({ note: e.target.value })}
          />
        </Field>

        <div className={cn(PANEL, 'px-3.5 py-1 font-mono tabular-nums')}>
          {[
            ['外幣小計', foreign(d.cur, c.foreign)],
            [`換算台幣（× ${d.rate || 0}）`, money(c.base)],
            [`刷卡手續費（${num(d.fx)}%）`, money(c.fee)],
            ['單位成本', money(c.unitTwd)],
          ].map(([k, v]) => (
            <div
              key={k}
              className='flex justify-between border-b border-[#E4E4DE] py-2.5 text-[13.5px] text-[#2E2E2A]'
            >
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div className='flex justify-between py-3 text-[15px] font-medium'>
            <span>台幣合計</span>
            <span>{money(c.total)}</span>
          </div>
        </div>

        <div
          className={cn(
            PANEL,
            'flex min-h-[52px] items-center justify-between gap-3 px-3.5 py-2 text-sm'
          )}
        >
          <label className='flex flex-col gap-0.5' htmlFor={`${ids}-stock`}>
            <span>同時加入庫存</span>
            <span className='text-xs text-muted-foreground'>
              {d.toStock
                ? `庫存 +${Math.round(num(d.qty)) || 0}`
                : '只記帳，不變動庫存'}
            </span>
          </label>
          <AdminSwitch
            id={`${ids}-stock`}
            checked={d.toStock}
            onCheckedChange={(toStock) => set({ toStock })}
          />
        </div>
      </div>

      <div className='flex-none border-t border-border bg-[#FBFBF9] px-5 pt-3 pb-[18px]'>
        <Button
          type='button'
          variant='brand'
          className='h-12 w-full rounded-none text-[15px] font-normal'
          onClick={save}
        >
          記錄進貨
        </Button>
      </div>
    </>
  )
}
