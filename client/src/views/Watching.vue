<template>
  <div class="max-w-5xl mx-auto">
    <div class="flex items-center gap-3 mb-5">
      <a @click.prevent="$router.back()" class="text-sm text-primary hover-underline-wipe cursor-pointer">← 返回</a>
      <h1 class="text-2xl font-semibold text-base-content">在看</h1>
    </div>

    <!-- Type tabs -->
    <div class="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide">
      <button
        v-for="t in typeTabs"
        :key="t.value"
        @click="switchType(t.value)"
        class="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all"
        :class="activeType === t.value ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60 hover:bg-base-300'"
      >
        {{ t.label }}
      </button>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="fetchCollections" />

    <div v-if="!loading && !error">
      <div v-if="!collections.length" class="py-16 text-center text-base-content/40">
        <p>暂无在看内容</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        <!-- Left: anime list -->
        <div class="lg:col-span-4">
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
                <p class="text-[13px] font-medium text-base-content line-clamp-1">{{ col.subject?.name_cn || col.subject?.name }}</p>
                <p class="text-xs text-primary font-semibold mt-0.5">[{{ col.ep_status || 0 }}/{{ col.subject?.eps || col.subject?.total_episodes || '?' }}]</p>
              </div>
            </button>
          </div>
          <div class="text-center mt-3" v-if="hasMore">
            <button @click="loadMore" class="text-sm text-primary hover-underline-wipe">加载更多</button>
          </div>
        </div>

        <!-- Right: detail panel -->
        <div class="lg:col-span-8">
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
                <span
                  v-for="ep in Math.min(selected.subject?.eps || selected.subject?.total_episodes || 0, 24)"
                  :key="ep"
                  class="w-8 h-7 rounded text-xs font-bold flex items-center justify-center"
                  :class="ep <= (selected.ep_status || 0) ? 'bg-primary text-white' : 'bg-base-300 text-base-content/40'"
                >
                  {{ String(ep).padStart(2, '0') }}
                </span>
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

function switchType(val) {
  activeType.value = val
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
    const params = { offset: page.value * limit, limit, type: 3 }
    if (activeType.value) params.subject_type = activeType.value
    const res = await collectionAPI.getList(params)
    const data = res.data?.data || []
    if (page.value === 0) {
      collections.value = data
      if (data.length && !selected.value) selected.value = data[0]
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
