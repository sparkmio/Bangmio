<template>
  <div class="container mx-auto px-4 py-6 max-w-4xl">
    <!-- 加载中：骨架屏 -->
    <div v-if="loading" class="space-y-6">
      <div class="bg-base-100 rounded-lg p-6 border border-base-300">
        <div class="skeleton h-8 w-1/3 mb-3" />
        <div class="skeleton h-4 w-2/3" />
      </div>
      <div class="bg-base-100 rounded-lg p-6 border border-base-300 space-y-3">
        <div class="skeleton h-5 w-1/4 mb-2" />
        <div v-for="n in 6" :key="n" class="space-y-2 pb-3 border-b border-base-200 last:border-0">
          <div class="skeleton h-4 w-1/2" />
          <div class="skeleton h-3 w-1/3" />
        </div>
      </div>
    </div>

    <!-- 数据展示 -->
    <div v-else-if="group">
      <!-- 小组基本信息 -->
      <div class="bg-base-100 rounded-xl p-6 shadow-card mb-6 border border-base-300">
        <div class="flex items-center gap-3 mb-2 flex-wrap">
          <h1 class="text-2xl font-bold">
            {{ group.name }}
          </h1>
          <!-- 成员数 badge -->
          <span
            v-if="group.member_count != null || group.members != null"
            class="badge badge-primary badge-outline"
          >
            {{ group.member_count ?? group.members }} 成员
          </span>
        </div>
        <p class="text-sm text-base-content/70">
          {{ group.description || '暂无简介' }}
        </p>
      </div>

      <!-- 最近话题 -->
      <div class="bg-base-100 rounded-xl p-6 shadow-card border border-base-300">
        <h2 class="text-lg font-semibold mb-4">最近话题</h2>
        <div v-if="group.topics?.length" class="space-y-1">
          <a
            v-for="t in group.topics"
            :key="t.id"
            :href="`https://bangumi.lol/group/topic/${t.id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="block p-3 hover:bg-base-200 rounded-lg transition-colors group"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-base-content group-hover:text-primary font-medium truncate">{{
                t.title
              }}</span>
              <div class="flex items-center gap-2 shrink-0">
                <!-- 回复数 -->
                <span v-if="getReplies(t) != null" class="badge badge-sm badge-ghost">
                  {{ getReplies(t) }} 回复
                </span>
                <!-- 跳转箭头 -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 text-base-content/30 group-hover:text-primary transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
            <div class="flex items-center gap-3 mt-1 text-xs text-base-content/50">
              <!-- 作者 -->
              <span v-if="getAuthor(t)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-3 h-3 inline -mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {{ getAuthor(t) }}
              </span>
              <!-- 最后回复时间 -->
              <span v-if="getLastReply(t)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-3 h-3 inline -mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {{ getLastReply(t) }}
              </span>
            </div>
          </a>
        </div>
        <div v-else class="py-10 text-center text-base-content/40 text-sm">
          <p>暂无抓取到话题</p>
          <a :href="group.url" target="_blank" class="btn btn-sm btn-ghost mt-2"
            >前往 Bangumi 查看原小组 →</a
          >
        </div>
      </div>
    </div>

    <!-- 错误状态：分类提示 + 重试 -->
    <div v-else class="py-20 text-center">
      <!-- 小组不存在或已被删除 -->
      <template v-if="errorType === 'notfound'">
        <p class="text-base-content/60 mb-4">小组不存在或已被删除</p>
        <div class="flex items-center justify-center gap-3">
          <button class="btn btn-sm btn-primary" @click="retry">重试</button>
          <a
            :href="`https://bgm.tv/group/${route.params.id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm btn-ghost"
            >前往 Bangumi 查看</a
          >
        </div>
      </template>
      <!-- 网络错误 -->
      <template v-else-if="errorType === 'network'">
        <p class="text-base-content/60 mb-4">网络连接失败，请检查网络</p>
        <button class="btn btn-sm btn-primary" @click="retry">重试</button>
      </template>
      <!-- 接口异常 -->
      <template v-else>
        <p class="text-base-content/60 mb-4">服务暂不可用，请稍后再试</p>
        <div class="flex items-center justify-center gap-3">
          <button class="btn btn-sm btn-primary" @click="retry">重试</button>
          <a
            :href="`https://bgm.tv/group/${route.params.id}`"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm btn-ghost"
            >前往 Bangumi 查看</a
          >
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { groupAPI } from '../api/endpoints'

const route = useRoute()
const group = ref(null)
const loading = ref(true)
// 错误分类: null | 'network' | 'server' | 'notfound'
const errorType = ref(null)

// 根据 axios 错误对象分类错误类型
function classifyError(err) {
  if (!err) return 'server'
  // 404 视为小组不存在
  if (err.response?.status === 404) return 'notfound'
  // 网络错误：无 response（请求未送达）或超时/断网
  if (!err.response) return 'network'
  if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') return 'network'
  // 5xx 及其他视为接口异常
  return 'server'
}

// 判断后端返回的数据是否为「空数据/占位」：name === id 表示后端未能解析出真实小组名
function isEmptyGroup(data) {
  if (!data) return true
  if (data.name && data.id && data.name === data.id) return true
  return false
}

// 兼容多种字段命名，提取话题作者
function getAuthor(t) {
  if (!t) return ''
  if (typeof t.author === 'string') return t.author
  if (t.author?.username) return t.author.username
  if (t.author?.name) return t.author.name
  if (t.username) return t.username
  if (t.user?.username) return t.user.username
  if (t.user?.name) return t.user.name
  return ''
}

// 兼容多种字段命名，提取回复数
function getReplies(t) {
  if (!t) return null
  if (t.replies != null) return t.replies
  if (t.reply_count != null) return t.reply_count
  if (t.posts != null) return t.posts
  return null
}

// 兼容多种字段命名，提取最后回复时间，能解析则格式化
function getLastReply(t) {
  if (!t) return ''
  const raw = t.lastpost || t.last_reply_at || t.updated_at || t.last_reply || t.timestamp
  if (!raw) return ''
  // 尝试解析并格式化，失败则原样返回
  const d = new Date(raw)
  if (isNaN(d.getTime())) return String(raw)
  // YYYY-MM-DD HH:mm
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadGroup() {
  loading.value = true
  errorType.value = null
  try {
    const res = await groupAPI.getDetail(route.params.id)
    const data = res.data?.data || null
    // 后端返回占位数据（name === id）视为小组不存在
    if (isEmptyGroup(data)) {
      group.value = null
      errorType.value = 'notfound'
    } else {
      group.value = data
    }
  } catch (err) {
    group.value = null
    errorType.value = classifyError(err)
  }
  loading.value = false
}

// 重试按钮：重新发起请求
function retry() {
  loadGroup()
}

onMounted(loadGroup)
</script>
