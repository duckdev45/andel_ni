// 設定後台登入用的兩個 secret，寫入 Cloudflare（或本機 .dev.vars）。
// 登入時另外寄 6 位數驗證碼到 service@andelni.com，需要 RESEND_API_KEY。
//
//   pnpm admin:setup                    設定密碼（自己輸入，留空自動產生）＋ session 金鑰，寫入正式站
//   pnpm admin:setup --env=staging      寫入 staging
//   pnpm admin:setup --local            寫入 .dev.vars（本機測試正式流程用）
//   pnpm admin:setup --only=password    只換密碼（舊登入全部失效）
//   pnpm admin:setup --only=session     只換 session 金鑰（所有裝置立刻登出）
//
// 請在自己的終端機執行，不要在 Claude 對話裡跑（密碼會留在紀錄）。

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'

import { hashPassword } from '../workers/auth/password.ts'

const args = process.argv.slice(2)
const local = args.includes('--local')
const only = args.find((a) => a.startsWith('--only='))?.slice(7)
const env = args.find((a) => a.startsWith('--env='))?.slice(6)
const want = (k: 'password' | 'session') => !only || only === k
if (only && !want('password') && !want('session')) {
  console.error('--only 只能是 password 或 session')
  process.exit(1)
}

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n))
// 去掉容易看錯的 0 O 1 l I
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
let password = ''
let generated = false
if (want('password')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  password = (
    await rl.question('後台密碼（至少 10 碼，留空自動產生）：')
  ).trim()
  rl.close()
  if (password && password.length < 10) {
    console.error('密碼至少 10 碼')
    process.exit(1)
  }
  if (!password) {
    generated = true
    password = Array.from(
      random(16),
      (b) => ALPHABET[b % ALPHABET.length]
    ).join('')
  }
}

const secrets: Record<string, string> = {}
if (want('password')) secrets.ADMIN_PASSWORD_HASH = await hashPassword(password)
if (want('session'))
  secrets.SESSION_SECRET = Buffer.from(random(32)).toString('base64url')

if (local) {
  let current = ''
  try {
    current = readFileSync('.dev.vars', 'utf8')
  } catch {
    // 還沒有 .dev.vars
  }
  const kept = current
    .split('\n')
    .filter((l) => l && !(l.split('=')[0] in secrets))
  const lines = [
    ...kept,
    ...Object.entries(secrets).map(([k, v]) => `${k}=${v}`),
  ]
  writeFileSync('.dev.vars', lines.join('\n') + '\n')
  console.log(
    '已寫入 .dev.vars（不會進 Git）。用 pnpm build && npx vite preview 測試。'
  )
} else {
  for (const [name, value] of Object.entries(secrets)) {
    const r = spawnSync(
      'npx',
      ['wrangler', 'secret', 'put', name, ...(env ? ['--env', env] : [])],
      { input: value, stdio: ['pipe', 'ignore', 'inherit'] }
    )
    if (r.status !== 0) {
      console.error(`寫入 ${name} 失敗，請先 npx wrangler login`)
      process.exit(1)
    }
    console.log(`✓ ${name}`)
  }
}

console.log()
if (generated)
  console.log(`  後台密碼（請存進密碼管理器，不會再顯示）：${password}`)
else if (want('password')) console.log('  後台密碼已更新')
if (want('session')) console.log('  session 金鑰已更新：所有裝置需要重新登入')
console.log()
