import type { Route } from './+types/product'

import { isRouteErrorResponse, Link } from 'react-router'

import { ProductBuyBox } from '~/components/product/product-buy-box'
import {
  ProductHeading,
  ProductSpecs,
} from '~/components/product/product-details'
import { ProductGallery } from '~/components/product/product-gallery'
import { ProductCard, ProductGrid } from '~/components/store/product-card'
import { PageTitle } from '~/components/store/typography'
import {
  categoryName,
  formatPrice,
  getProduct,
  isCustomOrder,
  isSoldOut,
  type Product,
  productNo,
  PRODUCTS,
} from '~/lib/catalog'

/** 推薦：同品牌 → 同分類 → 其他新品，排除自己與已售完 */
function relatedProducts(p: Product, n = 4) {
  const rank = (q: Product) =>
    (q.brand === p.brand ? 0 : 2) + (q.cat === p.cat ? 0 : 1)
  return PRODUCTS.filter((q) => q.id !== p.id && !isSoldOut(q))
    .sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, n)
}

export function loader({ params, request }: Route.LoaderArgs) {
  const product = getProduct(params.id)
  if (!product) throw new Response('Not Found', { status: 404 })
  const i = PRODUCTS.indexOf(product)
  return {
    next: PRODUCTS[i + 1] ?? null,
    origin: new URL(request.url).origin,
    prev: PRODUCTS[i - 1] ?? null,
    product,
    related: relatedProducts(product),
  }
}

const kindText = (p: Product) =>
  isCustomOrder(p)
    ? `${p.kind}・約 [X] 週到貨`
    : isSoldOut(p)
      ? '已售出'
      : p.kind

// 規格 5.3：伺服器端輸出 OG 與 JSON-LD
export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [{ title: '找不到商品｜AndelNI' }]
  const { origin, product: p } = loaderData
  const title = `${p.brand} ${p.name}`
  const url = `${origin}/products/${p.id}`
  const image = `${origin}${p.image}`
  const description = `${formatPrice(p.price)}・${kindText(p)}。${p.description}`
  const availability = isCustomOrder(p)
    ? 'BackOrder'
    : isSoldOut(p)
      ? 'SoldOut'
      : 'InStock'

  return [
    { title: `${title}｜AndelNI` },
    { content: description, name: 'description' },
    { href: url, rel: 'canonical', tagName: 'link' },
    { content: title, property: 'og:title' },
    { content: description, property: 'og:description' },
    { content: image, property: 'og:image' },
    { content: url, property: 'og:url' },
    { content: 'product', property: 'og:type' },
    { content: 'AndelNI', property: 'og:site_name' },
    { content: String(p.price), property: 'product:price:amount' },
    { content: 'TWD', property: 'product:price:currency' },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'Product',
        brand: { '@type': 'Brand', name: p.brand },
        description: p.description,
        image: [image],
        name: title,
        offers: {
          '@type': 'Offer',
          availability: `https://schema.org/${availability}`,
          price: p.price,
          priceCurrency: 'TWD',
          url,
        },
        sku: p.id,
      },
    },
  ]
}

// productNo 以物件身分在 PRODUCTS 裡找編號，loader 資料經序列化後要換回目錄裡的同一個物件
const fromCatalog = (q: Product) => getProduct(q.id) ?? q

export default function ProductPage({ loaderData }: Route.ComponentProps) {
  const p = fromCatalog(loaderData.product)
  const prev = loaderData.prev && fromCatalog(loaderData.prev)
  const next = loaderData.next && fromCatalog(loaderData.next)
  const related = loaderData.related.map(fromCatalog)
  const soldOut = isSoldOut(p)

  return (
    <main className='container-page'>
      <nav
        className='flex flex-wrap justify-between gap-2 border-b border-border py-[18px] font-mono text-xs text-muted-foreground'
        aria-label='麵包屑'
      >
        <span>
          <Link to='/'>索引</Link> /{' '}
          <Link to='/#index'>{categoryName(p.cat)}</Link> /{' '}
          <span className='text-foreground'>
            No.{productNo(p)} {p.name}
          </span>
        </span>
        <span className='flex gap-4'>
          {prev && (
            <Link
              aria-label={`上一件：${prev.name}`}
              to={`/products/${prev.id}`}
            >
              ← No.{productNo(prev)}
            </Link>
          )}
          {next && (
            <Link
              aria-label={`下一件：${next.name}`}
              to={`/products/${next.id}`}
            >
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
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <main className='container-page py-16'>
      <PageTitle>{notFound ? '找不到商品' : '發生錯誤'}</PageTitle>
      <p className='mt-4 text-[15px] leading-relaxed'>
        {notFound ? '這件商品不存在或已下架。' : '請稍後再試一次。'}
      </p>
      <Link
        className='mt-8 inline-block border-b border-line pb-0.5 text-sm'
        to='/#index'
      >
        回到索引 →
      </Link>
    </main>
  )
}
