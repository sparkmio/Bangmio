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
            {{ memberLabel(group.member_count ?? group.members) }}
          </span>
          <span
            v-if="hasCountField(group, 'topic_count', 'topics_count', 'topics')"
            class="badge badge-ghost"
          >
            {{ topicLabel(group.topic_count ?? group.topics_count ?? group.topics) }}
          </span>
        </div>
        <p class="text-sm text-base-content/70">
          {{ group.description || '暂无简介' }}
        </p>
      </div>

      <!-- 发起话题 -->
      <div class="bg-base-100 rounded-xl p-6 shadow-card mb-6 border border-base-300">
        <template v-if="auth.isAuthenticated && auth.isBound">
          <div class="flex items-center justify-between gap-3 mb-3">
            <h2 class="text-lg font-semibold">发起新话题</h2>
            <span class="text-xs text-base-content/50">支持换行和链接</span>
          </div>
          <form class="space-y-3" @submit.prevent="submitTopic">
            <input
              v-model="newTopicTitle"
              type="text"
              maxlength="120"
              class="input input-bordered w-full"
              placeholder="话题标题"
              :disabled="sending"
            />
            <textarea
              v-model="newTopicContent"
              maxlength="20000"
              class="textarea textarea-bordered w-full min-h-28 leading-7"
              placeholder="写下话题内容..."
              :disabled="sending"
            />
            <div class="flex justify-end">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="sending || !newTopicTitle.trim() || !newTopicContent.trim()"
              >
                <span v-if="sending" class="loading loading-spinner loading-sm" />
                {{ sending ? '发布中...' : '发布话题' }}
              </button>
            </div>
          </form>
        </template>
        <template v-else-if="auth.isAuthenticated">
          <p class="text-sm text-base-content/65">请先绑定 Bangumi 账号后再发起话题。</p>
          <button class="btn btn-sm btn-primary mt-3" @click="auth.setShowBindModal(true)">
            去绑定
          </button>
        </template>
        <template v-else>
          <p class="text-sm text-base-content/65">登录并绑定 Bangumi 账号后即可发起话题。</p>
          <router-link
            class="btn btn-sm btn-primary mt-3 w-fit"
            :to="{ path: '/login', query: { redirect: route.fullPath } }"
            >去登录</router-link
          >
        </template>
      </div>

      <!-- 最近话题 -->
      <div class="bg-base-100 rounded-xl p-6 shadow-card border border-base-300">
        <h2 class="text-lg font-semibold mb-4">最近话题</h2>
        <div v-if="group.topics?.length" class="space-y-1">
          <router-link
            v-for="t in group.topics"
            :key="t.id"
            :to="`/group/topic/${t.id}`"
            class="block p-3 hover:bg-base-200 rounded-lg transition-colors group"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-base-content group-hover:text-primary font-medium truncate">{{
                t.title
              }}</span>
              <div class="flex items-center gap-2 shrink-0">
                <!-- 回复数 -->
                <span
                  v-if="hasCountField(t, 'replies', 'reply_count', 'posts')"
                  class="badge badge-sm badge-ghost"
                >
                  {{ replyLabel(getReplies(t)) }}
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
          </router-link>
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
      <!-- 占位数据：上游暂不可用 -->
      <template v-else-if="errorType === 'placeholder'">
        <p class="text-base-content/60 mb-2">小组信息暂不可用</p>
        <p class="text-sm text-base-content/50 mb-4">
          Bangumi 上游数据暂时无法获取，请稍后重试或前往原站查看。
        </p>
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
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const route = useRoute()
const group = ref(null)
const loading = ref(true)
// 是否为兜底降级数据（后端返回 degraded: true 时置位）
const degraded = ref(false)
// 错误分类: null | 'network' | 'server' | 'notfound' | 'placeholder'
const errorType = ref(null)
const auth = useAuthStore()
const toast = useToastStore()
const newTopicTitle = ref('')
const newTopicContent = ref('')
const sending = ref(false)

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

function safeCount(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text) return null
  const count = Number(text.replaceAll(',', ''))
  return Number.isFinite(count) && count >= 0 ? count : null
}

function hasCountField(value, ...keys) {
  return Boolean(value && keys.some(key => value[key] !== undefined && value[key] !== null))
}

function memberLabel(value) {
  const count = safeCount(value)
  return count === null ? '成员数暂不可用' : count.toLocaleString() + ' 成员'
}

function topicLabel(value) {
  const count = safeCount(Array.isArray(value) ? value.length : value)
  return count === null ? '话题数暂不可用' : count.toLocaleString() + ' 话题'
}

function replyLabel(value) {
  const count = safeCount(value)
  return count === null ? '回复数暂不可用' : `${count.toLocaleString()} 回复`
}

const GENERIC_NAMES = new Set([
  '社区成员',
  '社区用户',
  '用户',
  '匿名用户',
  '匿名',
  'unknown',
  'user'
])

function usefulName(value) {
  const name = String(value || '').trim()
  return name && !GENERIC_NAMES.has(name.toLocaleLowerCase()) ? name : ''
}

// 兼容多种字段命名，优先真实昵称，再回退到用户名；占位昵称不能覆盖真实资料。
function getAuthor(t) {
  if (!t) return ''
  const candidates = [t.user, t.creator, typeof t.author === 'object' ? t.author : t.author, t]
  const selected = candidates
    .map((candidate, index) => {
      if (typeof candidate === 'string' || typeof candidate === 'number') {
        const value = String(candidate).trim()
        return { name: value, username: value, score: usefulName(value) ? 8 : 0 - index / 100 }
      }
      const name = String(
        candidate?.nickname || candidate?.name || candidate?.display_name || ''
      ).trim()
      const username = String(candidate?.username || '').trim()
      return {
        name,
        username,
        score:
          (usefulName(name) ? 8 : 0) +
          (usefulName(username) ? 5 : 0) +
          (candidate?.avatar ? 3 : 0) +
          (candidate?.url ? 2 : 0) -
          index / 100
      }
    })
    .filter(candidate => candidate.name || candidate.username)
    .sort((left, right) => right.score - left.score)[0]
  return usefulName(selected?.name) || usefulName(selected?.username) || ''
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

async function submitTopic() {
  const title = newTopicTitle.value.trim()
  const content = newTopicContent.value.trim()
  if (!title || !content || sending.value || !auth.isAuthenticated || !auth.isBound) return
  sending.value = true
  try {
    await groupAPI.postTopic(route.params.id, { title, content })
    newTopicTitle.value = ''
    newTopicContent.value = ''
    toast.success('话题发布成功')
    await loadGroup()
  } catch (error) {
    toast.error(error.response?.data?.error || '发布失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

async function loadGroup() {
  loading.value = true
  errorType.value = null
  degraded.value = false
  try {
    const res = await groupAPI.getDetail(route.params.id)
    const data = res.data?.data || null
    degraded.value = res.data?.degraded === true
    if (!data) {
      group.value = null
      errorType.value = 'notfound'
    } else if (degraded.value || isEmptyGroup(data)) {
      // 后端返回降级标识或占位数据（name === id），说明上游暂不可用
      group.value = null
      errorType.value = 'placeholder'
    } else {
      group.value = data
    }
  } catch (err) {
    group.value = null
    degraded.value = false
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
