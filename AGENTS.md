# AndelNI 購物網站

規格：`docs/架構與規格.md`（與設計稿衝突時以規格為準）。

## 架構

- React Router v8（framework 模式、SSR）跑在 Cloudflare Worker（`workers/app.ts`）。
- `/api/*` 是 Hono（`workers/api/`）；其餘交給 React Router，loader 用 `dbFrom(context)` 取 D1（`app/lib/context.ts`）。
- D1 schema 在 `migrations/`（規格第 8 節）；商品讀取 `app/lib/db/products.server.ts`（loader 與 API 共用）。
- 已接 D1：首頁、商品頁、sitemap、`/api/products`。仍是假資料：購物車（localStorage）、登入、會員、結帳、後台（`app/lib/mock/*`）；`app/lib/catalog.ts` 只剩型別、工具與種子資料來源。
- 環境：正式 `andelni`（main）、staging `andelni-staging`（dev），見規格 11.4。
- 後台存取保護：密碼＋驗證器 App，在 Worker 層（`workers/auth/admin.ts`）；設定 `pnpm admin:setup`，規劃見 `docs/後台存取保護.md`。
- UI：Tailwind v4 + shadcn/ui（`app/components/ui`，直角）。色票、字體 token 在 `app/app.css`。

## 目錄

- `app/routes.ts`：路由表。`store-layout`（首頁、商品頁）、`plain-layout`（購物車、結帳、會員、政策）、`admin/layout`（後台）。
- 商品編號 `AN0014`（`code`，永不重用）、網址 `/products/an0014-<slug>`（`productPath()`）、規格層級 `sku`；見規格 5.1a。
- `app/components/store`：頁首、頁尾、商品卡、標題元件。其他區域元件放 `app/components/<區域>/`。

## 指令

- `pnpm dev`／`pnpm build`／`pnpm typecheck`／`pnpm lint`／`pnpm format`／`pnpm test`
- 本機資料庫：`pnpm db:migrate`、`pnpm db:seed`（第一次開發前跑）
- 部署：`pnpm deploy:staging`（dev）、`pnpm run deploy`（正式，main）
- 提交前：`pnpm lint && pnpm test && pnpm format:check && pnpm typecheck`

## 慣例

- pnpm、Node 22（`mise.toml`）。prettier：無分號、單引號。eslint：perfectionist 排序 import / JSX props、jsx-a11y、react-hooks。
- 註解用繁體中文；路由 `meta` 標題格式「xxx｜AndelNI」。
