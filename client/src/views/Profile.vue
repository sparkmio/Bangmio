<template>
  <div class="max-w-5xl mx-auto">
    <div v-if="!auth.isLoggedIn && !route.params.username" class="py-20 text-center">
      <p class="text-base-content/50 mb-3">请先登录</p>
      <router-link to="/login" class="btn btn-primary btn-sm">登录 Bangmio</router-link>
    </div>

    <div v-else>
      <!-- 个人资料头 -->
      <div class="card bg-base-100 border border-base-300 mb-6 overflow-hidden">
        <div class="h-24 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/30"></div>
        <div class="card-body p-6 pt-0">
          <div class="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div class="avatar shrink-0">
              <div class="w-24 h-24 rounded-2xl ring-4 ring-base-100 shadow-lg">
                <img v-if="profileUser?.avatar?.large" :src="profileUser.avatar.large" />
                <div v-else class="w-24 h-24 rounded-2xl bg-primary text-primary-content flex items-center justify-center text-3xl font-bold">
                  {{ profileUser?.nickname?.[0] || profileUser?.username?.[0]?.toUpperCase() || '?' }}
                </div>
              </div>
            </div>
            <div class="flex-1 min-w-0 pb-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-2xl font-bold text-base-content">{{ profileUser?.nickname || profileUser?.username }}</h1>
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

      <!-- 彩色统计面板 -->
      <div v-if="stats" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div class="rounded-xl border border-pink-500/30 bg-pink-500/10 p-3 text-center">
          <p class="text-xs text-pink-600">收藏数</p>
          <p class="text-2xl font-bold text-pink-700 mt-1">{{ stats.total || 0 }}</p>
        </div>
        <div class="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-center">
          <p class="text-xs text-green-600">完成数</p>
          <p class="text-2xl font-bold text-green-700 mt-1">{{ stats.completed || 0 }}</p>
        </div>
        <div class="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-center">
          <p class="text-xs text-blue-600">完成率</p>
          <p class="text-2xl font-bold text-blue-700 mt-1">{{ completionRate }}%</p>
        </div>
        <div class="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-center">
          <p class="text-xs text-orange-600">平均分</p>
          <p class="text-2xl font-bold text-orange-700 mt-1">{{ rateAverage || '-' }}</p>
        </div>
        <div class="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-center">
          <p class="text-xs text-purple-600">标准差</p>
          <p class="text-2xl font-bold text-purple-700 mt-1">{{ rateStdDev || '-' }}</p>
        </div>
        <div class="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-center">
          <p class="text-xs text-cyan-600">评分数</p>
          <p class="text-2xl font-bold text-cyan-700 mt-1">{{ rateTotal || 0 }}</p>
        </div>
      </div>

      <!-- 年度统计柱状图 -->
      <div v-if="yearlyStats.length" class="card bg-base-100 border border-base-300 mb-6">
        <div class="card-body p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-base-content flex items-center gap-1.5">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              年度统计
            </h2>
            <span class="text-xs text-base-content/40">最近 {{ yearlyStats.length }} 年</span>
          </div>

          <!-- 堆叠柱状图：纯 div + flex 实现 -->
          <div class="flex items-end gap-2 h-48 px-1">
            <div
              v-for="y in yearlyStats"
              :key="y.year"
              class="flex-1 flex flex-col justify-end items-center relative group min-w-0"
            >
              <div
                class="w-full max-w-[40px] mx-auto rounded-t overflow-hidden flex flex-col-reverse transition-all duration-300 group-hover:opacity-80"
                :style="{ height: (yearlyMaxTotal > 0 ? (y.total / yearlyMaxTotal) * 100 : 0) + '%' }"
              >
                <div class="bg-blue-500" :style="{ height: y.total > 0 ? (y.want / y.total) * 100 + '%' : '0%' }"></div>
                <div class="bg-green-500" :style="{ height: y.total > 0 ? (y.collect / y.total) * 100 + '%' : '0%' }"></div>
                <div class="bg-orange-500" :style="{ height: y.total > 0 ? (y.doing / y.total) * 100 + '%' : '0%' }"></div>
                <div class="bg-yellow-400" :style="{ height: y.total > 0 ? (y.on_hold / y.total) * 100 + '%' : '0%' }"></div>
                <div class="bg-red-500" :style="{ height: y.total > 0 ? (y.dropped / y.total) * 100 + '%' : '0%' }"></div>
              </div>
              <p class="text-[10px] text-center mt-1 text-base-content/60">{{ y.year }}</p>

              <!-- hover tooltip -->
              <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 bg-base-100 border border-base-300 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap min-w-[140px]">
                <p class="font-semibold mb-1 text-center text-base-content">{{ y.year }} 年</p>
                <div class="space-y-0.5">
                  <div class="flex justify-between gap-3"><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-blue-500"></span>想看</span><span class="text-base-content/70">{{ y.want || 0 }}</span></div>
                  <div class="flex justify-between gap-3"><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-green-500"></span>看过</span><span class="text-base-content/70">{{ y.collect || 0 }}</span></div>
                  <div class="flex justify-between gap-3"><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-orange-500"></span>在看</span><span class="text-base-content/70">{{ y.doing || 0 }}</span></div>
                  <div class="flex justify-between gap-3"><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-yellow-400"></span>搁置</span><span class="text-base-content/70">{{ y.on_hold || 0 }}</span></div>
                  <div class="flex justify-between gap-3"><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-red-500"></span>弃番</span><span class="text-base-content/70">{{ y.dropped || 0 }}</span></div>
                  <div class="flex justify-between gap-3 border-t border-base-300 pt-0.5 mt-0.5"><span class="text-base-content">合计</span><span class="font-semibold text-base-content">{{ y.total }}</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 图例 -->
          <div class="flex flex-wrap gap-3 mt-4 justify-center text-xs text-base-content/60">
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>想看</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-green-500"></span>看过</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>在看</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-yellow-400"></span>搁置</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-red-500"></span>弃番</span>
          </div>
        </div>
      </div>

      <!-- 收藏区 -->
      <div class="card bg-base-100 border border-base-300">
        <div class="card-body p-6">
          <!-- 分类 tab -->
          <div class="flex items-center gap-1 border-b border-base-300 mb-4 overflow-x-auto">
            <button
              v-for="tab in subjectTabs"
              :key="tab.value"
              @click="filterSubjectType = tab.value; fetchCollections()"
              class="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
              :class="filterSubjectType === tab.value ? 'border-primary text-primary' : 'border-transparent text-base-content/50 hover:text-base-content'"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- 封面网格 -->
          <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div v-for="n in 10" :key="n" class="aspect-[3/4] rounded-lg bg-base-200 animate-pulse"></div>
          </div>

          <div v-else-if="collections.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <router-link
              v-for="col in collections"
              :key="col.subject?.id || col.anime_id"
              :to="`/anime/${col.subject?.id || col.anime_id}`"
              class="group block"
            >
              <div class="relative aspect-[3/4] rounded-lg overflow-hidden bg-base-200 shadow-sm">
                <img
                  v-if="col.subject?.images?.common || col.subject?.images?.grid"
                  :src="col.subject?.images?.common || col.subject?.images?.grid"
                  :alt="col.subject?.name_cn || col.subject?.name"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-base-content/30 text-xs p-2 text-center">
                  {{ col.subject?.name_cn || col.subject?.name || '无封面' }}
                </div>

                <!-- 顶部状态条 -->
                <div class="absolute top-0 left-0 right-0 px-2 py-1 bg-gradient-to-b from-black/70 to-transparent">
                  <span class="badge badge-xs" :class="statusBadgeClass(col.type)">{{ statusLabel(col.type) }}</span>
                </div>

                <!-- hover 信息层 -->
                <div class="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 flex flex-col justify-end">
                  <p class="text-xs font-medium text-white line-clamp-2 mb-1">
                    {{ col.subject?.name_cn || col.subject?.name || `#${col.subject?.id || col.anime_id}` }}
                  </p>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span v-if="col.rate" class="text-xs font-bold text-amber-400 flex items-center gap-0.5">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      {{ col.rate }}
                    </span>
                    <span v-if="col.ep_status" class="text-xs text-white/70">看到{{ col.ep_status }}话</span>
                  </div>
                  <p v-if="col.comment" class="text-xs text-white/80 line-clamp-2 mt-1 italic">"{{ col.comment }}"</p>
                </div>
              </div>
              <p class="text-xs text-center mt-1 text-base-content/60 line-clamp-1 group-hover:text-primary transition-colors">
                {{ col.subject?.name_cn || col.subject?.name }}
              </p>
            </router-link>
          </div>

          <div v-else class="py-16 text-center">
            <p class="text-base-content/40 text-sm">还没有收藏</p>
          </div>

          <div class="text-center mt-5" v-if="collections.length && hasMore">
            <button @click="loadMore" class="btn btn-ghost btn-sm text-primary">加载更多</button>
          </div>
        </div>
      </div>

      <!-- 评分分布 -->
      <div v-if="rateDistribution.length" class="card bg-base-100 border border-base-300 mt-6">
        <div class="card-body p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-base-content flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              评分分布
            </h2>
            <span class="text-xs text-base-content/40">共 {{ rateTotal }} 条评分</span>
          </div>
          <div class="space-y-1.5">
            <div v-for="r in rateDistribution" :key="r.rate" class="flex items-center gap-2">
              <span class="text-xs w-10 text-base-content/70 flex items-center gap-0.5 shrink-0">
                {{ r.rate }}
                <svg class="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              </span>
              <div class="flex-1 bg-base-200 rounded-full h-5 overflow-hidden relative">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="rateBarClass(r.rate)"
                  :style="{ width: Math.max(r.percent, r.count > 0 ? 4 : 0) + '%' }"
                ></div>
                <span class="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-medium text-base-content/60">{{ r.percent }}%</span>
              </div>
              <span class="text-xs w-8 text-right text-base-content font-medium shrink-0">{{ r.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 时间胶囊 -->
      <div v-if="timeline.length" class="card bg-base-100 border border-base-300 mt-6">
        <div class="card-body p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-base-content flex items-center gap-1.5">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              时间胶囊
            </h2>
            <span class="text-xs text-base-content/40">最近 {{ timeline.length }} 条</span>
          </div>
          <div class="relative">
            <div class="absolute left-[5px] top-1 bottom-1 w-px bg-base-300"></div>
            <div v-for="(item, i) in timeline" :key="i" class="relative pl-6 pb-3 last:pb-0">
              <div class="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full bg-primary ring-2 ring-base-100"></div>
              <router-link :to="`/anime/${item.subject_id || item.subject?.id || item.anime_id}`" class="block hover:text-primary transition-colors">
                <div class="flex items-center gap-2 text-sm flex-wrap">
                  <span class="badge badge-xs" :class="timelineBadgeClass(item)">{{ timelineTypeLabel(item) }}</span>
                  <span class="font-medium">{{ item.subject_name || item.subject?.name_cn || item.subject?.name }}</span>
                  <span v-if="item.action" class="text-xs text-base-content/50">{{ item.action }}</span>
                </div>
                <p class="text-xs text-base-content/40 mt-0.5">{{ formatRelativeTime(item.time || item.updated_at || item.created_at) }}</p>
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的目录 -->
      <div v-if="indexes.length" class="card bg-base-100 border border-base-300 mt-6">
        <div class="card-body p-6">
          <h2 class="text-base font-semibold text-base-content mb-4 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            我的目录
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              v-for="idx in indexes"
              :key="idx.id"
              :href="`https://bgm.tv/index/${idx.id}`"
              target="_blank"
              rel="noopener noreferrer"
              class="block p-3 rounded-lg border border-base-300 hover:border-primary transition-colors"
            >
              <p class="font-medium text-sm">{{ idx.title }}</p>
              <p v-if="idx.desc" class="text-xs text-base-content/50 mt-1 line-clamp-2">{{ idx.desc }}</p>
              <p class="text-xs text-base-content/40 mt-1">{{ idx.total || 0 }} 条</p>
            </a>
          </div>
        </div>
      </div>

      <!-- 收藏人物 -->
      <div v-if="characters.length || persons.length" class="card bg-base-100 border border-base-300 mt-6">
        <div class="card-body p-6">
          <h2 class="text-base font-semibold text-base-content mb-4 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            收藏人物
          </h2>
          <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-3">
            <router-link
              v-for="char in characters.slice(0, 10)"
              :key="'c-' + char.id"
              :to="`/character/${char.id}`"
              class="block text-center group"
            >
              <div class="w-12 h-12 mx-auto rounded-full overflow-hidden bg-base-200 ring-2 ring-base-100 shadow-sm group-hover:ring-primary transition">
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
              <div class="w-12 h-12 mx-auto rounded-full overflow-hidden bg-base-200 ring-2 ring-base-100 shadow-sm group-hover:ring-primary transition">
                <img v-if="person.images?.medium" :src="person.images.medium" :alt="person.name" class="w-full h-full object-cover" loading="lazy" />
                <div v-else class="w-full h-full flex items-center justify-center text-xs text-base-content/50">{{ person.name?.[0] || '?' }}</div>
              </div>
              <p class="text-xs mt-1 line-clamp-1 group-hover:text-primary transition-colors">{{ person.name }}</p>
            </router-link>
          </div>
        </div>
      </div>

      <!-- 好友 -->
      <div v-if="friends.length" class="card bg-base-100 border border-base-300 mt-6">
        <div class="card-body p-6">
          <h2 class="text-base font-semibold text-base-content mb-4 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            好友
          </h2>
          <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-3">
            <router-link
              v-for="f in friends.slice(0, 12)"
              :key="f.username"
              :to="`/user/${f.username}`"
              class="block text-center group"
            >
              <div class="w-14 h-14 mx-auto rounded-full overflow-hidden bg-base-200 ring-2 ring-base-100 shadow-sm group-hover:ring-primary transition">
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

      <!-- 加入的小组 -->
      <div v-if="groups.length" class="card bg-base-100 border border-base-300 mt-6">
        <div class="card-body p-6">
          <h2 class="text-base font-semibold text-base-content mb-4 flex items-center gap-1.5">
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            加入的小组
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <router-link
              v-for="g in groups.slice(0, 6)"
              :key="g.id"
              :to="`/group/${g.id}`"
              class="block p-3 rounded-lg border border-base-300 hover:border-primary transition-colors group"
            >
              <div class="flex gap-3">
                <div class="w-12 h-12 rounded-lg overflow-hidden bg-base-200 shrink-0">
                  <img v-if="g.avatar" :src="g.avatar" :alt="g.name" class="w-full h-full object-cover" loading="lazy" />
                  <div v-else class="w-full h-full flex items-center justify-center text-base-content/40 text-xs">
                    {{ g.name?.[0] || '?' }}
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm truncate group-hover:text-primary transition-colors">{{ g.name }}</p>
                  <p v-if="g.description" class="text-xs text-base-content/50 mt-0.5 line-clamp-2">{{ g.description }}</p>
                  <p class="text-xs text-base-content/40 mt-1">{{ g.member_count || 0 }} 成员</p>
                </div>
              </div>
            </router-link>
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

const profileUser = ref(null)
const stats = ref(null)
const collections = ref([])
const filterSubjectType = ref(0) // 0=全部, 1=书籍, 2=动画, 3=音乐, 4=游戏
const page = ref(0)
const hasMore = ref(true)
const loading = ref(false)
const limit = 30

// 时间胶囊
const timeline = ref([])
// 我的目录
const indexes = ref([])
// 收藏人物
const characters = ref([])
const persons = ref([])
// 评分分布
const rateDistribution = ref([])
const rateTotal = ref(0)
const rateAverage = ref(0)
const rateStdDev = ref(0)
// 年度统计
const yearlyStats = ref([])
// 好友
const friends = ref([])
// 加入的小组
const groups = ref([])

const subjectTabs = [
  { label: '全部', value: 0 },
  { label: '书籍', value: 1 },
  { label: '动画', value: 2 },
  { label: '音乐', value: 3 },
  { label: '游戏', value: 4 }
]

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

// timeline 项的类型标签：兼容新 timeline API（type 为字符串）和旧 collection 数据（type 为数字）
function timelineTypeLabel(item) {
  if (typeof item.type === 'string' && item.type) return item.type
  return statusLabel(item.type)
}

// timeline 项的 badge 样式：字符串类型给一个默认配色
function timelineBadgeClass(item) {
  if (typeof item.type === 'number') return statusBadgeClass(item.type)
  const map = { '收藏': 'badge-info', '评论': 'badge-secondary', '进度': 'badge-success' }
  return map[item.type] || 'badge-ghost'
}

// 完成率：completed / total * 100
const completionRate = computed(() => {
  if (!stats.value || !stats.value.total) return 0
  return Math.round(((stats.value.completed || 0) / stats.value.total) * 100)
})

// 年度统计中最大年度合计，用于柱子高度归一化
const yearlyMaxTotal = computed(() => {
  return Math.max(...yearlyStats.value.map(y => y.total || 0), 1)
})

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

function rateBarClass(rate) {
  if (rate >= 9) return 'bg-success'
  if (rate >= 7) return 'bg-primary'
  if (rate >= 5) return 'bg-secondary'
  if (rate >= 3) return 'bg-warning'
  return 'bg-error'
}

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

async function fetchCollections(reset = true) {
  if (loading.value) return
  loading.value = true
  if (reset) {
    page.value = 0
    collections.value = []
    hasMore.value = true
  }
  try {
    const params = { offset: page.value * limit, limit }
    if (filterSubjectType.value > 0) params.subject_type = filterSubjectType.value
    if (route.params.username) params.username = route.params.username

    const res = await collectionAPI.getList(params)
    const data = res.data.data || []

    if (reset) {
      collections.value = data
    } else {
      collections.value.push(...data)
    }

    hasMore.value = data.length >= limit
    page.value++

    if (reset) {
      const s = await collectionAPI.getStats()
      stats.value = s.data.data
    }
  } catch { /* ignore */ }
  loading.value = false
}

function loadMore() {
  fetchCollections(false)
}

// 时间胶囊：优先使用新 timeline API，失败或空时回退到 collectionAPI 排序模拟
async function fetchTimeline() {
  const username = route.params.username || auth.user?.username
  // 先尝试新 timeline API
  if (username) {
    try {
      const res = await userAPI.getTimeline(username)
      const data = res.data?.data || []
      if (data.length) {
        timeline.value = data.slice(0, 20)
        return
      }
    } catch { /* 回退到老逻辑 */ }
  }
  // 兜底：用 collectionAPI 排序模拟
  try {
    const params = { limit: 20 }
    if (route.params.username) params.username = route.params.username
    const res = await collectionAPI.getList(params)
    const list = res.data?.data || []
    timeline.value = list.sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at || 0).getTime()
      const tb = new Date(b.updated_at || b.created_at || 0).getTime()
      return tb - ta
    })
  } catch {
    timeline.value = []
  }
}

// 我的目录
async function fetchIndexes() {
  const username = route.params.username || auth.user?.username
  if (!username) { indexes.value = []; return }
  try {
    const res = await userAPI.getIndexes(username)
    indexes.value = res.data?.data || []
  } catch {
    indexes.value = []
  }
}

// 收藏人物
async function fetchCharacters() {
  const username = route.params.username || auth.user?.username
  if (!username) { characters.value = []; return }
  try {
    const res = await userAPI.getCharacters(username)
    characters.value = res.data?.data || []
  } catch {
    characters.value = []
  }
}

async function fetchPersons() {
  const username = route.params.username || auth.user?.username
  if (!username) { persons.value = []; return }
  try {
    const res = await userAPI.getPersons(username)
    persons.value = res.data?.data || []
  } catch {
    persons.value = []
  }
}

// 拉取全部收藏并统计评分分布（1-10 星）+ 平均分 + 标准差
async function fetchRateDistribution() {
  try {
    const all = []
    let offset = 0
    const pageSize = 50
    const maxPages = 20 // 最多拉取 1000 条
    for (let i = 0; i < maxPages; i++) {
      const params = { offset, limit: pageSize }
      if (filterSubjectType.value > 0) params.subject_type = filterSubjectType.value
      if (route.params.username) params.username = route.params.username
      const res = await collectionAPI.getList(params)
      const data = res.data?.data || []
      all.push(...data)
      if (data.length < pageSize) break
      offset += pageSize
    }

    const counts = {}
    let totalRated = 0
    let sumRate = 0
    const ratedArr = []
    all.forEach(c => {
      const r = Number(c.rate)
      if (r && r >= 1 && r <= 10) {
        counts[r] = (counts[r] || 0) + 1
        totalRated++
        sumRate += r
        ratedArr.push(r)
      }
    })

    const dist = []
    for (let r = 1; r <= 10; r++) {
      const count = counts[r] || 0
      dist.push({
        rate: r,
        count,
        percent: totalRated > 0 ? Math.round((count / totalRated) * 100) : 0
      })
    }
    rateDistribution.value = dist.filter(d => d.count > 0).sort((a, b) => a.rate - b.rate)
    rateTotal.value = totalRated
    rateAverage.value = totalRated > 0 ? (sumRate / totalRated).toFixed(1) : 0
    // 标准差
    if (totalRated > 0) {
      const mean = sumRate / totalRated
      const variance = ratedArr.reduce((s, r) => s + (r - mean) ** 2, 0) / totalRated
      rateStdDev.value = Math.sqrt(variance).toFixed(2)
    } else {
      rateStdDev.value = 0
    }
  } catch {
    rateDistribution.value = []
    rateTotal.value = 0
    rateAverage.value = 0
    rateStdDev.value = 0
  }
}

// 年度统计：调用 timeline stats API，计算 total 并按年份排序取最近 10 年
async function fetchYearlyStats() {
  const username = route.params.username || auth.user?.username
  if (!username) { yearlyStats.value = []; return }
  try {
    const res = await userAPI.getYearlyStats(username)
    const data = res.data?.data || []
    yearlyStats.value = data
      .map(y => ({
        ...y,
        total: (y.want || 0) + (y.collect || 0) + (y.doing || 0) + (y.on_hold || 0) + (y.dropped || 0)
      }))
      .filter(y => y.total > 0)
      .sort((a, b) => Number(a.year) - Number(b.year))
      .slice(-10)
  } catch {
    yearlyStats.value = []
  }
}

// 好友
async function fetchFriends() {
  const username = route.params.username || auth.user?.username
  if (!username) { friends.value = []; return }
  try {
    const res = await userAPI.getFriends(username)
    friends.value = res.data?.data || []
  } catch {
    friends.value = []
  }
}

// 加入的小组
async function fetchGroups() {
  const username = route.params.username || auth.user?.username
  if (!username) { groups.value = []; return }
  try {
    const res = await userAPI.getGroups(username)
    groups.value = res.data?.data || []
  } catch {
    groups.value = []
  }
}

// 并行拉取所有数据
function fetchAll() {
  return Promise.allSettled([
    loadProfile(),
    fetchCollections(),
    fetchTimeline(),
    fetchIndexes(),
    fetchCharacters(),
    fetchPersons(),
    fetchRateDistribution(),
    fetchYearlyStats(),
    fetchFriends(),
    fetchGroups()
  ])
}

onMounted(() => {
  fetchAll()
})

watch(() => route.params.username, () => {
  filterSubjectType.value = 0
  fetchAll()
})
</script>
