<template>
  <div class="max-w-6xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <a @click.prevent="$router.back()" class="btn btn-ghost btn-sm text-primary cursor-pointer">← 返回</a>
      <h1 class="text-2xl font-semibold text-base-content">在看</h1>
    </div>

    <!-- Type tabs -->
    <div class="flex gap-1.5 mb-6 overflow-x-auto">
      <button
        v-for="t in typeTabs"
        :key="t.value"
        @click="switchType(t.value)"
        class="px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap"
        :class="activeType === t.value ? 'bg-primary text-white shadow-sm' : 'bg-base-200 text-base-content/60 hover:bg-base-300'"
      >
        {{ t.label }}
      </button>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="fetchCollections" />

    <div v-if="!loading && !error">
      <div v-if="!collections.length" class="py-16 text-center text-base-content/40">
        <p class="text-lg">暂无在看内容</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <!-- Left: anime list -->
        <div class="lg:col-span-4">
          <div class="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            <button
              v-for="col in collections"
              :key="col.subject?.id || col.anime_id"
              @click="selectItem(col)"
              class="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-200"
              :class="selectedId === (col.subject?.id || col.anime_id)
                ? 'bg-primary/10 border-l-2 border-primary'
                : 'hover:bg-base-200/80 border-l-2 border-transparent'"
            >
              <img
                v-if="col.subject?.images?.common || col.subject?.images?.grid"
                :src="col.subject.images.common || col.subject.images.grid"
                class="w-12 h-16 rounded object-cover flex-shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-base-content line-clamp-2">{{ col.subject?.name_cn || col.subject?.name }}</p>
                <p v-if="col.ep_status || col.subject?.total_episodes" class="text-xs text-primary font-semibold mt-0.5">[{{ col.ep_status || 0 }}/{{ col.subject?.total_episodes || '?' }}]</p>
              </div>
            </button>
          </div>
          <div class="text-center mt-3" v-if="hasMore">
            <button @click="loadMore" class="text-sm text-primary hover-underline-wipe">加载更多</button>
          </div>
        </div>

        <!-- Right: detail panel -->
        <div class="lg:col-span-8">
          <div v-if="selected" class="rounded-lg bg-base-200/50 p-5">
            <div class="flex gap-5 mb-5">
              <img
                v-if="selected.subject?.images?.common || selected.subject?.images?.large"
                :src="selected.subject.images.common || selected.subject.images.large"
                class="w-24 h-32 sm:w-32 sm:h-44 rounded-lg object-cover shadow-md flex-shrink-0"
              />
              <div class="min-w-0">
                <h2 class="text-lg sm:text-xl font-semibold text-base-content mb-1">{{ selected.subject?.name_cn || selected.subject?.name }}</h2>
                <p class="text-sm text-base-content/50 mb-3">{{ selected.subject?.name }}</p>

                <!-- Action links -->
                <div class="flex gap-3 text-sm mb-3">
                  <router-link v-if="selected.subject?.id" :to="`/anime/${selected.subject.id}/topics`" class="text-primary hover:underline">参与讨论</router-link>
                  <router-link v-if="selected.subject?.id" :to="`/anime/${selected.subject.id}/talkbox`" class="text-primary hover:underline">观吐槽</router-link>
                  <span class="text-base-content/30">|</span>
                  <router-link v-if="selected.subject?.id" :to="`/anime/${selected.subject.id}`" class="text-primary hover:underline">详情页</router-link>
                </div>
              </div>
            </div>

            <!-- Episode progress -->
            <div v-if="selected.subject?.total_episodes" class="mb-5">
              <p class="text-xs text-base-content/50 mb-2">播放进度 · 已看 {{ selected.ep_status || 0 }} / {{ selected.subject.total_episodes }}</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="ep in selected.subject.total_episodes"
                  :key="ep"
                  class="w-9 h-7 rounded text-xs font-bold transition-all"
                  :class="ep <= (selected.ep_status || 0) ? 'bg-primary text-white' : 'bg-base-300 text-base-content/50 hover:bg-base-300/80'"
                >
                  {{ String(ep).padStart(2, '0') }}
                </button>
              </div>
            </div>

            <!-- Episode info bar -->
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-3">
                <span v-if="selected.rating || selected.rate" class="text-amber-500 font-bold">★ {{ selected.rating || selected.rate }}</span>
                <span class="text-base-content/40">{{ statusLabel(selected.status || selected.type) }}</span>
              </div>
              <router-link v-if="selected.subject?.id" :to="`/anime/${selected.subject.id}`" class="text-sm text-primary hover-underline-wipe">查看详情 →</router-link>
            </div>
          </div>

          <div v-else class="py-16 text-center text-base-content/30 text-sm">
            选择左侧的番剧查看详情
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { collectionAPI } from '../api/endpoints'
import LoadingState from '../components/LoadingState.vue'

const route = useRoute()

const typeTabs = [
  { label: '全部', value: 0 },
  { label: '动画', value: 2 },
  { label: '三次元', value: 6 },
  { label: '书籍', value: 1 },
]

const activeType = ref(route.query.type ? Number(route.query.type) : 0)
const collections = ref([])
const selected = ref(null)
const loading = ref(false)
const error = ref('')
const page = ref(0)
const hasMore = ref(true)
const limit = 30

const selectedId = computed(() => selected.value?.subject?.id || selected.value?.anime_id)

function statusLabel(s) {
  return { 1: '想看', 2: '看过', 3: '在看', 4: '搁置', 5: '弃番' }[s] || '未知'
}

function switchType(value) {
  activeType.value = value
  page.value = 0
  collections.value = []
  selected.value = null
  hasMore.value = true
  fetchCollections()
}

function selectItem(col) {
  selected.value = col
}

async function fetchCollections() {
  loading.value = true; error.value = ''
  try {
    const params = { offset: page.value * limit, limit, subject_type: activeType.value || undefined, type: 3 }
    const res = await collectionAPI.getList(params)
    const data = res.data?.data || []
    if (page.value === 0) {
      collections.value = data
      if (data.length > 0 && !selected.value) selected.value = data[0]
    } else {
      collections.value.push(...data)
    }
    hasMore.value = data.length >= limit
    page.value++
  } catch { error.value = '加载失败' }
  finally { loading.value = false }
}

function loadMore() {
  fetchCollections()
}

onMounted(fetchCollections)
</script>
