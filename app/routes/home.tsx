import type { Route } from './+types/home'

import { useState } from 'react'
import { Link } from 'react-router'

import { ProductCard, ProductGrid } from '~/components/store/product-card'
import { SectionTitle } from '~/components/store/typography'
import { BRANDS, CATEGORIES, type CategoryId, PRODUCTS } from '~/lib/catalog'
import { cn } from '~/lib/utils'

export const meta: Route.MetaFunction = () => [
  { title: 'AndelNI｜精品選物型錄' },
  {
    name: 'description',
    content:
      '包包、小皮件、飾品、服裝與鞋履，每一件都標清楚品牌、規格與尺寸，像一本可以直接下單的型錄。',
  },
]

const SORTS = [
  ['new', '最新'],
  ['low', '價格↑'],
  ['high', '價格↓'],
] as const
type Sort = (typeof SORTS)[number][0]

const newCount = PRODUCTS.filter((p) => p.isNew).length
const catCount = CATEGORIES.filter((c) => !c.comingSoon).length

export default function Home() {
  const [cat, setCat] = useState<'all' | CategoryId>('all')
  const [sort, setSort] = useState<Sort>('new')

  const items = PRODUCTS.filter((p) => cat === 'all' || p.cat === cat).sort(
    (a, b) =>
      sort === 'new'
        ? b.createdAt.localeCompare(a.createdAt)
        : sort === 'low'
          ? a.price - b.price
          : b.price - a.price
  )
  const catLabel =
    cat === 'all' ? '全部' : CATEGORIES.find((c) => c.id === cat)?.name

  return (
    <main>
      <Hero />

      <section
        id='cats'
        className='scroll-mt-20 border-b border-line'
        aria-labelledby='cats-h'
      >
        <div className='container-page pt-14'>
          <div className='flex flex-wrap items-baseline justify-between gap-3 pb-5'>
            <SectionTitle id='cats-h' en='CATEGORIES'>
              分類
            </SectionTitle>
            <span className='font-mono text-xs text-muted-foreground'>
              點選分類即篩選下方索引
            </span>
          </div>
          <div className='grid grid-cols-2 border-t border-l border-t-line border-l-border sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]'>
            {[
              { id: 'all' as const, name: '全部', en: 'All' },
              ...CATEGORIES,
            ].map((c, i) => {
              const on = cat === c.id
              const count =
                c.id === 'all'
                  ? PRODUCTS.length
                  : PRODUCTS.filter((p) => p.cat === c.id).length
              return (
                <button
                  key={c.id}
                  type='button'
                  className={cn(
                    'flex min-h-[132px] flex-col justify-between gap-4 border-r border-b border-border p-4 pb-5 text-left',
                    on
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  )}
                  aria-pressed={on}
                  onClick={() => setCat(c.id)}
                >
                  <span className='flex justify-between font-mono text-xs opacity-80'>
                    <span>{String(i).padStart(2, '0')}</span>
                    <span>
                      {'comingSoon' in c && c.comingSoon
                        ? '即將登場'
                        : `${count} 件`}
                    </span>
                  </span>
                  <span className='flex flex-col gap-1'>
                    <span className='text-[22px] font-bold'>{c.name}</span>
                    <span className='font-display text-xs tracking-[0.08em] uppercase [font-stretch:112%] opacity-75'>
                      {c.en}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section id='index' className='scroll-mt-20' aria-labelledby='index-h'>
        <div className='container-page pt-14 pb-18'>
          <div className='flex flex-wrap items-baseline justify-between gap-3 pb-5'>
            <SectionTitle id='index-h' en='INDEX'>
              物件索引
            </SectionTitle>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-muted-foreground'>
              <span aria-live='polite'>
                {catLabel}・共 {items.length} 件
              </span>
              <span className='flex border border-line'>
                {SORTS.map(([id, label]) => (
                  <button
                    key={id}
                    type='button'
                    className={cn(
                      'min-h-9 px-3 font-mono text-xs',
                      sort === id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground'
                    )}
                    aria-pressed={sort === id}
                    onClick={() => setSort(id)}
                  >
                    {label}
                  </button>
                ))}
              </span>
            </div>
          </div>
          <ProductGrid>
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductGrid>
          {items.length === 0 && (
            <div className='flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border border-t-0 border-line px-6 py-10'>
              <p className='text-xl font-bold'>
                {cat === 'home'
                  ? '家飾選品即將登場'
                  : '這個分類的商品整理中，敬請期待'}
              </p>
              <a className='border-b border-line pb-0.5 text-sm' href='#nl'>
                上架時通知我 →
              </a>
            </div>
          )}
        </div>
      </section>

      <Brands />
      <About />
    </main>
  )
}

function Hero() {
  return (
    <section
      className='relative overflow-hidden border-b border-line bg-[#2B2724] bg-[url(/images/hero.jpg)] bg-cover bg-[center_42%] text-[#F6F4F0]'
      aria-labelledby='hero-h'
    >
      <div
        className='absolute inset-0 bg-[rgba(12,10,9,0.55)]'
        aria-hidden='true'
      />
      <div
        className='absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(246,244,240,0.07)_0,rgba(246,244,240,0.07)_1px,transparent_1px,transparent_120px)]'
        aria-hidden='true'
      />
      <div className='relative container-page flex min-h-[600px] flex-col justify-between gap-14 pt-10 pb-14'>
        <div className='flex flex-wrap justify-between gap-x-6 gap-y-2 font-mono text-xs tracking-[0.04em] text-[#F6F4F0]/75'>
          <span>INDEX OF OBJECTS — 精品選物型錄</span>
          <span>
            {BRANDS.length} 個品牌・{catCount} 個分類
          </span>
          <span>2026 / 秋</span>
        </div>
        <div className='flex flex-wrap items-end justify-between gap-10'>
          <div className='flex max-w-[640px] flex-[1_1_520px] flex-col gap-5.5'>
            <h1
              id='hero-h'
              className='text-[clamp(36px,4.4vw,64px)] leading-[1.12] font-black tracking-[-0.02em]'
            >
              精品選物，
              <br />
              逐件收錄<span className='text-brand-soft'>。</span>
            </h1>
            <p className='text-base leading-[1.8] text-[#F6F4F0]/85'>
              包包、小皮件、飾品、服裝與鞋履，到 Jellycat 與 Steiff
              的收藏娃娃。每一件都標清楚品牌、規格與尺寸，像一本可以直接下單的型錄。
            </p>
            <div className='flex flex-wrap gap-2.5'>
              <a
                className='flex min-h-13 items-center gap-7 bg-[#F6F4F0] px-5 text-[15px] font-medium text-[#121212]'
                href='#index'
              >
                瀏覽全部商品 <span aria-hidden='true'>→</span>
              </a>
              <a
                className='flex min-h-13 items-center border border-[#F6F4F0]/70 px-5 text-[15px] font-medium'
                href='#brands'
              >
                瀏覽 {BRANDS.length} 個品牌
              </a>
            </div>
          </div>
          <dl className='grid flex-[0_1_380px] grid-cols-2 border-t border-[#F6F4F0]/70'>
            <HeroStat
              className='border-r pr-4'
              label='收錄品牌'
              value={String(BRANDS.length)}
            />
            <HeroStat
              className='pl-4'
              label='商品分類'
              value={String(catCount).padStart(2, '0')}
            />
            <HeroStat
              className='border-r border-b-0 pr-4'
              label='本季新品'
              value={String(newCount).padStart(2, '0')}
              valueClassName='text-brand-soft'
            />
            <HeroStat
              className='border-b-0 pl-4'
              label='免運門檻'
              value='NT$2,000'
              valueClassName='text-[26px] leading-[1.55]'
            />
          </dl>
        </div>
      </div>
    </section>
  )
}

function HeroStat({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string
  value: string
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={cn('border-b border-[#F6F4F0]/25 py-3.5', className)}>
      <dt className='text-xs text-[#F6F4F0]/70'>{label}</dt>
      <dd
        className={cn(
          'mt-1 font-display text-[40px] leading-none font-extrabold [font-stretch:112%]',
          valueClassName
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function Brands() {
  return (
    <section
      id='brands'
      className='scroll-mt-20 bg-inverse text-inverse-foreground'
      aria-labelledby='brands-h'
    >
      <div className='container-page pt-16 pb-18'>
        <div className='flex flex-wrap items-baseline justify-between gap-3 pb-6'>
          <h2 id='brands-h' className='text-[28px] font-black'>
            品牌
            <span className='ml-2 font-display text-sm font-semibold tracking-[0.06em] text-inverse-muted [font-stretch:125%]'>
              BRANDS A–Z
            </span>
          </h2>
          <span className='font-mono text-xs text-inverse-muted'>
            {BRANDS.length} 個品牌・依字母排序
          </span>
        </div>
        <ol className='grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-x-8 border-t border-inverse-foreground'>
          {BRANDS.map((b, i) => (
            <li key={b.name} className='border-b border-inverse-rule'>
              <Link
                className='flex min-h-16 items-baseline gap-3.5 py-4.5'
                to='/#index'
              >
                <span className='flex-[0_0_26px] font-mono text-[11.5px] text-inverse-muted'>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className='min-w-0 flex-1 font-display text-[clamp(19px,1.7vw,24px)] leading-[1.15] font-extrabold tracking-[-0.005em] [font-stretch:112%]'>
                  {b.name}
                </span>
                <span className='font-mono text-xs text-inverse-body'>
                  {b.origin}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className='mt-10 flex flex-wrap items-baseline gap-x-9 gap-y-3 border border-inverse-rule px-6 py-5'>
          <span className='font-mono text-xs text-inverse-accent'>
            COMING SOON
          </span>
          <span className='font-display text-[22px] font-extrabold [font-stretch:112%]'>
            家飾選品即將登場
          </span>
          <a className='ml-auto text-sm text-inverse-body' href='#nl'>
            預計進貨，上架時通知我 →
          </a>
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section
      id='about'
      className='scroll-mt-20 border-b border-line'
      aria-label='購物須知'
    >
      <div className='mx-auto grid max-w-[1440px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))]'>
        <div className='border-b border-border px-4 py-8 sm:border-r sm:px-10'>
          <div className='font-mono text-xs text-brand'>01 / 運送</div>
          <p className='mt-2.5 text-[15px] leading-[1.7]'>
            超商取貨 NT$60・宅配 NT$100
            <br />
            單筆滿 NT$2,000 免運
          </p>
        </div>
        <div className='border-b border-border px-4 py-8 sm:border-r sm:px-10'>
          <div className='font-mono text-xs text-brand'>02 / 付款</div>
          <p className='mt-2.5 text-[15px] leading-[1.7]'>
            信用卡・無卡分期
            <br />
            ATM 轉帳・Apple Pay
          </p>
        </div>
        <div className='flex flex-col gap-2.5 px-4 py-8 sm:px-10'>
          <div className='font-mono text-xs text-brand'>03 / 退換貨</div>
          <p className='text-[15px] leading-[1.7]'>
            現貨商品享 7
            天鑑賞期（須保持全新、內容物完整）。客訂／代購商品下單後無法取消，不適用鑑賞期。
          </p>
          <Link
            className='self-start border-b border-line pb-0.5 text-sm'
            to='/policy/returns'
          >
            完整退換貨政策 →
          </Link>
        </div>
      </div>
    </section>
  )
}
