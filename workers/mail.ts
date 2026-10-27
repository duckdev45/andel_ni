// 寄信：Resend HTTP API（不另裝套件）。寄件網域 andelni.com 已在 Resend 驗證。

export type MailEnv = { RESEND_API_KEY?: string }

export const FROM = 'AndelNI <service@andelni.com>'

/** 沒設 RESEND_API_KEY（本機開發）只印在 console，不真的寄 */
export async function sendMail(
  env: MailEnv,
  msg: { subject: string; text: string; to: string }
) {
  if (!env.RESEND_API_KEY) {
    console.log(`[mail] to=${msg.to} ${msg.subject}\n${msg.text}`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, ...msg }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}
