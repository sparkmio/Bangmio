<template>
  <div>
    <!-- Watching panel: Bangumi-style split layout -->
    <section class="mb-10" v-if="auth.isLoggedIn">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-base-content">在看</h2>
        <router-link to="/watching" class="text-sm text-primary hover-underline-wipe">查看全部 →</router-link>
      </div>

      <!-- Type tabs -->
      <div class="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide">
        <button
          v-for="t in typeTabs"
          :key="t.value"
          @click="switchType(t.value)"
          class="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all"
          :class="watchingType === t.value ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60 hover:bg-base-300'"
        >
          {{ t.label }}
        </button>
      </div>

      <LoadingState :loading="watchingLoading" :error="watchingError" @retry="fetchWatching" />

      <div v-if="!watchingLoading && !watchingError && watchingList.length" class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        <!-- Left: anime list -->
        <div class="lg:col-span-4">
          <div class="space-y-0.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-hide">
            <button
              v-for="item in watchingList"
              :key="item.id"
              @click="selectWatching(item)"
              class="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all duration-200"
              :class="selectedWatching?.id === item.id
                ? 'bg-primary/10 border-l-2 border-primary'
                : 'hover:bg-base-200/60 border-l-2 border-transparent'"
            >
              <img
                v-if="item.images?.common || item.images?.large"
                :src="item.images.common || item.images.large"
                class="w-10 h-14 rounded object-cover flex-shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p class="text-[13px] font-medium text-base-content line-clamp-1">{{ item.name_cn || item.name }}</p>
                <p class="text-xs text-primary font-semibold mt-0.5">[{{ item.ep_status || 0 }}/{{ item.total_episodes || '?' }}]</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Right: detail panel -->
        <div class="lg:col-span-8">
          <div v-if="selectedWatching" class="rounded-lg bg-base-200/40 p-5">
            <div class="flex gap-5 mb-4">
              <img
                v-if="selectedWatching.images?.large || selectedWatching.images?.common"
                :src="selectedWatching.images.large || selectedWatching.images.common"
                class="w-24 h-32 sm:w-28 sm:h-40 rounded-lg object-cover shadow-md flex-shrink-0"
              />
              <div class="min-w-0 flex-1">
                <h3 class="text-lg font-semibold text-base-content mb-1">{{ selectedWatching.name_cn || selectedWatching.name }}</h3>
                <p class="text-sm text-base-content/50 mb-3">{{ selectedWatching.name }}</p>
                <div class="flex gap-3 text-sm">
                  <router-link :to="`/anime/${selectedWatching.id}/topics`" class="text-primary hover-underline-wipe">参与讨论</router-link>
                  <router-link :to="`/anime/${selectedWatching.id}/talkbox`" class="text-primary hover-underline-wipe">观吐槽</router-link>
                  <router-link :to="`/anime/${selectedWatching.id}`" class="text-primary hover-underline-wipe">详情页</router-link>
                </div>
              </div>
            </div>

            <!-- Episode progress -->
            <div v-if="selectedWatching.total_episodes" class="mt-4">
              <p class="text-xs text-base-content/40 mb-2">播放进度 · 已看 {{ selectedWatching.ep_status || 0 }} / {{ selectedWatching.total_episodes }}</p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="ep in Math.min(selectedWatching.total_episodes, 24)"
                  :key="ep"
                  class="w-8 h-7 rounded text-xs font-bold flex items-center justify-center"
                  :class="ep <= (selectedWatching.ep_status || 0) ? 'bg-primary text-white' : 'bg-base-300 text-base-content/40'"
                >
                  {{ String(ep).padStart(2, '0') }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="py-12 text-center text-base-content/30 text-sm rounded-lg bg-base-200/30">
            选择左侧的番剧查看详情
          </div>
        </div>
      </div>

      <div v-else-if="!watchingLoading && watchingList.length === 0" class="text-center py-10 rounded-lg bg-base-200/30">
        <p class="text-sm text-base-content/40">还没有在看的内容</p>
        <router-link to="/anime" class="text-sm text-primary mt-1 inline-block hover-underline-wipe">去探索</router-link>
      </div>
    </section>

    <!-- Schedule -->
    <section class="mb-10">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-base-content">新番时间表</h2>
        <router-link to="/schedule" class="text-sm text-primary hover-underline-wipe">查看全部 →</router-link>
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
        <div v-else class="text-center py-10 rounded-lg bg-base-200/30">
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

const typeTabs = [
  { label: '全部', value: 0 },
  { label: '动画', value: 2 },
  { label: '三次元', value: 6 },
  { label: '书籍', value: 1 },
]

const watchingType = ref(0)
const watchingList = ref([])
const selectedWatching = ref(null)
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

function selectWatching(item) {
  selectedWatching.value = item
}

function switchType(val) {
  watchingType.value = val
  watchingList.value = []
  selectedWatching.value = null
  fetchWatching()
}

async function fetchWatching() {
  if (!auth.isLoggedIn) return
  watchingLoading.value = true; watchingError.value = ''
  try {
    const params = { type: 3, limit: 30 }
    if (watchingType.value) params.subject_type = watchingType.value
    const res = await collectionAPI.getList(params)
    const data = res.data?.data || []
    watchingList.value = data
      .map(c => ({
        ...(c.subject || {}),
        id: c.subject?.id || c.anime_id,
        ep_status: c.ep_status || c.episode || 0,
        total_episodes: c.subject?.eps || c.subject?.total_episodes || 0,
        rating: c.subject?.rating || { score: 0 }
      }))
      .filter(item => item.id)
    if (watchingList.value.length > 0) selectedWatching.value = watchingList.value[0]
  } catch { watchingError.value = '加载失败' }
  finally { watchingLoading.value = false }
}

async function fetchWeek() {
  weekLoading.value = true; weekError.value = ''
  try { const res = await animeAPI.getCalendar(); weekData.value = res.data?.data || res.data || [] }
  catch { weekError.value = '加载失败' }
  finally { weekLoading.value = false }
}

onMounted(() => {
  fetchWeek()
  if (auth.isLoggedIn) fetchWatching()
  nextTick(() => {
    gsap.fromTo('section', { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.4, ease: 'power2.out' })
  })
})
</script>
