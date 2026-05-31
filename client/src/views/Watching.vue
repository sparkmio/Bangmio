<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <a @click.prevent="$router.back()" class="text-sm text-primary hover-underline-wipe cursor-pointer">← 返回</a>
      <h1 class="text-2xl font-semibold text-base-content">我的收藏</h1>
    </div>

    <div class="flex gap-2 mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="switchTab(tab.value)"
        class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
        :class="activeTab === tab.value ? 'bg-primary text-white shadow-sm' : 'bg-base-200 text-base-content/60 hover:bg-base-300'"
      >
        {{ tab.label }}
      </button>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="fetchCollections" />

    <div v-if="!loading && !error">
      <div v-if="collections.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <router-link
          v-for="col in collections"
          :key="col.subject?.id || col.subject_id || col.anime_id"
          :to="`/anime/${col.subject?.id || col.subject_id || col.anime_id}`"
          class="group flex gap-4 p-4 rounded-lg glass-card hover-glow"
        >
          <div class="w-16 h-22 rounded overflow-hidden flex-shrink-0 bg-base-300">
            <img v-if="col.subject?.images?.common || col.subject?.images?.grid" :src="col.subject?.images?.common || col.subject?.images?.grid" class="w-full h-full object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium line-clamp-2 text-base-content group-hover:text-primary transition-colors">
              {{ col.subject?.name_cn || col.subject?.name || `#${col.subject_id || col.anime_id}` }}
            </p>
            <div class="flex items-center gap-2 mt-2 flex-wrap">
              <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary">{{ statusLabel(col.status || col.type) }}</span>
              <span v-if="col.rating || col.rate" class="text-xs font-bold text-amber-500">★ {{ col.rating || col.rate }}</span>
              <span v-if="col.episode || col.ep_status" class="text-xs text-base-content/40">{{ col.episode || col.ep_status }}话</span>
            </div>
            <p v-if="col.comment" class="text-xs text-base-content/40 mt-1 line-clamp-1">"{{ col.comment }}"</p>
          </div>
        </router-link>
      </div>
      <div v-else class="text-center py-16">
        <div class="text-4xl mb-3 opacity-30">{{ activeTab === 'anime' ? '📺' : '📚' }}</div>
        <p class="text-base-content/40">还没有收藏{{ activeTab === 'anime' ? '番剧' : '书籍' }}</p>
      </div>

      <div class="text-center mt-6" v-if="collections.length && hasMore">
        <button @click="loadMore" class="px-6 py-2 rounded-md text-sm text-primary border border-primary/30 hover:bg-primary/5 transition-colors">加载更多</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { collectionAPI } from '../api/endpoints'
import LoadingState from '../components/LoadingState.vue'

const route = useRoute()

const tabs = [
  { label: '番剧', value: 'anime' },
  { label: '书籍', value: 'book' }
]

const activeTab = ref(route.query.type === 'book' ? 'book' : 'anime')
const collections = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(0)
const hasMore = ref(true)
const limit = 30

const subjectType = () => activeTab.value === 'book' ? 1 : 2

function statusLabel(s) {
  return { 1: '想看', 2: '看过', 3: '在看', 4: '搁置', 5: '弃番' }[s] || '未知'
}

function switchTab(tab) {
  activeTab.value = tab
  page.value = 0
  collections.value = []
  hasMore.value = true
  fetchCollections()
}

async function fetchCollections() {
  loading.value = true; error.value = ''
  try {
    const params = { offset: page.value * limit, limit, subject_type: subjectType(), type: 3 }
    const res = await collectionAPI.getList(params)
    const data = res.data?.data || []
    if (page.value === 0) collections.value = data
    else collections.value.push(...data)
    hasMore.value = data.length >= limit
    page.value++
  } catch { error.value = '加载失败' }
  finally { loading.value = false }
}

function loadMore() {
  fetchCollections()
}

onMounted(fetchCollections)
</script>
