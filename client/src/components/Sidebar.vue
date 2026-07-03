<template>
  <aside class="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-40 bg-base-100/80 backdrop-blur-xl border-r border-base-300">
    <!-- 刊头 -->
    <div class="px-5 pt-5 pb-3 shrink-0">
      <router-link to="/" class="flex items-baseline gap-2 mb-1">
        <span class="font-display font-black text-2xl tracking-tighter text-base-content">Bangmio</span>
        <span class="text-[9px] font-mono tracking-widest text-base-content/40 uppercase">vol.04</span>
      </router-link>
      <hr class="masthead-rule" />
      <p class="text-[10px] text-base-content/40 mt-1.5 tracking-wider serif-cn">番组追番 · 编辑手记</p>
    </div>

    <!-- 目录 -->
    <div class="px-5 pt-2 pb-1">
      <p class="text-[9px] font-mono tracking-[0.25em] text-base-content/40 uppercase mb-2">Contents</p>
    </div>

    <ul class="flex-1 px-3 gap-0.5 overflow-y-auto scrollbar-hide">
      <li v-for="(item, idx) in navItems" :key="item.path">
        <router-link
          :to="item.path"
          :class="$route.path === item.path ? 'is-active' : ''"
          class="group flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-300"
        >
          <span class="editorial-number text-xs text-base-content/30 group-hover:text-violet-500 transition-colors w-5 tabular-nums">
            {{ String(idx + 1).padStart(2, '0') }}
          </span>
          <component :is="item.icon" class="w-4 h-4 text-base-content/40 group-hover:text-base-content transition-colors" :class="$route.path === item.path ? '!text-violet-500' : ''" />
          <span class="text-[13px] font-medium serif-cn group-hover:text-base-content transition-colors">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>

    <hr class="masthead-rule-thin mx-5" />

    <!-- 用户区 -->
    <div class="px-3 py-3 shrink-0">
      <template v-if="auth.isLoggedIn">
        <router-link to="/profile" class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
          <div class="avatar">
            <div class="w-8 h-8 rounded-full ring-1 ring-violet-500/20">
              <img v-if="auth.user?.avatar?.medium || auth.user?.avatar?.large" :src="auth.user.avatar.medium || auth.user.avatar.large" class="rounded-full" />
              <div v-else class="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center text-xs font-bold serif-cn">
                {{ auth.user?.nickname?.[0] || auth.user?.username?.[0]?.toUpperCase() }}
              </div>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-medium truncate text-base-content serif-cn">{{ auth.user?.nickname || auth.user?.username }}</p>
            <p class="text-[10px] truncate text-base-content/40 tracking-wider">查看主页</p>
          </div>
        </router-link>
        <button @click="auth.logout()" class="btn btn-ghost btn-xs w-full mt-1.5 text-base-content/50 hover:text-violet-600 rounded-full text-[11px] tracking-wider">
          退出登录
        </button>
      </template>
      <template v-else>
        <router-link to="/login" class="btn btn-primary btn-sm w-full rounded-full shadow-md shadow-violet-500/20 text-xs tracking-wider">
          登录 Bangmio
        </router-link>
      </template>

      <button @click="theme.toggle()" class="btn btn-ghost btn-xs w-full mt-2 gap-2 rounded-full text-[11px] text-base-content/50 tracking-wider">
        <svg v-if="theme.theme === 'dark'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        {{ theme.theme === 'dark' ? '浅色' : '深色' }}
      </button>
    </div>
  </aside>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
const auth = useAuthStore()
const theme = useThemeStore()

const IconHome = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>' }
const IconTrending = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>' }
const IconBrowse = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>' }
const IconGroups = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>' }
const IconAbout = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' }
const IconSettings = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' }

const navItems = [
  { path: '/', label: '首页', icon: IconHome },
  { path: '/trending', label: '新番时间表', icon: IconTrending },
  { path: '/anime', label: '搜索', icon: IconBrowse },
  { path: '/groups', label: '小组', icon: IconGroups },
  { path: '/about', label: '关于我们', icon: IconAbout },
  { path: '/settings', label: '设置', icon: IconSettings },
]
</script>

<style scoped>
.is-active {
  background: color-mix(in srgb, var(--violet) 8%, transparent);
  position: relative;
}
.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 60%;
  background: var(--violet);
}
.is-active span {
  color: var(--violet) !important;
}
</style>
