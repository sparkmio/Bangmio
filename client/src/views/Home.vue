<template>
  <div>
    <section class="mb-12" v-if="auth.isLoggedIn">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-base-content">正在追的番剧</h2>
        <router-link to="/profile" class="btn btn-ghost btn-sm text-primary">查看全部</router-link>
      </div>
      <LoadingState :loading="watchingLoading" :error="watchingError" @retry="fetchWatching" />
      <div v-if="!watchingLoading && !watchingError && watchingList.length" class="anime-grid">
        <AnimeCard v-for="anime in watchingList" :key="anime.id" :anime="anime" />
      </div>
      <div v-else-if="!watchingLoading && watchingList.length === 0" class="card bg-base-200 border border-base-300">
        <div class="card-body items-center text-center py-10">
          <p class="text-base-content/50">还没有在追的番剧</p>
          <router-link to="/anime" class="btn btn-primary btn-sm mt-2">去探索</router-link>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-base-content">新番时间表</h2>
        <router-link to="/schedule" class="btn btn-ghost btn-sm text-primary">查看全部</router-link>
      </div>
      <LoadingState :loading="weekLoading" :error="weekError" @retry="fetchWeek" />

      <div v-if="!weekLoading && !weekError && weekData.length">
        <div class="flex gap-1.5 mb-5 overflow-x-auto pb-2">
          <button
            v-for="(day, idx) in dayLabels"
            :key="idx"
            @click="activeDay = idx + 1"
            class="btn btn-sm rounded-lg whitespace-nowrap"
            :class="activeDay === idx + 1 ? 'btn-primary' : 'btn-ghost'"
          >
            {{ day }}
          </button>
        </div>

        <div v-if="currentDayItems.length" class="anime-grid">
          <AnimeCard v-for="item in currentDayItems.slice(0, 8)" :key="item.id" :anime="mapAnime(item)" />
        </div>
        <div v-else class="card bg-base-200 border border-base-300">
          <div class="card-body items-center text-center py-10">
            <p class="text-base-content/50">当天暂无番剧播出</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { animeAPI, collectionAPI } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import AnimeCard from '../components/AnimeCard.vue'
import LoadingState from '../components/LoadingState.vue'

const auth = useAuthStore()

const watchingList = ref([])
const watchingLoading = ref(false)
const watchingError = ref('')

const weekData = ref([])
const activeDay = ref(new Date().getDay() || 7)
const weekLoading = ref(true)
const weekError = ref('')

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const currentDayItems = computed(() => {
  const day = weekData.value.find(d => d.weekday?.id === activeDay.value)
  return day?.items || []
})

function mapAnime(item) {
  return { ...item, images: item.images || (item.image ? { common: item.image, large: item.image } : null) }
}

async function fetchWatching() {
  if (!auth.isLoggedIn) return
  watchingLoading.value = true; watchingError.value = ''
  try {
    const res = await collectionAPI.getList({ type: 3, subject_type: 2, limit: 12 })
    const data = res.data?.data || []
    watchingList.value = data.map(c => ({ ...(c.subject || {}), id: c.subject?.id || c.anime_id, rating: c.subject?.rating || { score: 0 } })).filter(item => item.id)
  } catch { watchingError.value = '加载失败' }
  finally { watchingLoading.value = false }
}

async function fetchWeek() {
  weekLoading.value = true; weekError.value = ''
  try { const res = await animeAPI.getCalendar(); weekData.value = res.data?.data || res.data || [] }
  catch { weekError.value = '加载失败' }
  finally { weekLoading.value = false }
}

onMounted(() => { fetchWeek(); if (auth.isLoggedIn) fetchWatching() })
</script>
