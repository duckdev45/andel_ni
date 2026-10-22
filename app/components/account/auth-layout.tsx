import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { Eyebrow, PageTitle } from '~/components/store/typography'
import { cn } from '~/lib/utils'

/** 登入／註冊／忘記密碼共用版型：左側表單、右側 #FBFBF9 說明欄 */
export function AuthLayout({
  aside,
  children,
}: {
  aside: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className='container-page pb-22'>
      <div className='flex flex-wrap items-start gap-12 pt-12'>
        <section className='flex min-w-0 flex-[999_1_520px] flex-col gap-6 sm:max-w-[560px]'>
          {children}
        </section>
        {aside}
      </div>
    </main>
  )
}

export function AuthHeading({
  children,
  eyebrow,
  large,
  title,
}: {
  children?: React.ReactNode
  eyebrow: React.ReactNode
  /** 起始頁用大字級，後續步驟稍小 */
  large?: boolean
  title: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-2.5'>
      <Eyebrow>{eyebrow}</Eyebrow>
      <PageTitle
        className={cn(
          large
            ? 'text-[clamp(36px,4.4vw,56px)]'
            : 'text-[clamp(30px,3.6vw,44px)] leading-[1.15]'
        )}
      >
        {title}
      </PageTitle>
      {children && (
        <p className='m-0 text-[15px] leading-[1.8] text-caption'>{children}</p>
      )}
    </div>
  )
}

/** 右側說明：編號清單；current 為目前步驟（從 0 起算） */
export function AuthAside({
  children,
  current,
  items,
  title,
}: {
  children?: React.ReactNode
  current?: number
  items: React.ReactNode[]
  title: string
}) {
  return (
    <aside className='min-w-0 flex-[1_1_320px] border border-line bg-[#FBFBF9]'>
      <div className='border-b border-line px-5 py-[18px]'>
        <h2 className='m-0 text-lg font-black'>{title}</h2>
      </div>
      <ol className='m-0 list-none px-5 pt-1 pb-2'>
        {items.map((item, i) => (
          <li
            key={i}
            className='flex gap-3.5 border-b border-[#E4E4DE] py-3.5 last:border-b-0'
            aria-current={current === i ? 'step' : undefined}
          >
            <span className='pt-[3px] font-mono text-xs text-brand'>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className={cn(
                'text-sm leading-[1.7]',
                current !== undefined &&
                  (current === i ? 'font-bold' : 'text-muted-foreground')
              )}
            >
              {item}
            </span>
          </li>
        ))}
      </ol>
      {children && (
        <div className='flex flex-col gap-3 border-t border-line px-5 py-[18px]'>
          {children}
        </div>
      )}
    </aside>
  )
}

/** 登入頁與會員中心未登入時的右側說明 */
export function JoinAside({ registerHref }: { registerHref: string }) {
  return (
    <AuthAside
      items={[
        '註冊只要填姓名、Email、手機與密碼',
        '輸入 Email 收到的 6 位數驗證碼，帳號就啟用了',
        '登入後可查詢代購進度、收藏商品，結帳自動帶入收件資訊',
      ]}
      title='第一次來？'
    >
      <Link
        className='flex min-h-[52px] items-center justify-between border border-line px-[18px] text-[15px] font-medium hover:bg-accent'
        to={registerHref}
      >
        註冊會員 <span aria-hidden='true'>→</span>
      </Link>
    </AuthAside>
  )
}

/** 規格 3.6：註冊、登入、忘記密碼都過 Cloudflare Turnstile；先放佔位框 */
export function TurnstilePlaceholder() {
  return (
    <div
      className='flex h-[65px] w-full max-w-[300px] items-center justify-between border border-dashed border-[#8E8E87] bg-white px-4 font-mono text-xs text-muted-foreground'
      aria-hidden='true'
    >
      <span>[Turnstile]</span>
      <span>Cloudflare</span>
    </div>
  )
}

/** 只接受站內路徑，避免 ?redirect= 被拿去導到外站 */
export function safeRedirect(to: null | string, fallback = '/account') {
  return to && to.startsWith('/') && !to.startsWith('//') ? to : fallback
}

/** 規格 3.6：同一 Email 60 秒內只能寄一次 */
export function useCooldown(seconds = 60) {
  const [left, setLeft] = useState(seconds)
  const running = left > 0
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [running])
  return { left, restart: () => setLeft(seconds) }
}

export function ResendButton({
  left,
  onResend,
}: {
  left: number
  onResend: () => void
}) {
  return (
    <button
      type='button'
      className='min-h-11 border border-line px-3.5 text-[13px] disabled:border-border disabled:text-[#8E8E87]'
      disabled={left > 0}
      onClick={onResend}
    >
      {left > 0 ? `重新寄送（${left} 秒）` : '重新寄送驗證碼'}
    </button>
  )
}
