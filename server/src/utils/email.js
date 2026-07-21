/**
 * 邮件发送工具（基于 Resend HTTP API）。
 *
 * Cloudflare Pages 不支持传统 SMTP，使用 Resend REST API 发送验证码邮件。
 * 需要 `RESEND_API_KEY` 环境变量；`RESEND_FROM` 可选，默认使用 Resend onboarding 发件人。
 *
 * 注意：Resend 免费账号使用 onboarding@resend.dev 时只能发送到账号所有者邮箱；
 *      生产环境需在 Resend 控制台验证自有域名后将 RESEND_FROM 设为
 *      `Bangmio <noreply@your-domain.com>`。
 *
 * 用法：
 *   import { sendEmail } from '../utils/email.js'
 *   await sendEmail({ to, subject, html }, env.RESEND_API_KEY, env.RESEND_FROM)
 */

const RESEND_API = 'https://api.resend.com/emails'

/** 未配置 RESEND_FROM 时使用的默认发件人（仅 Resend 账号所有者可收到） */
const DEFAULT_FROM = 'Bangmio <onboarding@resend.dev>'

/**
 * 通过 Resend 发送邮件。
 *
 * @param {{ to: string, subject: string, html: string }} input - 邮件内容。
 * @param {string} apiKey - Resend API Key（`re_` 前缀）。
 * @param {string} [from] - 发件人地址，未传时使用 `DEFAULT_FROM`。
 * @returns {Promise<{ id: string }>} Resend 返回的邮件 ID。
 * @throws {Error} 当 API 调用失败（非 2xx）时抛出带状态码与响应体的错误。
 */
export async function sendEmail({ to, subject, html }, apiKey, from) {
  if (!apiKey) throw new Error('RESEND_API_KEY 未配置')
  if (!to) throw new Error('收件人不能为空')

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: from || DEFAULT_FROM,
      to,
      subject,
      html
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend API ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * 生成注册验证码邮件 HTML。
 * 采用简洁内联样式，兼容主流邮件客户端。
 *
 * @param {string} code - 6 位数字验证码。
 * @returns {string} HTML 邮件内容。
 */
export function buildVerificationEmailHTML(code) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f6f9;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="420" style="max-width:420px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
        <tr><td style="padding:24px 32px 8px;text-align:center">
          <h1 style="margin:0;font-size:18px;font-weight:600;color:#1f2937">Bangmio 账号注册</h1>
          <p style="margin:8px 0 0;font-size:13px;color:#6b7280">使用以下验证码完成注册</p>
        </td></tr>
        <tr><td style="padding:16px 32px 8px;text-align:center">
          <div style="display:inline-block;padding:14px 28px;background:#fff5f6;border:1px solid #ffd6dd;border-radius:10px;letter-spacing:8px;font-size:30px;font-weight:600;color:#ff6b81;font-family:'SF Mono','Menlo','Consolas',monospace">${code}</div>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">验证码 10 分钟内有效，请勿向他人泄露</p>
          <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">如非本人操作，请忽略此邮件</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af">© Bangmio · 此邮件由系统自动发送，请勿回复</p>
    </td></tr>
  </table>
</body>
</html>`
}
