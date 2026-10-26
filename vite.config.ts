import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// 照片網址（app/lib/images.ts）：Workers Builds 上建置（WORKERS_CI=1）用 R2 自訂網域，走 CDN 快取；
// 本機開發與預覽沒有這個變數，照片經 Worker 的 /img/ 讀本機 R2。
const IMG_ORIGIN = !process.env.WORKERS_CI
  ? ''
  : process.env.CLOUDFLARE_ENV === 'staging'
    ? 'https://img-staging.andelni.com'
    : 'https://img.andelni.com'

export default defineConfig({
  define: {
    'import.meta.env.VITE_IMG_ORIGIN': JSON.stringify(IMG_ORIGIN),
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
