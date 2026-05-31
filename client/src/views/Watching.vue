<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <a @click.prevent="$router.back()" class="btn btn-ghost btn-sm text-primary cursor-pointer">← 返回</a>
      <h1 class="text-2xl font-semibold text-base-content">我的收藏</h1>
    </div>

    <div class="tabs tabs-boxed bg-base-200 mb-6">
      <button @click="switchTab('anime')" class="tab" :class="activeTab === 'anime' ? 'tab-active' : ''">番剧</button>
      <button @click="switchTab('book')" class="tab" :class="activeTab === 'book' ? 'tab-active' : ''">书籍</button>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="fetchCollections" />

    <div v-if="!loading && !error">
      <div v-if="collections.length" class="space-y-3">
        <div v-for="col in collections" :key="col.subject?.id || col.anime_id" class="flex gap-4 p-4 rounded-lg bg-base-200 border border-base-300">
          <div class="avatar shrink-0">
            <div class="w-14 h-20 rounded-lg">
              <img v-if="col.subject?.images?.common || col.subject?.images?.grid" :src="col.subject?.images?.common || col.subject?.images?.grid" />
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium line-clamp-2 text-base-content">
              {{ col.subject?.name_cn || col.subject?.name || `#${col.subject_id || col.anime_id}` }}
            </p>
            <div class="flex items-center flex-wrap gap-2 mt-1">
              <span class="badge badge-sm badge-primary">{{ statusLabel(col.status || col.type) }}</span>
              <span v-if="col.rating || col.rate" class="text-xs font-bold text-amber-500">
                <svg class="w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                {{ col.rating || col.rate }}
              </span>
              <span v-if="col.episode || col.ep_status" class="text-xs text-base-content/50">{{ col.episode || col.ep_status }}话</span>
              <span v-if="col.comment" class="text-xs line-clamp-1 text-base-content/50">"{{ col.comment }}"</span>
            </div>
          </div>
          <router-link :to="`/anime/${col.subject?.id || col.subject_id || col.anime_id}`" class="btn btn-ghost btn-xs text-primary self-center">
            详情
          </router-link>
        </div>
      </div>
      <div v-else class="py-10 text-center text-sm text-base-content/50">
        <p>还没有收藏{{ activeTab === 'anime' ? '番剧' : '书籍' }}</p>
      </div>

      <div class="text-center mt-4" v-if="collections.length">
        <button @click="loadMore" v-if="hasMore" class="btn btn-ghost btn-sm text-primary">加载更多</button>
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
