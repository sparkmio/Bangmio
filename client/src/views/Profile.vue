<template>
  <div class="max-w-none lg:max-w-[900px] lg:ml-[240px] lg:mr-auto">
    <!-- 未登录且未指定用户名时提示 -->
    <div v-if="!auth.isLoggedIn && !route.params.username" class="py-20 text-center">
      <p class="text-base-content/50 mb-3">请先登录</p>
      <router-link to="/login" class="btn btn-primary btn-sm"> 登录 Bangmio </router-link>
    </div>

    <div v-else>
      <!-- effectiveUser 为空时的加载/重试提示 -->
      <div v-if="!profileUser && !route.params.username" class="py-20 text-center">
        <div v-if="auth.bgmProfileLoading" class="flex flex-col items-center gap-3">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="text-base-content/50">正在获取 Bangumi 资料...</p>
        </div>
        <div v-else>
          <p class="text-base-content/50 mb-3">用户资料加载失败</p>
          <button class="btn btn-primary btn-sm" @click="retryLoadProfile">重试</button>
        </div>
      </div>
      <!-- 用户卡 -->
      <div
        v-if="profileUser || route.params.username"
        class="card bg-base-100 border border-base-300 mb-4 overflow-hidden"
      >
        <div class="h-16 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/30" />
        <div class="card-body p-4 pt-0">
          <div class="flex flex-col sm:flex-row sm:items-end gap-3 -mt-8">
            <div class="avatar shrink-0">
              <div class="w-16 h-16 rounded-xl ring-4 ring-base-100 shadow-lg">
                <img
                  v-if="profileUser?.avatar?.large"
                  :src="profileUser.avatar.large"
                  :alt="profileUser?.nickname || profileUser?.username || ''"
                  decoding="async"
                />
                <div
                  v-else
                  class="w-16 h-16 rounded-xl bg-primary text-primary-content flex items-center justify-center text-2xl font-bold"
                >
                  {{
                    profileUser?.nickname?.[0] || profileUser?.username?.[0]?.toUpperCase() || '?'
                  }}
                </div>
              </div>
            </div>
            <div class="flex-1 min-w-0 pb-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-xl font-bold text-base-content">
                  {{ profileUser?.nickname || profileUser?.username }}
                </h1>
                <span v-if="profileUser?.user_group" class="badge badge-sm badge-outline">{{
                  profileUser.user_group
                }}</span>
              </div>
              <p class="text-sm text-base-content/50 mt-0.5">
                @{{ profileUser?.username }} · UID: {{ profileUser?.id }}
              </p>
              <p v-if="profileUser?.sign" class="text-sm mt-2 text-base-content/70 line-clamp-2">
                {{ profileUser.sign }}
              </p>
              <div class="flex gap-4 mt-2 text-xs text-base-content/40 flex-wrap items-center">
                <span v-if="profileUser?.join_date">加入于 {{ profileUser.join_date }}</span>
                <a
                  v-if="profileUser?.website"
                  :href="profileUser.website"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 link link-hover text-primary/70 hover:text-primary truncate max-w-[200px]"
                >
                  <svg
                    class="w-3 h-3 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  <span class="truncate">{{ profileUser.website }}</span>
                </a>
              </div>
              <p v-if="profileUser?.bio" class="text-sm mt-2 text-base-content/60 line-clamp-3">
                {{ profileUser.bio }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 顶部二级导航 -->
      <div class="card bg-base-100 border border-base-300 mb-4">
        <nav class="flex items-center px-2 py-1 overflow-x-auto">
          <button
            v-for="tab in navTabs"
            :key="tab.label"
            class="px-3 py-2 text-sm whitespace-nowrap transition-colors rounded-lg"
            :class="
              tab.label === '时光机'
                ? 'text-primary font-medium bg-primary/10'
                : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
            "
            @click="handleNavClick(tab)"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- 整体两栏布局 -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <!-- 左侧主栏：各媒介类型收藏（动画 / 游戏 / 书籍 / 音乐） -->
        <div id="collections" class="main-col space-y-4">
          <ProfileCollections
            v-for="(config, subjectType) in TYPE_CONFIG"
            :key="subjectType"
            :subject-type="subjectType"
            :label="config.label"
            :statuses="config.statuses"
            :status-counts="statusCounts"
            :grouped="groupedCollections"
          />
        </div>

        <!-- 右侧边栏 -->
        <div class="sidebar-col space-y-4">
          <!-- 我的时间胶囊 -->
          <ProfileTimelineCard :timeline="timeline" :username="currentUsername" />

          <!-- 统计面板（key 绑定用户名，切换用户时重置筛选） -->
          <ProfileStatsPanel :key="currentUsername" :collections="allCollectionsForStats" />

          <!-- 我的朋友 -->
          <div v-if="friends.length" id="friends" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-base-content/70">/ 我的朋友</h3>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/friends`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-base-content/40 hover:text-primary"
                  >...more</a
                >
              </div>
              <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
                <router-link
                  v-for="f in friends.slice(0, 12)"
                  :key="f.username"
                  :to="`/profile/${f.username}`"
                  class="block text-center group"
                >
                  <div
                    class="w-10 h-10 mx-auto rounded-full overflow-hidden bg-base-200 ring-2 ring-base-100 shadow-sm group-hover:ring-primary transition"
                  >
                    <img
                      v-if="f.avatar"
                      :src="f.avatar"
                      :alt="f.nickname"
                      class="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-lg font-bold text-base-content/50"
                    >
                      {{ f.nickname?.[0] || f.username?.[0]?.toUpperCase() || '?' }}
                    </div>
                  </div>
                  <p class="text-xs mt-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {{ f.nickname || f.username }}
                  </p>
                </router-link>
              </div>
            </div>
          </div>

          <!-- 我参加的小组 -->
          <div v-if="groups.length" id="groups" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-base-content/70">/ 我参加的小组</h3>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/groups`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-base-content/40 hover:text-primary"
                  >...more</a
                >
              </div>
              <div class="space-y-3">
                <router-link
                  v-for="g in groups.slice(0, 6)"
                  :key="g.id"
                  :to="`/group/${g.id}`"
                  class="flex items-center gap-3 group"
                >
                  <div
                    class="w-8 h-8 rounded-full overflow-hidden bg-base-200 shrink-0 ring-2 ring-base-100 group-hover:ring-primary transition"
                  >
                    <img
                      v-if="g.avatar"
                      :src="g.avatar"
                      :alt="g.name"
                      class="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-xs text-base-content/40"
                    >
                      {{ g.name?.[0] || '?' }}
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p
                      class="text-sm font-medium truncate group-hover:text-primary transition-colors"
                    >
                      {{ g.name }}
                    </p>
                    <p class="text-xs text-base-content/40">{{ g.member_count || 0 }} 成员</p>
                  </div>
                </router-link>
              </div>
            </div>
          </div>

          <!-- 我的目录 -->
          <div v-if="indexes.length" id="indexes" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-base-content/70">/ 我的目录</h3>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/index`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-base-content/40 hover:text-primary"
                  >...more</a
                >
              </div>
              <div class="space-y-2">
                <a
                  v-for="idx in indexes"
                  :key="idx.id"
                  :href="`https://bgm.tv/index/${idx.id}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block text-sm text-primary hover:underline line-clamp-1"
                >
                  {{ idx.title }}
                </a>
              </div>
            </div>
          </div>

          <!-- 我收藏的人物 -->
          <div
            v-if="characters.length || persons.length"
            id="characters"
            class="card bg-base-100 border border-base-300"
          >
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-base-content/70">/ 我收藏的人物</h3>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/mono`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-base-content/40 hover:text-primary"
                  >...more</a
                >
              </div>
              <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
                <router-link
                  v-for="char in characters.slice(0, 10)"
                  :key="'c-' + char.id"
                  :to="`/character/${char.id}`"
                  class="block text-center group"
                >
                  <div
                    class="w-14 h-14 mx-auto rounded overflow-hidden bg-base-200 shadow-sm group-hover:ring-2 group-hover:ring-primary transition"
                  >
                    <img
                      v-if="char.images?.medium"
                      :src="char.images.medium"
                      :alt="char.name"
                      class="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-xs text-base-content/50"
                    >
                      {{ char.name?.[0] || '?' }}
                    </div>
                  </div>
                  <p class="text-xs mt-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {{ char.name }}
                  </p>
                </router-link>
                <router-link
                  v-for="person in persons.slice(0, 10)"
                  :key="'p-' + person.id"
                  :to="`/person/${person.id}`"
                  class="block text-center group"
                >
                  <div
                    class="w-14 h-14 mx-auto rounded overflow-hidden bg-base-200 shadow-sm group-hover:ring-2 group-hover:ring-primary transition"
                  >
                    <img
                      v-if="person.images?.medium"
                      :src="person.images.medium"
                      :alt="person.name"
                      class="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-xs text-base-content/50"
                    >
                      {{ person.name?.[0] || '?' }}
                    </div>
                  </div>
                  <p class="text-xs mt-1 line-clamp-1 group-hover:text-primary transition-colors">
                    {{ person.name }}
                  </p>
                </router-link>
              </div>
            </div>
          </div>

          <!-- RSS2.0 / 我的维基编辑 -->
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center gap-4 text-sm">
                <a
                  :href="`https://bgm.tv/feed/user/${currentUsername}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"
                    />
                  </svg>
                  RSS2.0
                </a>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/wiki`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  我的维基编辑
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { collectionAPI, userAPI } from '../api/endpoints'
import { getStatusLabels } from '../utils/subjectType'
import ProfileCollections from '../components/profile/ProfileCollections.vue'
import ProfileTimelineCard from '../components/profile/ProfileTimelineCard.vue'
import ProfileStatsPanel from '../components/profile/ProfileStatsPanel.vue'

const route = useRoute()
const auth = useAuthStore()

// 当前查看的用户名
const currentUsername = computed(() => route.params.username || auth.effectiveUser?.username)

// 用户资料
const profileUser = ref(null)

// 按媒介类型存储的收藏数据
const collectionsByType = ref({
  2: [],
  4: [],
  1: [],
  3: []
})

// 用于统计面板的全部收藏
const allCollectionsForStats = ref([])

// 右侧边栏数据
const timeline = ref([])
const indexes = ref([])
const characters = ref([])
const persons = ref([])
const friends = ref([])
const groups = ref([])

// 媒介类型配置：顺序即左侧主栏展示顺序
// 状态用语通过 getStatusLabels 动态生成（Task 16）
// 注意：subjectType.js 中 labels.collect 对应「在看」（进行中），labels.do 对应「看过」（已完成）
// Bangumi collection type: 3=doing, 2=collected, 1=wish, 4=on_hold, 5=dropped
function buildStatuses(subjectType, shortList = false) {
  const labels = getStatusLabels(subjectType)
  const all = [
    { type: 3, label: labels.collect },
    { type: 2, label: labels.do },
    { type: 1, label: labels.wish },
    { type: 4, label: labels.on_hold },
    { type: 5, label: labels.dropped }
  ]
  return shortList ? all.slice(0, 3) : all
}

const TYPE_CONFIG = {
  2: { label: '动画', statuses: buildStatuses(2) },
  4: { label: '游戏', statuses: buildStatuses(4) },
  1: { label: '书籍', statuses: buildStatuses(1, true) },
  3: { label: '音乐', statuses: buildStatuses(3, true) }
}

// 顶部二级导航
const navTabs = [
  { label: '时光机', kind: 'active' },
  { label: '收藏', kind: 'anchor', target: '#collections' },
  { label: '时间胶囊', kind: 'anchor', target: '#timeline' },
  { label: '人物', kind: 'anchor', target: '#characters' },
  { label: '日志', kind: 'link', target: username => `https://bgm.tv/user/${username}/journal` },
  { label: '目录', kind: 'anchor', target: '#indexes' },
  { label: '小组', kind: 'anchor', target: '#groups' },
  { label: '好友', kind: 'anchor', target: '#friends' },
  { label: '维基', kind: 'link', target: username => `https://bgm.tv/user/${username}/wiki` },
  { label: '天窗', kind: 'link', target: username => `https://bgm.tv/user/${username}/doujin` }
]

// 获取某个媒介类型的收藏，最多 500 条
async function fetchBySubjectType(subjectType) {
  const all = []
  let offset = 0
  const limit = 50
  for (let i = 0; i < 10; i++) {
    const params = { offset, limit, subject_type: subjectType }
    if (route.params.username) params.username = route.params.username
    const res = await collectionAPI.getList(params)
    const data = res.data?.data || []
    all.push(...data)
    if (data.length < limit) break
    offset += limit
  }
  return { subjectType, data: all }
}

// 获取全部收藏用于统计面板
async function fetchAllCollectionsForStats() {
  const all = []
  let offset = 0
  const limit = 50
  const maxPages = 20
  for (let i = 0; i < maxPages; i++) {
    const params = { offset, limit }
    if (route.params.username) params.username = route.params.username
    const res = await collectionAPI.getList(params)
    const data = res.data?.data || []
    all.push(...data)
    if (data.length < limit) break
    offset += limit
  }
  allCollectionsForStats.value = all
}

// 加载用户资料
async function loadProfile() {
  const username = route.params.username
  if (username) {
    try {
      const res = await userAPI.getUser(username)
      profileUser.value = res.data?.data
    } catch {
      profileUser.value = null
    }
  } else {
    profileUser.value = auth.effectiveUser
    // Bangmio 用户绑定后 effectiveUser 可能为空（bgmUserProfile 拉取失败），尝试重新拉取
    if (!profileUser.value && auth.isBangmioUser && auth.isBound) {
      await auth.fetchBgmUserProfile()
      profileUser.value = auth.effectiveUser
    }
  }
}

async function retryLoadProfile() {
  await auth.fetchBgmUserProfile()
  loadProfile()
}

// 时间胶囊：优先使用新 timeline API，空时回退到 collectionAPI 排序
async function fetchTimeline() {
  const username = currentUsername.value
  if (username) {
    try {
      const res = await userAPI.getTimeline(username)
      const data = res.data?.data || []
      if (data.length) {
        timeline.value = data.slice(0, 20)
        return
      }
    } catch {
      /* 回退 */
    }
  }
  try {
    const params = { limit: 20 }
    if (route.params.username) params.username = route.params.username
    const res = await collectionAPI.getList(params)
    const list = res.data?.data || []
    timeline.value = list
      .sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at || 0).getTime()
        const tb = new Date(b.updated_at || b.created_at || 0).getTime()
        return tb - ta
      })
      .slice(0, 20)
  } catch {
    timeline.value = []
  }
}

// 我的目录
async function fetchIndexes() {
  const username = currentUsername.value
  if (!username) {
    indexes.value = []
    return
  }
  try {
    const res = await userAPI.getIndexes(username)
    indexes.value = res.data?.data || []
  } catch {
    indexes.value = []
  }
}

// 收藏角色
async function fetchCharacters() {
  const username = currentUsername.value
  if (!username) {
    characters.value = []
    return
  }
  try {
    const res = await userAPI.getCharacters(username)
    characters.value = res.data?.data || []
  } catch {
    characters.value = []
  }
}

// 收藏人物
async function fetchPersons() {
  const username = currentUsername.value
  if (!username) {
    persons.value = []
    return
  }
  try {
    const res = await userAPI.getPersons(username)
    persons.value = res.data?.data || []
  } catch {
    persons.value = []
  }
}

// 好友
async function fetchFriends() {
  const username = currentUsername.value
  if (!username) {
    friends.value = []
    return
  }
  try {
    const res = await userAPI.getFriends(username)
    friends.value = res.data?.data || []
  } catch {
    friends.value = []
  }
}

// 参加的小组
async function fetchGroups() {
  const username = currentUsername.value
  if (!username) {
    groups.value = []
    return
  }
  try {
    const res = await userAPI.getGroups(username)
    groups.value = res.data?.data || []
  } catch {
    groups.value = []
  }
}

// 按状态分组后的收藏（每个状态最多 10 条）
const groupedCollections = computed(() => {
  const result = {}
  for (const [subjectType, config] of Object.entries(TYPE_CONFIG)) {
    result[subjectType] = {}
    const list = collectionsByType.value[subjectType] || []
    for (const s of config.statuses) {
      result[subjectType][s.type] = list.filter(c => c.type === s.type).slice(0, 10)
    }
  }
  return result
})

// 各状态计数
const statusCounts = computed(() => {
  const result = {}
  for (const [subjectType, config] of Object.entries(TYPE_CONFIG)) {
    result[subjectType] = {}
    const list = collectionsByType.value[subjectType] || []
    for (const s of config.statuses) {
      result[subjectType][s.type] = list.filter(c => c.type === s.type).length
    }
  }
  return result
})

// 顶部导航点击处理
function handleNavClick(tab) {
  if (tab.kind === 'anchor' && tab.target) {
    const el = document.querySelector(tab.target)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else if (tab.kind === 'link' && typeof tab.target === 'function') {
    const username = currentUsername.value
    if (username) window.open(tab.target(username), '_blank', 'noopener,noreferrer')
  }
}

// 并行拉取所有数据
async function fetchAll() {
  const results = await Promise.allSettled([
    fetchBySubjectType(2),
    fetchBySubjectType(4),
    fetchBySubjectType(1),
    fetchBySubjectType(3),
    loadProfile(),
    fetchAllCollectionsForStats(),
    fetchTimeline(),
    fetchIndexes(),
    fetchCharacters(),
    fetchPersons(),
    fetchFriends(),
    fetchGroups()
  ])
  // 按媒介类型写入左侧收藏数据
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value?.subjectType !== undefined) {
      collectionsByType.value[r.value.subjectType] = r.value.data
    }
  })
}

onMounted(() => {
  fetchAll()
})

watch(
  () => route.params.username,
  () => {
    fetchAll()
  }
)
</script>
