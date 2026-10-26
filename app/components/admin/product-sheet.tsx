import type { CategoryId } from '~/lib/catalog'

import { ImagePlus, X } from 'lucide-react'
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
import { Textarea } from '~/components/ui/textarea'
import {
  type AdminProduct,
  avgCost,
  CURRENCIES,
  type Currency,
  money,
  num,
  PRODUCT_TYPES,
  type ProductType,
  taipeiDate,
} from '~/lib/admin'
import { imageUrl } from '~/lib/images'
import { cn } from '~/lib/utils'

import { uploadImage, useAdmin } from './admin-store'
import { AdminSwitch, Field, FIELD, PANEL } from './parts'

const MAX_IMAGES = 8

/** 瀏覽器端壓縮：長邊 1600px，WebP（Safari 不支援輸出 WebP 時改 JPEG） */
async function compress(file: File, max = 1600) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const encode = (type: string) =>
    new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85))
  const webp = await encode('image/webp')
  const blob = webp?.type === 'image/webp' ? webp : await encode('image/jpeg')
  if (!blob) throw new Error('照片壓縮失敗')
  return blob
}

type Draft = {
  name: string
  brand: string
  cat: CategoryId
  price: string
  type: ProductType
  stock: string
  hasVar: boolean
  vName: string
  vOpts: { label: string; stock: string }[]
  description: string
  active: boolean
  isNew: boolean
  images: string[]
  // 新商品首批進貨
  cur: Currency
  unit: string
  rate: string
  fx: string
}

export function ProductSheetBody({ product }: { product?: AdminProduct }) {
  const {
    brands,
    categories,
    purchases,
    settings,
    brandCurrency,
    saveProduct,
    closeSheet,
  } = useAdmin()
  const isNew = !product
  const ids = useId()
  const [d, setD] = useState<Draft>(() => {
    const brand = product?.brand ?? ''
    const cur = brandCurrency(brand)
    return {
      name: product?.name ?? '',
      brand,
      cat: product?.cat ?? categories.find((c) => c.active)?.id ?? '',
      price: product ? String(product.price) : '',
      type: product?.type ?? '現貨',
      stock: product ? String(product.stock) : '',
      hasVar: !!product?.variants,
      vName: product?.variants?.name ?? '顏色',
      vOpts: product?.variants?.options.map((o) => ({
        label: o.label,
        stock: String(o.stock),
      })) ?? [{ label: '', stock: '' }],
      description: product?.description ?? '',
      active: product?.active ?? true,
      isNew: product?.isNew ?? true,
      images: product?.images ?? [],
      cur,
      unit: '',
      rate: String(settings.rates[cur]),
      fx: cur === 'TWD' ? '0' : String(settings.cardFx),
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(0)
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))
  const setCur = (cur: Currency) =>
    set({
      cur,
      rate: String(settings.rates[cur]),
      fx: cur === 'TWD' ? '0' : String(settings.cardFx),
    })
  const setOpt = (i: number, patch: Partial<Draft['vOpts'][number]>) =>
    set({ vOpts: d.vOpts.map((o, j) => (j === i ? { ...o, ...patch } : o)) })

  // 停用的分類不能選；編輯中的商品原本就在停用分類時保留
  const catOptions = categories.filter((c) => c.active || c.id === product?.cat)
  const price = num(d.price)
  const cost = isNew
    ? Math.round(num(d.unit) * num(d.rate) * (1 + num(d.fx) / 100))
    : avgCost(purchases, product.id)

  // ponytail: 經 Worker 上傳（照片壓縮後幾百 KB），不用預簽網址；縮圖與 1200×630 分享圖之後再做（規格 5.2）
  const addFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) =>
      f.type.startsWith('image/')
    )
    const room = MAX_IMAGES - d.images.length - uploading
    if (room <= 0) return toast('最多 8 張照片')
    const picked = list.slice(0, room)
    setUploading((n) => n + picked.length)
    for (const f of picked) {
      try {
        const key = await uploadImage(await compress(f))
        setD((x) => ({ ...x, images: [...x.images, key] }))
      } catch (e) {
        toast(e instanceof Error ? e.message : '上傳失敗')
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const save = async () => {
    const e: Record<string, string> = {}
    if (!d.name.trim()) e.name = '請輸入商品名稱'
    if (!d.brand.trim()) e.brand = '請輸入品牌'
    if (!(price > 0)) e.price = '請輸入售價'
    const opts = d.vOpts
      .filter((o) => o.label.trim())
      .map((o) => ({
        label: o.label.trim(),
        stock: Math.max(0, Math.round(num(o.stock))),
      }))
    if (d.hasVar && !d.vName.trim()) e.vName = '請輸入規格名稱'
    if (d.hasVar && !opts.length) e.vOpts = '至少需要一個選項'
    setErrors(e)
    if (Object.keys(e).length) return

    const stock = d.hasVar ? 0 : Math.max(0, Math.round(num(d.stock)))
    const qty = d.hasVar ? opts.reduce((a, o) => a + o.stock, 0) : stock
    setSaving(true)
    try {
      await saveProduct(
        {
          id: product?.id ?? null,
          name: d.name.trim(),
          brand: d.brand.trim(),
          cat: d.cat,
          price: Math.round(price),
          type: d.type,
          active: d.active,
          isNew: d.isNew,
          description: d.description,
          images: d.images,
          stock,
          variants: d.hasVar ? { name: d.vName.trim(), options: opts } : null,
        },
        isNew && num(d.unit) > 0 && qty > 0
          ? {
              date: taipeiDate(),
              cur: d.cur,
              unit: num(d.unit),
              rate: num(d.rate),
              fx: num(d.fx),
              note: '首批進貨',
            }
          : undefined
      )
      closeSheet()
      toast(isNew ? '商品已上架' : '已儲存變更')
    } catch (e) {
      toast(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-4 pb-5'>
        {/* 照片 */}
        <div className='flex flex-col gap-2'>
          <div className='flex items-baseline justify-between gap-2'>
            <span className='text-[12.5px] text-muted-foreground'>
              商品照片
            </span>
            <span className='font-mono text-[11.5px] text-muted-foreground'>
              {d.images.length} / {MAX_IMAGES}・第一張為封面
            </span>
          </div>
          <div className='grid grid-cols-4 gap-2'>
            {d.images.map((src, i) => (
              <div
                key={src}
                className={cn(
                  'relative aspect-square overflow-hidden bg-[#E4E4DE]',
                  i === 0
                    ? 'border-2 border-foreground'
                    : 'border border-border'
                )}
              >
                <img
                  className='block size-full object-cover'
                  src={imageUrl(src)}
                  alt={`商品照片 ${i + 1}`}
                />
                <button
                  type='button'
                  className='absolute top-1 right-1 grid size-7 place-items-center bg-foreground/80 text-[#FBFBF9]'
                  aria-label={`移除照片 ${i + 1}`}
                  onClick={() =>
                    set({ images: d.images.filter((_, j) => j !== i) })
                  }
                >
                  <X className='size-3.5' strokeWidth={1.6} />
                </button>
                <button
                  type='button'
                  className={cn(
                    'absolute inset-x-0 bottom-0 h-[26px] text-[11.5px]',
                    i === 0
                      ? 'bg-foreground text-[#FBFBF9]'
                      : 'bg-[#FBFBF9]/90 text-foreground'
                  )}
                  disabled={i === 0}
                  onClick={() =>
                    set({
                      images: [src, ...d.images.filter((_, j) => j !== i)],
                    })
                  }
                >
                  {i === 0 ? '封面' : '設為封面'}
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <div
                key={`up-${i}`}
                className='grid aspect-square place-items-center border border-border bg-[#E4E4DE] text-[12px] text-muted-foreground'
              >
                上傳中…
              </div>
            ))}
            {d.images.length + uploading < MAX_IMAGES && (
              <label
                className='relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-[#8E8E87] bg-[#FBFBF9] p-1.5 text-center text-[12.5px] text-[#2E2E2A] focus-within:border-foreground'
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  void addFiles(e.dataTransfer.files)
                }}
              >
                <ImagePlus
                  className='size-5'
                  strokeWidth={1.6}
                  aria-hidden='true'
                />
                <span>上傳照片</span>
                <span className='text-[10.5px] text-muted-foreground'>
                  或拖曳到這裡
                </span>
                <input
                  type='file'
                  className='absolute inset-0 size-full cursor-pointer opacity-0'
                  multiple
                  accept='image/*'
                  onChange={(e) => {
                    void addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>
          <span className='text-[11.5px] leading-normal text-muted-foreground'>
            JPG／PNG，上傳時會在瀏覽器壓縮。建議正方形或 4:5，白底或淺色背景。
          </span>
        </div>

        <Field id={`${ids}-name`} label='商品名稱' error={errors.name}>
          <Input
            id={`${ids}-name`}
            className={cn(FIELD, errors.name && 'border-brand')}
            value={d.name}
            placeholder='例：Saint-Sulpice 卡夾'
            aria-invalid={!!errors.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>

        <div className='grid grid-cols-2 gap-3'>
          <Field id={`${ids}-brand`} label='品牌' error={errors.brand}>
            {/* 可選既有品牌或直接輸入新品牌，存檔時自動建立 */}
            <Input
              id={`${ids}-brand`}
              className={cn(FIELD, errors.brand && 'border-brand')}
              value={d.brand}
              list={`${ids}-brands`}
              autoComplete='off'
              placeholder='選擇或輸入新品牌'
              aria-invalid={!!errors.brand}
              onChange={(e) => {
                const brand = e.target.value
                set({ brand })
                if (isNew) setCur(brandCurrency(brand))
              }}
            />
            <datalist id={`${ids}-brands`}>
              {brands.map((b) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
          </Field>
          <Field id={`${ids}-cat`} label='分類'>
            <Select
              value={d.cat}
              onValueChange={(v) => set({ cat: v as CategoryId })}
            >
              <SelectTrigger
                id={`${ids}-cat`}
                className={cn(FIELD, 'w-full rounded-none shadow-none')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-none'>
                {catOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id={`${ids}-price`} label='售價 NT$' error={errors.price}>
            <Input
              id={`${ids}-price`}
              className={cn(FIELD, errors.price && 'border-brand')}
              value={d.price}
              inputMode='numeric'
              placeholder='0'
              aria-invalid={!!errors.price}
              onChange={(e) => set({ price: e.target.value })}
            />
          </Field>
          <Field id={`${ids}-type`} label='類型'>
            <Select
              value={d.type}
              onValueChange={(v) => set({ type: v as ProductType })}
            >
              <SelectTrigger
                id={`${ids}-type`}
                className={cn(FIELD, 'w-full rounded-none shadow-none')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='rounded-none'>
                {PRODUCT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {(d.type === '客訂' || d.type === '代購') && (
          <p className='-mt-2 text-xs leading-normal text-muted-foreground'>
            客訂商品不適用 7 天鑑賞期，前台結帳時需勾選同意。
          </p>
        )}

        {/* 規格與庫存 */}
        <div className='flex flex-col gap-2.5'>
          <span className='text-[12.5px] text-muted-foreground'>
            規格與庫存
          </span>
          <div
            className='grid grid-cols-2 gap-0.5 bg-[#E4E4DE] p-[3px]'
            role='group'
            aria-label='規格'
          >
            {[
              [false, '單一規格'],
              [true, '多規格（顏色、尺寸…）'],
            ].map(([v, label]) => (
              <button
                key={String(v)}
                type='button'
                className={cn(
                  'h-[38px] text-[13.5px]',
                  d.hasVar === v && 'bg-[#FBFBF9]'
                )}
                aria-pressed={d.hasVar === v}
                onClick={() => set({ hasVar: v as boolean })}
              >
                {label}
              </button>
            ))}
          </div>
          {!d.hasVar ? (
            <Field id={`${ids}-stock`} label='庫存數量'>
              <Input
                id={`${ids}-stock`}
                className={FIELD}
                value={d.stock}
                inputMode='numeric'
                placeholder='0'
                onChange={(e) => set({ stock: e.target.value })}
              />
            </Field>
          ) : (
            <div className={cn(PANEL, 'flex flex-col gap-2.5 p-3')}>
              <label className='sr-only' htmlFor={`${ids}-vname`}>
                規格名稱
              </label>
              <Input
                id={`${ids}-vname`}
                className={cn(
                  FIELD,
                  'h-[42px] bg-background',
                  errors.vName && 'border-brand'
                )}
                value={d.vName}
                placeholder='規格名稱，例：顏色'
                aria-invalid={!!errors.vName}
                onChange={(e) => set({ vName: e.target.value })}
              />
              <div className='grid grid-cols-[minmax(0,1fr)_84px_44px] gap-2 text-xs text-muted-foreground'>
                <span>選項</span>
                <span>庫存</span>
              </div>
              {d.vOpts.map((o, i) => (
                <div
                  key={i}
                  className='grid grid-cols-[minmax(0,1fr)_84px_44px] items-center gap-2'
                >
                  <Input
                    className={cn(FIELD, 'h-[42px] bg-background')}
                    value={o.label}
                    placeholder='例：黑色'
                    aria-label={`選項 ${i + 1} 名稱`}
                    onChange={(e) => setOpt(i, { label: e.target.value })}
                  />
                  <Input
                    className={cn(FIELD, 'h-[42px] bg-background text-right')}
                    value={o.stock}
                    inputMode='numeric'
                    placeholder='0'
                    aria-label={`選項 ${i + 1} 庫存`}
                    onChange={(e) => setOpt(i, { stock: e.target.value })}
                  />
                  <button
                    type='button'
                    className='grid h-11 w-11 place-items-center text-muted-foreground disabled:opacity-30'
                    aria-label={`移除選項 ${i + 1}`}
                    disabled={d.vOpts.length <= 1}
                    onClick={() =>
                      set({ vOpts: d.vOpts.filter((_, j) => j !== i) })
                    }
                  >
                    <X className='size-4' strokeWidth={1.6} />
                  </button>
                </div>
              ))}
              {(errors.vOpts || errors.vName) && (
                <span className='text-xs text-brand'>
                  {errors.vName || errors.vOpts}
                </span>
              )}
              <button
                type='button'
                className='h-11 self-start border border-dashed border-[#A8A8A0] px-3 text-[13px] lg:h-9'
                onClick={() =>
                  set({ vOpts: [...d.vOpts, { label: '', stock: '' }] })
                }
              >
                ＋ 新增選項
              </button>
            </div>
          )}
        </div>

        <Field id={`${ids}-desc`} label='商品描述'>
          <Textarea
            id={`${ids}-desc`}
            className='min-h-24 rounded-none border-[#BDBDB6] bg-[#FBFBF9] px-3.5 py-3 text-[14.5px] leading-relaxed shadow-none md:text-[14.5px]'
            value={d.description}
            rows={4}
            placeholder='材質、尺寸、配件…'
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>

        <div className={cn(PANEL, 'flex flex-col px-3.5')}>
          <SwitchRow
            id={`${ids}-active`}
            label='上架'
            sub={d.active ? '前台可見、可購買' : '前台隱藏'}
            checked={d.active}
            onChange={(active) => set({ active })}
          />
          <SwitchRow
            id={`${ids}-new`}
            label='標示新品'
            sub='顯示於首頁「新品」'
            checked={d.isNew}
            onChange={(v) => set({ isNew: v })}
          />
        </div>

        {/* 成本 */}
        <div className='flex flex-col gap-2.5'>
          <span className='text-[12.5px] text-muted-foreground'>
            {isNew ? '首批進貨成本（選填，會寫入記帳簿）' : '成本'}
          </span>
          {isNew && (
            <div className='grid grid-cols-2 gap-2.5'>
              <Select
                value={d.cur}
                onValueChange={(v) => setCur(v as Currency)}
              >
                <SelectTrigger
                  className={cn(FIELD, 'h-11 w-full rounded-none shadow-none')}
                  aria-label='幣別'
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
              <Input
                className={cn(FIELD, 'h-11')}
                value={d.unit}
                inputMode='decimal'
                placeholder='外幣進貨單價'
                aria-label='外幣進貨單價'
                onChange={(e) => set({ unit: e.target.value })}
              />
              <InlineNum
                label='匯率'
                value={d.rate}
                onChange={(rate) => set({ rate })}
              />
              <InlineNum
                label='刷卡費'
                suffix='%'
                value={d.fx}
                onChange={(fx) => set({ fx })}
              />
            </div>
          )}
          <div className='flex justify-between gap-3 bg-[#E4E4DE] px-3.5 py-3 font-mono text-[13.5px] tabular-nums'>
            <span>{cost ? `單位成本 ${money(cost)}` : '尚未填寫成本'}</span>
            <span className='font-medium'>
              {cost && price
                ? `毛利率 ${Math.round(((price - cost) / price) * 100)}%`
                : ''}
            </span>
          </div>
          <span className='text-xs leading-normal text-muted-foreground'>
            {isNew
              ? '進貨數量以上方庫存為準。'
              : '依進貨紀錄加權平均。新增進貨請到「庫存」頁按「進貨」。'}
          </span>
        </div>
      </div>

      <div className='flex-none border-t border-border bg-[#FBFBF9] px-5 pt-3 pb-[18px]'>
        <Button
          type='button'
          variant='brand'
          className='h-12 w-full rounded-none text-[15px] font-normal'
          disabled={saving || uploading > 0}
          onClick={() => void save()}
        >
          {isNew ? '上架商品' : '儲存變更'}
        </Button>
      </div>
    </>
  )
}

function SwitchRow({
  id,
  label,
  sub,
  checked,
  onChange,
}: {
  id: string
  label: string
  sub: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className='flex min-h-[52px] items-center justify-between gap-3 border-b border-[#E4E4DE] py-2 text-sm last:border-b-0'>
      <label className='flex flex-col gap-0.5' htmlFor={id}>
        <span>{label}</span>
        <span className='text-xs text-muted-foreground'>{sub}</span>
      </label>
      <AdminSwitch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function InlineNum({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string
  suffix?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className='flex h-11 items-center gap-1.5 border border-[#BDBDB6] bg-[#FBFBF9] px-3 text-[13px] text-muted-foreground focus-within:border-foreground'>
      {label}
      <input
        className='h-full min-w-0 flex-1 bg-transparent text-right text-[14.5px] text-foreground outline-none'
        value={value}
        inputMode='decimal'
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix}
    </label>
  )
}
