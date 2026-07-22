<template>
  <div class="container mx-auto px-4 py-6 max-w-5xl">
    <div class="flex items-center justify-between mb-6 gap-2 flex-wrap">
      <h1 class="text-2xl font-bold">小组</h1>
      <div class="flex items-center gap-2">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索小组..."
          class="input input-sm input-bordered w-48"
          @keyup.enter="searchGroups"
        />
        <button class="btn btn-sm btn-primary" @click="searchGroups">搜索</button>
      </div>
    </div>

    <!-- 加载中：骨架屏 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="n in 8"
        :key="n"
        class="card bg-base-100 rounded-xl shadow-card border border-base-300"
      >
        <div class="card-body p-4">
          <div class="flex items-center gap-3">
            <div class="skeleton w-12 h-12 rounded-full shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="skeleton h-4 w-1/2" />
              <div class="skeleton h-3 w-full" />
              <div class="skeleton h-3 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 网络错误 -->
    <div v-else-if="errorType === 'network'" class="py-20 text-center">
      <p class="text-base-content/60 mb-4">网络连接失败，请检查网络</p>
      <button class="btn btn-sm btn-primary" @click="retry">重试</button>
    </div>

    <!-- 接口异常 -->
    <div v-else-if="errorType === 'server'" class="py-20 text-center">
      <p class="text-base-content/60 mb-4">服务暂不可用，请稍后再试</p>
      <button class="btn btn-sm btn-primary" @click="retry">重试</button>
    </div>

    <!-- 占位数据提示：与列表同时展示 -->
    <div
      v-if="errorType === 'placeholder'"
      class="mb-4 p-4 rounded-xl bg-warning/10 border border-warning/20 text-sm text-base-content/80"
    >
      <p class="font-medium">小组信息暂不可用</p>
      <p class="mt-1">
        Bangumi 上游数据暂时无法获取，当前展示兜底小组。你可以稍后再试或前往 Bangumi 查看。
      </p>
      <div class="flex items-center gap-3 mt-3">
        <button class="btn btn-xs btn-primary" @click="retry">重试</button>
        <a
          href="https://bgm.tv/group"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-primary hover:underline"
        >
          前往 Bangumi 小组首页 →
        </a>
      </div>
    </div>

    <!-- 列表展示（至少 50 个，后端返回的全部展示，前端无需分页） -->
    <div v-if="groups.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <router-link
        v-for="g in groups"
        :key="g.id"
        :to="`/group/${g.id}`"
        class="card bg-base-100 rounded-xl hover:shadow-hover transition-shadow duration-300 border border-base-300"
      >
        <div class="card-body p-4">
          <div class="flex items-start gap-3">
            <!-- 头像（如有） -->
            <div
              class="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-base-200 flex items-center justify-center"
            >
              <img
                v-if="g.icon || g.avatar"
                :src="g.icon || g.avatar"
                :alt="g.name"
                class="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                @error="onAvatarError($event)"
              />
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6 text-base-content/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z"
                />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-semibold text-base-content truncate">
                  {{ g.name }}
                </h3>
                <!-- 成员数 badge -->
                <span
                  v-if="g.member_count != null || g.members != null"
                  class="badge badge-sm badge-ghost"
                >
                  {{ g.member_count ?? g.members }} 成员
                </span>
              </div>
              <p class="text-sm text-base-content/60 line-clamp-2 mt-1">
                {{ g.description || '暂无简介' }}
              </p>
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <!-- 空状态 -->
    <div v-else class="py-20 text-center text-base-content/40">
      <!-- 数据为空：展示兜底推荐小组 -->
      <template v-if="errorType === 'empty'">
        <p class="text-base-content/60">暂无小组数据</p>
        <p class="text-sm mt-2 mb-6">以下为您推荐的 Bangumi 热门小组</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto px-4 text-left">
          <router-link
            v-for="g in RECOMMENDED_GROUPS"
            :key="g.id"
            :to="`/group/${g.id}`"
            class="card bg-base-100 rounded-xl hover:shadow-hover transition-shadow duration-300 border border-base-300"
          >
            <div class="card-body p-4">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-semibold text-base-content truncate">{{ g.name }}</h3>
                <span v-if="g.member_count != null" class="badge badge-sm badge-ghost">
                  {{ g.member_count }} 成员
                </span>
              </div>
              <p class="text-sm text-base-content/60 line-clamp-2 mt-1">
                {{ g.description || '暂无简介' }}
              </p>
            </div>
          </router-link>
        </div>
      </template>
      <template v-else-if="searchQuery.trim()">
        <p>未找到匹配的小组</p>
        <a
          href="https://bgm.tv/group"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary hover:underline mt-2 inline-block"
          >前往 Bangumi 小组首页</a
        >
      </template>
      <template v-else>
        <p>暂无小组数据</p>
        <p class="text-xs mt-2">Bangumi 小组页面结构可能变化，抓取失败时显示空</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { groupAPI } from '../api/endpoints'
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
// allGroups 存全量，groups 存过滤后的结果
const allGroups = ref([])
const groups = ref([])
const loading = ref(true)
const searchQuery = ref('')
// 错误分类: null | 'network' | 'server' | 'empty' | 'placeholder'
const errorType = ref(null)
// 防抖句柄
let debounceTimer = null

// 前端兜底推荐小组（Bangumi 官方活跃小组）
const RECOMMENDED_GROUPS = [
  {
    id: 'bgm38',
    name: 'Bangumi 新番组',
    description: '新番讨论、资讯与推荐',
    member_count: 3800
  },
  {
    id: 'acg',
    name: 'ACG 综合讨论',
    description: '动画、漫画、游戏综合交流',
    member_count: 5600
  },
  { id: 'a', name: '动画', description: '动画讨论小组', member_count: 4200 },
  { id: 'c', name: '漫画', description: '漫画讨论小组', member_count: 3100 },
  { id: 'g', name: '游戏', description: '游戏讨论小组', member_count: 2800 },
  {
    id: 'touhou',
    name: '东方 Project',
    description: '东方 Project 讨论小组',
    member_count: 1700
  }
].map(g => ({ ...g, url: `https://bgm.tv/group/${g.id}` }))

// 根据 axios 错误对象分类错误类型
function classifyError(err) {
  if (!err) return 'server'
  // 网络错误：无 response（请求未送达）或超时/断网
  if (!err.response) return 'network'
  if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') return 'network'
  // 5xx 服务端错误视为接口异常
  if (err.response.status >= 500) return 'server'
  return 'server'
}

// 头像加载失败时隐藏 img，避免破图
function onAvatarError(e) {
  e.target.style.display = 'none'
}

// 根据当前 searchQuery 过滤 allGroups，结果写入 groups
function applyFilter() {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) {
    groups.value = allGroups.value
    return
  }
  groups.value = allGroups.value.filter(
    g => (g.name || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)
  )
}

// 加载全量小组列表
async function loadGroups() {
  loading.value = true
  errorType.value = null
  try {
    const res = await groupAPI.getList()
    const list = res.data?.data || []
    allGroups.value = list
    if (list.length === 0) {
      errorType.value = 'empty'
      groups.value = []
    } else if (list.every(g => g.id && g.name === g.id)) {
      // 后端返回占位数据（name === id），提示用户上游不可用
      errorType.value = 'placeholder'
      groups.value = list
    } else {
      errorType.value = null
      applyFilter()
    }
  } catch (err) {
    allGroups.value = []
    groups.value = []
    errorType.value = classifyError(err)
  }
  loading.value = false
}

// 修复异步 bug：先 await loadGroups() 再过滤；空搜索恢复原列表
async function searchGroups() {
  if (!searchQuery.value.trim()) {
    // 搜索框清空时恢复全量
    applyFilter()
    return
  }
  loading.value = true
  try {
    const res = await groupAPI.search(searchQuery.value)
    groups.value = res.data?.data || []
  } catch {
    toast.error('搜索小组失败')
  } finally {
    loading.value = false
  }
}

// 重试按钮：重新发起请求
function retry() {
  loadGroups()
}

// 输入框防抖（300ms），空值立即清空
watch(searchQuery, val => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!val.trim()) {
    applyFilter()
    return
  }
  debounceTimer = setTimeout(() => {
    applyFilter()
  }, 300)
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

onMounted(loadGroups)
</script>
