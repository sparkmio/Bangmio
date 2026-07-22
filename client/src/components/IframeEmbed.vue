<template>
  <div class="w-full rounded-xl overflow-hidden border border-base-300">
    <!-- 加载中骨架屏 -->
    <div
      v-if="loading"
      class="animate-pulse bg-base-200 h-96"
      role="status"
      :aria-label="loadingText"
    />
    <!-- 错误占位 -->
    <div v-else-if="error" class="p-8 text-center text-base-content/60">
      <p class="mb-3 text-sm">{{ error }}</p>
      <button class="btn btn-sm btn-primary" @click="retry">重试</button>
    </div>
    <!-- iframe 嵌入 -->
    <iframe
      v-else
      :key="iframeKey"
      ref="iframeRef"
      :srcdoc="mode === 'srcdoc' ? htmlContent : undefined"
      :src="mode === 'src' ? iframeSrc : undefined"
      :title="title"
      class="w-full border-0"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      @load="onLoad"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'

/**
 * IframeEmbed - 通用 HTML 片段嵌入组件。
 *
 * 支持 srcdoc 与 src 两种模式：
 * - srcdoc：通过 fetch 拉取 HTML 片段后用 iframe srcdoc 嵌入。
 * - src：直接加载代理 URL，通过 postMessage + ResizeObserver 同步高度。
 * 提供骨架屏加载、错误占位 + 重试、超时检测、连续失败 fallback 事件。
 *
 * @example
 *   <IframeEmbed
 *     src="/api/v1/douban/page/123"
 *     title="豆瓣评论"
 *     loading-text="正在加载豆瓣评论..."
 *     mode="srcdoc"
 *   />
 */
const props = defineProps({
  /** API 代理 URL，需返回 HTML 片段或完整文档 */
  src: { type: String, required: true },
  /** iframe 标题，用于无障碍访问 */
  title: { type: String, default: '嵌入内容' },
  /** 加载中提示文案（用于 aria-label） */
  loadingText: { type: String, default: '加载中...' },
  /** 嵌入模式：srcdoc（默认）或 src */
  mode: {
    type: String,
    default: 'srcdoc',
    validator: value => ['srcdoc', 'src'].includes(value)
  },
  /** 加载超时时间（毫秒） */
  timeoutMs: { type: Number, default: 8000 }
})

const emit = defineEmits(['fallback'])

const loading = ref(true)
const error = ref('')
const htmlContent = ref('')
const iframeSrc = ref('')
const iframeRef = ref(null)
const consecutiveFailures = ref(0)

const iframeKey = computed(() => `${props.mode}:${props.src}`)

/** 注入到 iframe 的基础样式与文档骨架，保证外部 HTML 片段可读 */
const BASE_DOC =
  '<!DOCTYPE html><html><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' \'unsafe-inline\' https: data:;">' +
  '<base target="_blank">' +
  '<style>' +
  'body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.6;padding:0.5rem;margin:0;color:#333;background:transparent}' +
  'img{max-width:100%;height:auto}' +
  'a{color:#3b82f6;text-decoration:none}' +
  'a:hover{text-decoration:underline}' +
  'table{border-collapse:collapse;width:100%;font-size:0.875rem}' +
  'td,th{border:1px solid #ddd;padding:0.4rem 0.6rem}' +
  'th{background:#f5f5f5}' +
  'h2{font-size:1.1rem;font-weight:600;margin:1rem 0 0.5rem}' +
  'h3{font-size:1rem;font-weight:600;margin:0.8rem 0 0.4rem}' +
  'p{margin:0.6rem 0}' +
  'ul,ol{padding-left:1.5rem;margin:0.5rem 0}' +
  '</style>' +
  '</head><body>'
const BASE_DOC_END = '</body></html>'

/** src 模式下注入到 iframe 内部的高度同步脚本 */
const HEIGHT_SYNC_SCRIPT =
  `<script>\n` +
  `(function () {\n` +
  `  function sendHeight() {\n` +
  `    if (!document.body) return\n` +
  `    window.parent.postMessage(\n` +
  `      { type: 'iframe-height', height: document.body.scrollHeight },\n` +
  `      '*'\n` +
  `    )\n` +
  `  }\n` +
  `  window.addEventListener('load', sendHeight)\n` +
  `  window.addEventListener('resize', sendHeight)\n` +
  `  document.addEventListener('DOMContentLoaded', sendHeight)\n` +
  `  document.querySelectorAll('img').forEach(function (img) {\n` +
  `    if (img.complete) return\n` +
  `    img.addEventListener('load', sendHeight)\n` +
  `    img.addEventListener('error', sendHeight)\n` +
  `  })\n` +
  `  setTimeout(sendHeight, 300)\n` +
  `  setTimeout(sendHeight, 1000)\n` +
  `  setTimeout(sendHeight, 2000)\n` +
  `})()\n` +
  '</scr' +
  'ipt>'

/** 高度更新定时器句柄 */
let heightTimers = []
/** ResizeObserver 实例 */
let resizeObserver = null
/** message 事件监听句柄 */
let messageHandler = null
/** 加载超时定时器句柄 */
let timeoutTimer = null
/** src 模式下创建的 blob URL，需要在卸载或重载时释放 */
let blobUrl = null

/**
 * 从代理地址获取 HTML 文本。
 * @param {string} url - 代理 URL。
 * @returns {Promise<string>} HTML 文本。
 */
async function fetchHtml(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`加载失败（${res.status}）`)
  const html = await res.text()
  if (!html || !html.trim()) throw new Error('内容为空')
  return html
}

/**
 * 将 HTML 片段包装为完整 HTML 文档，并注入高度同步脚本。
 * @param {string} fragment - HTML 片段。
 * @returns {string} 完整 HTML 文档。
 */
function buildFullDocument(fragment) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_blank">
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.6;padding:0.5rem;margin:0;color:#333;background:transparent}
img{max-width:100%;height:auto}
a{color:#3b82f6;text-decoration:none}
a:hover{text-decoration:underline}
table{border-collapse:collapse;width:100%;font-size:0.875rem}
td,th{border:1px solid #ddd;padding:0.4rem 0.6rem}
th{background:#f5f5f5}
h2{font-size:1.1rem;font-weight:600;margin:1rem 0 0.5rem}
h3{font-size:1rem;font-weight:600;margin:0.8rem 0 0.4rem}
p{margin:0.6rem 0}
ul,ol{padding-left:1.5rem;margin:0.5rem 0}
</style>
</head>
<body>
${fragment}
${HEIGHT_SYNC_SCRIPT}
</body>
</html>`
}

/**
 * 创建 src 模式使用的 blob URL，并释放旧的 blob URL。
 * @param {string} html - 完整 HTML 文档。
 */
function setSrcHtml(html) {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
  blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html; charset=utf-8' }))
  iframeSrc.value = blobUrl
}

async function load() {
  if (!props.src) {
    handleError('缺少加载地址')
    return
  }

  loading.value = true
  error.value = ''
  htmlContent.value = ''
  iframeSrc.value = ''
  cleanupHeightSync()
  startTimeout()

  try {
    const html = await fetchHtml(props.src)
    if (props.mode === 'srcdoc') {
      htmlContent.value = BASE_DOC + html + BASE_DOC_END
    } else {
      setSrcHtml(buildFullDocument(html))
    }
    // 保持 loading=true，等待 iframe load 事件触发 onLoad
  } catch (e) {
    handleError(e?.message || '加载失败')
  }
}

/** iframe 加载完成后结束 loading、重置失败计数并启动高度同步 */
function onLoad() {
  clearTimeout(timeoutTimer)
  loading.value = false
  consecutiveFailures.value = 0
  setupHeightSync()
}

/** 读取 iframe 文档高度并同步到 iframe 元素 */
function updateHeight() {
  try {
    const iframe = iframeRef.value
    if (!iframe?.contentDocument?.body) return
    const height = iframe.contentDocument.body.scrollHeight
    if (height > 0) iframe.style.height = height + 'px'
  } catch {
    // 跨域或不可访问时忽略
  }
}

/** 监听图片加载完成后重新计算高度 */
function observeImages() {
  try {
    const iframe = iframeRef.value
    if (!iframe?.contentDocument) return
    const images = iframe.contentDocument.querySelectorAll('img')
    images.forEach(img => {
      if (img.complete) return
      img.addEventListener('load', updateHeight)
      img.addEventListener('error', updateHeight)
    })
  } catch {
    // 跨域或不可访问时忽略
  }
}

/** 启动高度同步机制：ResizeObserver + 定时轮询 + 图片 load 事件 + postMessage */
function setupHeightSync() {
  cleanupHeightSync()

  const iframe = iframeRef.value
  if (!iframe) return

  // src 模式：监听 iframe 内部通过 postMessage 发送的高度
  messageHandler = event => {
    if (event.source !== iframe.contentWindow) return
    if (event.data?.type === 'iframe-height') {
      const height = event.data.height
      if (height > 0) iframe.style.height = height + 'px'
    }
  }
  window.addEventListener('message', messageHandler)

  // 优先使用 ResizeObserver 观察 body
  try {
    const body = iframe.contentDocument?.body
    if (body && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateHeight())
      resizeObserver.observe(body)
    }
  } catch {
    // 跨域或不可访问时降级为定时轮询
  }

  // 初始高度与多轮定时重算，兼容图片懒加载
  updateHeight()
  heightTimers.push(setTimeout(updateHeight, 300))
  heightTimers.push(setTimeout(updateHeight, 1000))
  heightTimers.push(setTimeout(updateHeight, 2000))

  // 图片加载完成后重新计算高度
  observeImages()
}

/** 清理所有高度同步相关的 timer/observer/listener */
function cleanupHeightSync() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  heightTimers.forEach(t => clearTimeout(t))
  heightTimers = []
  if (messageHandler) {
    window.removeEventListener('message', messageHandler)
    messageHandler = null
  }
}

/** 统一错误处理：显示错误、增加失败计数，连续 2 次失败后触发 fallback */
function handleError(message) {
  clearTimeout(timeoutTimer)
  loading.value = false
  error.value = message
  consecutiveFailures.value += 1
  if (consecutiveFailures.value >= 2) {
    emit('fallback')
  }
}

/** 启动加载超时定时器 */
function startTimeout() {
  clearTimeout(timeoutTimer)
  timeoutTimer = setTimeout(() => {
    handleError('加载超时，请重试')
  }, props.timeoutMs)
}

/** 触发重试，可通过 ref 暴露给父组件 */
function retry() {
  load()
}

watch(
  () => props.src,
  () => load()
)

watch(
  () => props.mode,
  () => load()
)

onMounted(load)

onBeforeUnmount(() => {
  cleanupHeightSync()
  clearTimeout(timeoutTimer)
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
})

defineExpose({ retry })
</script>
