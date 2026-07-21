<template>
  <div class="max-w-md mx-auto mt-6">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body p-8">
        <div class="text-center mb-6">
          <img
            src="/logo.png"
            alt="Bangmio"
            class="w-16 h-16 mx-auto rounded-2xl mb-3"
            decoding="async"
          />
          <h1 class="text-2xl font-bold text-base-content">登录 Bangmio</h1>
        </div>

        <!-- Tab 切换 -->
        <div class="flex gap-1 mb-4 bg-base-200 p-1 rounded-lg">
          <button
            class="flex-1 py-1.5 text-sm font-medium rounded-md transition-all"
            :class="
              activeTab === 'bangmio'
                ? 'bg-base-100 text-primary shadow-sm'
                : 'text-base-content/60 hover:text-base-content'
            "
            @click="activeTab = 'bangmio'"
          >
            Bangmio 账号
          </button>
          <button
            class="flex-1 py-1.5 text-sm font-medium rounded-md transition-all"
            :class="
              activeTab === 'bangumi'
                ? 'bg-base-100 text-primary shadow-sm'
                : 'text-base-content/60 hover:text-base-content'
            "
            @click="activeTab = 'bangumi'"
          >
            Bangumi 直登
          </button>
        </div>

        <div v-if="auth.error" class="alert alert-error mb-4">
          <span>{{ auth.error }}</span>
        </div>

        <!-- Tab 1: Bangmio 账号登录 -->
        <form
          v-if="activeTab === 'bangmio'"
          class="flex flex-col gap-3"
          @submit.prevent="handleBangmioLogin"
        >
          <input
            v-model="email"
            type="email"
            placeholder="邮箱"
            class="input input-bordered w-full"
            autocomplete="email"
          />
          <input
            v-model="password"
            type="password"
            placeholder="密码"
            class="input input-bordered w-full"
            autocomplete="current-password"
          />
          <div class="flex justify-end -mt-1">
            <router-link to="/forgot-password" class="text-xs link link-primary">
              忘记密码？
            </router-link>
          </div>

          <!-- 人机验证（仅当配置了 Turnstile site key 时显示） -->
          <div v-if="turnstileSiteKey" class="flex flex-col gap-1.5">
            <div ref="turnstileContainer" class="cf-turnstile min-h-[65px]" />
            <p v-if="turnstileError" class="text-xs text-error ml-1">{{ turnstileError }}</p>
          </div>

          <button
            type="submit"
            :disabled="auth.loading || (turnstileSiteKey && !captchaToken)"
            class="btn btn-primary w-full"
          >
            {{ auth.loading ? '登录中...' : '登录' }}
          </button>

          <p class="text-sm text-center mt-2 text-base-content/50">
            还没账号？
            <router-link to="/register" class="link link-primary">立即注册</router-link>
          </p>
        </form>

        <!-- Tab 2: Bangumi 直登 -->
        <div v-else class="flex flex-col gap-3">
          <div v-if="oauthWaiting" class="text-center py-4">
            <span class="loading loading-spinner loading-lg text-primary" />
            <p class="text-sm text-base-content/60 mt-3">请在浏览器中完成授权...</p>
          </div>

          <button
            v-else
            :disabled="auth.loading"
            class="btn w-full bg-[#2D89EF] text-white border-none hover:brightness-110"
            @click="oauthLogin"
          >
            {{ auth.loading ? '跳转中...' : '使用 Bangumi 账号登录' }}
          </button>

          <div class="divider text-xs text-base-content/40">或手动输入 Token</div>

          <form class="flex flex-col gap-3" @submit.prevent="handleTokenLogin">
            <input
              v-model="token"
              type="password"
              placeholder="粘贴 Access Token"
              class="input input-bordered w-full"
            />
            <button type="submit" :disabled="auth.loading || !token" class="btn btn-primary w-full">
              {{ auth.loading ? '验证中...' : 'Token 登录' }}
            </button>
          </form>

          <p class="text-xs text-center mt-2 text-base-content/50">
            前往
            <a
              href="https://next.bgm.tv/demo/access-token"
              target="_blank"
              class="link link-primary"
              >next.bgm.tv/demo/access-token</a
            >
            获取 Token
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import { userAPI } from '../api/endpoints'

const auth = useAuthStore()
const activeTab = ref('bangmio')
const email = ref('')
const password = ref('')
const token = ref('')
const oauthWaiting = ref(false)

// Turnstile 配置：未配置 site key 时跳过人机验证（后端也兼容跳过）
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const turnstileContainer = ref(null)
const captchaToken = ref('')
const turnstileError = ref('')
let turnstileWidgetId = null

// 切换 Tab 时清空错误信息；切回 Bangmio Tab 时重新渲染 Turnstile widget
watch(activeTab, newTab => {
  auth.error = ''
  if (newTab === 'bangmio' && turnstileSiteKey) {
    // 容器刚被 v-if 重建，旧 widget 已随 DOM 卸载，需重新渲染
    turnstileWidgetId = null
    captchaToken.value = ''
    turnstileError.value = ''
    nextTick(() => {
      if (window.turnstile) renderTurnstile()
    })
  }
})

// 动态加载 Turnstile 脚本并渲染 widget（复用自 Register.vue）
function loadTurnstile() {
  if (!turnstileSiteKey) return
  if (window.turnstile) {
    renderTurnstile()
    return
  }
  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  script.async = true
  script.defer = true
  script.onload = renderTurnstile
  document.head.appendChild(script)
}

function renderTurnstile() {
  if (!window.turnstile || !turnstileContainer.value) return
  // 切换 Tab 重建容器后旧 ID 失效，先尝试移除避免重复
  if (turnstileWidgetId !== null) {
    try {
      window.turnstile.remove(turnstileWidgetId)
    } catch {
      // ignore
    }
    turnstileWidgetId = null
  }
  turnstileWidgetId = window.turnstile.render(turnstileContainer.value, {
    sitekey: turnstileSiteKey,
    callback: token => {
      captchaToken.value = token
      turnstileError.value = ''
    },
    'expired-callback': () => {
      captchaToken.value = ''
      turnstileError.value = '人机验证已过期，请重新完成'
    },
    'error-callback': () => {
      captchaToken.value = ''
      turnstileError.value = '人机验证失败，请刷新重试'
    }
  })
}

function resetTurnstile() {
  if (window.turnstile && turnstileWidgetId !== null) {
    window.turnstile.reset(turnstileWidgetId)
  }
  captchaToken.value = ''
}

async function handleBangmioLogin() {
  if (!email.value || !password.value) return
  if (turnstileSiteKey && !captchaToken.value) return
  try {
    await auth.loginWithBangmio(email.value, password.value, captchaToken.value)
  } catch {
    // 错误已写入 auth.error；Turnstile token 一次性，需重置
    resetTurnstile()
  }
}

async function oauthLogin() {
  try {
    oauthWaiting.value = true
    const res = await userAPI.getOAuthUrl()
    window.location.href = res.data.data
  } catch {
    oauthWaiting.value = false
    auth.error = '获取授权链接失败'
  }
}

function handleTokenLogin() {
  if (token.value) auth.loginWithBangumi(token.value)
}

onMounted(loadTurnstile)

onBeforeUnmount(() => {
  if (window.turnstile && turnstileWidgetId !== null) {
    try {
      window.turnstile.remove(turnstileWidgetId)
    } catch {
      // ignore
    }
  }
})
</script>
