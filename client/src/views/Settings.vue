<template>
  <div class="max-w-xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <a @click.prevent="$router.back()" class="text-sm text-primary hover-underline-wipe cursor-pointer">← 返回</a>
      <h1 class="text-2xl font-semibold text-base-content">设置</h1>
    </div>

    <!-- Appearance -->
    <div class="rounded-xl bg-base-200/40 p-5 mb-4">
      <h2 class="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-4">外观</h2>

      <div class="flex items-center justify-between py-3 border-b border-base-300/50">
        <span class="text-sm text-base-content">主题</span>
        <div class="flex gap-2">
          <button @click="theme.setTheme('light')" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="theme.theme === 'light' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'">浅色</button>
          <button @click="theme.setTheme('dark')" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="theme.theme === 'dark' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'">暗色</button>
        </div>
      </div>

      <div class="flex items-center justify-between py-3 border-b border-base-300/50">
        <span class="text-sm text-base-content">字号</span>
        <div class="flex gap-2">
          <button @click="theme.setFontSize(12)" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="theme.fontSize === 12 ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'">小</button>
          <button @click="theme.setFontSize(14)" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="theme.fontSize === 14 ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'">中</button>
          <button @click="theme.setFontSize(16)" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="theme.fontSize === 16 ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'">大</button>
        </div>
      </div>

      <div class="flex items-center justify-between py-3">
        <span class="text-sm text-base-content">间距</span>
        <div class="flex gap-2">
          <button @click="theme.setDensity('compact')" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="theme.density === 'compact' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'">紧凑</button>
          <button @click="theme.setDensity('comfortable')" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="theme.density === 'comfortable' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'">舒适</button>
        </div>
      </div>
    </div>

    <!-- Reset -->
    <div class="rounded-xl bg-base-200/40 p-5">
      <button @click="theme.reset()" class="w-full py-2 text-sm text-base-content/60 hover:text-error transition-colors text-center">
        恢复默认设置
      </button>
    </div>
  </div>
</template>

<script setup>
import { useThemeStore } from '../stores/theme'
const theme = useThemeStore()
</script>
