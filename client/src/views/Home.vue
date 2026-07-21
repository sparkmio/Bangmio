<template>
  <div>
    <!-- Watching panel: Bangumi-style split layout -->
    <section v-if="auth.isLoggedIn" class="mb-10">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-base-content">在追</h2>
        <router-link to="/watching" class="text-sm text-primary hover-underline-wipe">
          查看全部 →
        </router-link>
      </div>

      <!-- Type tabs -->
      <div class="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide">
        <button
          v-for="t in typeTabs"
          :key="t.value"
          class="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300"
          :class="
            watchingType === t.value
              ? 'bg-primary text-primary-content shadow-sm'
              : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'
          "
          @click="switchType(t.value)"
        >
          {{ t.label }}
        </button>
      </div>

      <LoadingState :loading="watchingLoading" :error="watchingError" @retry="fetchWatching" />

      <div
        v-if="!watchingLoading && !watchingError && watchingList.length"
        class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start"
      >
        <!-- Left: anime list -->
        <div class="lg:col-span-3">
          <div class="space-y-0.5 overflow-y-auto pr-1 scrollbar-hide" style="max-height: 420px">
            <button
              v-for="item in watchingList"
              :key="item.id"
              class="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all duration-200"
              :class="
                selectedWatching?.id === item.id
                  ? 'bg-primary/10 border-l-2 border-primary pl-3'
                  : 'hover:bg-base-200/60 border-l-2 border-transparent'
              "
              @click="selectWatching(item)"
            >
              <img
                v-if="item.images?.common || item.images?.large"
                :src="item.images.common || item.images.large"
                :alt="item.name_cn || item.name"
                class="w-10 h-14 rounded object-cover flex-shrink-0"
                loading="lazy"
                decoding="async"
              />
              <div class="min-w-0 flex-1">
                <p
                  class="text-[13px] font-medium text-base-content line-clamp-1 hover:text-primary transition-colors cursor-pointer"
                >
                  {{ item.name_cn || item.name }}
                </p>
                <p class="text-xs text-primary font-semibold mt-0.5">
                  [{{ item.ep_status || 0 }}/{{ item.total_episodes || '?' }}]
                </p>
              </div>
            </button>
          </div>
        </div>

        <!-- Right: detail panel -->
        <div class="lg:col-span-9">
          <div v-if="selectedWatching" class="rounded-xl bg-base-200/40 p-5">
            <div class="flex gap-5 mb-4">
              <img
                v-if="selectedWatching.images?.large || selectedWatching.images?.common"
                :src="selectedWatching.images.large || selectedWatching.images.common"
                :alt="selectedWatching.name_cn || selectedWatching.name"
                class="w-24 h-32 sm:w-28 sm:h-40 rounded-lg object-cover shadow-md flex-shrink-0"
                loading="lazy"
                decoding="async"
              />
              <div class="min-w-0 flex-1">
                <h3 class="text-lg font-semibold text-base-content mb-1">
                  {{ selectedWatching.name_cn || selectedWatching.name }}
                </h3>
                <p class="text-sm text-base-content/50 mb-3">
                  {{ selectedWatching.name }}
                </p>
                <div class="flex gap-3 text-sm">
                  <router-link
                    :to="`/anime/${selectedWatching.id}/topics`"
                    class="text-primary hover-underline-wipe"
                  >
                    参与讨论
                  </router-link>
                  <router-link
                    :to="`/anime/${selectedWatching.id}/talkbox`"
                    class="text-primary hover-underline-wipe"
                  >
                    观吐槽
                  </router-link>
                  <router-link
                    :to="`/anime/${selectedWatching.id}`"
                    class="text-primary hover-underline-wipe"
                  >
                    详情页
                  </router-link>
                </div>
              </div>
            </div>

            <!-- Episode progress -->
            <div v-if="selectedWatching.total_episodes" class="mt-4">
              <p class="text-xs text-base-content/40 mb-2">
                播放进度 · 已看 {{ selectedWatching.ep_status || 0 }} /
                {{ selectedWatching.total_episodes }}
              </p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="ep in Math.min(selectedWatching.total_episodes, 24)"
                  :key="ep"
                  class="w-9 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                  :class="
                    ep <= (selectedWatching.ep_status || 0)
                      ? 'bg-primary text-white'
                      : 'bg-base-300 text-base-content/40 hover:bg-base-300/80'
                  "
                  @click="openEpisode(ep)"
                >
                  {{ String(ep).padStart(2, '0') }}
                </button>
              </div>
            </div>
          </div>
          <div
            v-else
            class="py-12 text-center text-base-content/30 text-sm rounded-xl bg-base-200/30"
          >
            选择左侧的番剧查看详情
          </div>
        </div>
      </div>

      <div
        v-else-if="!watchingLoading && watchingList.length === 0"
        class="text-center py-10 rounded-xl bg-base-200/30"
      >
        <p class="text-sm text-base-content/40">还没有在追的内容</p>
        <router-link
          to="/anime"
          class="text-sm text-primary mt-1 inline-block hover-underline-wipe"
        >
          去探索
        </router-link>
      </div>
    </section>

    <!-- 热门新番 -->
    <section class="mb-10">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-base-content">热门新番</h2>
        <router-link to="/trending" class="text-sm text-primary hover-underline-wipe">
          查看全部 →
        </router-link>
      </div>
      <LoadingState :loading="trendingLoading" :error="trendingError" @retry="fetchTrending" />
      <div v-if="!trendingLoading && !trendingError" class="anime-grid">
        <AnimeCard v-for="anime in trendingList.slice(0, 8)" :key="anime.id" :anime="anime" />
      </div>
    </section>

    <!-- Episode detail popup -->
    <div
      v-if="episodePopup"
      class="fixed inset-0 z-50 flex items-center justify-center"
      @click.self="closeEpisode"
    >
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="closeEpisode" />
      <div
        class="relative bg-base-100 rounded-2xl shadow-hover w-full max-w-sm mx-4 p-5 z-10 border border-base-300"
      >
        <button
          class="absolute top-3 right-3 text-base-content/40 hover:text-base-content transition-colors"
          @click="closeEpisode"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 class="text-base font-semibold text-base-content mb-4 pr-8">
          ep.{{ episodePopup.episode }} {{ episodePopup.name }}
        </h3>

        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="s in epStatusOptions"
            :key="s.value"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            :class="
              selectedWatching?.type === s.value
                ? 'bg-primary text-primary-content shadow-sm'
                : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'
            "
            @click="updateWatchingStatus(s.value)"
          >
            {{ s.label }}
          </button>
        </div>

        <div class="space-y-2 text-sm text-base-content/60">
          <div class="flex justify-between">
            <span>首播</span>
            <span class="text-base-content">{{ episodePopup.airdate || '未知' }}</span>
          </div>
          <div class="flex justify-between">
            <span>时长</span>
            <span class="text-base-content">{{ formatDuration(episodePopup.duration) }}</span>
          </div>
          <div class="flex justify-between">
            <span>讨论</span>
            <router-link
              v-if="selectedWatching?.id"
              :to="`/anime/${selectedWatching.id}/topics`"
              class="text-primary hover-underline-wipe"
              @click="closeEpisode"
            >
              参与讨论
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { animeAPI, collectionAPI } from '../api/endpoints'
import { createCancelToken, isCanceled } from '../api'
import { useAuthStore } from '../stores/auth'
import AnimeCard from '../components/AnimeCard.vue'
import LoadingState from '../components/LoadingState.vue'
import { gsap } from 'gsap'

const auth = useAuthStore()

const typeTabs = [
  { label: '全部', value: 0 },
  { label: '动画', value: 2 },
  { label: '三次元', value: 6 },
  { label: '书籍', value: 1 }
]

const epStatusOptions = [
  { label: '想看', value: 1 },
  { label: '看过', value: 2 },
  { label: '看到', value: 3 },
  { label: '抛弃', value: 5 }
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

// 在追列表请求 & 章节请求的取消令牌；切换类型/选择条目时取消上一个未完成请求
let watchingCancelToken = null
let episodesCancelToken = null

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
  if (episodesCancelToken) episodesCancelToken.cancel('切换条目，取消上一个章节请求')
  episodesCancelToken = createCancelToken()
  try {
    const res = await animeAPI.getEpisodes(subjectId, undefined, {
      signal: episodesCancelToken.signal
    })
    episodes.value = res.data?.data || res.data || []
  } catch (err) {
    if (!isCanceled(err)) episodes.value = []
  }
}

function openEpisode(ep) {
  const epData = episodes.value.find(e => e.sort === ep)
  episodePopup.value = {
    episode: ep,
    name: epData?.name_cn || epData?.name || `第${ep}话`,
    airdate: epData?.airdate || '',
    duration: epData?.duration_seconds || 0
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
  } catch {
    // ignore
  }
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
  if (watchingCancelToken) watchingCancelToken.cancel('切换类型，取消上一个在追列表请求')
  watchingCancelToken = createCancelToken()
  watchingLoading.value = true
  watchingError.value = ''
  try {
    const params = { type: 3, limit: 30 }
    if (watchingType.value) params.subject_type = watchingType.value
    const res = await collectionAPI.getList(params, { signal: watchingCancelToken.signal })
    const data = (res.data?.data || []).filter(
      c => Number(c.subject_type) !== 4 && Number(c.subject?.type) !== 4
    )
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
  } catch (err) {
    if (!isCanceled(err)) watchingError.value = '加载失败'
  } finally {
    watchingLoading.value = false
  }
}

async function fetchTrending() {
  trendingLoading.value = true
  trendingError.value = ''
  try {
    const res = await animeAPI.browse({ sort: 'heat', type: 2, limit: 12 })
    trendingList.value = res.data.data || []
  } catch {
    trendingError.value = '加载失败'
  } finally {
    trendingLoading.value = false
  }
}

onMounted(() => {
  fetchTrending()
  if (auth.isLoggedIn) fetchWatching()
  nextTick(() => {
    gsap.fromTo(
      'section',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, stagger: 0.12, duration: 0.4, ease: 'power2.out' }
    )
  })
})

onBeforeUnmount(() => {
  if (watchingCancelToken) watchingCancelToken.cancel('组件卸载')
  if (episodesCancelToken) episodesCancelToken.cancel('组件卸载')
})
</script>
