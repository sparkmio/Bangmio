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

  // 优先尝试 vector 皮肤，再回退默认皮肤；国内/海外双源容错
  const candidates = [
    `${DEFAULT_BASE}/${encoded}?useskin=vector`,
    `${DEFAULT_BASE}/${encoded}`,
    `https://zh.moegirl.uk/${encoded}?useskin=vector`,
    `https://zh.moegirl.uk/${encoded}`
  ]

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
