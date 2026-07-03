<template>
  <div>
    <!-- Watching panel: Bangumi-style split layout -->
    <section class="mb-10" v-if="auth.isLoggedIn">
      <div class="flex items-end justify-between mb-5">
        <div class="flex items-baseline gap-3">
          <span class="editorial-number text-3xl text-violet-500">01</span>
          <h2 class="text-xl font-bold text-base-content serif-cn">在追</h2>
        </div>
        <router-link to="/watching" class="text-xs text-base-content/40 hover:text-violet-500 transition-colors font-mono tracking-wider">查看全部 →</router-link>
      </div>
      <hr class="masthead-rule-thin mb-5" />

      <!-- Type tabs -->
      <div class="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide">
        <button
          v-for="t in typeTabs"
          :key="t.value"
          @click="switchType(t.value)"
          class="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all serif-cn tracking-wider"
          :class="watchingType === t.value ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20' : 'bg-base-200 text-base-content/40 hover:bg-base-300'"
        >
          {{ t.label }}
        </button>
      </div>

      <LoadingState :loading="watchingLoading" :error="watchingError" @retry="fetchWatching" />

      <div v-if="!watchingLoading && !watchingError && watchingList.length" class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        <!-- Left: anime list -->
        <div class="lg:col-span-3">
          <div class="space-y-0.5 overflow-y-auto pr-1 scrollbar-hide" style="max-height: 420px">
            <button
              v-for="item in watchingList"
              :key="item.id"
              @click="selectWatching(item)"
              class="w-full flex items-center gap-3 p-2 rounded-md text-left transition-all duration-300"
              :class="selectedWatching?.id === item.id
                ? 'bg-violet-500/8 border-l-2 border-violet-500'
                : 'hover:bg-base-200 border-l-2 border-transparent'"
            >
              <img
                v-if="item.images?.common || item.images?.large"
                :src="item.images.common || item.images.large"
                class="w-10 h-14 rounded object-cover flex-shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p class="text-[13px] font-medium text-base-content line-clamp-1 hover:text-violet-500 transition-colors cursor-pointer serif-cn">{{ item.name_cn || item.name }}</p>
                <p class="text-xs text-violet-500 font-semibold mt-0.5 numeric">[{{ item.ep_status || 0 }}/{{ item.total_episodes || '?' }}]</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Right: detail panel -->
        <div class="lg:col-span-9">
          <div v-if="selectedWatching" class="rounded-md bg-base-200/60 p-5 paper-shadow">
            <div class="flex gap-5 mb-4">
              <img
                v-if="selectedWatching.images?.large || selectedWatching.images?.common"
                :src="selectedWatching.images.large || selectedWatching.images.common"
                class="w-24 h-32 sm:w-28 sm:h-40 rounded-md object-cover flex-shrink-0"
              />
              <div class="min-w-0 flex-1">
                <h3 class="text-lg font-bold text-base-content mb-1 serif-cn">{{ selectedWatching.name_cn || selectedWatching.name }}</h3>
                <p class="text-xs text-base-content/40 mb-3 font-mono tracking-tight">{{ selectedWatching.name }}</p>
                <div class="flex gap-3 text-xs">
                  <router-link :to="`/anime/${selectedWatching.id}/topics`" class="text-violet-500 hover-underline-wipe">参与讨论</router-link>
                  <router-link :to="`/anime/${selectedWatching.id}/talkbox`" class="text-violet-500 hover-underline-wipe">观吐槽</router-link>
                  <router-link :to="`/anime/${selectedWatching.id}`" class="text-violet-500 hover-underline-wipe">详情页</router-link>
                </div>
              </div>
            </div>

            <!-- Episode progress -->
            <div v-if="selectedWatching.total_episodes" class="mt-4">
              <p class="text-[10px] text-base-content/40 mb-2 tracking-wider font-mono uppercase">播放进度 · 已看 {{ selectedWatching.ep_status || 0 }} / {{ selectedWatching.total_episodes }}</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="ep in Math.min(selectedWatching.total_episodes, 24)"
                  :key="ep"
                  @click="openEpisode(ep)"
                  class="w-8 h-7 rounded text-xs font-bold flex items-center justify-center transition-all hover:scale-110 cursor-pointer numeric"
                  :class="ep <= (selectedWatching.ep_status || 0) ? 'bg-violet-500 text-white' : 'bg-base-300 text-base-content/30 hover:bg-washi-300'"
                >
                  {{ String(ep).padStart(2, '0') }}
                </button>
              </div>
            </div>
          </div>
          <div v-else class="py-12 text-center text-base-content/30 text-xs rounded-md bg-base-200/40 serif-cn tracking-wider">
            选择左侧的番剧查看详情
          </div>
        </div>
      </div>

      <div v-else-if="!watchingLoading && watchingList.length === 0" class="text-center py-10 rounded-md bg-base-200/40">
        <p class="text-xs text-base-content/40 serif-cn tracking-wider">还没有在追的内容</p>
        <router-link to="/anime" class="text-xs text-violet-500 mt-1 inline-block hover-underline-wipe font-mono tracking-wider">去探索 →</router-link>
      </div>
    </section>

    <!-- 热门新番 -->
    <section class="mb-10">
      <div class="flex items-end justify-between mb-5">
        <div class="flex items-baseline gap-3">
          <span class="editorial-number text-3xl text-violet-500">02</span>
          <h2 class="text-xl font-bold text-base-content serif-cn">热门新番</h2>
        </div>
        <router-link to="/trending" class="text-xs text-base-content/40 hover:text-violet-500 transition-colors font-mono tracking-wider">查看全部 →</router-link>
      </div>
      <hr class="masthead-rule-thin mb-5" />
      <LoadingState :loading="trendingLoading" :error="trendingError" @retry="fetchTrending" />
      <div v-if="!trendingLoading && !trendingError" class="anime-grid">
        <AnimeCard v-for="anime in trendingList.slice(0, 8)" :key="anime.id" :anime="anime" />
      </div>
    </section>

    <!-- Episode detail popup -->
    <div v-if="episodePopup" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="closeEpisode">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeEpisode"></div>
      <div class="relative bg-base-100 rounded-lg paper-shadow w-full max-w-sm mx-4 p-5 z-10 border border-base-content/10">
        <button @click="closeEpisode" class="absolute top-3 right-3 text-base-content/30 hover:text-base-content transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <p class="text-[10px] font-mono tracking-widest text-base-content/40 uppercase mb-1">Episode</p>
        <h3 class="text-base font-bold text-base-content mb-4 pr-8 serif-cn">
          <span class="text-violet-500 numeric">ep.{{ episodePopup.episode }}</span> {{ episodePopup.name }}
        </h3>

        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="s in epStatusOptions"
            :key="s.value"
            @click="updateWatchingStatus(s.value)"
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all serif-cn"
            :class="selectedWatching?.type === s.value ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20' : 'bg-base-200 text-base-content/40 hover:bg-base-300'"
          >
            {{ s.label }}
          </button>
        </div>

        <hr class="masthead-rule-thin mb-3" />

        <div class="space-y-2 text-xs text-base-content/40">
          <div class="flex justify-between">
            <span class="font-mono tracking-wider uppercase">首播</span>
            <span class="text-base-content numeric">{{ episodePopup.airdate || '未知' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-mono tracking-wider uppercase">时长</span>
            <span class="text-base-content numeric">{{ formatDuration(episodePopup.duration) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-mono tracking-wider uppercase">讨论</span>
            <router-link
              v-if="selectedWatching?.id"
              :to="`/anime/${selectedWatching.id}/topics`"
              class="text-violet-500 hover-underline-wipe"
              @click="closeEpisode"
            >
              参与讨论 →
            </router-link>
          </div>
        </div>
      </div>
    </div>
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

const epStatusOptions = [
  { label: '想看', value: 1 },
  { label: '看过', value: 2 },
  { label: '看到', value: 3 },
  { label: '抛弃', value: 5 },
]

const watchingType = ref(0)
const watchingList = ref([])
const selectedWatching = ref(null)
const watchingLoading = ref(false)
const watchingError = ref('')

const trendingList = ref([])
const trendingLoading = ref(false)
const trendingError = ref('')

const episodes = ref([])
const episodePopup = ref(null)

function formatDuration(dur) {
  if (!dur) return '未知'
  const total = Number(dur)
  if (total >= 60) {
    const h = Math.floor(total / 60)
    const m = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
  }
  return `00:${String(total).padStart(2, '0')}:00`
}

function selectWatching(item) {
  selectedWatching.value = item
  episodePopup.value = null
  if (item.id) fetchEpisodes(item.id)
}

async function fetchEpisodes(subjectId) {
  try {
    const res = await animeAPI.getEpisodes(subjectId)
    episodes.value = res.data?.data || res.data || []
  } catch {
    episodes.value = []
  }
}

function openEpisode(ep) {
  const epData = episodes.value.find(e => e.sort === ep)
  episodePopup.value = {
    episode: ep,
    name: epData?.name_cn || epData?.name || `第${ep}话`,
    airdate: epData?.airdate || '',
    duration: epData?.duration_seconds || 0,
  }
}

function closeEpisode() {
  episodePopup.value = null
}

async function updateWatchingStatus(status) {
  if (!selectedWatching.value?.id) return
  try {
    await collectionAPI.save(selectedWatching.value.id, { status })
    const idx = watchingList.value.findIndex(item => item.id === selectedWatching.value.id)
    if (idx >= 0) watchingList.value[idx] = { ...watchingList.value[idx], type: status }
    selectedWatching.value = { ...selectedWatching.value, type: status }
    closeEpisode()
  } catch {}
}

function switchType(val) {
  watchingType.value = val
  watchingList.value = []
  selectedWatching.value = null
  episodes.value = []
  fetchWatching()
}

async function fetchWatching() {
  if (!auth.isLoggedIn) return
  watchingLoading.value = true; watchingError.value = ''
  try {
    const params = { type: 3, limit: 30 }
    if (watchingType.value) params.subject_type = watchingType.value
    const res = await collectionAPI.getList(params)
    const data = (res.data?.data || []).filter(c => Number(c.subject_type) !== 4 && Number(c.subject?.type) !== 4)
    watchingList.value = data
      .map(c => ({
        ...(c.subject || {}),
        id: c.subject?.id || c.anime_id,
        ep_status: c.ep_status || c.episode || 0,
        total_episodes: c.subject?.eps || c.subject?.total_episodes || 0,
        rating: c.subject?.rating || { score: 0 }
      }))
      .filter(item => item.id)
    if (watchingList.value.length > 0) {
      selectedWatching.value = watchingList.value[0]
      if (watchingList.value[0].id) fetchEpisodes(watchingList.value[0].id)
    }
  } catch { watchingError.value = '加载失败' }
  finally { watchingLoading.value = false }
}

async function fetchTrending() {
  trendingLoading.value = true; trendingError.value = ''
  try { const res = await animeAPI.browse({ sort: 'heat', type: 2, limit: 12 }); trendingList.value = res.data.data || [] }
  catch { trendingError.value = '加载失败' }
  finally { trendingLoading.value = false }
}

onMounted(() => {
  fetchTrending()
  if (auth.isLoggedIn) fetchWatching()
  nextTick(() => {
    gsap.fromTo('section', { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.4, ease: 'power2.out' })
  })
})
</script>
