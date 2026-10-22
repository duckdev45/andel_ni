import type { Route } from './+types/root'

import './app.css'

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router'

import { Toaster } from '~/components/ui/sonner'
import { CartProvider } from '~/lib/cart'
import { siteOrigin } from '~/lib/seo'

// 正式網址給各路由的 canonical／OG 用；不會變，換頁時不必重抓
export function loader({ request }: Route.LoaderArgs) {
  return { origin: siteOrigin(request) }
}

export const shouldRevalidate = () => false

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Cormorant+Garamond:wght@500;600&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+TC:wght@400;500;700;900&display=swap',
  },
  { rel: 'icon', href: '/images/logo-mark.png', type: 'image/png' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='zh-Hant'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <CartProvider>
      <Outlet />
      {/* 手機底部留空間給後台分頁列 */}
      <Toaster mobileOffset={{ bottom: 80 }} position='bottom-center' />
    </CartProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = '發生錯誤'
  let details = '請稍後再試一次。'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '找不到頁面' : '發生錯誤'
    details =
      error.status === 404
        ? '這個頁面不存在或已下架。'
        : error.statusText || details
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className='container-page py-16'>
      <h1 className='text-4xl font-black'>
        {message}
        <span className='text-brand'>。</span>
      </h1>
      <p className='mt-4'>{details}</p>
      {stack && (
        <pre className='mt-6 overflow-x-auto border border-border p-4 text-xs'>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
