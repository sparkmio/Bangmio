import { Hono } from 'hono'

const app = new Hono()
const ZHIPU_CHAT_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const DEFAULT_MODEL = 'glm-5.3-flash'
const MAX_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 2000
const MAX_CONTEXT_LENGTH = 7000

function cleanMessage(message) {
  if (!message || typeof message !== 'object') return null
  const role = message.role === 'assistant' ? 'assistant' : message.role === 'user' ? 'user' : null
  const content = typeof message.content === 'string' ? message.content.trim() : ''
  if (!role || !content || content.length > MAX_MESSAGE_LENGTH) return null
  return { role, content }
}

function cleanContext(value) {
  if (typeof value !== 'string') return ''
  return Array.from(value)
    .filter(char => {
      const code = char.charCodeAt(0)
      return code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d
    })
    .join('')
    .trim()
    .slice(0, MAX_CONTEXT_LENGTH)
}

function systemPrompt(context) {
  return `你是 Bangmio 的番剧资料助手「米欧」。你熟悉动画、漫画、游戏、音乐和 Bangumi 条目，语气友好、自然、简洁。回答优先依据当前页面资料；资料不足时明确说不知道，不编造链接、评分、人物关系或实时信息。可以使用 Markdown，但不要输出 HTML。当前页面上下文如下：\n${context || '当前页面没有可读取的正文资料。'}`
}

async function callZhipu(c, messages, context) {
  const apiKey = String(c.env?.ZHIPU_API_KEY || '').trim()
  if (!apiKey) return { error: 'AI 服务尚未配置，请稍后再试', status: 503 }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(ZHIPU_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: String(c.env?.ZHIPU_MODEL || DEFAULT_MODEL),
        messages: [{ role: 'system', content: systemPrompt(context) }, ...messages],
        temperature: 0.6,
        max_tokens: 1400
      }),
      signal: controller.signal
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.warn('[AI] Zhipu request failed', response.status)
      return { error: 'AI 服务暂时不可用，请稍后再试', status: 502 }
    }
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim())
      return { error: 'AI 未返回有效回复，请重试', status: 502 }
    return { message: content.trim() }
  } catch (error) {
    return {
      error:
        error instanceof Error && error.name === 'AbortError'
          ? 'AI 响应超时，请稍后再试'
          : 'AI 服务暂时不可用，请稍后再试',
      status: 502
    }
  } finally {
    clearTimeout(timeout)
  }
}

app.post('/chat', async c => {
  const body = await c.req.json().catch(() => ({}))
  const messages = Array.isArray(body?.messages)
    ? body.messages.map(cleanMessage).filter(Boolean)
    : []
  const context = cleanContext(body?.context)
  if (!messages.length || messages.length > MAX_MESSAGES || messages.at(-1)?.role !== 'user') {
    return c.json({ data: null, error: '消息格式不正确', code: 400 }, 400)
  }
  const result = await callZhipu(c, messages, context)
  if (result.error)
    return c.json({ data: null, error: result.error, code: result.status }, result.status)
  return c.json({ data: { message: result.message }, code: 200 })
})

app.post('/suggestions', async c => {
  const body = await c.req.json().catch(() => ({}))
  const context = cleanContext(body?.context)
  const result = await callZhipu(
    c,
    [
      {
        role: 'user',
        content:
          '根据当前页面资料，从下面四类中挑选最有帮助的 4 个提问建议：剧情概览、角色关系、制作与音乐、观看顺序/相似作品。只返回 JSON 数组，每项是 12 到 30 字的中文问题，不要 Markdown、不要解释。'
      }
    ],
    context
  )
  if (result.error)
    return c.json(
      { data: { suggestions: [] }, error: result.error, code: result.status },
      result.status
    )
  let suggestions = []
  try {
    const parsed = JSON.parse(
      String(result.message)
        .replace(/^```json\s*|\s*```$/g, '')
        .trim()
    )
    if (Array.isArray(parsed))
      suggestions = parsed
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 4)
  } catch {
    suggestions = String(result.message)
      .split(/\n+/)
      .map(item => item.replace(/^[-*\d.、）)]+\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 4)
  }
  return c.json({ data: { suggestions }, code: 200 })
})

export default app
