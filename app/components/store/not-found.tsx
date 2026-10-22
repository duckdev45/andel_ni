import { Link, useLocation } from 'react-router'

import { ProductCard, ProductGrid } from '~/components/store/product-card'
import { Eyebrow, SectionTitle } from '~/components/store/typography'
import { isSoldOut, PRODUCTS } from '~/lib/catalog'
import { SITE } from '~/lib/seo'

const COPY = {
  page: {
    title: '找不到這個頁面',
    body: '網址可能打錯了，或這個頁面已經移除。可以回到首頁，或直接看看本季選物。',
  },
  product: {
    title: '找不到這件商品',
    body: '這件商品可能已經下架，或網址打錯了。如果是從 IG 貼文點進來，歡迎私訊詢問是否還能代購。',
  },
}

// 迷路的人多半還是想逛：附上最新、還買得到的商品
const suggestions = PRODUCTS.filter((p) => !isSoldOut(p))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, 4)

/** 404 內容：一般頁面、商品頁、未開放的後台共用 */
export function NotFound({ kind = 'page' }: { kind?: keyof typeof COPY }) {
  const { pathname } = useLocation()
  const copy = COPY[kind]

  return (
    <main>
      <section className='border-b border-line' aria-labelledby='nf-h'>
        <div className='container-page grid gap-x-16 gap-y-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:py-20'>
          <div
            className='font-display text-[clamp(120px,30vw,200px)] leading-[0.8] font-black tracking-[-0.04em] [font-stretch:112%] lg:self-end lg:text-[clamp(160px,13.5vw,210px)]'
            aria-hidden='true'
          >
            404<span className='text-brand'>.</span>
          </div>

          <div className='flex flex-col justify-end gap-6'>
            <Eyebrow>ERROR 404 · NOT FOUND</Eyebrow>
            <h1
              id='nf-h'
              className='text-[clamp(32px,4vw,52px)] leading-[1.15] font-black tracking-[-0.02em]'
            >
              {copy.title}
              <span className='text-brand'>。</span>
            </h1>
            <p className='max-w-[520px] text-[15px] leading-[1.85]'>
              {copy.body}
            </p>
            <dl className='flex gap-4 border-t border-border pt-3 font-mono text-xs'>
              <dt className='text-muted-foreground'>你要找的網址</dt>
              <dd className='min-w-0 break-all'>{pathname}</dd>
            </dl>
            <div className='flex flex-wrap gap-2.5'>
              <Link
                className='flex min-h-13 items-center gap-7 bg-primary px-5 text-[15px] font-medium text-primary-foreground hover:bg-primary/85'
                to='/'
              >
                回到首頁 <span aria-hidden='true'>→</span>
              </Link>
              <Link
                className='flex min-h-13 items-center border border-line px-5 text-[15px] font-medium hover:bg-accent'
                to='/#index'
              >
                看本季選物
              </Link>
            </div>
            <p className='text-sm text-muted-foreground'>
              還是找不到？到 Instagram 私訊{' '}
              <a
                className='border-b border-line pb-px text-foreground'
                href={SITE.instagram}
                rel='noopener noreferrer'
                target='_blank'
              >
                {SITE.instagramHandle}
              </a>
              ，我們幫你找。
            </p>
          </div>
        </div>
      </section>

      <section className='container-page pt-12 pb-18' aria-labelledby='nf-more'>
        <div className='flex flex-wrap items-baseline justify-between gap-3 pb-5'>
          <SectionTitle id='nf-more' className='text-2xl' en='NEW IN'>
            或看看這些新品
          </SectionTitle>
          <Link className='border-b border-line pb-0.5 text-sm' to='/#index'>
            全部商品 →
          </Link>
        </div>
        <ProductGrid>
          {suggestions.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ProductGrid>
      </section>
    </main>
  )
}
