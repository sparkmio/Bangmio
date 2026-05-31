<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-semibold mb-4 text-base-content">热门番剧</h1>

      <div class="flex flex-wrap gap-3 items-center mb-4">
        <div class="relative flex-1 min-w-60 max-w-md">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input v-model="keyword" @keyup.enter="search" placeholder="搜索番剧..." class="input input-bordered input-sm w-full pl-9" />
        </div>
        <select v-model="filterType" @change="page = 1; browse()" class="select select-bordered select-sm w-auto">
          <option :value="0">全部</option>
          <option :value="2">动画</option>
          <option :value="1">书籍</option>
          <option :value="3">音乐</option>
          <option :value="4">游戏</option>
        </select>
      </div>

      <div class="flex flex-wrap gap-2" v-if="tags.length">
        <button
          v-for="tag in tags"
          :key="tag.name"
          @click="toggleTag(tag.name)"
          class="badge badge-lg cursor-pointer transition-all"
          :class="selectedTags.includes(tag.name) ? 'badge-primary' : 'badge-ghost'"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="browse" />

    <div v-if="!loading && !error">
      <div v-if="animeList.length === 0" class="text-center py-16">
        <div class="text-4xl mb-3 opacity-30">🔍</div>
        <p class="text-base-content/50 mb-1">暂无结果</p>
        <p class="text-sm text-base-content/30">尝试其他关键词或筛选条件</p>
      </div>
      <div v-else class="anime-grid">
        <AnimeCard v-for="anime in animeList" :key="anime.id" :anime="anime" />
      </div>
      <div class="join mt-8 flex justify-center" v-if="totalPages > 1">
        <button @click="goPage(page - 1)" :disabled="page <= 1" class="join-item btn btn-sm">«</button>
        <button v-for="p in visiblePages" :key="p" @click="goPage(p)" class="join-item btn btn-sm" :class="p === page ? 'btn-active' : ''">{{ p }}</button>
        <button @click="goPage(page + 1)" :disabled="page >= totalPages" class="join-item btn btn-sm">»</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animeAPI } from '../api/endpoints'
import AnimeCard from '../components/AnimeCard.vue'
import LoadingState from '../components/LoadingState.vue'

const route = useRoute()
const router = useRouter()

const keyword = ref(route.query.keyword || '')
const animeList = ref([])
const tags = ref([])
const selectedTags = ref([])
const sortType = ref('heat')
const filterType = ref(Number(route.query.type) || 0)
const page = ref(Number(route.query.page) || 1)
const total = ref(0)
const loading = ref(false)
const error = ref('')
const limit = 20

const totalPages = computed(() => Math.ceil(total.value / limit))
const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPages.value, page.value + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function toggleTag(tag) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(tag)
  page.value = 1; browse()
}
function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p; browse(); window.scrollTo(0, 0)
}
async function search() {
  selectedTags.value = []; page.value = 1
  if (keyword.value.trim()) {
    loading.value = true; error.value = ''
    try { const res = await animeAPI.search({ keyword: keyword.value.trim(), page: page.value, limit, type: filterType.value || undefined }); animeList.value = res.data.data || []; total.value = res.data.total || 0 }
    catch { error.value = '搜索失败' }
    finally { loading.value = false }
  } else { browse() }
}
async function browse() {
  loading.value = true; error.value = ''
  const params = { sort: sortType.value, type: filterType.value, page: page.value, limit }
  if (selectedTags.value.length) params.tag = selectedTags.value.join(',')
  try {
    if (keyword.value.trim()) { const res = await animeAPI.search({ keyword: keyword.value.trim(), page: page.value, limit, type: filterType.value || undefined }); animeList.value = res.data.data || []; total.value = res.data.total || 0 }
    else { const res = await animeAPI.browse(params); animeList.value = res.data.data || []; total.value = res.data.total || 0 }
  } catch { error.value = '加载失败' }
  finally { loading.value = false }
  router.replace({ query: { ...route.query, page: page.value, type: filterType.value, keyword: keyword.value || undefined } })
}
async function fetchTags() {
  try { const res = await animeAPI.getTags(); tags.value = ((res.data.data || res.data) || []).slice(0, 20) }
  catch { /* ignore */ }
}
onMounted(() => { fetchTags(); browse() })
watch(keyword, () => { if (!keyword.value.trim()) browse() })
</script>
