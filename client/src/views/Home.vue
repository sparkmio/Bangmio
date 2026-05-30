<template>
  <div>
    <section class="mb-10" v-if="auth.isLoggedIn">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-xl font-bold" style="color: var(--text)">正在追的番剧</h2>
        <router-link to="/profile" class="text-sm font-medium hover:underline" style="color: var(--primary)">查看全部</router-link>
      </div>
      <LoadingState :loading="watchingLoading" :error="watchingError" @retry="fetchWatching" />
      <div v-if="!watchingLoading && !watchingError && watchingList.length" class="anime-grid">
        <AnimeCard v-for="anime in watchingList" :key="anime.id" :anime="anime" />
      </div>
      <div v-else-if="!watchingLoading && watchingList.length === 0" class="text-center py-10 text-sm rounded-xl border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }">
        <p>还没有在追的番剧</p>
        <router-link to="/anime" class="mt-1 inline-block hover:underline" style="color: var(--primary)">去探索</router-link>
      </div>
    </section>

    <section class="mb-10">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-xl font-bold" style="color: var(--text)">新番时间表</h2>
        <router-link to="/schedule" class="text-sm font-medium hover:underline" style="color: var(--primary)">查看全部</router-link>
      </div>
      <LoadingState :loading="weekLoading" :error="weekError" @retry="fetchWeek" />

      <div v-if="!weekLoading && !weekError && weekData.length">
        <div class="flex gap-1.5 mb-5 overflow-x-auto pb-2">
          <button
            v-for="(day, idx) in dayLabels"
            :key="idx"
            @click="activeDay = idx + 1"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            :style="activeDay === idx + 1 ? { background: 'var(--primary)', color: '#fff' } : { background: 'var(--bg-hover)', color: 'var(--text-secondary)' }"
          >
            {{ day }}
          </button>
        </div>

        <div v-if="currentDayItems.length" class="anime-grid">
          <AnimeCard v-for="item in currentDayItems.slice(0, 6)" :key="item.id" :anime="mapAnime(item)" />
        </div>
        <div v-else class="text-center py-10 text-sm rounded-xl border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }">
          当天暂无番剧播出
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { animeAPI, collectionAPI } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import AnimeCard from '../components/AnimeCard.vue'
import LoadingState from '../components/LoadingState.vue'
import { gsap } from 'gsap'

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
  watchingLoading.value = true
  watchingError.value = ''
  try {
    const res = await collectionAPI.getList({ type: 3, subject_type: 2, limit: 12 })
    const data = res.data?.data || []
    watchingList.value = data.map(c => ({
      ...(c.subject || {}),
      id: c.subject?.id || c.anime_id,
      rating: c.subject?.rating || { score: 0 }
    })).filter(item => item.id)
  } catch {
    watchingError.value = '加载失败'
  } finally {
    watchingLoading.value = false
  }
}

async function fetchWeek() {
  weekLoading.value = true
  weekError.value = ''
  try {
    const res = await animeAPI.getCalendar()
    weekData.value = res.data?.data || res.data || []
  } catch {
    weekError.value = '加载失败'
  } finally {
    weekLoading.value = false
  }
}

onMounted(() => {
  fetchWeek()
  if (auth.isLoggedIn) fetchWatching()

  nextTick(() => {
    gsap.from('section', { opacity: 0, y: 30, duration: 0.5, stagger: 0.15, ease: 'power2.out' })
  })
})
</script>
