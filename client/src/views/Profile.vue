<template>
  <div class="max-w-4xl mx-auto" v-if="auth.isLoggedIn">
    <div class="rounded-2xl p-8 mb-8 border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
      <div class="flex items-center gap-4 mb-6">
        <img
          v-if="auth.user?.avatar?.large"
          :src="auth.user.avatar.large"
          class="w-16 h-16 rounded-full object-cover border-2"
          :style="{ borderColor: 'var(--primary)' }"
        />
        <div v-else class="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" :style="{ background: 'var(--primary)' }">
          {{ auth.user?.nickname?.[0] || auth.user?.username?.[0]?.toUpperCase() }}
        </div>
        <div>
          <h1 class="text-xl font-bold" style="color: var(--text)">{{ auth.user?.nickname || auth.user?.username }}</h1>
          <p class="text-sm" style="color: var(--text-muted)">@{{ auth.user?.username }} · UID: {{ auth.user?.id }}</p>
          <p v-if="auth.user?.sign" class="text-sm mt-1" style="color: var(--text-secondary)">{{ auth.user.sign }}</p>
        </div>
      </div>

      <div class="grid grid-cols-5 gap-3" v-if="stats">
        <div v-for="stat in statItems" :key="stat.label" class="text-center p-3 rounded-xl" :style="{ background: 'var(--bg-hover)' }">
          <p class="text-2xl font-bold" :style="{ color: stat.color }">{{ stats[stat.key] || 0 }}</p>
          <p class="text-xs mt-1" style="color: var(--text-muted)">{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <div class="rounded-2xl p-8 border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
      <div class="flex items-center gap-3 mb-4">
        <h2 class="text-lg font-bold" style="color: var(--text)">我的收藏</h2>
        <select v-model="filterType" @change="fetchCollections" class="px-2 py-1 rounded-lg text-xs border" :style="{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }">
          <option :value="0">全部</option>
          <option :value="1">想看</option>
          <option :value="3">在看</option>
          <option :value="2">看过</option>
          <option :value="4">搁置</option>
          <option :value="5">弃番</option>
        </select>
      </div>

      <div v-if="collections.length" class="grid grid-cols-1 gap-3">
        <div v-for="col in collections" :key="col.subject?.id || col.anime_id" class="flex gap-4 p-3 rounded-xl border transition-all" :style="{ background: 'var(--bg-hover)', borderColor: 'var(--border)' }">
          <img
            v-if="col.subject?.images?.common || col.subject?.images?.grid"
            :src="col.subject?.images?.common || col.subject?.images?.grid"
            class="w-14 h-20 object-cover rounded-lg flex-shrink-0"
          />
          <div v-else class="w-14 h-20 rounded-lg flex-shrink-0" :style="{ background: 'var(--bg-card)' }"></div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium line-clamp-2" style="color: var(--text)">
              {{ col.subject?.name_cn || col.subject?.name || `番剧 #${col.anime_id}` }}
            </p>
            <div class="flex items-center flex-wrap gap-2 mt-1">
              <span class="text-xs px-1.5 py-0.5 rounded" :style="{ background: 'var(--primary-bg)', color: 'var(--primary)' }">{{ statusLabel(col.status || col.type) }}</span>
              <span v-if="col.rating || col.rate" class="text-xs font-bold" style="color: var(--star)">
                <svg class="w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                {{ col.rating || col.rate }}
              </span>
              <span v-if="col.episode || col.ep_status" class="text-xs" style="color: var(--text-muted)">{{ col.episode || col.ep_status }}话</span>
              <span v-if="col.comment" class="text-xs truncate max-w-40 inline-block" style="color: var(--text-muted)">"{{ col.comment }}"</span>
            </div>
          </div>
          <router-link :to="`/anime/${col.subject?.id || col.anime_id}`" class="text-sm font-medium hover:underline self-center flex-shrink-0" style="color: var(--primary)">
            详情
          </router-link>
        </div>
      </div>
      <div v-else class="text-center py-10 text-sm" style="color: var(--text-muted)">
        <p>还没有收藏任何番剧</p>
        <router-link to="/anime" class="mt-2 inline-block font-medium hover:underline" style="color: var(--primary)">去探索</router-link>
      </div>

      <div class="text-center mt-4" v-if="collections.length">
        <button
          @click="loadMore"
          v-if="hasMore"
          class="text-sm hover:underline" style="color: var(--primary)"
        >加载更多</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { collectionAPI } from '../api/endpoints'

const auth = useAuthStore()

const stats = ref(null)
const collections = ref([])
const filterType = ref(0)
const page = ref(0)
const hasMore = ref(true)
const limit = 30

const statItems = [
  { key: 'want', label: '想看', color: '#60a5fa' },
  { key: 'watching', label: '在看', color: '#34d399' },
  { key: 'completed', label: '看过', color: '#f472b6' },
  { key: 'on_hold', label: '搁置', color: '#fbbf24' },
  { key: 'dropped', label: '弃番', color: '#f87171' }
]

function statusLabel(s) {
  return { 1: '想看', 2: '看过', 3: '在看', 4: '搁置', 5: '弃番' }[s] || '未知'
}

async function fetchCollections(reset = true) {
  if (reset) {
    page.value = 0
    collections.value = []
    hasMore.value = true
  }
  try {
    const params = { offset: page.value * limit, limit, subject_type: 2 }
    if (filterType.value > 0) params.type = filterType.value

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
}

function loadMore() {
  fetchCollections(false)
}

onMounted(() => fetchCollections())
</script>
