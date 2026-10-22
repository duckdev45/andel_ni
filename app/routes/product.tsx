import type { Route } from './+types/product'

import { isRouteErrorResponse, Link, redirect } from 'react-router'

import { ProductBuyBox } from '~/components/product/product-buy-box'
import {
  ProductHeading,
  ProductSpecs,
} from '~/components/product/product-details'
import { ProductGallery } from '~/components/product/product-gallery'
import { NotFound } from '~/components/store/not-found'
import { ProductCard, ProductGrid } from '~/components/store/product-card'
import { PageTitle } from '~/components/store/typography'
import {
  categoryName,
  codeFromHandle,
  formatPrice,
  isCustomOrder,
  isSoldOut,
  type Product,
  productNo,
  productPath,
} from '~/lib/catalog'
import { dbFrom } from '~/lib/context'
import { listProducts } from '~/lib/db/products.server'
import { originFrom, seoMeta } from '~/lib/seo'

/** 推薦：同品牌 → 同分類 → 其他新品，排除自己與已售完 */
function relatedProducts(p: Product, all: Product[], n = 4) {
  const rank = (q: Product) =>
    (q.brand === p.brand ? 0 : 2) + (q.cat === p.cat ? 0 : 1)
  return all
    .filter((q) => q.id !== p.id && !isSoldOut(q))
    .sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, n)
}

// ponytail: 一次讀全部上架商品再算上一件／下一件與推薦；商品破千再改成分別查詢
export async function loader({ context, params }: Route.LoaderArgs) {
  const code = codeFromHandle(params.handle)
  const all = code ? await listProducts(dbFrom(context)) : []
  const product = all.find((p) => p.code === code)
  if (!product) throw new Response('Not Found', { status: 404 })
  // 舊網址、描述打錯或改過：永久轉到正式網址，分享連結不失效
  const canonical = productPath(product)
  if (`/products/${params.handle}` !== canonical) throw redirect(canonical, 301)
  const byCode = [...all].sort((a, b) => a.code.localeCompare(b.code))
  const i = byCode.indexOf(product)
  return {
    next: byCode[i + 1] ?? null,
    prev: byCode[i - 1] ?? null,
    product,
    related: relatedProducts(product, all),
  }
}

const kindText = (p: Product) =>
  isCustomOrder(p)
    ? `${p.kind}・約 [X] 週到貨`
    : isSoldOut(p)
      ? '已售出'
      : p.kind

// 規格 5.3：伺服器端輸出 OG 與 JSON-LD
export const meta: Route.MetaFunction = ({ loaderData, matches }) => {
  if (!loaderData)
    return [
      { title: '找不到商品｜AndelNI' },
      { name: 'robots', content: 'noindex' },
    ]
  const origin = originFrom(matches)
  const { product: p } = loaderData
  const title = `${p.brand} ${p.name}`
  const path = productPath(p)
  const description = `${formatPrice(p.price)}・${kindText(p)}。${p.description}`
  const availability = isCustomOrder(p)
    ? 'BackOrder'
    : isSoldOut(p)
      ? 'SoldOut'
      : 'InStock'

  return [
    ...seoMeta({
      origin,
      path,
      title,
      description,
      image: p.image,
      imageAlt: title,
      type: 'product',
    }),
    { property: 'product:price:amount', content: String(p.price) },
    { property: 'product:price:currency', content: 'TWD' },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: title,
        description: p.description,
        image: [origin + p.image],
        sku: p.id,
        brand: { '@type': 'Brand', name: p.brand },
        category: categoryName(p.cat),
        offers: {
          '@type': 'Offer',
          url: origin + path,
          price: p.price,
          priceCurrency: 'TWD',
          availability: `https://schema.org/${availability}`,
          itemCondition: 'https://schema.org/NewCondition',
        },
      },
    },
  ]
}

export default function ProductPage({ loaderData }: Route.ComponentProps) {
  const { next, prev, product: p, related } = loaderData
  const soldOut = isSoldOut(p)

  return (
    <main className='container-page'>
      <nav
        className='flex flex-wrap justify-between gap-2 border-b border-border py-[18px] font-mono text-xs text-muted-foreground'
        aria-label='麵包屑'
      >
        <span>
          <Link to='/#index'>本季選物</Link> /{' '}
          <Link to='/#index'>{categoryName(p.cat)}</Link> /{' '}
          <span className='text-foreground'>
            No.{productNo(p)} {p.name}
          </span>
        </span>
        <span className='flex gap-4'>
          {prev && (
            <Link aria-label={`上一件：${prev.name}`} to={productPath(prev)}>
              ← No.{productNo(prev)}
            </Link>
          )}
          {next && (
            <Link aria-label={`下一件：${next.name}`} to={productPath(next)}>
              No.{productNo(next)} →
            </Link>
          )}
        </span>
      </nav>

      <div className='grid border-b border-line lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]'>
        <ProductGallery key={p.id} product={p} soldOut={soldOut} />
        <section
          className='flex min-w-0 flex-col gap-6 border-t border-border pt-6 pb-10 lg:border-t-0 lg:pl-8'
          aria-labelledby='pname'
        >
          <ProductHeading product={p} />
          <ProductBuyBox key={p.id} product={p} />
          <ProductSpecs product={p} />
        </section>
      </div>

      <section
        id='related'
        className='scroll-mt-20 pt-12 pb-18'
        aria-labelledby='more-h'
      >
        <div className='flex flex-wrap items-baseline justify-between gap-3 pb-5'>
          <h2 id='more-h' className='m-0 text-2xl font-black'>
            {soldOut ? '相似商品' : '一起看看'}
            <span className='ml-2 font-display text-[13px] font-semibold tracking-[0.06em] text-muted-foreground [font-stretch:125%]'>
              SEE ALSO
            </span>
          </h2>
          <Link
            className='border-b border-line pb-0.5 font-mono text-xs'
            to='/#index'
          >
            回到索引 →
          </Link>
        </div>
        <ProductGrid className='lg:grid-cols-4'>
          {related.map((r) => (
            <ProductCard key={r.id} product={r} />
          ))}
        </ProductGrid>
      </section>
    </main>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound kind='product' />
  }
  return (
    <main className='container-page py-16'>
      <PageTitle>發生錯誤</PageTitle>
      <p className='mt-4 text-[15px] leading-relaxed'>請稍後再試一次。</p>
      <Link
        className='mt-8 inline-block border-b border-line pb-0.5 text-sm'
        to='/'
      >
        回到首頁 →
      </Link>
    </main>
  )
}
