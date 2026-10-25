<template>
  <div class="container mx-auto max-w-4xl px-4 py-6">
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" @click="$router.back()">← 返回</button>
      <router-link to="/groups" class="text-sm text-primary hover:underline">小组首页</router-link>
    </div>

    <div v-if="loading" class="space-y-4">
      <div class="card bg-base-100 border border-base-300 p-6 space-y-3">
        <div class="skeleton h-7 w-2/3" />
        <div class="skeleton h-4 w-1/3" />
      </div>
      <div v-for="n in 4" :key="n" class="card bg-base-100 border border-base-300 p-5 space-y-2">
        <div class="skeleton h-4 w-1/4" />
        <div class="skeleton h-16 w-full" />
      </div>
    </div>

    <div v-else-if="topic" class="space-y-5">
      <header class="card bg-base-100 border border-base-300">
        <div class="card-body p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h1 class="text-xl font-bold leading-relaxed break-words">{{ topic.title }}</h1>
              <div
                class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/55"
              >
                <router-link
                  v-if="topic.group_id"
                  :to="`/group/${topic.group_id}`"
                  class="text-primary hover:underline"
                  >{{ topic.group_name || '所属小组' }}</router-link
                >
                <span v-if="topicAuthor">{{ topicAuthor }}</span>
              </div>
            </div>
            <span class="badge badge-primary badge-outline whitespace-nowrap">
              {{ replyLabel(topic.reply_count) }}
            </span>
          </div>
        </div>
      </header>

      <section class="card bg-base-100 border border-base-300 overflow-hidden">
        <div class="px-5 py-4 border-b border-base-300">
          <h2 class="font-semibold">
            帖子内容
            <span class="text-sm font-normal text-base-content/50"
              >（{{ postRows.length }} 楼）</span
            >
          </h2>
        </div>
        <div v-if="postRows.length" class="divide-y divide-base-300">
          <article v-for="(post, index) in postRows" :key="post.id || `post-${index}`" class="p-5">
            <div class="flex items-start gap-3">
              <div class="avatar placeholder shrink-0">
                <div class="w-10 h-10 rounded-full bg-primary text-primary-content overflow-hidden">
                  <img
                    v-if="postProfile(post).avatar"
                    v-image-placeholder
                    :src="postProfile(post).avatar"
                    :alt="postName(post)"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else>{{ postName(post).slice(0, 1).toUpperCase() || '?' }}</span>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap text-sm mb-2">
                  <a
                    v-if="profileUrl(postProfile(post))"
                    :href="profileUrl(postProfile(post))"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-medium text-base-content hover:text-primary hover:underline"
                    >{{ postName(post) }}</a
                  >
                  <span v-else class="font-medium text-base-content">{{ postName(post) }}</span>
                  <span v-if="post.timestamp" class="text-xs text-base-content/50">{{
                    post.timestamp
                  }}</span>
                  <span class="ml-auto badge badge-xs">#{{ post.floor || index + 1 }}</span>
                </div>
                <RichText
                  :value="post.content"
                  fallback="暂无内容。"
                  class="text-base-content/80"
                />
              </div>
            </div>
          </article>
        </div>
        <div v-else class="p-8 text-center text-sm text-base-content/55">
          帖子标题已在 Bangmio 内打开，但暂时无法解析正文。
        </div>
      </section>

      <section class="card bg-base-100 border border-base-300">
        <div class="card-body p-5">
          <template v-if="canPost">
            <div class="flex items-center justify-between gap-3 mb-3">
              <h2 class="font-semibold">回复帖子</h2>
              <span class="text-xs text-base-content/50">支持换行和链接</span>
            </div>
            <form class="space-y-3" @submit.prevent="submitReply">
              <textarea
                v-model="newReply"
                class="textarea textarea-bordered w-full min-h-28 leading-7"
                maxlength="20000"
                placeholder="写下你的回复..."
                :disabled="sending"
              />
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="sending || !newReply.trim()"
                >
                  <span v-if="sending" class="loading loading-spinner loading-sm" />
                  {{ sending ? '发送中...' : '发送回复' }}
                </button>
              </div>
            </form>
          </template>
          <template v-else-if="auth.isAuthenticated">
            <p class="text-sm text-base-content/65">请先绑定 Bangumi 账号后再发言。</p>
            <button class="btn btn-sm btn-primary mt-3" @click="auth.setShowBindModal(true)">
              去绑定
            </button>
          </template>
          <template v-else>
            <p class="text-sm text-base-content/65">登录并绑定 Bangumi 账号后即可参与讨论。</p>
            <router-link
              class="btn btn-sm btn-primary mt-3 w-fit"
              :to="{ path: '/login', query: { redirect: route.fullPath } }"
              >去登录</router-link
            >
          </template>
        </div>
      </section>
    </div>

    <div v-else class="py-20 text-center">
      <p class="text-base-content/60 mb-4">帖子暂时无法加载，请稍后重试。</p>
      <button class="btn btn-primary btn-sm" @click="loadTopic">重试</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { groupAPI } from '../api/endpoints'
import RichText from '../components/RichText.vue'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()
const topic = ref(null)
const loading = ref(true)
const newReply = ref('')
const sending = ref(false)

function safeCount(count) {
  if (count === null || count === undefined) return null
  const text = String(count).trim()
  if (!text) return null
  const value = Number(text.replaceAll(',', ''))
  return Number.isFinite(value) && value >= 0 ? value : null
}

function replyLabel(count) {
  const value = safeCount(count)
  return value === null ? '回复数暂不可用' : `${value.toLocaleString()} 回复`
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

function avatarValue(value) {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object') return ''
  return String(value.large || value.medium || value.small || '').trim()
}

function profileFields(candidate) {
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    const value = String(candidate).trim()
    return { nickname: value, username: value, avatar: '', url: '' }
  }
  if (!candidate || typeof candidate !== 'object')
    return { nickname: '', username: '', avatar: '', url: '' }
  return {
    nickname: String(
      candidate.nickname || candidate.name || candidate.display_name || candidate.author || ''
    ).trim(),
    username: String(candidate.username || '').trim(),
    avatar: avatarValue(candidate.avatar),
    url: String(candidate.url || '').trim()
  }
}

function profileScore(fields, index) {
  const name = usefulName(fields.nickname)
  const username = usefulName(fields.username)
  return (
    (name ? 8 : 0) +
    (username ? 5 : 0) +
    (fields.avatar ? 3 : 0) +
    (fields.url ? 2 : 0) -
    index / 100
  )
}

function postProfile(post) {
  const candidates = [
    post?.user,
    post?.creator,
    typeof post?.author === 'object' ? post.author : post?.author,
    post
  ]
  const selected = candidates
    .map((candidate, index) => ({ fields: profileFields(candidate), index }))
    .filter(({ fields }) => fields.nickname || fields.username || fields.avatar || fields.url)
    .sort(
      (left, right) =>
        profileScore(right.fields, right.index) - profileScore(left.fields, left.index)
    )[0]
  const profile = selected?.fields || profileFields(post)
  return {
    username: usefulName(profile.username) || usefulName(post?.username),
    nickname:
      usefulName(profile.nickname) || usefulName(profile.username) || usefulName(post?.nickname),
    avatar: profile.avatar || avatarValue(post?.avatar),
    url: profile.url || String(post?.url || '').trim()
  }
}

function postName(post) {
  const profile = postProfile(post)
  return (
    usefulName(profile.nickname) ||
    usefulName(profile.username) ||
    usefulName(post?.author) ||
    '用户信息不可用'
  )
}

function profileUrl(profile) {
  const raw = String(profile?.url || '').trim()
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return `https://bgm.tv${raw}`
  return ''
}

const postRows = computed(() => (Array.isArray(topic.value?.replies) ? topic.value.replies : []))
const topicAuthor = computed(() => {
  const first = postRows.value[0]
  return first ? postName(first) : postName(topic.value)
})
const canPost = computed(() => auth.isAuthenticated && auth.isBound)

async function loadTopic() {
  loading.value = true
  try {
    const response = await groupAPI.getTopicDetail(route.params.id)
    topic.value = response.data?.data || null
  } catch {
    topic.value = null
  } finally {
    loading.value = false
  }
}

async function submitReply() {
  const content = newReply.value.trim()
  if (!content || !canPost.value || sending.value) return
  sending.value = true
  try {
    await groupAPI.postReply(route.params.id, { content })
    newReply.value = ''
    toast.success('回复成功')
    await loadTopic()
  } catch (error) {
    toast.error(error.response?.data?.error || '发送失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

watch(() => route.params.id, loadTopic)
onMounted(loadTopic)
</script>
