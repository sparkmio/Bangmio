<template>
  <aside class="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-40 border-r transition-colors duration-300" :style="{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }">
    <router-link to="/" class="flex items-center gap-3 px-5 h-16 border-b transition-colors duration-300 shrink-0" :style="{ borderColor: 'var(--border)' }">
      <img src="/logo.png" alt="Bangmio" class="w-8 h-8 rounded-lg object-cover" />
      <span class="text-lg font-bold" style="color: var(--primary)">Bangmio</span>
    </router-link>

    <nav class="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
        :class="$route.path === item.path ? 'nav-active' : 'nav-inactive'"
      >
        <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
        <span>{{ item.label }}</span>
      </router-link>


    </nav>

    <div class="px-3 py-4 border-t shrink-0" :style="{ borderColor: 'var(--border)' }">
      <template v-if="auth.isLoggedIn">
        <router-link to="/profile" class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 hover:brightness-110" style="background: var(--primary-bg)">
          <img
            v-if="auth.user?.avatar?.medium || auth.user?.avatar?.large"
            :src="auth.user.avatar.medium || auth.user.avatar.large"
            class="w-8 h-8 rounded-full object-cover"
          />
          <div v-else class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style="background: var(--primary)">
            {{ auth.user?.nickname?.[0] || auth.user?.username?.[0]?.toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate" style="color: var(--text)">{{ auth.user?.nickname || auth.user?.username }}</p>
            <p class="text-xs truncate" style="color: var(--text-muted)">查看主页</p>
          </div>
        </router-link>
        <button @click="auth.logout()" class="w-full mt-2 px-3 py-2 rounded-lg text-xs transition-colors duration-200" style="color: var(--text-muted)" @mouseenter="e => e.target.style.color = 'var(--danger)'" @mouseleave="e => e.target.style.color = 'var(--text-muted)'">
          退出登录
        </button>
      </template>
      <template v-else>
        <router-link to="/login" class="block w-full px-3 py-2.5 rounded-lg text-sm font-medium text-center text-white transition-all duration-200 hover:brightness-110" style="background: var(--primary)">
          登录 Bangmio
        </router-link>
      </template>

      <button @click="theme.toggle()" class="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors duration-200" style="color: var(--text-muted); background: var(--bg-hover)">
        <svg v-if="theme.theme === 'dark'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        {{ theme.theme === 'dark' ? '浅色模式' : '深色模式' }}
      </button>
    </div>
  </aside>
</template>

<script setup>
import { h } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()

const IconHome = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>' }
const IconBrowse = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>' }
const IconCalendar = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' }

const navItems = [
  { path: '/', label: '首页', icon: IconHome },
  { path: '/anime', label: '热门番剧', icon: IconBrowse },
  { path: '/schedule', label: '新番时间表', icon: IconCalendar },
]


</script>

<style scoped>
.nav-active {
  background: var(--primary-bg);
  color: var(--primary);
}
.nav-inactive {
  color: var(--text-secondary);
}
.nav-inactive:hover {
  background: var(--bg-hover);
  color: var(--text);
}
</style>
