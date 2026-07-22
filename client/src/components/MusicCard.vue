<template>
  <div
    class="card bg-base-200/40 border border-base-300/50 hover:border-primary/40 hover:bg-base-200/60 transition-all cursor-pointer overflow-hidden"
    @click="toggleExpanded"
  >
    <div class="card-body p-4">
      <div class="flex items-center gap-4">
        <div class="avatar shrink-0">
          <div class="w-14 h-14 rounded-lg overflow-hidden bg-base-300/50">
            <img
              v-if="track?.cover || image"
              :src="track?.cover || image"
              :alt="displayName"
              loading="lazy"
              decoding="async"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold"
            >
              ♪
            </div>
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-base-content line-clamp-1">
            {{ displayName }}
          </p>
          <p v-if="track?.artists" class="text-xs text-primary/80 line-clamp-1 mt-0.5">
            {{ track.artists }}
          </p>
          <p v-else-if="relation" class="text-xs text-base-content/50 line-clamp-1 mt-0.5">
            {{ relation }}
          </p>
        </div>
        <div class="shrink-0">
          <button
            class="btn btn-circle btn-sm btn-ghost text-primary"
            :aria-label="expanded ? '收起' : '播放'"
            @click.stop="toggleExpanded"
          >
            <span v-if="loading" class="loading loading-spinner loading-xs" />
            <svg
              v-else-if="expanded"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 15l7-7 7 7"
              />
            </svg>
            <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 嵌入式播放器 -->
      <div v-if="expanded && track?.id" class="mt-4 -mx-1">
        <div class="rounded-lg overflow-hidden border border-base-300/50 bg-black/5">
          <iframe
            :src="playerUrl"
            width="100%"
            height="86"
            frameborder="0"
            allow="autoplay; encrypted-media"
            class="block"
            :title="`${displayName} - 网易云音乐播放器`"
          />
        </div>
        <div class="flex items-center justify-between mt-2">
          <p class="text-xs text-base-content/40">来自网易云音乐</p>
          <button class="btn btn-ghost btn-xs text-xs text-primary" @click.stop="collapse">
            收起
          </button>
        </div>
      </div>

      <!-- 搜索失败/无结果降级 -->
      <div v-else-if="expanded && !loading && !track?.id" class="mt-4">
        <p class="text-sm text-base-content/60 mb-3">未找到匹配曲目，可通过以下链接继续查找：</p>
        <div class="flex flex-wrap gap-2">
          <a
            :href="neteaseSearchUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm btn-ghost text-xs"
            @click.stop
          >
            网易云搜索
          </a>
          <a
            :href="bilibiliSearchUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm btn-ghost text-xs"
            @click.stop
          >
            B站搜索
          </a>
        </div>
        <button class="btn btn-ghost btn-xs text-xs text-primary mt-3" @click.stop="collapse">
          收起
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { musicAPI } from '../api/endpoints'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  nameCn: {
    type: String,
    default: ''
  },
  relation: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  }
})

const expanded = ref(false)
const loading = ref(false)
const track = ref(null)
const searched = ref(false)

const displayName = computed(() => props.nameCn || props.name)
const searchKeyword = computed(() => props.name || props.nameCn || '')
const playerUrl = computed(() =>
  track.value?.id
    ? `https://music.163.com/outchain/player?type=2&id=${track.value.id}&auto=1&height=66`
    : ''
)
const neteaseSearchUrl = computed(
  () => `https://music.163.com/#/search/m/?s=${encodeURIComponent(searchKeyword.value)}`
)
const bilibiliSearchUrl = computed(
  () => `https://search.bilibili.com/all?keyword=${encodeURIComponent(searchKeyword.value)}`
)

async function searchTrack() {
  if (searched.value || loading.value || !searchKeyword.value.trim()) return
  loading.value = true
  try {
    const res = await musicAPI.search(searchKeyword.value.trim())
    const results = res.data?.data?.results || []
    track.value = results[0] || null
  } catch {
    track.value = null
  } finally {
    loading.value = false
    searched.value = true
  }
}

function toggleExpanded() {
  expanded.value = !expanded.value
  if (expanded.value && !searched.value) {
    searchTrack()
  }
}

function collapse() {
  expanded.value = false
}

watch(
  () => searchKeyword.value,
  () => {
    expanded.value = false
    track.value = null
    searched.value = false
  }
)
</script>
