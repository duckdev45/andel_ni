import type { CartItem } from '~/lib/cart'

import { MapPin } from 'lucide-react'
import { cloneElement, useState } from 'react'

import {
  CustomOrderNotice,
  SummaryPanel,
  SummaryRow,
  SummaryTotal,
} from '~/components/checkout/order-summary'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Textarea } from '~/components/ui/textarea'
import { useAuth, type User } from '~/lib/auth'
import { formatPrice } from '~/lib/catalog'
import {
  createOrder,
  isCustomLine,
  MOCK_STORES,
  type MockOrder,
  optionText,
  PAY_OPTIONS,
  type PayId,
  SHIP_OPTIONS,
  type ShipId,
  shippingFee,
  type StoreChoice,
} from '~/lib/mock/checkout'
import { cn } from '~/lib/utils'

const inputClass =
  'bg-white text-[15px] md:text-[15px] aria-invalid:border-brand aria-invalid:ring-brand/20'

type Errors = Partial<
  Record<'addr' | 'city' | 'consent' | 'name' | 'phone' | 'store', string>
>

/** 收件人、配送、付款、備註＋右側訂單摘要。送出後產生假訂單交給 onPlaced */
export function CheckoutForm({
  user,
  items,
  onPlaced,
}: {
  user: User
  items: CartItem[]
  onPlaced: (order: MockOrder) => void
}) {
  const { logout } = useAuth()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone)
  const [ship, setShip] = useState<ShipId>('711')
  const [store, setStore] = useState<null | StoreChoice>(null)
  const [city, setCity] = useState('')
  const [addr, setAddr] = useState('')
  const [pay, setPay] = useState<PayId>('card')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [tried, setTried] = useState(false)

  const subtotal = items.reduce((n, i) => n + i.qty * i.product.price, 0)
  const fee = shippingFee(subtotal, ship)
  const hasCustom = items.some(isCustomLine)
  const isHome = ship === 'home'
  const shipOpt = SHIP_OPTIONS.find((o) => o.id === ship)!
  const payOpt = PAY_OPTIONS.find((o) => o.id === pay)!
  const pickedStore = store?.chain === ship ? store : null

  const errors: Errors = {}
  if (!name.trim()) errors.name = '請填寫收件人姓名'
  if (!/^09\d{8}$/.test(phone.replace(/[\s-]/g, '')))
    errors.phone = '請填寫 09 開頭的 10 碼手機號碼'
  if (!isHome && !pickedStore) errors.store = '請選擇取貨門市'
  if (isHome && !city.trim()) errors.city = '請填寫縣市與區'
  if (isHome && !addr.trim()) errors.addr = '請填寫詳細地址'
  if (hasCustom && !consent)
    errors.consent = '請勾選「已了解客訂商品不適用 7 天鑑賞期」'
  const shown: Errors = tried ? errors : {}
  const errorCount = Object.keys(shown).length

  // 假的超商電子地圖：每按一次輪替一間門市
  const pickStore = () => {
    if (isHome) return
    const list = MOCK_STORES[ship]
    const idx = pickedStore
      ? (list.findIndex((s) => s.id === pickedStore.id) + 1) % list.length
      : 0
    setStore({ chain: ship, ...list[idx] })
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (Object.keys(errors).length) {
      setTried(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    onPlaced(
      createOrder(
        {
          name: name.trim(),
          phone: phone.replace(/[\s-]/g, ''),
          email: user.email,
          ship,
          destination: pickedStore
            ? `${shipOpt.label.replace('取貨', '')} ${pickedStore.name}（${pickedStore.address}）`
            : `${city.trim()} ${addr.trim()}`,
          pay,
          note: note.trim(),
          consentNoReturn: hasCustom && consent,
        },
        items
      )
    )
  }

  return (
    <>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border border-line bg-[#FBFBF9] px-[18px] py-3.5 text-sm'>
        <span>
          <span className='mr-2.5 font-mono text-xs text-brand'>MEMBER</span>
          已登入 <strong className='font-bold'>{user.name}</strong>（
          <span className='font-mono'>{user.email}</span>
          ），已帶入收件資料。訂單確認信會寄到這個 Email。
        </span>
        <button
          type='button'
          className='min-h-11 text-[13px] text-muted-foreground underline'
          onClick={() => void logout()}
        >
          不是你？登出
        </button>
      </div>
      {errorCount > 0 && (
        <div
          className='mb-6 border border-brand px-[18px] py-3.5 text-sm text-brand'
          role='alert'
        >
          還有 {errorCount} 個欄位需要確認，已在下方標示。
        </div>
      )}

      <form
        className='flex flex-wrap items-start gap-10'
        noValidate
        aria-label='填寫結帳資料'
        onSubmit={onSubmit}
      >
        <div className='flex min-w-0 flex-[999_1_620px] flex-col gap-10'>
          <Section no='01' title='收件人'>
            <div className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4'>
              <Field id='c-name' error={shown.name} label='收件人姓名'>
                <Input
                  className={inputClass}
                  autoComplete='name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field id='c-phone' error={shown.phone} label='手機號碼'>
                <Input
                  className={cn(inputClass, 'font-mono')}
                  autoComplete='tel'
                  inputMode='tel'
                  placeholder='09XXXXXXXX'
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section no='02' title='配送方式'>
            <ChoiceGroup
              label='配送方式'
              options={SHIP_OPTIONS.map((o) => ({
                id: o.id,
                label: o.label,
                sub: o.sub,
                aside: fee === 0 ? '免運' : `NT$${o.fee}`,
              }))}
              value={ship}
              onChange={(v) => setShip(v as ShipId)}
            />
            {isHome ? (
              <div className='grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4'>
                <Field id='c-city' error={shown.city} label='縣市・區'>
                  <Input
                    className={inputClass}
                    autoComplete='address-level2'
                    placeholder='台北市松山區'
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </Field>
                <Field
                  id='c-addr'
                  className='col-span-full'
                  error={shown.addr}
                  label='詳細地址'
                >
                  <Input
                    className={inputClass}
                    autoComplete='street-address'
                    placeholder='路名、門牌、樓層'
                    value={addr}
                    onChange={(e) => setAddr(e.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <div className='flex flex-col gap-2'>
                <span id='store-label' className='text-[13px] font-medium'>
                  取貨門市
                </span>
                <div
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-3 border bg-white px-3.5 py-3',
                    shown.store ? 'border-brand' : 'border-line'
                  )}
                >
                  {pickedStore ? (
                    <span className='flex min-w-0 flex-col gap-0.5 text-sm'>
                      <span className='font-medium'>
                        {shipOpt.label.replace('取貨', '')} {pickedStore.name}
                        <span className='ml-2 font-mono text-xs text-muted-foreground'>
                          店號 {pickedStore.id}
                        </span>
                      </span>
                      <span className='text-[13px] text-muted-foreground'>
                        {pickedStore.address}
                      </span>
                    </span>
                  ) : (
                    <span className='text-sm text-muted-foreground'>
                      尚未選擇門市
                    </span>
                  )}
                  <Button
                    id='store-btn'
                    type='button'
                    variant='outline'
                    aria-describedby={shown.store ? 'store-err' : undefined}
                    aria-labelledby='store-label store-btn'
                    onClick={pickStore}
                  >
                    <MapPin aria-hidden strokeWidth={1.6} />
                    {pickedStore ? '重新選擇門市' : '選擇門市'}
                  </Button>
                </div>
                <span className='font-mono text-[11.5px] text-muted-foreground'>
                  將開啟超商電子地圖選擇門市（原型示範：直接帶入門市）
                </span>
                {shown.store && (
                  <span id='store-err' className='text-[12.5px] text-brand'>
                    {shown.store}
                  </span>
                )}
              </div>
            )}
          </Section>

          <Section no='03' title='付款方式'>
            <ChoiceGroup
              label='付款方式'
              options={PAY_OPTIONS}
              value={pay}
              onChange={(v) => setPay(v as PayId)}
            />
          </Section>

          <Section
            extra={
              <span className='text-[13px] text-muted-foreground'>選填</span>
            }
            no='04'
            title='備註'
          >
            <Field id='c-note' label='給店家的話（例如：送禮、包裝需求）'>
              <Textarea
                className={cn(inputClass, 'min-h-24 border-line')}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </Section>
        </div>

        <SummaryPanel className='lg:sticky lg:top-6' title='訂單摘要'>
          <ul className='m-0 list-none border-b border-[#E4E4DE] px-5 py-2'>
            {items.map((i) => (
              <li
                key={`${i.productId}-${i.variant ?? ''}`}
                className='flex items-center gap-3 py-2'
              >
                <span
                  className='relative size-12 shrink-0 overflow-hidden bg-tone-object'
                  aria-hidden='true'
                >
                  <img
                    className='absolute inset-0 size-full object-cover'
                    alt=''
                    src={i.product.image}
                  />
                </span>
                <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span className='text-sm font-medium'>{i.product.name}</span>
                  <span className='text-xs text-muted-foreground'>
                    {optionText(i)} × {i.qty}
                  </span>
                </span>
                <span className='font-mono text-[13.5px]'>
                  {formatPrice(i.product.price * i.qty)}
                </span>
              </li>
            ))}
          </ul>
          <dl className='m-0 px-5 py-1 text-sm'>
            <SummaryRow label='小計'>{formatPrice(subtotal)}</SummaryRow>
            <SummaryRow label={`運費（${shipOpt.label}）`}>
              <span className={cn(fee === 0 && 'text-brand')}>
                {fee === 0 ? '免運' : formatPrice(fee)}
              </span>
            </SummaryRow>
            <SummaryTotal
              amount={formatPrice(subtotal + fee)}
              label='應付金額'
            />
          </dl>
          <div className='flex flex-col gap-3.5 px-5 pb-5'>
            {hasCustom && (
              <CustomOrderNotice>
                <div className='mt-1.5 flex items-start gap-2.5 border-t border-[#E4D3D3] pt-3'>
                  <Checkbox
                    id='c-consent'
                    className='mt-0.5 size-[18px] border-line aria-invalid:border-brand'
                    aria-describedby={shown.consent ? 'consent-err' : undefined}
                    aria-invalid={!!shown.consent}
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                  />
                  <Label
                    className='block text-[13.5px] leading-[1.6] font-medium'
                    htmlFor='c-consent'
                  >
                    我已了解客訂／代購商品不適用 7 天鑑賞期
                  </Label>
                </div>
                {shown.consent && (
                  <span id='consent-err' className='text-[12.5px] text-brand'>
                    {shown.consent}
                  </span>
                )}
              </CustomOrderNotice>
            )}
            <Button
              type='submit'
              variant='brand'
              className='min-h-14 justify-between px-5 text-base'
              size='lg'
            >
              <span>{payOpt.submit}</span>
              <span className='font-mono text-sm'>
                {formatPrice(subtotal + fee)}
              </span>
            </Button>
            <p className='m-0 text-[12.5px] leading-[1.7] text-muted-foreground'>
              {payOpt.note}
            </p>
            <p className='m-0 border-t border-[#E4E4DE] pt-3 text-[12.5px] leading-[1.7] text-muted-foreground'>
              送出訂單即表示同意服務條款與退換貨政策。本店免開立統一發票。
            </p>
          </div>
        </SummaryPanel>
      </form>
    </>
  )
}

function Section({
  no,
  title,
  extra,
  children,
}: {
  no: string
  title: string
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <fieldset className='m-0 flex min-w-0 flex-col gap-4 border-0 p-0'>
      <legend className='mb-4 flex w-full items-baseline gap-3.5 border-b border-line pb-3.5'>
        <span className='font-mono text-xs text-brand'>{no}</span>
        <span className='text-xl font-black'>{title}</span>
        {extra}
      </legend>
      {children}
    </fieldset>
  )
}

/** 標籤＋欄位＋錯誤訊息；錯誤時欄位加 aria-invalid 並以 aria-describedby 連到訊息 */
function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  className?: string
  children: React.ReactElement<React.ComponentProps<'input' | 'textarea'>>
}) {
  const errId = `${id}-err`
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label className='text-[13px]' htmlFor={id}>
        {label}
      </Label>
      {cloneElement(children, {
        'aria-describedby': error ? errId : undefined,
        'aria-invalid': !!error,
        id,
      })}
      {error && (
        <span id={errId} className='text-[12.5px] text-brand'>
          {error}
        </span>
      )}
    </div>
  )
}

/** 設計稿的格狀單選卡：選中時反白（墨黑底） */
function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: string; label: string; sub: string; aside?: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <RadioGroup
      className='grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-0 border-t border-l border-line'
      aria-label={label}
      value={value}
      onValueChange={onChange}
    >
      {options.map((o) => {
        const on = o.id === value
        const id = `${label}-${o.id}`
        return (
          <label
            key={o.id}
            className={cn(
              'flex min-h-11 cursor-pointer items-start gap-3 border-r border-b border-line p-4',
              on ? 'bg-inverse text-inverse-foreground' : 'bg-white'
            )}
            htmlFor={id}
          >
            <RadioGroupItem
              id={id}
              className={cn(
                'mt-0.5 size-[18px] border-line',
                on &&
                  'border-inverse-foreground text-inverse-foreground [&_svg]:fill-inverse-foreground'
              )}
              value={o.id}
            />
            <span className='flex flex-1 flex-col gap-1'>
              <span className='flex justify-between gap-2 text-[15px] font-bold'>
                <span>{o.label}</span>
                {o.aside && (
                  <span className='font-mono font-medium'>{o.aside}</span>
                )}
              </span>
              <span className='text-[12.5px] opacity-80'>{o.sub}</span>
            </span>
          </label>
        )
      })}
    </RadioGroup>
  )
}
