<template>
  <div>
    <!-- Watching section: asymmetric two-column layout -->
    <section class="mb-12" v-if="auth.isLoggedIn">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Watching anime - horizontal scroll -->
        <div class="lg:col-span-8">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-xl font-semibold text-base-content">正在追的番剧</h2>
            <router-link to="/watching?type=anime" class="hover-underline-wipe text-sm text-primary">查看全部 →</router-link>
          </div>
          <LoadingState :loading="watchingLoading" :error="watchingError" @retry="fetchWatching" />
          <div v-if="!watchingLoading && !watchingError && watchingList.length" class="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            <router-link
              v-for="anime in watchingList"
              :key="anime.id"
              :to="`/anime/${anime.id}`"
              class="flex-shrink-0 w-32 sm:w-36 group"
            >
              <div class="relative overflow-hidden rounded-lg bg-base-300 card-lift">
                <div class="aspect-[2/3] relative overflow-hidden">
                  <img
                    v-if="anime.images?.large || anime.images?.common"
                    :src="anime.images.large || anime.images.common"
                    class="w-full h-full object-cover transition-all duration-500 group-hover:brightness-110"
                    loading="lazy"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center bg-base-200">
                    <span class="text-xs text-base-content/30">暂无封面</span>
                  </div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div v-if="anime.rating?.score" class="absolute top-2 left-2 z-10">
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-black/60 text-amber-400 backdrop-blur-sm">
                      <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      {{ anime.rating.score.toFixed(1) }}
                    </span>
                  </div>
                  <div class="absolute inset-x-0 bottom-0 p-2.5 z-10">
                    <h3 class="text-[12px] font-semibold text-white line-clamp-2 leading-snug">{{ anime.name_cn || anime.name }}</h3>
                  </div>
                </div>
              </div>
            </router-link>
          </div>
          <div v-else-if="!watchingLoading && watchingList.length === 0" class="text-center py-8 rounded-lg glass-card">
            <p class="text-sm text-base-content/40">还没有在追的番剧</p>
            <router-link to="/anime" class="text-sm text-primary mt-1 inline-block hover-underline-wipe">去探索</router-link>
          </div>
        </div>

        <!-- Right: Watching books - compact list -->
        <div class="lg:col-span-4">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-xl font-semibold text-base-content">正在追的书籍</h2>
            <router-link to="/watching?type=book" class="hover-underline-wipe text-sm text-primary">查看全部 →</router-link>
          </div>
          <LoadingState :loading="watchingBooksLoading" :error="watchingBooksError" @retry="fetchWatchingBooks" />
          <div v-if="!watchingBooksLoading && !watchingBooksError && watchingBooks.length" class="space-y-2">
            <router-link
              v-for="book in watchingBooks"
              :key="book.id"
              :to="`/anime/${book.id}`"
              class="flex items-center gap-3 p-2.5 rounded-lg hover-bg-slide transition-colors"
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
          <div v-else-if="!watchingBooksLoading && watchingBooks.length === 0" class="text-center py-8 rounded-lg glass-card">
            <p class="text-sm text-base-content/40">还没有在追的书籍</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Schedule section -->
    <section class="mb-12">
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-xl font-semibold text-base-content">新番时间表</h2>
        <router-link to="/schedule" class="hover-underline-wipe text-sm text-primary">查看全部 →</router-link>
      </div>
      <LoadingState :loading="weekLoading" :error="weekError" @retry="fetchWeek" />

      <div v-if="!weekLoading && !weekError && weekData.length">
        <div class="flex gap-1.5 mb-5 overflow-x-auto pb-2 scrollbar-hide">
          <button
            v-for="(day, idx) in dayLabels"
            :key="idx"
            @click="activeDay = idx + 1"
            class="btn btn-sm rounded-md whitespace-nowrap"
            :class="activeDay === idx + 1 ? 'btn-primary' : 'btn-ghost'"
          >
            {{ day }}
          </button>
        </div>

        <div v-if="currentDayItems.length" class="anime-grid">
          <AnimeCard v-for="item in currentDayItems.slice(0, 8)" :key="item.id" :anime="mapAnime(item)" />
        </div>
        <div v-else class="text-center py-10 rounded-lg glass-card">
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
    gsap.from('section', { opacity: 0, y: 25, stagger: 0.12, duration: 0.5, ease: 'power2.out' })
  })
})
</script>
