<template>
  <div
    class="md:hidden sticky top-0 z-50 navbar bg-base-100/60 backdrop-blur-xl border-b border-base-300/50"
  >
    <div class="navbar-start">
      <router-link to="/" class="flex items-center gap-2">
        <img src="/logo.png" alt="Bangmio" class="w-7 h-7 rounded-lg" decoding="async" />
        <span class="text-lg font-black text-primary">Bangmio</span>
      </router-link>
    </div>
    <div class="navbar-end gap-1">
      <button class="btn btn-ghost btn-sm btn-circle" @click="theme.toggle()">
        <svg
          v-if="theme.theme === 'dark'"
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </button>
      <template v-if="auth.isLoggedIn">
        <router-link to="/profile" class="btn btn-ghost btn-sm btn-circle avatar">
          <div class="w-7 h-7 rounded-full ring-2 ring-primary/30">
            <img
              v-if="auth.effectiveUser?.avatar?.medium || auth.effectiveUser?.avatar?.large"
              :src="auth.effectiveUser.avatar.medium || auth.effectiveUser.avatar.large"
              :alt="auth.effectiveUser?.nickname || auth.effectiveUser?.username || ''"
              class="rounded-full"
              decoding="async"
            />
            <div
              v-else
              class="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold"
            >
              {{
                auth.effectiveUser?.nickname?.[0] ||
                auth.effectiveUser?.username?.[0]?.toUpperCase()
              }}
            </div>
          </div>
        </router-link>
      </template>
      <template v-else>
        <router-link to="/login" class="btn btn-primary btn-sm rounded-full"> 登录 </router-link>
      </template>
    </div>
  </div>

  <div
    class="md:hidden fixed bottom-0 left-0 right-0 z-50 btm-nav bg-base-100/60 backdrop-blur-xl border-t border-base-300/50"
  >
    <router-link
      to="/"
      :class="$route.path === '/' ? 'active text-primary' : 'text-base-content/40'"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
      <span class="btm-nav-label text-xs">首页</span>
    </router-link>
    <router-link
      to="/anime"
      :class="$route.path === '/anime' ? 'active text-primary' : 'text-base-content/40'"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span class="btm-nav-label text-xs">搜索</span>
    </router-link>
    <router-link
      to="/settings"
      :class="$route.path === '/settings' ? 'active text-primary' : 'text-base-content/40'"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <span class="btm-nav-label text-xs">设置</span>
    </router-link>
    <router-link
      to="/profile"
      :class="$route.path === '/profile' ? 'active text-primary' : 'text-base-content/40'"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
      <span class="btm-nav-label text-xs">{{ auth.isLoggedIn ? '我的' : '登录' }}</span>
    </router-link>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
const auth = useAuthStore()
const theme = useThemeStore()
</script>
