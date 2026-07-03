<template>
  <div>
    <div class="flex items-center gap-3 mb-5">
      <a @click.prevent="$router.back()" class="text-sm text-primary hover-underline-wipe cursor-pointer">← 返回</a>
      <h1 class="text-2xl font-semibold text-base-content">在追</h1>
    </div>

    <!-- Type tabs -->
    <div class="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide">
      <button
        v-for="t in typeTabs"
        :key="t.value"
        @click="switchType(t.value)"
        class="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all"
        :class="activeType === t.value ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'"
      >
        {{ t.label }}
      </button>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="fetchCollections" />

    <div v-if="!loading && !error">
      <div v-if="!collections.length" class="py-16 text-center text-base-content/40">
        <p>暂无在追内容</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        <!-- Left: anime list -->
        <div class="lg:col-span-3">
          <div class="space-y-0.5 max-h-[calc(100vh-180px)] overflow-y-auto pr-1 scrollbar-hide">
            <button
              v-for="col in collections"
              :key="col.subject?.id || col.anime_id"
              @click="selectItem(col)"
              class="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all duration-200"
              :class="selectedId === (col.subject?.id || col.anime_id)
                ? 'bg-primary/10 border-l-2 border-primary'
                : 'hover:bg-base-200/60 border-l-2 border-transparent'"
            >
              <img
                v-if="col.subject?.images?.common || col.subject?.images?.grid"
                :src="col.subject.images.common || col.subject.images.grid"
                class="w-10 h-14 rounded object-cover flex-shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p class="text-[13px] font-medium text-base-content line-clamp-1 hover:text-primary transition-colors cursor-pointer">{{ col.subject?.name_cn || col.subject?.name }}</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <p class="text-xs text-primary font-semibold">[{{ col.ep_status || 0 }}/{{ col.subject?.eps || col.subject?.total_episodes || '?' }}]</p>
                  <span class="badge badge-xs" :class="col.subject_type === 1 ? 'badge-info' : col.subject_type === 6 ? 'badge-warning' : 'badge-success'">{{ subjectTypeLabel(col.subject_type) }}</span>
                </div>
              </div>
            </button>
          </div>
          <div class="text-center mt-3" v-if="hasMore">
            <button @click="loadMore" class="text-sm text-primary hover-underline-wipe">加载更多</button>
          </div>
        </div>

        <!-- Right: detail panel -->
        <div class="lg:col-span-9">
          <div v-if="selected" class="rounded-lg bg-base-200/40 p-5">
            <div class="flex gap-5 mb-4">
              <img
                v-if="selected.subject?.images?.large || selected.subject?.images?.common"
                :src="selected.subject.images.large || selected.subject.images.common"
                class="w-28 h-40 rounded-lg object-cover shadow-md flex-shrink-0"
              />
              <div class="min-w-0 flex-1">
                <h2 class="text-lg font-semibold text-base-content mb-1">{{ selected.subject?.name_cn || selected.subject?.name }}</h2>
                <p class="text-sm text-base-content/50 mb-3">{{ selected.subject?.name }}</p>
                <div class="flex gap-3 text-sm">
                  <router-link v-if="selected.subject?.id" :to="`/anime/${selected.subject.id}/topics`" class="text-primary hover-underline-wipe">参与讨论</router-link>
                  <router-link v-if="selected.subject?.id" :to="`/anime/${selected.subject.id}/talkbox`" class="text-primary hover-underline-wipe">观吐槽</router-link>
                  <router-link v-if="selected.subject?.id" :to="`/anime/${selected.subject.id}`" class="text-primary hover-underline-wipe">详情页</router-link>
                </div>
              </div>
            </div>

            <!-- Episode progress -->
            <div v-if="selected.subject?.eps || selected.subject?.total_episodes" class="mt-4">
              <p class="text-xs text-base-content/40 mb-2">播放进度 · 已看 {{ selected.ep_status || 0 }} / {{ selected.subject?.eps || selected.subject?.total_episodes }}</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="ep in Math.min(selected.subject?.eps || selected.subject?.total_episodes || 0, 24)"
                  :key="ep"
                  @click="openEpisode(ep)"
                  class="w-8 h-7 rounded text-xs font-bold flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                  :class="ep <= (selected.ep_status || 0) ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/40 hover:bg-base-300/80'"
                >
                  {{ String(ep).padStart(2, '0') }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between text-sm mt-4 pt-3 border-t border-base-300">
              <span v-if="selected.rating || selected.rate" class="text-amber-500 font-bold">★ {{ selected.rating || selected.rate }}</span>
              <router-link v-if="selected.subject?.id" :to="`/anime/${selected.subject.id}`" class="text-primary hover-underline-wipe">查看详情 →</router-link>
            </div>
          </div>

          <div v-else class="py-12 text-center text-base-content/30 text-sm rounded-lg bg-base-200/30">
            选择左侧的番剧查看详情
          </div>
        </div>
      </div>
    </div>

    <!-- Episode detail popup -->
    <div v-if="episodePopup" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="closeEpisode">
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="closeEpisode"></div>
      <div class="relative bg-base-100 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5 z-10 border border-base-300">
        <button @click="closeEpisode" class="absolute top-3 right-3 text-base-content/40 hover:text-base-content transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <h3 class="text-base font-semibold text-base-content mb-4 pr-8">
          ep.{{ episodePopup.episode }} {{ episodePopup.name }}
        </h3>

        <!-- Status buttons -->
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="s in statusOptions"
            :key="s.value"
            @click="updateEpStatus(s.value)"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
            :class="selected?.type === s.value ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/60 hover:bg-base-300'"
          >
            {{ s.label }}
          </button>
        </div>

        <!-- Episode info -->
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
              v-if="selected?.subject?.id"
              :to="`/anime/${selected.subject.id}/topics`"
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { collectionAPI, animeAPI } from '../api/endpoints'
import LoadingState from '../components/LoadingState.vue'

const route = useRoute()

const typeTabs = [
  { label: '全部', value: 0 },
  { label: '动画', value: 2 },
  { label: '三次元', value: 6 },
  { label: '书籍', value: 1 },
]

const statusOptions = [
  { label: '想看', value: 1 },
  { label: '看过', value: 2 },
  { label: '看到', value: 3 },
  { label: '抛弃', value: 5 },
]

const activeType = ref(route.query.type ? Number(route.query.type) : 0)
const collections = ref([])
const selected = ref(null)
const loading = ref(false)
const error = ref('')
const page = ref(0)
const hasMore = ref(true)
const limit = 30

const episodes = ref([])
const episodePopup = ref(null)

const selectedId = computed(() => selected.value?.subject?.id || selected.value?.anime_id)

function subjectTypeLabel(type) {
  const map = { 1: '书籍', 2: '动画', 3: '音乐', 6: '三次元' }
  return map[type] || ''
}

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

function switchType(val) {
  activeType.value = val
  page.value = 0
  collections.value = []
  selected.value = null
  episodes.value = []
  hasMore.value = true
  fetchCollections()
}

function selectItem(col) {
  selected.value = col
  episodePopup.value = null
  if (col.subject?.id) fetchEpisodes(col.subject.id)
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

async function updateEpStatus(status) {
  if (!selected.value?.subject?.id) return
  try {
    await collectionAPI.save(selected.value.subject.id, { status })
    const idx = collections.value.findIndex(c => (c.subject?.id || c.anime_id) === selected.value.subject.id)
    if (idx >= 0) collections.value[idx] = { ...collections.value[idx], type: status }
    selected.value = { ...selected.value, type: status }
    closeEpisode()
  } catch {}
}

async function fetchCollections() {
  loading.value = true; error.value = ''
  try {
    const params = { offset: page.value * limit, limit, type: 3 }
    if (activeType.value) params.subject_type = activeType.value
    const res = await collectionAPI.getList(params)
    const data = (res.data?.data || []).filter(c => Number(c.subject_type) !== 4 && Number(c.subject?.type) !== 4)
    if (page.value === 0) {
      collections.value = data
      if (data.length && !selected.value) {
        selected.value = data[0]
        if (data[0].subject?.id) fetchEpisodes(data[0].subject.id)
      }
    } else {
      collections.value.push(...data)
    }
    hasMore.value = data.length >= limit
    page.value++
  } catch { error.value = '加载失败' }
  finally { loading.value = false }
}

function loadMore() { fetchCollections() }

onMounted(fetchCollections)
</script>
