import { Hono } from 'hono'

const app = new Hono()
const ZHIPU_CHAT_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const DEFAULT_MODEL = 'glm-5.3-flash'
const MAX_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 2000
const MAX_CONTEXT_LENGTH = 5000

function cleanMessage(message) {
  if (!message || typeof message !== 'object') return null
  const role = message.role === 'assistant' ? 'assistant' : message.role === 'user' ? 'user' : null
  const content = typeof message.content === 'string' ? message.content.trim() : ''
  if (!role || !content || content.length > MAX_MESSAGE_LENGTH) return null
  return { role, content }
}

app.post('/chat', async c => {
  const apiKey = String(c.env?.ZHIPU_API_KEY || '').trim()
  if (!apiKey) {
    return c.json({ data: null, error: 'AI 服务尚未配置，请稍后再试', code: 503 }, 503)
  }

  const body = await c.req.json().catch(() => ({}))
  const messages = Array.isArray(body?.messages)
    ? body.messages.map(cleanMessage).filter(Boolean)
    : []
  const context =
    typeof body?.context === 'string' ? body.context.trim().slice(0, MAX_CONTEXT_LENGTH) : ''
  if (!messages.length || messages.length > MAX_MESSAGES || messages.at(-1)?.role !== 'user') {
    return c.json({ data: null, error: '消息格式不正确', code: 400 }, 400)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(ZHIPU_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: String(c.env?.ZHIPU_MODEL || DEFAULT_MODEL),
        messages: [
          {
            role: 'system',
            content: `你是 Bangmio 的番剧信息助手。用简洁、准确的中文回答；不确定时明确说明，不编造来源或实时数据。${context ? `\n当前页面资料（仅作回答上下文）：\n${context}` : ''}`
          },
          ...messages
        ],
        temperature: 0.6,
        max_tokens: 1024
      }),
      signal: controller.signal
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.warn('[AI] Zhipu request failed', response.status)
      return c.json({ data: null, error: 'AI 服务暂时不可用，请稍后再试', code: 502 }, 502)
    }
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      return c.json({ data: null, error: 'AI 未返回有效回复，请重试', code: 502 }, 502)
    }
    return c.json({ data: { message: content.trim() }, code: 200 })
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'AI 响应超时，请稍后再试'
        : 'AI 服务暂时不可用，请稍后再试'
    return c.json({ data: null, error: message, code: 502 }, 502)
  } finally {
    clearTimeout(timeout)
  }
})

export default app
