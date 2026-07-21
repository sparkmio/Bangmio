<template>
  <div class="max-w-xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <a
        class="text-sm text-primary hover-underline-wipe cursor-pointer"
        @click.prevent="$router.back()"
        >← 返回</a
      >
      <h1 class="text-2xl font-semibold text-base-content">设置</h1>
    </div>

    <div class="rounded-xl bg-base-200/40 p-5 mb-4">
      <h2 class="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-4">外观</h2>

      <div class="flex items-center justify-between py-3 border-b border-base-300/50">
        <span class="text-sm text-base-content">主题</span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.theme === 'light' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setTheme('light')"
          >
            浅色
          </button>
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.theme === 'dark' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setTheme('dark')"
          >
            暗色
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between py-3 border-b border-base-300/50">
        <span class="text-sm text-base-content">字号</span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.fontSize === 12 ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setFontSize(12)"
          >
            小
          </button>
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.fontSize === 14 ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setFontSize(14)"
          >
            中
          </button>
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.fontSize === 16 ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setFontSize(16)"
          >
            大
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between py-3">
        <span class="text-sm text-base-content">间距</span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.density === 'compact'
                ? 'bg-primary text-white'
                : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setDensity('compact')"
          >
            紧凑
          </button>
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.density === 'comfortable'
                ? 'bg-primary text-white'
                : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setDensity('comfortable')"
          >
            舒适
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-xl bg-base-200/40 p-5 mb-4">
      <h2 class="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-4">内容</h2>

      <div class="flex items-center justify-between py-3 border-b border-base-300/50">
        <div>
          <span class="text-sm text-base-content">API 镜像</span>
          <p class="text-xs text-base-content/40 mt-0.5">国内用户选择国内镜像</p>
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              mirror === 'intl' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'
            "
            @click="setMirror('intl')"
          >
            国际
          </button>
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="mirror === 'cn' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'"
            @click="setMirror('cn')"
          >
            国内
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between py-3 border-b border-base-300/50">
        <span class="text-sm text-base-content">番名显示</span>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.nameLang === 'cn' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setNameLang('cn')"
          >
            优先中文
          </button>
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.nameLang === 'original'
                ? 'bg-primary text-white'
                : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setNameLang('original')"
          >
            优先原名
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between py-3">
        <div>
          <span class="text-sm text-base-content">NSFW 内容</span>
          <p class="text-xs text-base-content/40 mt-0.5">隐藏成人向内容</p>
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.nsfw === 'hide' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setNsfw('hide')"
          >
            隐藏
          </button>
          <button
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            :class="
              theme.nsfw === 'show' ? 'bg-primary text-white' : 'bg-base-200 text-base-content/60'
            "
            @click="theme.setNsfw('show')"
          >
            显示
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-xl bg-base-200/40 p-5">
      <button
        class="w-full py-2 text-sm text-base-content/60 hover:text-error transition-colors text-center"
        @click="theme.reset()"
      >
        恢复默认设置
      </button>
    </div>

    <div class="rounded-xl bg-base-200/40 p-5 mt-4">
      <router-link
        to="/about"
        class="w-full py-2 text-sm text-base-content/60 hover:text-primary transition-colors text-center block"
      >
        关于 Bangmio
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useThemeStore } from '../stores/theme'
const theme = useThemeStore()

const mirror = ref(localStorage.getItem('bangmio_mirror') || 'intl')

function setMirror(val) {
  mirror.value = val
  localStorage.setItem('bangmio_mirror', val)
}
</script>
