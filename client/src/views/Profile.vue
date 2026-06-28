<template>
  <div class="max-w-5xl mx-auto">
    <div v-if="!auth.isLoggedIn && !route.params.username" class="py-20 text-center">
      <p class="text-base-content/50 mb-3">请先登录</p>
      <router-link to="/login" class="btn btn-primary btn-sm">登录 Bangmio</router-link>
    </div>

    <div v-else>
      <!-- 个人资料头 -->
      <div class="card bg-base-100 border border-base-300 mb-6 overflow-hidden">
        <div class="h-24 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/30"></div>
        <div class="card-body p-6 pt-0">
          <div class="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div class="avatar shrink-0">
              <div class="w-24 h-24 rounded-2xl ring-4 ring-base-100 shadow-lg">
                <img v-if="profileUser?.avatar?.large" :src="profileUser.avatar.large" />
                <div v-else class="w-24 h-24 rounded-2xl bg-primary text-primary-content flex items-center justify-center text-3xl font-bold">
                  {{ profileUser?.nickname?.[0] || profileUser?.username?.[0]?.toUpperCase() || '?' }}
                </div>
              </div>
            </div>
            <div class="flex-1 min-w-0 pb-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-2xl font-bold text-base-content">{{ profileUser?.nickname || profileUser?.username }}</h1>
                <span v-if="profileUser?.user_group" class="badge badge-sm badge-outline">{{ profileUser.user_group }}</span>
              </div>
              <p class="text-sm text-base-content/50 mt-0.5">@{{ profileUser?.username }} · UID: {{ profileUser?.id }}</p>
              <p v-if="profileUser?.sign" class="text-sm mt-2 text-base-content/70 line-clamp-2">{{ profileUser.sign }}</p>
              <div class="flex gap-4 mt-2 text-xs text-base-content/40">
                <span v-if="profileUser?.join_date">加入于 {{ profileUser.join_date }}</span>
                <span v-if="profileUser?.website">· {{ profileUser.website }}</span>
              </div>
            </div>
          </div>

          <!-- 收藏统计 -->
          <div class="grid grid-cols-5 gap-2 mt-6" v-if="stats">
            <button
              v-for="stat in statItems"
              :key="stat.key"
              @click="filterType = stat.value; fetchCollections()"
              class="text-center p-3 rounded-xl transition-all"
              :class="filterType === stat.value ? 'bg-base-200 ring-2' : 'bg-base-200/50 hover:bg-base-200'"
              :style="filterType === stat.value ? { '--tw-ring-color': stat.color } : {}"
            >
              <p class="text-2xl font-bold" :style="{ color: stat.color }">{{ stats[stat.key] || 0 }}</p>
              <p class="text-xs mt-0.5 text-base-content/60">{{ stat.label }}</p>
            </button>
          </div>
        </div>
      </div>

      <!-- 收藏区 -->
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body p-6">
          <!-- tab 切换 -->
          <div class="flex items-center gap-1 border-b border-base-300 mb-4 overflow-x-auto">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              @click="filterType = tab.value; fetchCollections()"
              class="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
              :class="filterType === tab.value ? 'border-primary text-primary' : 'border-transparent text-base-content/50 hover:text-base-content'"
            >
              {{ tab.label }}
              <span v-if="tab.value === 0 && stats" class="text-xs text-base-content/40 ml-1">{{ stats.total }}</span>
            </button>
          </div>

          <!-- 封面网格 -->
          <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div v-for="n in 10" :key="n" class="aspect-[3/4] rounded-lg bg-base-200 animate-pulse"></div>
          </div>

          <div v-else-if="collections.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <router-link
              v-for="col in collections"
              :key="col.subject?.id || col.anime_id"
              :to="`/anime/${col.subject?.id || col.anime_id}`"
              class="group block"
            >
              <div class="relative aspect-[3/4] rounded-lg overflow-hidden bg-base-200 shadow-sm">
                <img
                  v-if="col.subject?.images?.common || col.subject?.images?.grid"
                  :src="col.subject?.images?.common || col.subject?.images?.grid"
                  :alt="col.subject?.name_cn || col.subject?.name"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-base-content/30 text-xs p-2 text-center">
                  {{ col.subject?.name_cn || col.subject?.name || '无封面' }}
                </div>

                <!-- 顶部状态条 -->
                <div class="absolute top-0 left-0 right-0 px-2 py-1 bg-gradient-to-b from-black/70 to-transparent">
                  <span class="badge badge-xs" :class="statusBadgeClass(col.type)">{{ statusLabel(col.type) }}</span>
                </div>

                <!-- hover 信息层 -->
                <div class="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 flex flex-col justify-end">
                  <p class="text-xs font-medium text-white line-clamp-2 mb-1">
                    {{ col.subject?.name_cn || col.subject?.name || `#${col.subject?.id || col.anime_id}` }}
                  </p>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span v-if="col.rate" class="text-xs font-bold text-amber-400 flex items-center gap-0.5">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      {{ col.rate }}
                    </span>
                    <span v-if="col.ep_status" class="text-xs text-white/70">看到{{ col.ep_status }}话</span>
                  </div>
                  <p v-if="col.comment" class="text-xs text-white/80 line-clamp-2 mt-1 italic">"{{ col.comment }}"</p>
                </div>
              </div>
              <p class="text-xs text-center mt-1 text-base-content/60 line-clamp-1 group-hover:text-primary transition-colors">
                {{ col.subject?.name_cn || col.subject?.name }}
              </p>
            </router-link>
          </div>

          <div v-else class="py-16 text-center">
            <p class="text-base-content/40 text-sm">还没有收藏</p>
          </div>

          <div class="text-center mt-5" v-if="collections.length && hasMore">
            <button @click="loadMore" class="btn btn-ghost btn-sm text-primary">加载更多</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { collectionAPI, userAPI } from '../api/endpoints'

const route = useRoute()
const auth = useAuthStore()

const profileUser = ref(null)
const stats = ref(null)
const collections = ref([])
const filterType = ref(0)
const page = ref(0)
const hasMore = ref(true)
const loading = ref(false)
const limit = 30

const statItems = [
  { key: 'want', label: '想看', value: 1, color: '#60a5fa' },
  { key: 'watching', label: '在追', value: 3, color: '#34d399' },
  { key: 'completed', label: '看过', value: 2, color: '#f472b6' },
  { key: 'on_hold', label: '搁置', value: 4, color: '#fbbf24' },
  { key: 'dropped', label: '弃番', value: 5, color: '#f87171' }
]

const tabs = [
  { label: '全部', value: 0 },
  { label: '想看', value: 1 },
  { label: '在追', value: 3 },
  { label: '看过', value: 2 },
  { label: '搁置', value: 4 },
  { label: '弃番', value: 5 }
]

function statusLabel(s) {
  return { 1: '想看', 2: '看过', 3: '在看', 4: '搁置', 5: '弃番' }[s] || ''
}

function statusBadgeClass(s) {
  return {
    1: 'badge-info',
    2: 'badge-secondary',
    3: 'badge-success',
    4: 'badge-warning',
    5: 'badge-error'
  }[s] || 'badge-ghost'
}

async function loadProfile() {
  const username = route.params.username
  if (username) {
    try {
      const res = await userAPI.getUser(username)
      profileUser.value = res.data?.data
    } catch { profileUser.value = null }
  } else {
    profileUser.value = auth.user
  }
}

async function fetchCollections(reset = true) {
  if (loading.value) return
  loading.value = true
  if (reset) {
    page.value = 0
    collections.value = []
    hasMore.value = true
  }
  try {
    const params = { offset: page.value * limit, limit, subject_type: 2 }
    if (filterType.value > 0) params.type = filterType.value
    if (route.params.username) params.username = route.params.username

    const res = await collectionAPI.getList(params)
    const data = res.data.data || []

    if (reset) {
      collections.value = data
    } else {
      collections.value.push(...data)
    }

    hasMore.value = data.length >= limit
    page.value++

    if (reset) {
      const s = await collectionAPI.getStats()
      stats.value = s.data.data
    }
  } catch { /* ignore */ }
  loading.value = false
}

function loadMore() {
  fetchCollections(false)
}

onMounted(async () => {
  await loadProfile()
  fetchCollections()
})

watch(() => route.params.username, async () => {
  await loadProfile()
  filterType.value = 0
  fetchCollections()
})
</script>
