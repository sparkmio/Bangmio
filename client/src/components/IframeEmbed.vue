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
      ref="iframeRef"
      :srcdoc="htmlContent"
      :title="title"
      class="w-full border-0"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      @load="onLoad"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

/**
 * IframeEmbed - 通用 HTML 片段嵌入组件。
 *
 * 通过 fetch 请求 src 拉取 HTML 片段，使用 iframe 的 srcdoc 属性嵌入，
 * 避免跨域问题。提供骨架屏加载、错误占位 + 重试、iframe 高度自适应能力。
 *
 * @example
 *   <IframeEmbed
 *     src="/api/v1/douban/page/123"
 *     title="豆瓣评论"
 *     loading-text="正在加载豆瓣评论..."
 *   />
 */
const props = defineProps({
  /** API 代理 URL，需返回 HTML 片段 */
  src: { type: String, required: true },
  /** iframe 标题，用于无障碍访问 */
  title: { type: String, default: '嵌入内容' },
  /** 加载中提示文案（用于 aria-label） */
  loadingText: { type: String, default: '加载中...' }
})

const loading = ref(true)
const error = ref('')
const htmlContent = ref('')
const iframeRef = ref(null)

/** 注入到 iframe 的基础样式与文档骨架，保证外部 HTML 片段可读 */
const BASE_DOC =
  '<!DOCTYPE html><html><head><meta charset="utf-8">' +
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

/** 高度更新定时器句柄 */
let heightTimers = []

async function load() {
  if (!props.src) {
    error.value = '缺少加载地址'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  htmlContent.value = ''
  try {
    const res = await fetch(props.src)
    if (!res.ok) throw new Error(`加载失败（${res.status}）`)
    const html = await res.text()
    if (!html || !html.trim()) throw new Error('内容为空')
    htmlContent.value = BASE_DOC + html + BASE_DOC_END
  } catch (e) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

/** 触发重试，可通过 ref 暴露给父组件 */
function retry() {
  load()
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

/** iframe 加载完成后设置高度，并按节奏重新测量以兼容图片加载 */
function onLoad() {
  updateHeight()
  heightTimers.push(setTimeout(updateHeight, 300))
  heightTimers.push(setTimeout(updateHeight, 1000))
  heightTimers.push(setTimeout(updateHeight, 2000))
}

watch(
  () => props.src,
  () => load()
)

onMounted(load)

onBeforeUnmount(() => {
  heightTimers.forEach(t => clearTimeout(t))
  heightTimers = []
})

defineExpose({ retry })
</script>
