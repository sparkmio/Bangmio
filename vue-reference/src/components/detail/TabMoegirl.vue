<template>
  <div>
    <div v-if="loading" class="flex justify-center py-10">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>

    <div v-else-if="pageName" class="space-y-4">
      <!-- 摘要只作为首屏补充，不能再短路完整正文代理。 -->
      <section v-if="summary?.extract" class="rounded-box border border-base-300 bg-base-100 p-4">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h3 class="font-semibold">{{ summary.title || pageName }}</h3>
          <a
            :href="summary.url || `https://zh.moegirl.org.cn/${encodeURIComponent(pageName)}`"
            target="_blank"
            rel="noopener noreferrer"
            class="link link-primary text-sm"
            >原站词条 ↗</a
          >
        </div>
        <p class="whitespace-pre-line text-sm leading-7 text-base-content/75">
          {{ summary.extract }}
        </p>
      </section>

      <ExternalEmbedFallback
        v-if="fallback"
        source="moegirl"
        :title="summary?.title || pageName"
        :content="summary?.extract || ''"
        :url="summary?.url || `https://zh.moegirl.org.cn/${encodeURIComponent(pageName)}`"
        :reason="fallbackReason"
        @retry="retryContent"
      />
      <IframeEmbed
        v-else
        ref="iframeRef"
        :src="`/api/v1/moegirl/page/${encodeURIComponent(pageName)}`"
        :mode="embedMode"
        :timeout-ms="12000"
        title="萌娘百科完整正文"
        loading-text="正在加载萌娘百科完整正文..."
        @fallback="onIframeFallback"
      />
    </div>

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
    if (data?.extract) summary.value = data
  } catch {
    // 正文代理独立运行；摘要失败不影响完整词条加载。
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
    // 让完整正文在同一渲染周期开始加载；摘要仅异步补充首屏信息。
    void loadSummary(pageName.value, currentRequestId)
  } catch {
    if (currentRequestId === requestId) pageName.value = ''
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

function onIframeFallback(reason = 'error') {
  fallback.value = true
  fallbackReason.value = reason || 'error'
  if (!summary.value?.extract) void loadSummary(pageName.value, requestId)
}

async function retryContent() {
  if (!pageName.value) return
  const currentRequestId = ++requestId
  fallback.value = false
  fallbackReason.value = 'error'
  // 保留已取得的摘要，避免用户在重试时看到内容闪烁。
  void loadSummary(pageName.value, currentRequestId)
  await nextTick()
  iframeRef.value?.retry()
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
