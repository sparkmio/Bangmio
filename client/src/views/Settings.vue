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

    <!-- 账号安全（仅 Bangmio 用户显示） -->
    <div v-if="auth.isBangmioUser" class="rounded-xl bg-base-200/40 p-5 mb-4">
      <h2 class="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-4">
        账号安全
      </h2>

      <div v-if="passwordSuccess" class="alert alert-success mb-3 py-2">
        <span class="text-sm">{{ passwordSuccess }}</span>
      </div>
      <div v-if="passwordError" class="alert alert-error mb-3 py-2">
        <span class="text-sm">{{ passwordError }}</span>
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="handleChangePassword">
        <div class="flex flex-col gap-1.5">
          <input
            v-model="currentPassword"
            type="password"
            placeholder="原密码"
            class="input input-bordered w-full"
            autocomplete="current-password"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <input
            v-model="newPassword"
            type="password"
            placeholder="新密码（至少 8 位）"
            class="input input-bordered w-full"
            autocomplete="new-password"
          />
          <p v-if="newPasswordError" class="text-xs text-error ml-1">{{ newPasswordError }}</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="确认新密码"
            class="input input-bordered w-full"
            autocomplete="new-password"
          />
          <p v-if="confirmError" class="text-xs text-error ml-1">{{ confirmError }}</p>
        </div>

        <button
          type="submit"
          :disabled="auth.loading || !canChangePassword"
          class="btn btn-primary w-full"
        >
          {{ auth.loading ? '更新中...' : '更新密码' }}
        </button>
      </form>
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
import { ref, computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useAuthStore } from '../stores/auth'

const theme = useThemeStore()
const auth = useAuthStore()

const mirror = ref(localStorage.getItem('bangmio_mirror') || 'intl')

function setMirror(val) {
  mirror.value = val
  localStorage.setItem('bangmio_mirror', val)
}

// 账号安全：修改密码表单（仅 Bangmio 用户）
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordSuccess = ref('')
const passwordError = ref('')

const newPasswordError = computed(() => {
  if (!newPassword.value) return ''
  if (newPassword.value.length < 8) return '密码至少 8 位'
  return ''
})

const confirmError = computed(() => {
  if (!confirmPassword.value) return ''
  if (confirmPassword.value !== newPassword.value) return '两次密码不一致'
  return ''
})

const canChangePassword = computed(
  () =>
    !!currentPassword.value &&
    newPassword.value.length >= 8 &&
    confirmPassword.value === newPassword.value
)

async function handleChangePassword() {
  if (!canChangePassword.value) return
  passwordSuccess.value = ''
  passwordError.value = ''
  try {
    await auth.changePassword(currentPassword.value, newPassword.value)
    passwordSuccess.value = '密码已更新'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    passwordError.value = err.response?.data?.error || auth.error || '密码更新失败'
  }
}
</script>
