<template>
  <div class="container mx-auto px-4 py-6 max-w-5xl">
    <div class="flex items-center justify-between mb-8 gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">小组</h1>
        <p class="text-sm text-base-content/50 mt-1">先看你关注的小组，再看看全站正在讨论什么。</p>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="搜索小组..."
          class="input input-sm input-bordered w-48"
          @keyup.enter="searchGroups"
        />
        <button class="btn btn-sm btn-primary" :disabled="searchLoading" @click="searchGroups">
          {{ searchLoading ? '搜索中' : '搜索' }}
        </button>
      </div>
    </div>

    <section v-if="isSearching" aria-labelledby="group-search-heading">
      <div class="flex items-center justify-between mb-4">
        <h2 id="group-search-heading" class="text-lg font-bold">搜索结果</h2>
        <button class="btn btn-xs btn-ghost" @click="clearSearch">返回小组首页</button>
      </div>
      <div v-if="searchLoading" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div v-for="n in 6" :key="n" class="h-24 rounded-xl skeleton" />
      </div>
      <div v-else-if="searchResults.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <router-link
          v-for="group in searchResults"
          :key="group.id"
          :to="`/group/${group.id}`"
          class="card bg-base-100 border border-base-300 hover:shadow-hover transition-shadow"
        >
          <div class="card-body p-4">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-full overflow-hidden bg-base-200 shrink-0">
                <img
                  v-if="group.avatar || group.icon"
                  v-image-placeholder
                  :src="group.avatar || group.icon"
                  :alt="group.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  @error="onAvatarError($event)"
                />
              </div>
              <div class="min-w-0">
                <p class="font-semibold truncate">{{ group.name }}</p>
                <p class="text-xs text-base-content/50 mt-1">
                  {{ memberLabel(group.member_count) }} · {{ group.description || '暂无简介' }}
                </p>
              </div>
            </div>
          </div>
        </router-link>
      </div>
      <div v-else class="py-16 text-center text-base-content/50">
        {{ searchError ? '搜索小组失败，请稍后重试' : '未找到匹配的小组' }}
      </div>
    </section>

    <template v-else>
      <!-- 登录用户自己的小组始终置顶，避免默认列表掩盖个人内容。 -->
      <section class="mb-8" aria-labelledby="followed-groups-heading">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 id="followed-groups-heading" class="text-lg font-bold">我关注的小组</h2>
            <p v-if="currentUsername" class="text-xs text-base-content/50 mt-1">
              {{ currentUsername }} 参加的小组 · 成员数来自小组详情页
            </p>
          </div>
          <button
            class="btn btn-xs btn-ghost"
            :disabled="followedLoading"
            @click="loadFollowedGroups"
          >
            刷新
          </button>
        </div>

        <div v-if="followedLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="n in 3" :key="n" class="h-24 rounded-xl skeleton" />
        </div>
        <div
          v-else-if="followedGroups.length"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          <router-link
            v-for="group in followedGroups"
            :key="group.id"
            :to="`/group/${group.id}`"
            class="card bg-base-100 border border-primary/20 hover:border-primary/50 hover:shadow-hover transition-all"
          >
            <div class="card-body p-4">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-full overflow-hidden bg-base-200 shrink-0">
                  <img
                    v-if="group.avatar"
                    v-image-placeholder
                    :src="group.avatar"
                    :alt="group.name"
                    class="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    @error="onAvatarError($event)"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-base-content/40"
                  >
                    {{ group.name?.[0] || '?' }}
                  </div>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ group.name }}</p>
                  <p class="text-xs text-base-content/50 mt-1">
                    {{ memberLabel(group.member_count) }}
                  </p>
                </div>
              </div>
            </div>
          </router-link>
        </div>
        <div
          v-else
          class="rounded-xl border border-dashed border-base-300 bg-base-100/60 p-5 text-sm text-base-content/60"
        >
          <template v-if="!isAuthenticated">
            登录并绑定 Bangumi 账号后，这里会显示你关注的小组。
            <router-link
              :to="{ path: '/login', query: { redirect: '/groups' } }"
              class="text-primary hover:underline ml-1"
            >
              去登录
            </router-link>
          </template>
          <template v-else-if="!currentUsername">
            绑定 Bangumi 账号后，才能读取你关注的小组。
            <router-link to="/bind-bangumi" class="text-primary hover:underline ml-1"
              >去绑定</router-link
            >
          </template>
          <template v-else>
            {{ followedError ? '关注的小组暂时加载失败，请刷新重试。' : '暂未找到你关注的小组。' }}
          </template>
        </div>
      </section>

      <!-- 每个已加入小组独立展示热门话题，避免把个人内容混进全站话题流。 -->
      <section
        v-if="followedGroups.length"
        class="space-y-6 mb-10"
        aria-labelledby="followed-group-topics-heading"
      >
        <div>
          <h2 id="followed-group-topics-heading" class="text-lg font-bold">我加入的小组热门话题</h2>
          <p class="text-xs text-base-content/50 mt-1">每个小组单独展示，按回复数排序。</p>
        </div>
        <article
          v-for="group in followedGroups"
          :key="`topics-${group.id}`"
          class="card bg-base-100 border border-base-300 overflow-hidden"
        >
          <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-base-300">
            <h3 class="font-semibold truncate">{{ group.name }}</h3>
            <router-link
              :to="`/group/${group.id}`"
              class="text-xs text-primary hover:underline shrink-0"
            >
              查看小组
            </router-link>
          </div>
          <div v-if="group.topics?.length" class="divide-y divide-base-300">
            <router-link
              v-for="topic in group.topics"
              :key="`${group.id}-${topic.id}`"
              :to="`/group/topic/${topic.id}`"
              class="p-4 flex items-start gap-3 hover:bg-base-200/60 transition-colors"
            >
              <div class="min-w-0 flex-1">
                <p class="font-medium line-clamp-1">{{ topic.title }}</p>
                <div
                  class="mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-base-content/50"
                >
                  <span v-if="topic.author">{{ topic.author }}</span>
                  <span v-if="topic.last_reply_time">{{ topic.last_reply_time }}</span>
                </div>
              </div>
              <span class="badge badge-sm badge-primary badge-outline whitespace-nowrap">
                {{ topic.reply_count || 0 }} 回复
              </span>
            </router-link>
          </div>
          <div v-else class="p-5 text-sm text-base-content/50">
            暂时没有读取到这个小组的热门话题。
          </div>
        </article>
      </section>

      <!-- 取自 Bangumi 小组发现页，按回复数排序后展示。 -->
      <section class="mb-10" aria-labelledby="hot-topics-heading">
        <div class="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 id="hot-topics-heading" class="text-lg font-bold">所有小组的热门帖子</h2>
            <p class="text-xs text-base-content/50 mt-1">
              来自 Bangumi 小组发现页，按当前回复数排序。
            </p>
          </div>
          <button class="btn btn-xs btn-ghost" :disabled="topicsLoading" @click="loadHotTopics">
            刷新
          </button>
        </div>
        <div class="card bg-base-100 border border-base-300 overflow-hidden">
          <div v-if="topicsLoading" class="p-4 space-y-3">
            <div v-for="n in 6" :key="n" class="h-12 skeleton rounded-lg" />
          </div>
          <div v-else-if="hotTopics.length" class="divide-y divide-base-300">
            <router-link
              v-for="topic in hotTopics"
              :key="topic.id"
              :to="`/group/topic/${topic.id}`"
              class="p-4 flex items-start gap-3 hover:bg-base-200/60 transition-colors"
            >
              <div class="min-w-0 flex-1">
                <p class="font-medium line-clamp-1">{{ topic.title }}</p>
                <div
                  class="mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-base-content/50"
                >
                  <span v-if="topic.group_id" class="text-base-content/50">
                    {{ topic.group_name || '小组' }}
                  </span>
                  <span v-if="topic.author">{{ topic.author }}</span>
                  <span v-if="topic.last_reply_time">{{ topic.last_reply_time }}</span>
                </div>
              </div>
              <span class="badge badge-sm badge-primary badge-outline whitespace-nowrap">
                {{ topic.reply_count || 0 }} 回复
              </span>
            </router-link>
          </div>
          <div v-else class="p-8 text-center text-sm text-base-content/50">
            {{ topicsDegraded ? '热门帖子暂时无法获取，请稍后刷新。' : '暂无热门帖子。' }}
          </div>
        </div>
      </section>
      <!-- 所有小组保留在最后，作为探索入口而不是首屏内容。 -->
      <section aria-labelledby="all-groups-heading">
        <div class="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 id="all-groups-heading" class="text-lg font-bold">全部小组</h2>
            <p class="text-xs text-base-content/50 mt-1">继续探索其他小组。</p>
          </div>
          <button class="btn btn-xs btn-ghost" :disabled="allGroupsLoading" @click="loadAllGroups">
            刷新
          </button>
        </div>
        <div v-if="allGroupsLoading" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="n in 8" :key="n" class="h-24 rounded-xl skeleton" />
        </div>
        <div v-else-if="allGroups.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <router-link
            v-for="group in allGroups"
            :key="group.id"
            :to="`/group/${group.id}`"
            class="card bg-base-100 border border-base-300 hover:shadow-hover transition-shadow"
          >
            <div class="card-body p-4">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-full overflow-hidden bg-base-200 shrink-0">
                  <img
                    v-if="group.avatar || group.icon"
                    v-image-placeholder
                    :src="group.avatar || group.icon"
                    :alt="group.name"
                    class="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    @error="onAvatarError($event)"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-base-content/40"
                  >
                    {{ group.name?.[0] || '?' }}
                  </div>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ group.name }}</p>
                  <p class="text-xs text-base-content/50 mt-1 line-clamp-1">
                    {{ memberLabel(group.member_count) }} · {{ group.description || '暂无简介' }}
                  </p>
                </div>
              </div>
            </div>
          </router-link>
        </div>
        <div
          v-else
          class="rounded-xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/50"
        >
          {{ allGroupsDegraded ? '全部小组暂时无法获取，请稍后刷新。' : '暂无小组数据。' }}
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { groupAPI, userAPI } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const followedGroups = ref([])
const hotTopics = ref([])
const allGroups = ref([])
const searchResults = ref([])
const searchQuery = ref('')
const followedLoading = ref(false)
const topicsLoading = ref(false)
const allGroupsLoading = ref(false)
const searchLoading = ref(false)
const followedError = ref(false)
const topicsDegraded = ref(false)
const allGroupsDegraded = ref(false)
const searchError = ref(false)
let searchTimer = null

const currentUsername = computed(() => auth.effectiveUser?.username || '')
const isAuthenticated = computed(() => auth.isAuthenticated)
const isSearching = computed(() => searchQuery.value.trim().length > 0)

function onAvatarError(event) {
  event.target.style.display = 'none'
}

function memberLabel(count) {
  const value = Number(count)
  return Number.isFinite(value) && value > 0 ? `${value.toLocaleString()} 成员` : '成员数暂不可用'
}

async function loadFollowedGroups() {
  const username = currentUsername.value
  followedError.value = false
  if (!username) {
    followedGroups.value = []
    return
  }

  followedLoading.value = true
  try {
    const response = await userAPI.getGroups(username)
    const groups = response.data?.data || []
    // 用户小组页通常只有小组链接和头像，不带成员数/话题数据。
    // 逐个读取小组详情，用同一份真实数据补齐成员数和热门话题。
    followedGroups.value = await Promise.all(
      groups.map(async group => {
        try {
          const detailResponse = await groupAPI.getDetail(group.id)
          const detail = detailResponse.data?.data
          const topics = (detail?.topics || [])
            .slice()
            .sort((a, b) => Number(b.reply_count || 0) - Number(a.reply_count || 0))
            .slice(0, 8)
          return {
            ...group,
            member_count:
              Number(detail?.member_count) > 0 ? detail.member_count : group.member_count,
            avatar: detail?.avatar || group.avatar,
            topics
          }
        } catch {
          return { ...group, topics: [] }
        }
      })
    )
  } catch {
    followedGroups.value = []
    followedError.value = true
  } finally {
    followedLoading.value = false
  }
}

async function loadHotTopics() {
  topicsLoading.value = true
  topicsDegraded.value = false
  try {
    const response = await groupAPI.getDiscover()
    hotTopics.value = response.data?.data || []
    topicsDegraded.value = response.data?.degraded === true
  } catch {
    hotTopics.value = []
    topicsDegraded.value = true
  } finally {
    topicsLoading.value = false
  }
}

async function loadAllGroups() {
  allGroupsLoading.value = true
  allGroupsDegraded.value = false
  try {
    const response = await groupAPI.getList()
    allGroups.value = response.data?.data || []
    allGroupsDegraded.value = response.data?.degraded === true
  } catch {
    allGroups.value = []
    allGroupsDegraded.value = true
  } finally {
    allGroupsLoading.value = false
  }
}

async function searchGroups() {
  const keyword = searchQuery.value.trim()
  if (!keyword) {
    searchResults.value = []
    searchError.value = false
    return
  }

  searchLoading.value = true
  searchError.value = false
  try {
    const response = await groupAPI.search(keyword)
    searchResults.value = response.data?.data || []
  } catch {
    searchResults.value = []
    searchError.value = true
  } finally {
    searchLoading.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  searchError.value = false
}

watch(searchQuery, value => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!value.trim()) {
    searchResults.value = []
    searchError.value = false
    return
  }
  searchTimer = setTimeout(searchGroups, 300)
})

watch(currentUsername, loadFollowedGroups)

onMounted(() => {
  loadFollowedGroups()
  loadHotTopics()
  loadAllGroups()
})
</script>
