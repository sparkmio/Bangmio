<template>
  <div class="max-w-[900px] mx-auto lg:ml-[240px] lg:mr-auto">
    <!-- 未登录且未指定用户名时提示 -->
    <div v-if="!auth.isLoggedIn && !route.params.username" class="py-20 text-center">
      <p class="text-base-content/50 mb-3">请先登录</p>
      <router-link to="/login" class="btn btn-primary btn-sm">登录 Bangmio</router-link>
    </div>

    <div v-else>
      <!-- 用户卡 -->
      <div class="card bg-base-100 border border-base-300 mb-4 overflow-hidden">
        <div class="h-16 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/30"></div>
        <div class="card-body p-4 pt-0">
          <div class="flex flex-col sm:flex-row sm:items-end gap-3 -mt-8">
            <div class="avatar shrink-0">
              <div class="w-16 h-16 rounded-xl ring-4 ring-base-100 shadow-lg">
                <img v-if="profileUser?.avatar?.large" :src="profileUser.avatar.large" />
                <div v-else class="w-16 h-16 rounded-xl bg-primary text-primary-content flex items-center justify-center text-2xl font-bold">
                  {{ profileUser?.nickname?.[0] || profileUser?.username?.[0]?.toUpperCase() || '?' }}
                </div>
              </div>
            </div>
            <div class="flex-1 min-w-0 pb-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-xl font-bold text-base-content">{{ profileUser?.nickname || profileUser?.username }}</h1>
                <span v-if="profileUser?.user_group" class="badge badge-sm badge-outline">{{ profileUser.user_group }}</span>
              </div>
              <p class="text-sm text-base-content/50 mt-0.5">@{{ profileUser?.username }} · UID: {{ profileUser?.id }}</p>
              <p v-if="profileUser?.sign" class="text-sm mt-2 text-base-content/70 line-clamp-2">{{ profileUser.sign }}</p>
              <div class="flex gap-4 mt-2 text-xs text-base-content/40 flex-wrap items-center">
                <span v-if="profileUser?.join_date">加入于 {{ profileUser.join_date }}</span>
                <a v-if="profileUser?.website" :href="profileUser.website" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 link link-hover text-primary/70 hover:text-primary truncate max-w-[200px]">
                  <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                  <span class="truncate">{{ profileUser.website }}</span>
                </a>
              </div>
              <p v-if="profileUser?.bio" class="text-sm mt-2 text-base-content/60 line-clamp-3">{{ profileUser.bio }}</p>
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
            @click="handleNavClick(tab)"
            class="px-3 py-2 text-sm whitespace-nowrap transition-colors rounded-lg"
            :class="tab.label === '时光机' ? 'text-primary font-medium bg-primary/10' : 'text-base-content/60 hover:text-base-content hover:bg-base-200'"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- 整体两栏布局 -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <!-- 左侧主栏 -->
        <div id="collections" class="main-col space-y-4">
          <!-- 各媒介类型：动画 / 游戏 / 书籍 / 音乐 -->
          <div
            v-for="(config, subjectType) in TYPE_CONFIG"
            :key="subjectType"
            class="card bg-base-100 border border-base-300"
          >
            <div class="card-body p-4">
              <!-- 标题 + 各状态计数 -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 class="text-base font-bold text-base-content">我的{{ config.label }}</h2>
                <div class="flex items-center gap-3 text-xs text-base-content/50 flex-wrap">
                  <span v-for="s in config.statuses" :key="s.type">
                    {{ s.label }} <span class="text-base-content font-medium">{{ statusCounts[subjectType]?.[s.type] || 0 }}</span>
                  </span>
                </div>
              </div>

              <!-- 按状态分行的横向封面网格 -->
              <div v-for="s in config.statuses" :key="s.type" class="mb-4 last:mb-0">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-base-content">{{ s.label }}</span>
                  <span v-if="groupedCollections[subjectType]?.[s.type]?.length" class="text-xs text-base-content/40">
                    {{ groupedCollections[subjectType][s.type].length }} 部
                  </span>
                </div>
                <div v-if="groupedCollections[subjectType]?.[s.type]?.length" class="flex gap-2 overflow-x-auto pb-1">
                  <router-link
                    v-for="col in groupedCollections[subjectType][s.type]"
                    :key="col.subject?.id || col.anime_id"
                    :to="`/anime/${col.subject?.id || col.anime_id}`"
                    class="shrink-0 group"
                    :title="col.subject?.name_cn || col.subject?.name"
                  >
                    <div class="w-[72px] h-[100px] rounded-md overflow-hidden bg-base-200 shadow-sm relative">
                      <img
                        v-if="col.subject?.images?.common || col.subject?.images?.grid || col.subject?.images?.medium"
                        :src="col.subject?.images?.common || col.subject?.images?.grid || col.subject?.images?.medium"
                        :alt="col.subject?.name_cn || col.subject?.name"
                        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center text-xs text-base-content/40 p-2 text-center">
                        {{ col.subject?.name_cn || col.subject?.name || '无封面' }}
                      </div>
                      <!-- 评分角标 -->
                      <div v-if="col.rate" class="absolute top-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                        <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        {{ col.rate }}
                      </div>
                    </div>
                    <p class="text-[10px] text-center mt-1 text-base-content/60 line-clamp-1 w-[72px] group-hover:text-primary transition-colors">
                      {{ col.subject?.name_cn || col.subject?.name }}
                    </p>
                  </router-link>
                </div>
                <div v-else class="text-xs text-base-content/40 py-2">暂无</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧边栏 -->
        <div class="sidebar-col space-y-4">
          <!-- 我的时间胶囊 -->
          <div id="timeline" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-base-content/70">/ 我的时间胶囊</h3>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/timeline`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-base-content/40 hover:text-primary"
                >...more</a>
              </div>
              <div v-if="timeline.length" class="relative">
                <div class="absolute left-[5px] top-1 bottom-1 w-px bg-base-300"></div>
                <div v-for="(item, i) in timeline" :key="i" class="relative pl-6 pb-3 last:pb-0">
                  <div class="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full bg-primary ring-2 ring-base-100"></div>
                  <router-link :to="`/anime/${item.subject_id || item.subject?.id || item.anime_id}`" class="block hover:text-primary transition-colors">
                    <div class="flex items-center gap-2 text-sm flex-wrap">
                      <span class="badge badge-xs" :class="timelineBadgeClass(item)">{{ timelineTypeLabel(item) }}</span>
                      <span class="font-medium line-clamp-1">{{ item.subject_name || item.subject?.name_cn || item.subject?.name }}</span>
                    </div>
                    <p class="text-xs text-base-content/40 mt-0.5">{{ formatRelativeTime(item.time || item.updated_at || item.created_at) }}</p>
                  </router-link>
                </div>
              </div>
              <div v-else class="text-xs text-base-content/40 py-2">还没有时间胶囊</div>
            </div>
          </div>

          <!-- 统计面板 -->
          <div id="stats" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <!-- 统计 tab -->
              <div class="flex items-center gap-1 border-b border-base-300 mb-4 overflow-x-auto">
                <button
                  v-for="tab in statsTabs"
                  :key="tab.value"
                  @click="statsFilter = tab.value"
                  class="px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
                  :class="statsFilter === tab.value ? 'border-primary text-primary' : 'border-transparent text-base-content/50 hover:text-base-content'"
                >
                  {{ tab.label }}
                </button>
              </div>

              <!-- 6 彩色统计卡片 -->
              <div class="grid grid-cols-2 gap-2 mb-4">
                <div class="rounded-2xl border border-primary/30 bg-primary/10 p-3">
                  <p class="text-xl font-bold text-primary">{{ computedStats.total }}</p>
                  <p class="text-xs text-primary mt-1">收藏数</p>
                </div>
                <div class="rounded-2xl border border-green-500/30 bg-green-500/10 p-3">
                  <p class="text-xl font-bold text-green-700">{{ computedStats.completed }}</p>
                  <p class="text-xs text-green-600 mt-1">完成数</p>
                </div>
                <div class="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3">
                  <p class="text-xl font-bold text-blue-700">{{ computedStats.completionRate }}%</p>
                  <p class="text-xs text-blue-600 mt-1">完成率</p>
                </div>
                <div class="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3">
                  <p class="text-xl font-bold text-orange-700">{{ computedStats.avg }}</p>
                  <p class="text-xs text-orange-600 mt-1">平均分</p>
                </div>
                <div class="rounded-2xl border border-secondary/30 bg-secondary/10 p-3">
                  <p class="text-2xl font-bold text-secondary">{{ computedStats.stdDev }}</p>
                  <p class="text-xs text-secondary mt-1">标准差</p>
                </div>
                <div class="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                  <p class="text-xl font-bold text-cyan-700">{{ computedStats.rateTotal }}</p>
                  <p class="text-xs text-cyan-600 mt-1">评分数</p>
                </div>
              </div>

              <!-- 评分分布条形图：10 → 1 倒序 -->
              <div v-if="computedStats.rateTotal > 0" class="space-y-1.5">
                <div class="flex items-center justify-between text-xs text-base-content/40 mb-2">
                  <span>评分分布</span>
                  <span>共 {{ computedStats.rateTotal }} 条评分</span>
                </div>
                <div v-for="r in rateDistribution" :key="r.rate" class="flex items-center gap-2">
                  <span class="text-xs w-6 text-right text-base-content/70 flex items-center justify-end gap-0.5">
                    {{ r.rate }}
                    <svg class="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  </span>
                  <div class="flex-1 bg-base-200 rounded h-4 overflow-hidden relative">
                    <div
                      class="h-full transition-all duration-500"
                      :class="rateBarClass(r.rate)"
                      :style="{ width: Math.max(r.percent, r.count > 0 ? 4 : 0) + '%' }"
                    ></div>
                    <span class="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-medium text-base-content/60">{{ r.percent }}%</span>
                  </div>
                  <span class="text-xs w-6 text-right text-base-content font-medium shrink-0">{{ r.count }}</span>
                </div>
              </div>
              <div v-else class="text-xs text-base-content/40 py-2">暂无评分数据</div>
            </div>
          </div>

          <!-- 我的朋友 -->
          <div id="friends" v-if="friends.length" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-base-content/70">/ 我的朋友</h3>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/friends`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-base-content/40 hover:text-primary"
                >...more</a>
              </div>
              <div class="grid grid-cols-6 gap-2">
                <router-link
                  v-for="f in friends.slice(0, 12)"
                  :key="f.username"
                  :to="`/profile/${f.username}`"
                  class="block text-center group"
                >
                  <div class="w-10 h-10 mx-auto rounded-full overflow-hidden bg-base-200 ring-2 ring-base-100 shadow-sm group-hover:ring-primary transition">
                    <img v-if="f.avatar" :src="f.avatar" :alt="f.nickname" class="w-full h-full object-cover" loading="lazy" />
                    <div v-else class="w-full h-full flex items-center justify-center text-lg font-bold text-base-content/50">
                      {{ f.nickname?.[0] || f.username?.[0]?.toUpperCase() || '?' }}
                    </div>
                  </div>
                  <p class="text-xs mt-1 line-clamp-1 group-hover:text-primary transition-colors">{{ f.nickname || f.username }}</p>
                </router-link>
              </div>
            </div>
          </div>

          <!-- 我参加的小组 -->
          <div id="groups" v-if="groups.length" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-base-content/70">/ 我参加的小组</h3>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/groups`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-base-content/40 hover:text-primary"
                >...more</a>
              </div>
              <div class="space-y-3">
                <router-link
                  v-for="g in groups.slice(0, 6)"
                  :key="g.id"
                  :to="`/group/${g.id}`"
                  class="flex items-center gap-3 group"
                >
                  <div class="w-8 h-8 rounded-full overflow-hidden bg-base-200 shrink-0 ring-2 ring-base-100 group-hover:ring-primary transition">
                    <img v-if="g.avatar" :src="g.avatar" :alt="g.name" class="w-full h-full object-cover" loading="lazy" />
                    <div v-else class="w-full h-full flex items-center justify-center text-xs text-base-content/40">{{ g.name?.[0] || '?' }}</div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate group-hover:text-primary transition-colors">{{ g.name }}</p>
                    <p class="text-xs text-base-content/40">{{ g.member_count || 0 }} 成员</p>
                  </div>
                </router-link>
              </div>
            </div>
          </div>

          <!-- 我的目录 -->
          <div id="indexes" v-if="indexes.length" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-base-content/70">/ 我的目录</h3>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/index`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-base-content/40 hover:text-primary"
                >...more</a>
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
          <div id="characters" v-if="characters.length || persons.length" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-base-content/70">/ 我收藏的人物</h3>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/mono`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-base-content/40 hover:text-primary"
                >...more</a>
              </div>
              <div class="grid grid-cols-6 gap-2">
                <router-link
                  v-for="char in characters.slice(0, 10)"
                  :key="'c-' + char.id"
                  :to="`/character/${char.id}`"
                  class="block text-center group"
                >
                  <div class="w-14 h-14 mx-auto rounded overflow-hidden bg-base-200 shadow-sm group-hover:ring-2 group-hover:ring-primary transition">
                    <img v-if="char.images?.medium" :src="char.images.medium" :alt="char.name" class="w-full h-full object-cover" loading="lazy" />
                    <div v-else class="w-full h-full flex items-center justify-center text-xs text-base-content/50">{{ char.name?.[0] || '?' }}</div>
                  </div>
                  <p class="text-xs mt-1 line-clamp-1 group-hover:text-primary transition-colors">{{ char.name }}</p>
                </router-link>
                <router-link
                  v-for="person in persons.slice(0, 10)"
                  :key="'p-' + person.id"
                  :to="`/person/${person.id}`"
                  class="block text-center group"
                >
                  <div class="w-14 h-14 mx-auto rounded overflow-hidden bg-base-200 shadow-sm group-hover:ring-2 group-hover:ring-primary transition">
                    <img v-if="person.images?.medium" :src="person.images.medium" :alt="person.name" class="w-full h-full object-cover" loading="lazy" />
                    <div v-else class="w-full h-full flex items-center justify-center text-xs text-base-content/50">{{ person.name?.[0] || '?' }}</div>
                  </div>
                  <p class="text-xs mt-1 line-clamp-1 group-hover:text-primary transition-colors">{{ person.name }}</p>
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
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"/></svg>
                  RSS2.0
                </a>
                <a
                  :href="`https://bgm.tv/user/${currentUsername}/wiki`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
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

const route = useRoute()
const auth = useAuthStore()

// 当前查看的用户名
const currentUsername = computed(() => route.params.username || auth.user?.username)

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

// 统计面板当前筛选
const statsFilter = ref(0)

// 右侧边栏数据
const timeline = ref([])
const indexes = ref([])
const characters = ref([])
const persons = ref([])
const friends = ref([])
const groups = ref([])

// 媒介类型配置：顺序即左侧主栏展示顺序
const TYPE_CONFIG = {
  2: {
    label: '动画',
    statuses: [
      { type: 3, label: '在看' },
      { type: 2, label: '看过' },
      { type: 1, label: '想看' },
      { type: 4, label: '搁置' },
      { type: 5, label: '弃番' }
    ]
  },
  4: {
    label: '游戏',
    statuses: [
      { type: 3, label: '在玩' },
      { type: 2, label: '玩过' },
      { type: 1, label: '想玩' },
      { type: 4, label: '搁置' },
      { type: 5, label: '弃玩' }
    ]
  },
  1: {
    label: '书籍',
    statuses: [
      { type: 3, label: '在读' },
      { type: 2, label: '读过' },
      { type: 1, label: '想读' }
    ]
  },
  3: {
    label: '音乐',
    statuses: [
      { type: 3, label: '在听' },
      { type: 2, label: '听过' },
      { type: 1, label: '想听' }
    ]
  }
}

// 统计面板 tab
const statsTabs = [
  { label: '全部', value: 0 },
  { label: '书籍', value: 1 },
  { label: '动画', value: 2 },
  { label: '音乐', value: 3 },
  { label: '游戏', value: 4 }
]

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

// 状态标签与样式
function statusLabel(s) {
  return { 1: '想看', 2: '看过', 3: '在看', 4: '搁置', 5: '弃番' }[s] || ''
}

function statusBadgeClass(s) {
  return {
    1: 'badge-info',
    2: 'badge-secondary',
    3: 'badge-success',
    4: 'badge-warning',
    5: 'badge-error'
  }[s] || 'badge-ghost'
}

// timeline 项类型标签：兼容字符串与数字
function timelineTypeLabel(item) {
  if (typeof item.type === 'string' && item.type) return item.type
  return statusLabel(item.type)
}

// timeline 项 badge 样式
function timelineBadgeClass(item) {
  if (typeof item.type === 'number') return statusBadgeClass(item.type)
  const map = { '收藏': 'badge-info', '评论': 'badge-secondary', '进度': 'badge-success' }
  return map[item.type] || 'badge-ghost'
}

// 相对时间格式化
function formatRelativeTime(t) {
  if (!t) return ''
  try {
    const d = new Date(t)
    if (isNaN(d.getTime())) return ''
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  } catch { return '' }
}

// 评分条颜色：10-9 绿/蓝，8-7 青，6-5 黄，4-3 橙，2-1 红
function rateBarClass(rate) {
  if (rate >= 9) return 'bg-emerald-500'
  if (rate >= 7) return 'bg-cyan-500'
  if (rate >= 5) return 'bg-yellow-400'
  if (rate >= 3) return 'bg-orange-500'
  return 'bg-red-500'
}

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
    } catch { profileUser.value = null }
  } else {
    profileUser.value = auth.user
  }
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
    } catch { /* 回退 */ }
  }
  try {
    const params = { limit: 20 }
    if (route.params.username) params.username = route.params.username
    const res = await collectionAPI.getList(params)
    const list = res.data?.data || []
    timeline.value = list.sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at || 0).getTime()
      const tb = new Date(b.updated_at || b.created_at || 0).getTime()
      return tb - ta
    }).slice(0, 20)
  } catch {
    timeline.value = []
  }
}

// 我的目录
async function fetchIndexes() {
  const username = currentUsername.value
  if (!username) { indexes.value = []; return }
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
  if (!username) { characters.value = []; return }
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
  if (!username) { persons.value = []; return }
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
  if (!username) { friends.value = []; return }
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
  if (!username) { groups.value = []; return }
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

// 统计面板：根据筛选条件过滤后的收藏
const filteredCollectionsForStats = computed(() => {
  if (!statsFilter.value) return allCollectionsForStats.value
  return allCollectionsForStats.value.filter(c => {
    const st = c.subject_type ?? c.subject?.type
    return st === statsFilter.value
  })
})

// 统计面板数字
const computedStats = computed(() => {
  const list = filteredCollectionsForStats.value
  const total = list.length
  const completed = list.filter(c => c.type === 2).length
  const rated = list.filter(c => c.rate && c.rate >= 1 && c.rate <= 10)
  const rateTotal = rated.length
  const sumRate = rated.reduce((s, c) => s + Number(c.rate), 0)
  const avg = rateTotal > 0 ? (sumRate / rateTotal).toFixed(1) : '-'
  let stdDev = '-'
  if (rateTotal > 0) {
    const mean = sumRate / rateTotal
    const variance = rated.reduce((s, c) => s + (Number(c.rate) - mean) ** 2, 0) / rateTotal
    stdDev = Math.sqrt(variance).toFixed(2)
  }
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, completionRate, avg, stdDev, rateTotal }
})

// 评分分布：10 → 1 倒序
const rateDistribution = computed(() => {
  const list = filteredCollectionsForStats.value
  const rated = list.filter(c => c.rate && c.rate >= 1 && c.rate <= 10)
  const totalRated = rated.length
  const counts = {}
  rated.forEach(c => { counts[c.rate] = (counts[c.rate] || 0) + 1 })

  const dist = []
  for (let r = 10; r >= 1; r--) {
    const count = counts[r] || 0
    dist.push({
      rate: r,
      count,
      percent: totalRated > 0 ? Math.round((count / totalRated) * 100) : 0
    })
  }
  return dist
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
  statsFilter.value = 0
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

watch(() => route.params.username, () => {
  fetchAll()
})
</script>
