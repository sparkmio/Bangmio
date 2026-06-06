<template>
  <div>
    <!-- Watching anime: horizontal scroll -->
    <section class="mb-10" v-if="auth.isLoggedIn">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-base-content">正在追的番剧</h2>
        <router-link to="/watching?type=anime" class="text-sm text-primary hover:underline">查看全部 →</router-link>
      </div>
      <LoadingState :loading="watchingLoading" :error="watchingError" @retry="fetchWatching" />
      <div v-if="!watchingLoading && !watchingError && watchingList.length" class="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
        <router-link
          v-for="anime in watchingList"
          :key="anime.id"
          :to="`/anime/${anime.id}`"
          class="flex-shrink-0 w-32 sm:w-36 group"
        >
          <div class="relative overflow-hidden rounded-lg bg-base-300 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md">
            <div class="aspect-[2/3] relative overflow-hidden">
              <img
                v-if="anime.images?.large || anime.images?.common"
                :src="anime.images.large || anime.images.common"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div v-else class="w-full h-full flex items-center justify-center bg-base-200">
                <span class="text-xs text-base-content/30">暂无</span>
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div class="absolute inset-x-0 bottom-0 p-2.5">
                <h3 class="text-[12px] font-semibold text-white line-clamp-2 leading-snug">{{ anime.name_cn || anime.name }}</h3>
              </div>
            </div>
          </div>
        </router-link>
      </div>
      <div v-else-if="!watchingLoading && watchingList.length === 0" class="text-center py-8 rounded-lg bg-base-200/50">
        <p class="text-sm text-base-content/40">还没有在追的番剧</p>
        <router-link to="/anime" class="text-sm text-primary mt-1 inline-block hover:underline">去探索</router-link>
      </div>
    </section>

    <!-- Watching books: compact list -->
    <section class="mb-10" v-if="auth.isLoggedIn">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-base-content">正在追的书籍</h2>
        <router-link to="/watching?type=book" class="text-sm text-primary hover:underline">查看全部 →</router-link>
      </div>
      <LoadingState :loading="watchingBooksLoading" :error="watchingBooksError" @retry="fetchWatchingBooks" />
      <div v-if="!watchingBooksLoading && !watchingBooksError && watchingBooks.length" class="space-y-2">
        <router-link
          v-for="book in watchingBooks"
          :key="book.id"
          :to="`/anime/${book.id}`"
          class="flex items-center gap-3 p-2.5 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
        >
          <div class="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-base-300">
            <img v-if="book.images?.common || book.images?.large" :src="book.images.common || book.images.large" class="w-full h-full object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-base-content line-clamp-1">{{ book.name_cn || book.name }}</p>
            <p v-if="book.rating?.score" class="text-xs text-amber-500 mt-0.5">★ {{ book.rating.score.toFixed(1) }}</p>
          </div>
        </router-link>
      </div>
      <div v-else-if="!watchingBooksLoading && watchingBooks.length === 0" class="text-center py-8 rounded-lg bg-base-200/50">
        <p class="text-sm text-base-content/40">还没有在追的书籍</p>
      </div>
    </section>

    <!-- Schedule -->
    <section class="mb-10">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-base-content">新番时间表</h2>
        <router-link to="/schedule" class="text-sm text-primary hover:underline">查看全部 →</router-link>
      </div>
      <LoadingState :loading="weekLoading" :error="weekError" @retry="fetchWeek" />

      <div v-if="!weekLoading && !weekError && weekData.length">
        <div class="flex gap-1.5 mb-5 overflow-x-auto pb-2 scrollbar-hide">
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
        <div v-else class="text-center py-10 rounded-lg bg-base-200/50">
          <p class="text-sm text-base-content/40">当天暂无番剧播出</p>
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

const watchingBooks = ref([])
const watchingBooksLoading = ref(false)
const watchingBooksError = ref('')

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

function mapCollection(data) {
  return data.map(c => ({ ...(c.subject || {}), id: c.subject?.id || c.anime_id, rating: c.subject?.rating || { score: 0 } })).filter(item => item.id)
}

async function fetchWatching() {
  if (!auth.isLoggedIn) return
  watchingLoading.value = true; watchingError.value = ''
  try {
    const res = await collectionAPI.getList({ type: 3, subject_type: 2, limit: 12 })
    watchingList.value = mapCollection(res.data?.data || [])
  } catch { watchingError.value = '加载失败' }
  finally { watchingLoading.value = false }
}

async function fetchWatchingBooks() {
  if (!auth.isLoggedIn) return
  watchingBooksLoading.value = true; watchingBooksError.value = ''
  try {
    const res = await collectionAPI.getList({ type: 3, subject_type: 1, limit: 12 })
    watchingBooks.value = mapCollection(res.data?.data || [])
  } catch { watchingBooksError.value = '加载失败' }
  finally { watchingBooksLoading.value = false }
}

async function fetchWeek() {
  weekLoading.value = true; weekError.value = ''
  try { const res = await animeAPI.getCalendar(); weekData.value = res.data?.data || res.data || [] }
  catch { weekError.value = '加载失败' }
  finally { weekLoading.value = false }
}

onMounted(() => {
  fetchWeek()
  if (auth.isLoggedIn) { fetchWatching(); fetchWatchingBooks() }
  nextTick(() => {
    gsap.fromTo('section', { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.4, ease: 'power2.out' })
  })
})
</script>
