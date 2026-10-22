// 產生後台登入用的三個 secret，寫入 Cloudflare（或本機 .dev.vars）。
//
//   pnpm admin:setup                    全部重新產生並寫入 Cloudflare
//   pnpm admin:setup --local            寫入 .dev.vars（本機測試正式流程用）
//   pnpm admin:setup --only=password    只換密碼（舊登入全部失效）
//   pnpm admin:setup --only=totp        只換驗證器金鑰（換手機時）
//   pnpm admin:setup --only=session     只換 session 金鑰（所有裝置立刻登出）
//
// 請在自己的終端機執行，產生的密碼與金鑰只會印在這裡一次，請存進密碼管理器。

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

import { hashPassword } from '../workers/auth/password.ts'
import { base32Encode } from '../workers/auth/totp.ts'

const args = process.argv.slice(2)
const local = args.includes('--local')
const only = args.find((a) => a.startsWith('--only='))?.slice(7)
const want = (k: 'password' | 'session' | 'totp') => !only || only === k

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n))
// 去掉容易看錯的 0 O 1 l I
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const password = Array.from(
  random(24),
  (b) => ALPHABET[b % ALPHABET.length]
).join('')
const totpSecret = base32Encode(random(20))
const sessionSecret = Buffer.from(random(32)).toString('base64url')

const secrets: Record<string, string> = {}
if (want('password')) secrets.ADMIN_PASSWORD_HASH = await hashPassword(password)
if (want('totp')) secrets.ADMIN_TOTP_SECRET = totpSecret
if (want('session')) secrets.SESSION_SECRET = sessionSecret
if (!Object.keys(secrets).length) {
  console.error('--only 只能是 password、totp 或 session')
  process.exit(1)
}

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
    const r = spawnSync('npx', ['wrangler', 'secret', 'put', name], {
      input: value,
      stdio: ['pipe', 'ignore', 'inherit'],
    })
    if (r.status !== 0) {
      console.error(`寫入 ${name} 失敗，請先 npx wrangler login`)
      process.exit(1)
    }
    console.log(`✓ ${name}`)
  }
}

console.log('\n請立刻存進密碼管理器，這些值不會再顯示：\n')
if (want('password')) console.log(`  後台密碼：${password}`)
if (want('totp')) {
  console.log(`  驗證器金鑰（手動輸入）：${totpSecret}`)
  console.log(
    `  或貼到 1Password：otpauth://totp/AndelNI:admin?secret=${totpSecret}&issuer=AndelNI&algorithm=SHA1&digits=6&period=30`
  )
}
if (want('session')) console.log('  session 金鑰已更新：所有裝置需要重新登入')
console.log()
