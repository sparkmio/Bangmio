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
              <div class="flex gap-4 mt-2 text-xs text-base-content/40 flex-wrap items-center">
                <span v-if="profileUser?.join_date">加入于 {{ profileUser.join_date }}</span>
                <a v-if="profileUser?.website" :href="profileUser.website" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 link link-hover text-primary/70 hover:text-primary truncate max-w-[200px]">
                  <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                  <span class="truncate">{{ profileUser.website }}</span>
                </a>
              </div>
              <p v-if="profileUser?.bio" class="text-sm mt-2 text-base-content/60 line-clamp-3">{{ profileUser.bio }}</p>
            </div>
          </div>

          <!-- 收藏统计 -->
          <div class="grid grid-cols-5 gap-2 mt-6" v-if="stats">
            <button
              v-for="stat in statItems"
              :key="stat.key"
              @click="filterType = stat.value; fetchCollections()"
              class="text-center p-3 rounded-xl transition-all"
              :class="filterType === stat.value ? 'bg-base-200 ring-2 ring-primary' : 'bg-base-200/50 hover:bg-base-200'"
            >
              <p class="text-2xl font-bold text-base-content">{{ stats[stat.key] || 0 }}</p>
              <p class="text-xs mt-0.5 text-base-content/60">{{ stat.label }}</p>
              <p class="text-[10px] text-base-content/40 mt-0.5">{{ statPercent(stat.key) }}%</p>
            </button>
          </div>
        </div>
      </div>

      <!-- 最近收藏时间线 -->
      <div v-if="recentCollections.length" class="card bg-base-100 border border-base-300 mb-6">
        <div class="card-body p-6">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base font-semibold text-base-content flex items-center gap-1.5">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              最近收藏
            </h2>
            <span class="text-xs text-base-content/40">最近 {{ recentCollections.length }} 条</span>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth">
            <router-link
              v-for="col in recentCollections"
              :key="'recent-' + (col.subject?.id || col.anime_id)"
              :to="`/anime/${col.subject?.id || col.anime_id}`"
              class="shrink-0 w-24 group"
            >
              <div class="relative aspect-[3/4] rounded-lg overflow-hidden bg-base-200 shadow-sm">
                <img
                  v-if="col.subject?.images?.common || col.subject?.images?.grid"
                  :src="col.subject?.images?.common || col.subject?.images?.grid"
                  :alt="col.subject?.name_cn || col.subject?.name"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-base-content/30 text-[10px] p-1 text-center">
                  {{ col.subject?.name_cn || col.subject?.name || '无封面' }}
                </div>
                <div class="absolute top-0 left-0 right-0 px-1.5 py-0.5 bg-gradient-to-b from-black/70 to-transparent">
                  <span class="badge badge-xs" :class="statusBadgeClass(col.type)">{{ statusLabel(col.type) }}</span>
                </div>
                <div v-if="col.rate" class="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-gradient-to-t from-black/80 to-transparent">
                  <span class="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                    <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    {{ col.rate }}
                  </span>
                </div>
              </div>
              <p class="text-xs text-center mt-1 text-base-content/60 line-clamp-1 group-hover:text-primary transition-colors">
                {{ col.subject?.name_cn || col.subject?.name }}
              </p>
              <p class="text-[10px] text-center text-base-content/40">{{ formatRelativeTime(col.updated_at || col.created_at) }}</p>
            </router-link>
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

      <!-- 评分分布 -->
      <div v-if="rateDistribution.length" class="card bg-base-100 border border-base-300 mt-6">
        <div class="card-body p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-base-content flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              评分分布
            </h2>
            <span class="text-xs text-base-content/40">共 {{ rateTotal }} 条评分</span>
          </div>
          <div class="space-y-1.5">
            <div v-for="r in rateDistribution" :key="r.rate" class="flex items-center gap-2">
              <span class="text-xs w-10 text-base-content/70 flex items-center gap-0.5 shrink-0">
                {{ r.rate }}
                <svg class="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              </span>
              <div class="flex-1 bg-base-200 rounded-full h-5 overflow-hidden relative">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="rateBarClass(r.rate)"
                  :style="{ width: Math.max(r.percent, r.count > 0 ? 4 : 0) + '%' }"
                ></div>
                <span class="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-medium text-base-content/60">{{ r.percent }}%</span>
              </div>
              <span class="text-xs w-8 text-right text-base-content font-medium shrink-0">{{ r.count }}</span>
            </div>
          </div>
          <div v-if="rateAverage" class="mt-4 pt-3 border-t border-base-300 flex items-center justify-between text-xs">
            <span class="text-base-content/60">平均评分</span>
            <span class="font-bold text-amber-500 flex items-center gap-0.5">
              {{ rateAverage }}
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            </span>
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

// 最近收藏时间线
const recentCollections = ref([])
// 评分分布
const rateDistribution = ref([])
const rateTotal = ref(0)
const rateAverage = ref(0)

const statItems = [
  { key: 'want', label: '想看', value: 1 },
  { key: 'watching', label: '在追', value: 3 },
  { key: 'completed', label: '看过', value: 2 },
  { key: 'on_hold', label: '搁置', value: 4 },
  { key: 'dropped', label: '弃番', value: 5 }
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

// 统计百分比：单项占总收藏的比例
function statPercent(key) {
  if (!stats.value) return 0
  const total = stats.value.total
    || ((stats.value.want || 0) + (stats.value.watching || 0) + (stats.value.completed || 0)
        + (stats.value.on_hold || 0) + (stats.value.dropped || 0))
  if (!total) return 0
  return Math.round(((stats.value[key] || 0) / total) * 100)
}

// 相对时间格式化：刚刚 / x分钟前 / x小时前 / x天前 / 月日
function formatRelativeTime(t) {
  if (!t) return ''
  try {
    const d = new Date(t)
    if (isNaN(d.getTime())) return ''
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch { return '' }
}

// 评分条颜色：高分绿色，中分蓝色，低分红色
function rateBarClass(rate) {
  if (rate >= 9) return 'bg-success'
  if (rate >= 7) return 'bg-primary'
  if (rate >= 5) return 'bg-secondary'
  if (rate >= 3) return 'bg-warning'
  return 'bg-error'
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

// 拉取最近 10 条收藏（用于时间线展示）
async function fetchRecentCollections() {
  try {
    const params = { limit: 10, subject_type: 2 }
    if (route.params.username) params.username = route.params.username
    const res = await collectionAPI.getList(params)
    const list = res.data?.data || []
    // 按 updated_at 倒序排序（如果 API 未排序则前端兜底）
    recentCollections.value = list.sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at || 0).getTime()
      const tb = new Date(b.updated_at || b.created_at || 0).getTime()
      return tb - ta
    })
  } catch {
    recentCollections.value = []
  }
}

// 拉取全部收藏并统计评分分布（1-10 星）
async function fetchRateDistribution() {
  try {
    const all = []
    let offset = 0
    const pageSize = 50
    const maxPages = 20 // 最多拉取 1000 条，避免无限请求
    for (let i = 0; i < maxPages; i++) {
      const params = { offset, limit: pageSize, subject_type: 2 }
      if (route.params.username) params.username = route.params.username
      const res = await collectionAPI.getList(params)
      const data = res.data?.data || []
      all.push(...data)
      if (data.length < pageSize) break
      offset += pageSize
    }

    const counts = {}
    let totalRated = 0
    let sumRate = 0
    all.forEach(c => {
      const r = Number(c.rate)
      if (r && r >= 1 && r <= 10) {
        counts[r] = (counts[r] || 0) + 1
        totalRated++
        sumRate += r
      }
    })

    const dist = []
    for (let r = 1; r <= 10; r++) {
      const count = counts[r] || 0
      dist.push({
        rate: r,
        count,
        percent: totalRated > 0 ? Math.round((count / totalRated) * 100) : 0
      })
    }
    rateDistribution.value = dist.filter(d => d.count > 0).sort((a, b) => a.rate - b.rate)
    rateTotal.value = totalRated
    rateAverage.value = totalRated > 0 ? (sumRate / totalRated).toFixed(1) : 0
  } catch {
    rateDistribution.value = []
    rateTotal.value = 0
    rateAverage.value = 0
  }
}

onMounted(async () => {
  await loadProfile()
  fetchCollections()
  fetchRecentCollections()
  fetchRateDistribution()
})

watch(() => route.params.username, async () => {
  await loadProfile()
  filterType.value = 0
  fetchCollections()
  fetchRecentCollections()
  fetchRateDistribution()
})
</script>
