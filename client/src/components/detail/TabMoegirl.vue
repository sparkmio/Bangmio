<template>
  <div>
    <div v-if="loading" class="flex justify-center py-10">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>
    <ExternalEmbedFallback
      v-else-if="fallback"
      source="moegirl"
      :title="summary?.title || pageName"
      :content="summary?.extract || ''"
      :url="summary?.url || `https://zh.moegirl.org.cn/${encodeURIComponent(pageName)}`"
      :reason="fallbackReason"
      @retry="retryIframe"
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
  // 用于在条目切换时重置内部状态
  subjectId: { type: [String, Number], required: true },
  // 候选搜索名(优先 name_cn,其次 name)
  names: { type: Array, default: () => [] },
  // 当前 Tab 是否激活(首次激活时懒加载搜索)
  active: { type: Boolean, default: false },
  // iframe 模式(src / srcdoc)
  embedMode: { type: String, default: 'srcdoc' }
})

const pageName = ref('')
const loading = ref(false)
const fallback = ref(false)
const fallbackReason = ref('error')
const summary = ref(null)
const iframeRef = ref(null)

async function search() {
  if (loading.value) return
  loading.value = true
  try {
    let results = null
    for (const name of props.names) {
      if (!name || results?.length) break
      const res = await moegirlAPI.search(name)
      const d = res.data?.data
      if (d?.results?.length) results = d.results
    }
    if (!results?.length && props.names[0]) {
      const clean = props.names[0]
        .replace(/[（(].+[)）]|第[一二三四五六七八九十\d]+季|OVA|剧场版|特别篇/g, '')
        .trim()
      if (clean && clean !== props.names[0]) {
        const res = await moegirlAPI.search(clean)
        const d = res.data?.data
        if (d?.results?.length) results = d.results
      }
    }
    pageName.value = results?.[0]?.title || ''
  } catch {
    pageName.value = ''
  }
  loading.value = false
}

async function onIframeFallback(reason = 'error') {
  fallback.value = true
  fallbackReason.value = reason || 'error'
  const name = pageName.value
  if (!name) return
  try {
    const res = await moegirlAPI.getSummary(name)
    summary.value = res.data?.data || null
  } catch {
    summary.value = null
  }
}

function retryIframe() {
  fallback.value = false
  fallbackReason.value = 'error'
  nextTick(() => {
    iframeRef.value?.retry()
  })
}

// 首次激活时懒加载搜索(与旧 Detail.vue 中 watch(activeTab) 的 moegirl 分支等价)
watch(
  () => props.active,
  active => {
    if (active && !pageName.value && !loading.value) search()
  }
)

// 切换条目时重置全部内部状态
watch(
  () => props.subjectId,
  () => {
    pageName.value = ''
    fallback.value = false
    fallbackReason.value = 'error'
    summary.value = null
    if (props.active) search()
  }
)

// 提供给父组件/测试的搜索名(empty state 链接用)
const searchName = computed(() => props.names[0] || '')
</script>
