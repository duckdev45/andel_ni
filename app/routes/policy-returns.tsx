import type { Route } from './+types/policy-returns'

import { Link } from 'react-router'

import { Eyebrow, PageTitle } from '~/components/store/typography'

export const meta: Route.MetaFunction = () => [
  { title: '退換貨政策｜AndelNI' },
  {
    content:
      '客訂／代購商品不適用 7 天鑑賞期，收到後請 48 小時內全程開箱錄影；一般現貨商品享 7 天鑑賞期。',
    name: 'description',
  },
]

type Item = { body: React.ReactNode; term: string }

const SECTIONS: {
  en: string
  id: string
  items: Item[]
  note?: string
  title: string
}[] = [
  {
    en: 'CUSTOM ORDER',
    id: 'pol-custom',
    items: [
      {
        body: '本商品屬「客製化給付」，依買家個別需求海外採購，下單後無法取消，亦不適用網路購物 7 天無條件退貨。',
        term: '不適用鑑賞期',
      },
      {
        body: (
          <>
            請於收到商品
            <strong className='font-bold'> 48 小時內「全程開箱錄影」</strong>
            檢查。若有重大非人為瑕疵，請憑完整影片聯絡客服處理；無影片或逾期恕不受理。
          </>
        ),
        term: '瑕疵處理',
      },
    ],
    note: '非現貨',
    title: '專屬客訂／代購商品',
  },
  {
    en: 'IN STOCK',
    id: 'pol-stock',
    items: [
      {
        body: '依法提供 7 天鑑賞期，但退回商品必須保持全新且內容物完整，不得缺漏。',
        term: '鑑賞期非試用期',
      },
      // 規格 9：現貨需寫明退貨流程、運費負擔、退款天數，內容待確認
      { body: '[退貨申請方式與寄回地址]', term: '退貨流程' },
      { body: '[退貨運費由誰負擔]', term: '運費負擔' },
      {
        body: '收到退回商品並確認無誤後 [N] 個工作天內退款。',
        term: '退款天數',
      },
    ],
    title: '一般現貨商品',
  },
]

export default function PolicyReturns() {
  return (
    <main className='container-page pb-22'>
      <div className='flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b border-line pt-12 pb-9'>
        <div className='flex flex-col gap-3'>
          <Eyebrow>RETURNS &amp; EXCHANGES</Eyebrow>
          <PageTitle>退換貨政策</PageTitle>
        </div>
        <p className='m-0 max-w-[480px] text-[15px] leading-[1.8] text-caption'>
          商品分為「客訂／代購」與「一般現貨」兩種，退換貨規則不同。每件商品的類型都標示在商品頁與購物車中。
        </p>
      </div>

      <div className='grid border-l border-border md:grid-cols-2'>
        {SECTIONS.map((s, i) => (
          <section
            key={s.id}
            className='flex flex-col gap-6 border-r border-b border-border px-[clamp(16px,3vw,36px)] pt-8 pb-10'
            aria-labelledby={s.id}
          >
            <div className='flex flex-col gap-2.5'>
              <span className='font-mono text-xs text-brand'>
                {String(i + 1).padStart(2, '0')} / {s.en}
              </span>
              <h2
                id={s.id}
                className='m-0 text-[26px] leading-[1.3] font-black'
              >
                {s.title}
                {s.note && (
                  <span className='ml-2 text-base font-medium text-muted-foreground'>
                    {s.note}
                  </span>
                )}
              </h2>
            </div>
            <dl className='m-0 flex flex-col border-t border-line'>
              {s.items.map((it) => (
                <div
                  key={it.term}
                  className='flex flex-col gap-2 border-b border-[#E4E4DE] py-[18px]'
                >
                  <dt className='text-base font-bold'>{it.term}</dt>
                  <dd className='m-0 text-[15px] leading-[1.85]'>{it.body}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className='mt-8 flex flex-wrap items-center justify-between gap-4 border border-line px-6 py-5'>
        <p className='m-0 text-[15px] leading-[1.7]'>
          需要協助退換貨或回報瑕疵？
        </p>
        <Link
          className='flex min-h-12 items-center gap-6 bg-primary px-[18px] text-[15px] font-medium text-primary-foreground'
          to='/#contact'
        >
          聯絡客服 <span aria-hidden>→</span>
        </Link>
      </div>
    </main>
  )
}
