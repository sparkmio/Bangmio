<template>
  <nav class="lg:hidden sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300" :style="{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }">
    <div class="px-4 h-14 flex items-center justify-between max-w-7xl mx-auto">
      <router-link to="/" class="flex items-center gap-2">
        <img src="/logo.png" alt="Bangmio" class="w-7 h-7 rounded-md object-cover" />
        <span class="text-lg font-bold" style="color: var(--primary)">Bangmio</span>
      </router-link>

      <div class="flex items-center gap-2">
        <button @click="theme.toggle()" class="p-2 rounded-lg transition-colors" style="color: var(--text-muted)" @mouseenter="e => e.target.style.background = 'var(--bg-hover)'" @mouseleave="e => e.target.style.background = 'transparent'">
          <svg v-if="theme.theme === 'dark'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        </button>

        <template v-if="auth.isLoggedIn">
          <router-link to="/profile" class="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors" style="color: var(--text-secondary)">
            <img
              v-if="auth.user?.avatar?.medium || auth.user?.avatar?.large"
              :src="auth.user.avatar.medium || auth.user.avatar.large"
              class="w-7 h-7 rounded-full object-cover"
            />
            <div v-else class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background: var(--primary)">
              {{ auth.user?.nickname?.[0] || auth.user?.username?.[0]?.toUpperCase() }}
            </div>
          </router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all" style="background: var(--primary)">登录</router-link>
        </template>
      </div>
    </div>
  </nav>

  <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md transition-colors duration-300" :style="{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }">
    <div class="flex items-center justify-around h-14 px-2 max-w-7xl mx-auto">
      <router-link to="/" class="flex flex-col items-center gap-0.5 text-xs transition-colors" :class="$route.path === '/' ? 'active' : ''" :style="{ color: $route.path === '/' ? 'var(--primary)' : 'var(--text-muted)' }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        <span>首页</span>
      </router-link>
      <router-link to="/anime" class="flex flex-col items-center gap-0.5 text-xs transition-colors" :class="$route.path.startsWith('/anime') ? 'active' : ''" :style="{ color: $route.path.startsWith('/anime') ? 'var(--primary)' : 'var(--text-muted)' }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        <span>番剧</span>
      </router-link>
      <router-link to="/schedule" class="flex flex-col items-center gap-0.5 text-xs transition-colors" :class="$route.path === '/schedule' ? 'active' : ''" :style="{ color: $route.path === '/schedule' ? 'var(--primary)' : 'var(--text-muted)' }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <span>时间表</span>
      </router-link>
      <router-link to="/profile" class="flex flex-col items-center gap-0.5 text-xs transition-colors" :class="$route.path === '/profile' ? 'active' : ''" :style="{ color: $route.path === '/profile' ? 'var(--primary)' : 'var(--text-muted)' }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        <span>{{ auth.isLoggedIn ? '我的' : '登录' }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()
</script>
