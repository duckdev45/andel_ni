import { createContext, type RouterContextProvider } from 'react-router'

/** Worker 傳給 React Router 的 Cloudflare 環境（D1 等 binding） */
export const cloudflareContext = createContext<{
  env: Env
  ctx: ExecutionContext
}>()

export const dbFrom = (context: Readonly<RouterContextProvider>) =>
  context.get(cloudflareContext).env.DB
