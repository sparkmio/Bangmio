<template>
  <div>
    <div v-if="loading" class="flex justify-center py-10">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>
    <ExternalEmbedFallback
      v-else-if="summary?.extract"
      source="moegirl"
      :title="summary.title || pageName"
      :content="summary.extract"
      :url="summary.url || `https://zh.moegirl.org.cn/${encodeURIComponent(pageName)}`"
      reason="error"
      @retry="retryContent"
    />
    <ExternalEmbedFallback
      v-else-if="fallback"
      source="moegirl"
      :title="pageName"
      :content="''"
      :url="`https://zh.moegirl.org.cn/${encodeURIComponent(pageName)}`"
      :reason="fallbackReason"
      @retry="retryContent"
    />
    <IframeEmbed
      v-else-if="pageName"
      ref="iframeRef"
      :src="`/api/v1/moegirl/page/${encodeURIComponent(pageName)}`"
      :mode="embedMode"
      title="萌娘百科"
      loading-text="正在加载萌娘百科..."
      @fallback="onIframeFallback"
    />
    <div v-else class="py-10 text-center">
      <p class="text-base-content/40 text-sm mb-3">未找到萌娘百科条目</p>
      <a
        :href="`https://zh.moegirl.org.cn/index.php?search=${encodeURIComponent(searchName)}`"
        target="_blank"
        class="btn btn-sm btn-ghost text-primary"
        >前往萌娘百科搜索 →</a
      >
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { moegirlAPI } from '../../api/endpoints'
import IframeEmbed from '../IframeEmbed.vue'
import ExternalEmbedFallback from '../ExternalEmbedFallback.vue'

const props = defineProps({
  subjectId: { type: [String, Number], required: true },
  names: { type: Array, default: () => [] },
  active: { type: Boolean, default: false },
  embedMode: { type: String, default: 'srcdoc' }
})

const pageName = ref('')
const loading = ref(false)
const fallback = ref(false)
const fallbackReason = ref('error')
const summary = ref(null)
const iframeRef = ref(null)
let requestId = 0

async function loadSummary(name, currentRequestId) {
  if (!name) return
  try {
    const res = await moegirlAPI.getSummary(name)
    if (currentRequestId !== requestId) return
    const data = res.data?.data || null
    // 摘要接口是主路径：成功时不再等待 HTML 代理/iframe 的 load 事件。
    if (data?.extract) summary.value = data
  } catch {
    // HTML 代理仍可作为后备路径。
  }
}

async function search() {
  const currentRequestId = ++requestId
  const names = [...props.names]
  loading.value = true
  fallback.value = false
  fallbackReason.value = 'error'
  summary.value = null
  try {
    let results = null
    for (const name of names) {
      if (!name || results?.length) break
      const res = await moegirlAPI.search(name)
      const data = res.data?.data
      if (data?.results?.length) results = data.results
    }
    if (!results?.length && names[0]) {
      const clean = names[0]
        .replace(/[（(].+[)）]|第[一二三四五六七八九十\d]+季|OVA|剧场版|特别篇/g, '')
        .trim()
      if (clean && clean !== names[0]) {
        const res = await moegirlAPI.search(clean)
        const data = res.data?.data
        if (data?.results?.length) results = data.results
      }
    }
    if (currentRequestId !== requestId) return
    pageName.value = results?.[0]?.title || ''
    // 先请求稳定的 MediaWiki 摘要；只有没有可用摘要时才加载 HTML 代理。
    await loadSummary(pageName.value, currentRequestId)
  } catch {
    if (currentRequestId === requestId) pageName.value = ''
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

async function onIframeFallback(reason = 'error') {
  fallback.value = true
  fallbackReason.value = reason || 'error'
  if (!summary.value?.extract) await loadSummary(pageName.value, requestId)
}

async function retryContent() {
  if (!pageName.value) return
  const currentRequestId = ++requestId
  fallback.value = false
  fallbackReason.value = 'error'
  summary.value = null
  loading.value = true
  try {
    await loadSummary(pageName.value, currentRequestId)
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }

  // 摘要仍不可用时再挂载/重试 HTML 代理。
  if (currentRequestId === requestId && !summary.value?.extract) {
    nextTick(() => {
      iframeRef.value?.retry()
    })
  }
}

watch(
  () => props.active,
  active => {
    if (active && !pageName.value && !loading.value) search()
  }
)

watch(
  () => props.subjectId,
  () => {
    requestId += 1
    pageName.value = ''
    fallback.value = false
    fallbackReason.value = 'error'
    summary.value = null
    if (props.active) search()
  }
)

const searchName = computed(() => props.names[0] || '')
</script>
