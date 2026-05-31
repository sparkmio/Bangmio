<template>
  <aside class="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-40 bg-base-100/40 backdrop-blur-xl border-r border-base-300/30">
    <div class="flex items-center gap-3 px-5 h-16 border-b border-base-300/30 shrink-0">
      <router-link to="/" class="flex items-center gap-3">
        <img src="/logo.png" alt="Bangmio" class="w-8 h-8 rounded-xl ring-2 ring-primary/20" />
        <span class="text-lg font-bold tracking-tight text-primary">Bangmio</span>
      </router-link>
    </div>

    <ul class="menu flex-1 py-4 px-3 gap-1">
      <li v-for="item in navItems" :key="item.path">
        <router-link :to="item.path" :class="$route.path === item.path ? 'active' : ''" class="gap-3 rounded-lg">
          <component :is="item.icon" class="w-5 h-5" />
          <span class="font-medium">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>

    <div class="px-3 py-4 border-t border-base-300/30 shrink-0">
      <template v-if="auth.isLoggedIn">
        <router-link to="/profile" class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
          <div class="avatar">
            <div class="w-8 h-8 rounded-full ring-2 ring-primary/20">
              <img v-if="auth.user?.avatar?.medium || auth.user?.avatar?.large" :src="auth.user.avatar.medium || auth.user.avatar.large" class="rounded-full" />
              <div v-else class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold">
                {{ auth.user?.nickname?.[0] || auth.user?.username?.[0]?.toUpperCase() }}
              </div>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate text-base-content">{{ auth.user?.nickname || auth.user?.username }}</p>
            <p class="text-xs truncate text-base-content/40">查看主页</p>
          </div>
        </router-link>
        <button @click="auth.logout()" class="btn btn-ghost btn-xs w-full mt-2 text-base-content/40 hover:text-error rounded-full">
          退出登录
        </button>
      </template>
      <template v-else>
        <router-link to="/login" class="btn btn-primary btn-sm w-full rounded-full shadow-lg shadow-primary/20">
          登录 Bangmio
        </router-link>
      </template>

      <button @click="theme.toggle()" class="btn btn-ghost btn-xs w-full mt-3 gap-2 rounded-full">
        <svg v-if="theme.theme === 'dark'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        {{ theme.theme === 'dark' ? '浅色模式' : '深色模式' }}
      </button>
    </div>
  </aside>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
const auth = useAuthStore()
const theme = useThemeStore()

const IconHome = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>' }
const IconBrowse = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>' }
const IconCalendar = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' }
const IconAbout = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' }

const navItems = [
  { path: '/', label: '首页', icon: IconHome },
  { path: '/anime', label: '热门番剧', icon: IconBrowse },
  { path: '/schedule', label: '新番时间表', icon: IconCalendar },
  { path: '/about', label: '关于我们', icon: IconAbout },
]
</script>
