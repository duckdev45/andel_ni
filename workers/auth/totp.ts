// RFC 6238 TOTP（SHA-1、30 秒、6 位數），Google Authenticator／1Password 預設值。

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(bytes: Uint8Array) {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(s: string): Uint8Array<ArrayBuffer> {
  const clean = s.toUpperCase().replace(/[\s=-]/g, '')
  const out: number[] = []
  let bits = 0
  let value = 0
  for (const c of clean) {
    const i = B32.indexOf(c)
    if (i < 0) throw new Error('TOTP 金鑰不是合法的 base32')
    value = (value << 5) | i
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

async function hotp(
  key: Uint8Array<ArrayBuffer>,
  counter: number,
  digits: number
) {
  const msg = new Uint8Array(8)
  new DataView(msg.buffer).setBigUint64(0, BigInt(counter))
  const k = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, msg))
  const o = h[h.length - 1] & 15
  const bin =
    ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(bin % 10 ** digits).padStart(digits, '0')
}

export const totp = (secret: string, unixSeconds: number, digits = 6) =>
  hotp(base32Decode(secret), Math.floor(unixSeconds / 30), digits)

/**
 * 前後各容許一個 30 秒區間，吸收手機時間誤差。
 * ponytail: 同一組碼在 90 秒內可重複使用；要防重放需記住最後用過的 counter（D1/KV）。
 */
export async function verifyTotp(
  secret: string,
  code: string,
  unixSeconds: number
) {
  if (!/^\d{6}$/.test(code)) return false
  for (const drift of [-30, 0, 30]) {
    if ((await totp(secret, unixSeconds + drift)) === code) return true
  }
  return false
}
