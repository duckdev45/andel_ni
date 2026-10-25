import type { Route } from './+types/ledger'

import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useAdmin } from '~/components/admin/admin-store'
import { Empty, NumInput, PANEL } from '~/components/admin/parts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  CURRENCIES,
  type Currency,
  currencyLabel,
  foreign,
  isBooked,
  type LedgerSettings,
  minus,
  money,
  orderLedger,
  PAY,
  type PayMethod,
  percent,
  purchaseCalc,
  SHIP,
  type ShipMethod,
  taipeiDate,
} from '~/lib/mock/admin'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => [{ title: '記帳簿｜AndelNI' }]

type Period = 'all' | 'month'
type Tab = 'purchases' | 'sales' | 'settings'

const MONO = 'font-mono tabular-nums'
const TH = 'h-auto px-2 py-2.5 text-xs font-normal text-muted-foreground'

export default function Ledger() {
  const { orders, products, purchases, settings, openSheet } = useAdmin()
  const [period, setPeriod] = useState<Period>('month')
  const [tab, setTab] = useState<Tab>('sales')

  const inP = (date: string) =>
    period === 'all' || date.startsWith(taipeiDate().slice(0, 7))
  const sales = orders
    .filter((o) => isBooked(o) && inP(o.date))
    .map((o) => ({ o, l: orderLedger(o, purchases, settings) }))
  const T = sales.reduce(
    (a, { l }) => ({
      sale: a.sale + l.sale,
      cogs: a.cogs + l.cogs,
      fee: a.fee + l.fee,
      pack: a.pack + l.pack,
      ship: a.ship + l.ship,
      net: a.net + l.net,
    }),
    { sale: 0, cogs: 0, fee: 0, pack: 0, ship: 0, net: 0 }
  )
  const pendN = orders.filter(
    (o) => o.status === 'pending_payment' && inP(o.date)
  ).length

  const purs = purchases
    .filter((p) => inP(p.date))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .map((p) => ({ p, c: purchaseCalc(p) }))
  const byCur = new Map<Currency, { f: number; t: number }>()
  for (const { p, c } of purs) {
    const x = byCur.get(p.cur) ?? { f: 0, t: 0 }
    byCur.set(p.cur, { f: x.f + c.foreign, t: x.t + c.total })
  }
  const pName = (id: string) => products.find((p) => p.id === id)?.name ?? id

  const exportCsv = () => {
    const rows =
      tab === 'purchases'
        ? [
            [
              '日期',
              '商品',
              '規格',
              '數量',
              '幣別',
              '外幣單價',
              '匯率',
              '刷卡手續費%',
              '台幣合計',
              '單位成本',
              '備註',
            ],
            ...purs.map(({ p, c }) => [
              p.date,
              pName(p.pid),
              p.opt ?? '',
              p.qty,
              p.cur,
              p.unit,
              p.rate,
              p.fx,
              c.total,
              c.unitTwd,
              p.note,
            ]),
          ]
        : [
            [
              '日期',
              '訂單',
              '顧客',
              '付款',
              '售出',
              '商品成本',
              '金流手續費',
              '包材',
              '物流',
              '淨利',
            ],
            ...sales.map(({ o, l }) => [
              o.date,
              o.id,
              o.customer.name,
              PAY[o.pay],
              l.sale,
              l.cogs,
              l.fee,
              l.pack,
              l.ship,
              l.net,
            ]),
          ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    )
    a.download = `AndelNI-${tab === 'purchases' ? '進貨紀錄' : '銷售明細'}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('已匯出 CSV')
  }

  return (
    <>
      <div className='flex flex-wrap items-center justify-between gap-2.5'>
        <div
          className='flex gap-0.5 bg-[#E4E4DE] p-[3px]'
          role='group'
          aria-label='期間'
        >
          {(
            [
              ['month', '本月（10 月）'],
              ['all', '全部'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type='button'
              className={cn(
                'h-11 px-4 text-[13px] lg:h-[34px]',
                period === k && 'bg-[#FBFBF9]'
              )}
              aria-pressed={period === k}
              onClick={() => setPeriod(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type='button'
          className='flex h-11 flex-none items-center gap-1.5 border border-[#BDBDB6] bg-[#FBFBF9] px-3.5 text-[13px] whitespace-nowrap hover:border-foreground lg:h-[38px]'
          onClick={exportCsv}
        >
          <Download
            className='size-[15px]'
            strokeWidth={1.6}
            aria-hidden='true'
          />
          匯出 CSV
        </button>
      </div>

      <div className='grid items-start gap-4 lg:grid-cols-2'>
        <section className={cn(PANEL, 'px-[18px] pt-[18px] pb-2')}>
          <div className='flex items-baseline justify-between gap-2'>
            <h2 className='text-[14.5px] font-bold'>損益</h2>
            <span className='text-xs text-muted-foreground'>
              已入帳 {sales.length} 筆訂單
            </span>
          </div>
          <div className='mt-3.5 mb-4 flex flex-wrap items-baseline gap-3'>
            <span
              className={cn(
                MONO,
                'text-[28px] font-medium tracking-[-0.01em] lg:text-[34px]',
                T.net < 0 ? 'text-brand' : 'text-[#3f5640]'
              )}
            >
              {money(T.net)}
            </span>
            <span className='text-[13px] text-[#2E2E2A]'>
              淨利 · 淨利率 {percent(T.net, T.sale)}
            </span>
          </div>
          <dl>
            {[
              ['銷售額（含運費收入）', money(T.sale), true],
              ['商品成本', minus(T.cogs)],
              ['金流手續費', minus(T.fee)],
              ['包材成本', minus(T.pack)],
              ['物流成本', minus(T.ship)],
            ].map(([k, v, strong]) => (
              <div
                key={String(k)}
                className={cn(
                  'flex justify-between gap-3 border-t border-[#E4E4DE] py-2.5 text-[13.5px]',
                  !strong && 'text-[#2E2E2A]'
                )}
              >
                <dt>{k}</dt>
                <dd className={MONO}>{v}</dd>
              </div>
            ))}
          </dl>
          {pendN > 0 && (
            <p className='border-t border-[#E4E4DE] py-2.5 text-xs text-muted-foreground'>
              另有 {pendN} 筆待付款訂單，收款後才計入。
            </p>
          )}
        </section>

        <section className={cn(PANEL, 'px-[18px] pt-[18px] pb-2')}>
          <div className='flex items-baseline justify-between gap-2'>
            <h2 className='text-[14.5px] font-bold'>進貨支出</h2>
            <span className='text-xs text-muted-foreground'>
              {purs.length} 筆
            </span>
          </div>
          <div className='mt-3.5 mb-4 flex flex-wrap items-baseline gap-3'>
            <span
              className={cn(
                MONO,
                'text-[28px] font-medium tracking-[-0.01em] lg:text-[34px]'
              )}
            >
              {money(purs.reduce((a, x) => a + x.c.total, 0))}
            </span>
            <span className='text-[13px] text-[#2E2E2A]'>
              含刷卡手續費 {money(purs.reduce((a, x) => a + x.c.fee, 0))}
            </span>
          </div>
          <dl>
            {[...byCur].map(([cur, v]) => (
              <div
                key={cur}
                className='flex justify-between gap-3 border-t border-[#E4E4DE] py-2.5 text-[13.5px]'
              >
                <dt className='truncate text-[#2E2E2A]'>
                  {cur} {currencyLabel(cur)}
                </dt>
                <dd className={cn(MONO, 'flex flex-none gap-2.5')}>
                  {cur !== 'TWD' && (
                    <span className='text-muted-foreground'>
                      {foreign(cur, v.f)}
                    </span>
                  )}
                  <span>{money(v.t)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <Tabs
        className='gap-4 lg:gap-5'
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
      >
        <TabsList
          variant='line'
          className='h-auto! w-full justify-start gap-[22px] rounded-none border-b border-border p-0'
        >
          {(
            [
              ['sales', '銷售明細'],
              ['purchases', '進貨紀錄'],
              ['settings', '費率設定'],
            ] as const
          ).map(([k, label]) => (
            <TabsTrigger
              key={k}
              className='h-11 flex-none rounded-none px-0 text-sm font-normal text-muted-foreground after:bottom-[-1px]! data-[state=active]:text-foreground'
              value={k}
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value='sales'>
          <section className={cn(PANEL, 'overflow-hidden')}>
            {sales.length > 0 && (
              <>
                <Table className='hidden min-w-[820px] lg:table'>
                  <TableHeader>
                    <TableRow className='border-border hover:bg-transparent'>
                      <TableHead className={cn(TH, 'pl-4')}>日期</TableHead>
                      <TableHead className={TH}>訂單</TableHead>
                      {[
                        '售出',
                        '商品成本',
                        '手續費',
                        '包材',
                        '物流',
                        '淨利',
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className={cn(TH, 'text-right last:pr-4')}
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(({ o, l }) => (
                      <TableRow
                        key={o.id}
                        className={cn(
                          MONO,
                          'border-[#E4E4DE] text-[13.5px] hover:bg-background'
                        )}
                      >
                        <TableCell className='px-2 py-3 pl-4 text-muted-foreground'>
                          {o.date.slice(5, 10)}
                        </TableCell>
                        <TableCell className='w-full max-w-0 px-2 py-3'>
                          <button
                            type='button'
                            className='truncate text-left hover:text-brand hover:underline'
                            onClick={() =>
                              openSheet({ type: 'order', id: o.id })
                            }
                          >
                            {o.id}{' '}
                            <span className='text-muted-foreground'>
                              {o.customer.name} · {PAY[o.pay]}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className='px-2 py-3 text-right'>
                          {money(l.sale)}
                        </TableCell>
                        {[l.cogs, l.fee, l.pack, l.ship].map((v, i) => (
                          <TableCell
                            key={i}
                            className='px-2 py-3 text-right text-[#2E2E2A]'
                          >
                            {money(v)}
                          </TableCell>
                        ))}
                        <TableCell
                          className={cn(
                            'px-2 py-3 pr-4 text-right font-medium',
                            l.net < 0 ? 'text-brand' : 'text-[#3f5640]'
                          )}
                        >
                          {money(l.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ul className='lg:hidden'>
                  {sales.map(({ o, l }) => (
                    <li key={o.id}>
                      <button
                        type='button'
                        className={cn(
                          MONO,
                          'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[#E4E4DE] px-4 py-[13px] text-left'
                        )}
                        onClick={() => openSheet({ type: 'order', id: o.id })}
                      >
                        <span className='text-sm font-medium'>
                          {o.id}{' '}
                          <span className='text-[12.5px] font-normal text-muted-foreground'>
                            {o.customer.name}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'justify-self-end text-[14.5px] font-medium',
                            l.net < 0 ? 'text-brand' : 'text-[#3f5640]'
                          )}
                        >
                          {money(l.net)}
                        </span>
                        <span className='text-[12.5px] text-[#2E2E2A]'>
                          {o.date.slice(5, 10)} · {PAY[o.pay]} · 售出{' '}
                          {money(l.sale)}
                        </span>
                        <span className='justify-self-end text-xs text-muted-foreground'>
                          淨利率 {percent(l.net, l.sale)}
                        </span>
                        <span className='col-span-2 text-xs text-[#6B6B65]'>
                          成本 {money(l.cogs)} · 手續費 {money(l.fee)} · 包材{' '}
                          {money(l.pack)} · 物流 {money(l.ship)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!sales.length && <Empty>這段期間沒有已入帳訂單</Empty>}
          </section>
        </TabsContent>

        <TabsContent value='purchases'>
          <section className={cn(PANEL, 'overflow-hidden')}>
            {purs.length > 0 && (
              <>
                <Table className='hidden min-w-[860px] lg:table'>
                  <TableHeader>
                    <TableRow className='border-border hover:bg-transparent'>
                      <TableHead className={cn(TH, 'pl-4')}>日期</TableHead>
                      <TableHead className={TH}>商品</TableHead>
                      {[
                        '數量',
                        '外幣單價',
                        '匯率',
                        '刷卡費',
                        '台幣合計',
                        '單位成本',
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className={cn(TH, 'text-right last:pr-4')}
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purs.map(({ p, c }) => {
                      const sub = [p.opt, p.note].filter(Boolean).join(' · ')
                      return (
                        <TableRow
                          key={p.id}
                          className={cn(
                            MONO,
                            'border-[#E4E4DE] text-[13.5px] hover:bg-background'
                          )}
                        >
                          <TableCell className='px-2 py-3 pl-4 text-muted-foreground'>
                            {p.date.slice(5)}
                          </TableCell>
                          <TableCell className='w-full max-w-0 px-2 py-3'>
                            <span className='block truncate'>
                              {pName(p.pid)}
                            </span>
                            {sub && (
                              <span className='block text-xs text-[#6B6B65]'>
                                {sub}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className='px-2 py-3 text-right'>
                            {p.qty}
                          </TableCell>
                          <TableCell className='px-2 py-3 text-right text-[#2E2E2A]'>
                            {foreign(p.cur, p.unit)}
                          </TableCell>
                          <TableCell className='px-2 py-3 text-right text-[#2E2E2A]'>
                            {p.rate}
                          </TableCell>
                          <TableCell className='px-2 py-3 text-right text-[#2E2E2A]'>
                            {p.fx}%
                          </TableCell>
                          <TableCell className='px-2 py-3 text-right font-medium'>
                            {money(c.total)}
                          </TableCell>
                          <TableCell className='px-2 py-3 pr-4 text-right text-[#2E2E2A]'>
                            {money(c.unitTwd)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <ul className='lg:hidden'>
                  {purs.map(({ p, c }) => {
                    const sub = [p.opt, p.note].filter(Boolean).join(' · ')
                    return (
                      <li
                        key={p.id}
                        className={cn(
                          MONO,
                          'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[#E4E4DE] px-4 py-[13px]'
                        )}
                      >
                        <span className='truncate text-sm'>
                          {pName(p.pid)}{' '}
                          <span className='text-muted-foreground'>
                            ×{p.qty}
                          </span>
                        </span>
                        <span className='justify-self-end text-[14.5px] font-medium'>
                          {money(c.total)}
                        </span>
                        <span className='text-[12.5px] text-[#2E2E2A]'>
                          {p.date.slice(5)} · {foreign(p.cur, p.unit)} ×{' '}
                          {p.rate} · 刷卡 {p.fx}%
                        </span>
                        <span className='justify-self-end text-xs text-muted-foreground'>
                          單位 {money(c.unitTwd)}
                        </span>
                        {sub && (
                          <span className='col-span-2 text-xs text-[#6B6B65]'>
                            {sub}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
            {!purs.length && <Empty>這段期間沒有進貨紀錄</Empty>}
          </section>
        </TabsContent>

        <TabsContent value='settings'>
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </>
  )
}

function SettingsPanel() {
  const { settings, updateSettings } = useAdmin()
  const done = () => toast('設定已更新，損益已重新計算')
  const patch = (fn: (s: LedgerSettings) => LedgerSettings) =>
    updateSettings(fn)

  return (
    <div className='grid items-start gap-4 lg:grid-cols-2'>
      <section className={cn(PANEL, 'p-[18px]')}>
        <h2 className='mb-1 text-[14.5px] font-medium'>金流手續費</h2>
        <p className='mb-2.5 text-xs text-muted-foreground'>
          每筆訂單：售出金額 × 費率 ＋ 固定費
        </p>
        {(Object.keys(PAY) as PayMethod[]).map((k) => (
          <div
            key={k}
            className='flex flex-wrap items-center gap-2 border-t border-[#E4E4DE] py-2 text-[13.5px]'
          >
            <label className='min-w-0 flex-1' htmlFor={`fee-${k}`}>
              {PAY[k]}
            </label>
            <NumInput
              id={`fee-${k}`}
              className='h-11 w-16 lg:h-[38px]'
              value={settings.payFee[k].pct}
              onCommit={done}
              onValue={(n) =>
                patch((s) => ({
                  ...s,
                  payFee: { ...s.payFee, [k]: { ...s.payFee[k], pct: n } },
                }))
              }
            />
            <span className='w-[22px] text-muted-foreground'>%</span>
            <span className='text-muted-foreground'>＋NT$</span>
            <NumInput
              className='h-11 w-14 lg:h-[38px]'
              value={settings.payFee[k].fixed}
              aria-label={`${PAY[k]} 固定費`}
              onCommit={done}
              onValue={(n) =>
                patch((s) => ({
                  ...s,
                  payFee: { ...s.payFee, [k]: { ...s.payFee[k], fixed: n } },
                }))
              }
            />
          </div>
        ))}
      </section>

      <section className={cn(PANEL, 'p-[18px]')}>
        <h2 className='mb-2.5 text-[14.5px] font-medium'>每筆訂單成本</h2>
        <SettingRow
          id='set-pack'
          label='包材（預設每單）'
          unit='NT$'
          value={settings.pack}
          onCommit={done}
          onValue={(n) => patch((s) => ({ ...s, pack: n }))}
        />
        {(Object.keys(SHIP) as ShipMethod[]).map((k) => (
          <SettingRow
            key={k}
            id={`set-ship-${k}`}
            label={`物流 · ${SHIP[k]}`}
            unit='NT$'
            value={settings.shipCost[k]}
            onCommit={done}
            onValue={(n) =>
              patch((s) => ({ ...s, shipCost: { ...s.shipCost, [k]: n } }))
            }
          />
        ))}
        <SettingRow
          id='set-fx'
          label='海外刷卡手續費（進貨）'
          unit='%'
          value={settings.cardFx}
          onCommit={done}
          onValue={(n) => patch((s) => ({ ...s, cardFx: n }))}
        />

        <h2 className='mt-5 mb-1 text-[14.5px] font-medium'>預設匯率</h2>
        <p className='mb-2.5 text-xs text-muted-foreground'>
          新增進貨時自動帶入，可逐筆修改為當下匯率
        </p>
        {CURRENCIES.filter((c) => c.code !== 'TWD').map((c) => (
          <SettingRow
            key={c.code}
            id={`set-rate-${c.code}`}
            label={c.label}
            unit={`1 ${c.code} =`}
            suffix='TWD'
            value={settings.rates[c.code]}
            onCommit={done}
            onValue={(n) =>
              patch((s) => ({ ...s, rates: { ...s.rates, [c.code]: n } }))
            }
          />
        ))}
      </section>
    </div>
  )
}

function SettingRow({
  id,
  label,
  unit,
  suffix,
  value,
  onCommit,
  onValue,
}: {
  id: string
  label: string
  unit: string
  suffix?: string
  value: number
  onCommit: () => void
  onValue: (n: number) => void
}) {
  return (
    <div className='flex items-center gap-2 border-t border-[#E4E4DE] py-2 text-[13.5px]'>
      <label className='min-w-0 flex-1' htmlFor={id}>
        {label}
      </label>
      <span className='text-muted-foreground'>{unit}</span>
      <NumInput
        id={id}
        className='h-11 w-20 lg:h-[38px]'
        value={value}
        onCommit={onCommit}
        onValue={onValue}
      />
      {suffix && <span className='text-muted-foreground'>{suffix}</span>}
    </div>
  )
}
