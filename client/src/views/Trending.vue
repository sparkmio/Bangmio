<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <a @click.prevent="$router.back()" class="text-sm text-primary hover-underline-wipe cursor-pointer">← 返回</a>
      <h1 class="text-2xl font-semibold text-base-content">热门新番</h1>
    </div>

    <div class="flex gap-1.5 mb-4 overflow-x-auto pb-1">
      <button
        v-for="t in typeOptions"
        :key="t.value"
        @click="filterType = t.value; page = 1; browse()"
        class="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all"
        :class="filterType === t.value ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60 hover:bg-base-300'"
      >
        {{ t.label }}
      </button>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="browse" />

    <div v-if="!loading && !error">
      <div v-if="animeList.length === 0" class="py-20 text-center text-base-content/50">
        <p>暂无结果</p>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animeAPI } from '../api/endpoints'
import AnimeCard from '../components/AnimeCard.vue'
import LoadingState from '../components/LoadingState.vue'

const route = useRoute()
const router = useRouter()

const animeList = ref([])
const filterType = ref(Number(route.query.type) || 0)
const typeOptions = [
  { label: '全部', value: 0 },
  { label: '动画', value: 2 },
  { label: '书籍', value: 1 },
]
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

function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p; browse(); window.scrollTo(0, 0)
}

async function browse() {
  loading.value = true; error.value = ''
  const params = { sort: 'heat', type: filterType.value, page: page.value, limit }
  try {
    const res = await animeAPI.browse(params)
    animeList.value = res.data.data || []
    total.value = res.data.total || 0
  } catch { error.value = '加载失败' }
  loading.value = false
  router.replace({ query: { ...route.query, page: page.value, type: filterType.value } })
}

onMounted(browse)
</script>
