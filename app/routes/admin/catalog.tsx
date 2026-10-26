import type { Route } from './+types/catalog'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'

import { useAdmin } from '~/components/admin/admin-store'
import {
  AdminSwitch,
  Empty,
  Field,
  FIELD,
  PANEL,
  PanelHead,
  ROW_RULE,
  SearchField,
} from '~/components/admin/parts'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import {
  type AdminBrand,
  type AdminCategory,
  CURRENCIES,
  type Currency,
} from '~/lib/admin'
import { cn } from '~/lib/utils'

// 分類與品牌：前台首頁、商品頁都讀這裡的資料（D1）。

export const meta: Route.MetaFunction = () => [{ title: '分類與品牌｜AndelNI' }]

const ADD =
  'h-9 border border-foreground px-3 text-[13px] hover:bg-foreground hover:text-background'
const EDIT =
  'h-11 flex-none px-2 text-[13px] text-muted-foreground underline hover:text-foreground'
const errorText = (e: unknown) => (e instanceof Error ? e.message : '儲存失敗')

export default function Catalog() {
  return (
    <>
      <Categories />
      <Brands />
    </>
  )
}

function Categories() {
  const { categories, moveCategory } = useAdmin()
  // 編輯中的分類代碼；'' 是新增
  const [editing, setEditing] = useState<null | string>(null)
  const done = () => setEditing(null)

  return (
    <section className={PANEL} aria-label='分類'>
      <PanelHead title='分類'>
        <button type='button' className={ADD} onClick={() => setEditing('')}>
          新增分類
        </button>
      </PanelHead>
      {editing === '' && <CategoryForm onDone={done} />}
      <ul>
        {categories.map((c, i) =>
          editing === c.id ? (
            <li key={c.id} className={ROW_RULE}>
              <CategoryForm category={c} onDone={done} />
            </li>
          ) : (
            <li
              key={c.id}
              className={cn('flex items-center gap-3 py-2 pr-2 pl-2', ROW_RULE)}
            >
              <span className='flex flex-none'>
                <button
                  type='button'
                  className='grid size-11 place-items-center hover:bg-muted disabled:opacity-30'
                  aria-label={`${c.name} 上移`}
                  disabled={i === 0}
                  onClick={() => moveCategory(c.id, -1)}
                >
                  <ArrowUp className='size-4' strokeWidth={1.6} />
                </button>
                <button
                  type='button'
                  className='grid size-11 place-items-center hover:bg-muted disabled:opacity-30'
                  aria-label={`${c.name} 下移`}
                  disabled={i === categories.length - 1}
                  onClick={() => moveCategory(c.id, 1)}
                >
                  <ArrowDown className='size-4' strokeWidth={1.6} />
                </button>
              </span>
              <span
                className={cn(
                  'flex min-w-0 flex-1 flex-col gap-[3px]',
                  !c.active && 'opacity-55'
                )}
              >
                <span className='truncate text-sm font-medium'>
                  {c.name}
                  <span className='ml-2 font-display text-xs tracking-[0.06em] text-muted-foreground uppercase'>
                    {c.en}
                  </span>
                </span>
                <span className='truncate font-mono text-xs text-muted-foreground'>
                  {c.id} · {c.count} 件
                  {c.live !== c.count && `（上架 ${c.live}）`}
                  {c.comingSoon && ' · 即將推出'}
                  {!c.active && ' · 已停用'}
                </span>
              </span>
              <button
                type='button'
                className={EDIT}
                aria-label={`編輯 ${c.name}`}
                onClick={() => setEditing(c.id)}
              >
                編輯
              </button>
            </li>
          )
        )}
      </ul>
      {!categories.length && editing !== '' && <Empty>還沒有分類</Empty>}
    </section>
  )
}

function CategoryForm({
  category: c,
  onDone,
}: {
  category?: AdminCategory
  onDone: () => void
}) {
  const { saveCategory } = useAdmin()
  const ids = useId()
  const [d, setD] = useState({
    slug: '',
    name: c?.name ?? '',
    en: c?.en ?? '',
    comingSoon: c?.comingSoon ?? false,
    active: c?.active ?? true,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<typeof d>) => setD((x) => ({ ...x, ...patch }))
  // 有上架商品的分類不能停用（伺服器也會擋）
  const locked = !!c?.live && c.active

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await saveCategory(c?.id ?? null, d)
      toast(c ? `已更新分類：${d.name}` : `已新增分類：${d.name}`)
      onDone()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className='flex flex-col gap-3 bg-background p-4'
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className='grid gap-3 sm:grid-cols-3'>
        <Field id={`${ids}-slug`} label='代碼（SKU 用，建立後不能改）'>
          <Input
            id={`${ids}-slug`}
            className={cn(FIELD, 'font-mono')}
            value={c?.id ?? d.slug}
            disabled={!!c}
            placeholder='例：home'
            autoCapitalize='none'
            autoComplete='off'
            onChange={(e) => set({ slug: e.target.value.toLowerCase() })}
          />
        </Field>
        <Field id={`${ids}-name`} label='名稱'>
          <Input
            id={`${ids}-name`}
            className={FIELD}
            value={d.name}
            placeholder='例：家飾'
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field id={`${ids}-en`} label='英文名稱'>
          <Input
            id={`${ids}-en`}
            className={FIELD}
            value={d.en}
            placeholder='例：Home'
            onChange={(e) => set({ en: e.target.value })}
          />
        </Field>
      </div>
      <div className='flex flex-wrap gap-x-8 gap-y-3 text-sm'>
        <span className='flex items-center gap-3'>
          <AdminSwitch
            id={`${ids}-soon`}
            checked={d.comingSoon}
            onCheckedChange={(comingSoon) => set({ comingSoon })}
          />
          <label htmlFor={`${ids}-soon`}>即將推出</label>
        </span>
        <span className='flex items-center gap-3'>
          <AdminSwitch
            id={`${ids}-active`}
            checked={d.active}
            disabled={locked}
            onCheckedChange={(active) => set({ active })}
          />
          <label htmlFor={`${ids}-active`}>
            前台顯示
            {locked && (
              <span className='ml-2 text-xs text-muted-foreground'>
                有上架商品，不能停用
              </span>
            )}
          </label>
        </span>
      </div>
      <FormButtons error={error} saving={saving} onCancel={onDone} />
    </form>
  )
}

function Brands() {
  const { brands } = useAdmin()
  const [editing, setEditing] = useState<'new' | null | number>(null)
  const [q, setQ] = useState('')
  const done = () => setEditing(null)
  const query = q.trim().toLowerCase()
  const list = brands.filter(
    (b) => !query || b.name.toLowerCase().includes(query)
  )

  return (
    <section className={PANEL} aria-label='品牌'>
      <PanelHead title={`品牌 ${brands.length}`}>
        <button type='button' className={ADD} onClick={() => setEditing('new')}>
          新增品牌
        </button>
      </PanelHead>
      <div className={cn('p-3', ROW_RULE)}>
        <SearchField
          label='搜尋品牌'
          value={q}
          placeholder='搜尋品牌'
          onChange={setQ}
        />
      </div>
      {editing === 'new' && <BrandForm onDone={done} />}
      <ul>
        {list.map((b) =>
          editing === b.id ? (
            <li key={b.id} className={ROW_RULE}>
              <BrandForm brand={b} onDone={done} />
            </li>
          ) : (
            <li
              key={b.id}
              className={cn('flex items-center gap-3 py-2 pr-2 pl-4', ROW_RULE)}
            >
              <span className='flex min-w-0 flex-1 flex-col gap-[3px]'>
                <span className='truncate text-sm font-medium'>{b.name}</span>
                <span className='truncate text-xs text-muted-foreground'>
                  {b.origin || '未填產地'} ·{' '}
                  <span className='font-mono'>{b.currency}</span> ·{' '}
                  {b.count ? `${b.count} 件商品` : '沒有商品，前台不顯示'}
                </span>
              </span>
              <button
                type='button'
                className={EDIT}
                aria-label={`編輯 ${b.name}`}
                onClick={() => setEditing(b.id)}
              >
                編輯
              </button>
            </li>
          )
        )}
      </ul>
      {!list.length && editing !== 'new' && <Empty>沒有符合的品牌</Empty>}
    </section>
  )
}

function BrandForm({
  brand: b,
  onDone,
}: {
  brand?: AdminBrand
  onDone: () => void
}) {
  const { saveBrand, deleteBrand } = useAdmin()
  const ids = useId()
  const [d, setD] = useState({
    name: b?.name ?? '',
    origin: b?.origin ?? '',
    blurb: b?.blurb ?? '',
    currency: b?.currency ?? ('EUR' as Currency),
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<typeof d>) => setD((x) => ({ ...x, ...patch }))

  const run = async (fn: () => Promise<void>, msg: string) => {
    setSaving(true)
    setError('')
    try {
      await fn()
      toast(msg)
      onDone()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className='flex flex-col gap-3 bg-background p-4'
      onSubmit={(e) => {
        e.preventDefault()
        void run(
          () => saveBrand(b?.id ?? null, d),
          b ? `已更新品牌：${d.name}` : `已新增品牌：${d.name}`
        )
      }}
    >
      <div className='grid gap-3 sm:grid-cols-3'>
        <Field id={`${ids}-name`} label='品牌名稱'>
          <Input
            id={`${ids}-name`}
            className={FIELD}
            value={d.name}
            placeholder='例：GOYARD'
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field id={`${ids}-origin`} label='產地'>
          <Input
            id={`${ids}-origin`}
            className={FIELD}
            value={d.origin}
            placeholder='例：法國'
            onChange={(e) => set({ origin: e.target.value })}
          />
        </Field>
        <Field id={`${ids}-cur`} label='預設進貨幣別'>
          <Select
            value={d.currency}
            onValueChange={(v) => set({ currency: v as Currency })}
          >
            <SelectTrigger
              id={`${ids}-cur`}
              className={cn(FIELD, 'w-full rounded-none shadow-none')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-none'>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field
        id={`${ids}-blurb`}
        label='品牌介紹（商品頁品牌卡，未填顯示「來自○○的品牌。」）'
      >
        <Textarea
          id={`${ids}-blurb`}
          className='min-h-20 rounded-none border-[#BDBDB6] bg-[#FBFBF9] text-[15px] md:text-[15px]'
          value={d.blurb}
          maxLength={300}
          onChange={(e) => set({ blurb: e.target.value })}
        />
      </Field>
      <FormButtons error={error} saving={saving} onCancel={onDone}>
        {b && b.count === 0 && (
          <Button
            type='button'
            variant='outline'
            className='ml-auto h-11 rounded-none border-brand px-5 font-normal text-brand hover:bg-brand hover:text-brand-foreground'
            disabled={saving}
            onClick={() =>
              void run(() => deleteBrand(b.id), `已刪除品牌：${b.name}`)
            }
          >
            刪除品牌
          </Button>
        )}
      </FormButtons>
    </form>
  )
}

function FormButtons({
  error,
  saving,
  children,
  onCancel,
}: {
  error: string
  saving: boolean
  children?: React.ReactNode
  onCancel: () => void
}) {
  return (
    <>
      {error && (
        <p className='text-[13px] text-brand' role='alert'>
          {error}
        </p>
      )}
      <div className='flex flex-wrap gap-2'>
        <Button
          type='submit'
          variant='brand'
          className='h-11 rounded-none px-6 font-normal'
          disabled={saving}
        >
          儲存
        </Button>
        <Button
          type='button'
          variant='outline'
          className='h-11 rounded-none px-6 font-normal'
          onClick={onCancel}
        >
          取消
        </Button>
        {children}
      </div>
    </>
  )
}
