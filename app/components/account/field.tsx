import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/utils'

type FieldProps = React.ComponentProps<typeof Input> & {
  error?: false | string
  hint?: React.ReactNode
  id: string
  label: React.ReactNode
}

/** 標籤＋輸入框＋錯誤訊息（設計稿：13px 標籤、白底墨線框、錯誤轉品牌色） */
export function Field({
  className,
  error,
  hint,
  id,
  label,
  ...props
}: FieldProps) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-[13px]' htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        className={cn(
          'h-[52px] bg-white text-base aria-invalid:border-brand aria-invalid:ring-brand/20 md:text-[15px]',
          className
        )}
        aria-describedby={describedBy}
        aria-invalid={!!error || undefined}
        {...props}
      />
      {error ? (
        <span
          id={`${id}-err`}
          className='text-[12.5px] text-brand'
          role='alert'
        >
          {error}
        </span>
      ) : (
        hint && (
          <span
            id={`${id}-hint`}
            className='text-[12.5px] text-muted-foreground'
          >
            {hint}
          </span>
        )
      )}
    </div>
  )
}

/** 6 位數驗證碼：單一欄位，手機可從簡訊/信件自動帶入 */
export function CodeField({
  error,
  id,
  onValue,
  value,
}: {
  error?: false | string
  id: string
  onValue: (v: string) => void
  value: string
}) {
  return (
    <Field
      id={id}
      name='code'
      className='h-16 font-mono text-[28px] tracking-[0.5em] md:text-[28px]'
      autoComplete='one-time-code'
      error={error}
      inputMode='numeric'
      label='驗證碼'
      maxLength={6}
      placeholder='••••••'
      value={value}
      onChange={(e) => onValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
    />
  )
}

export const isEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
export const isPhone = (v: string) => /^09\d{8}$/.test(v.replace(/[\s-]/g, ''))
export const isCode = (v: string) => /^\d{6}$/.test(v)
