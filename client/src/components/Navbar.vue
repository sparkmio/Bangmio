<template>
  <!-- Mobile top bar -->
  <div class="md:hidden sticky top-0 z-50 bg-base-100/70 backdrop-blur-xl border-b border-base-300/40">
    <div class="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto">
      <router-link to="/" class="flex items-center gap-2">
        <img src="/logo.png" alt="Bangmio" class="w-7 h-7 rounded-md" />
        <span class="text-lg font-bold text-primary tracking-tight">Bangmio</span>
      </router-link>
      <div class="flex items-center gap-2">
        <button @click="theme.toggle()" class="p-2 rounded-md hover:bg-base-200 transition-colors">
          <svg v-if="theme.theme === 'dark'" class="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          <svg v-else class="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        </button>
        <template v-if="auth.isLoggedIn">
          <router-link to="/profile" class="flex items-center">
            <div class="w-7 h-7 rounded-full overflow-hidden ring-2 ring-primary/20">
              <img v-if="auth.user?.avatar?.medium || auth.user?.avatar?.large" :src="auth.user.avatar.medium || auth.user.avatar.large" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold">
                {{ auth.user?.nickname?.[0] || auth.user?.username?.[0]?.toUpperCase() }}
              </div>
            </div>
          </router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-white">登录</router-link>
        </template>
      </div>
    </div>
  </div>

  <!-- Mobile bottom nav -->
  <div class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-100/70 backdrop-blur-xl border-t border-base-300/40">
    <div class="flex items-center justify-around h-14 px-2 max-w-7xl mx-auto">
      <router-link
        v-for="tab in mobileTabs"
        :key="tab.path"
        :to="tab.path"
        class="flex flex-col items-center gap-0.5 text-xs transition-colors py-1 px-3 rounded-md"
        :class="$route.path === tab.path ? 'text-primary' : 'text-base-content/40'"
      >
        <component :is="tab.icon" class="w-5 h-5" />
        <span>{{ tab.label }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
const auth = useAuthStore()
const theme = useThemeStore()

const IconHome = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>' }
const IconBrowse = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>' }
const IconSchedule = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' }
const IconProfile = { template: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>' }

const mobileTabs = [
  { path: '/', label: '首页', icon: IconHome },
  { path: '/anime', label: '番剧', icon: IconBrowse },
  { path: '/schedule', label: '时间表', icon: IconSchedule },
  { path: '/profile', label: '我的', icon: IconProfile },
]
</script>
