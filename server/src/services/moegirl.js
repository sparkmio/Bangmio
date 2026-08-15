import { parseHTML } from 'linkedom'
import { fetchHTML } from '../utils/http.js'

const DEFAULT_BASE = 'https://zh.moegirl.org.cn'

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, '').trim()
}

function collapseSpace(s) {
  return (s || '').replace(/\s+/g, ' ').trim()
}

/**
 * 通过 MediaWiki API 获取纯文本导言。相比抓取完整网页，该接口不会执行页面脚本，
 * 在 Worker 环境中更快、更稳定；失败时再回退到 HTML 提取。
 */
async function fetchApiExtract(name, base) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const params = new URLSearchParams({
      action: 'query',
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
      redirects: '1',
      format: 'json',
      titles: name
    })
    const response = await fetch(`${base}/api.php?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Bangmio/1.0 (summary request)'
      }
    })
    if (!response.ok) return null
    const data = await response.json()
    const page = Object.values(data?.query?.pages || {})[0]
    const extract = collapseSpace(page?.extract || '')
    return extract ? { title: page?.title || name, extract } : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
/**
 * 从萌娘百科页面抽取结构化摘要。
 * title 为页面名；extract 取 .mw-parser-output 中前 2-3 段非空纯文本；url 为原站链接。
 * 失败时静默返回可用字段，不抛错误。
 *
 * @param {string} name - 萌娘百科页面名（已解码）。
 * @param {string} [base='https://zh.moegirl.org.cn'] - 站点根 URL。
 * @returns {Promise<{ title: string, extract: string, url: string }>}
 */
export async function getMoegirlSummary(name, base = DEFAULT_BASE) {
  const encoded = encodeURIComponent(name)
  const result = { title: name, extract: '', url: `${base}/${encoded}` }

  // 优先 API：不依赖 HTML 页面代理，避免上游 JS 检测导致所有条目超时。
  const apiResult = await fetchApiExtract(name, base)
  if (apiResult) {
    result.title = apiResult.title
    result.extract = apiResult.extract
    return result
  }

  // API 不可用时再回退 HTML（vector 皮肤优先，默认皮肤回退）。
  const candidates = [`${base}/${encoded}?useskin=vector`, `${base}/${encoded}`]

  let html = ''
  for (const url of candidates) {
    try {
      html = await fetchHTML(url, {
        headers: {
          Referer: `${base}/`,
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      })
      if (html && html.length >= 500) break
    } catch {
      // 尝试下一个候选
    }
  }

  if (!html || html.length < 500) return result

  try {
    const { document } = parseHTML(html)

    // 萌娘百科新皮肤将正文放在 <template> 中，linkedom 不会自动展开，
    // 需要先解包到 body，否则 .mw-parser-output 无法被选中。
    document.querySelectorAll('template').forEach(tmpl => {
      const content = tmpl.innerHTML
      if (content) {
        const wrapper = document.createElement('div')
        wrapper.innerHTML = content
        while (wrapper.firstChild) {
          document.body.appendChild(wrapper.firstChild)
        }
      }
      tmpl.remove()
    })

    const parserOutput = document.querySelector('.mw-parser-output')
    if (!parserOutput) return result

    // 克隆并移除导航模板、编辑段、提示框等噪声元素
    const clone = parserOutput.cloneNode(true)
    clone
      .querySelectorAll(
        'style, script, noscript, template, .mw-editsection, .hatnote, .dablink, .navbox, .infobox, .mbox, .noprint'
      )
      .forEach(el => el.remove())

    // 优先取 <p> 段落，回退到任何非空文本块
    let paragraphs = Array.from(clone.querySelectorAll('p'))
    if (!paragraphs.length) {
      paragraphs = Array.from(clone.querySelectorAll('div, section, li'))
    }

    const extract = paragraphs
      .slice(0, 3)
      .map(p => collapseSpace(stripTags(p.innerHTML)))
      .filter(Boolean)
      .join('\n\n')

    result.extract = extract
  } catch {
    // 静默忽略，返回已有字段
  }

  return result
}
