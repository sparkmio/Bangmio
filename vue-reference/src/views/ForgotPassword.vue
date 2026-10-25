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
          <h1 class="text-2xl font-bold text-base-content">找回密码</h1>
        </div>

        <div v-if="auth.error" class="alert alert-error mb-4">
          <span>{{ auth.error }}</span>
        </div>

        <div v-if="infoMessage" class="alert alert-success mb-4">
          <span>{{ infoMessage }}</span>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
          <div class="flex flex-col gap-1.5">
            <input
              v-model="email"
              type="email"
              placeholder="邮箱"
              class="input input-bordered w-full"
              autocomplete="email"
            />
            <p v-if="emailError" class="text-xs text-error ml-1">{{ emailError }}</p>
          </div>

          <!-- 人机验证（仅当配置了 Turnstile site key 时显示） -->
          <div v-if="turnstileSiteKey" class="flex flex-col gap-1.5">
            <div ref="turnstileContainer" class="cf-turnstile min-h-[65px]" />
            <p v-if="turnstileError" class="text-xs text-error ml-1">{{ turnstileError }}</p>
          </div>

          <button
            type="submit"
            :disabled="auth.loading || cooldown > 0 || !canSubmit"
            class="btn btn-primary w-full mt-1"
          >
            {{
              auth.loading ? '发送中...' : cooldown > 0 ? `${cooldown}s 后可重新发送` : '发送验证码'
            }}
          </button>
        </form>

        <p class="text-sm text-center mt-4 text-base-content/50">
          想起密码了？
          <router-link to="/login" class="link link-primary">返回登录</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const infoMessage = ref('')
const cooldown = ref(0)
let cooldownTimer = null

// Turnstile 配置：未配置 site key 时跳过人机验证
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const turnstileContainer = ref(null)
const captchaToken = ref('')
const turnstileError = ref('')
let turnstileWidgetId = null

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailError = computed(() => {
  if (!email.value) return ''
  if (!EMAIL_REGEX.test(email.value)) return '邮箱格式不正确'
  return ''
})

const canSubmit = computed(() => {
  if (!EMAIL_REGEX.test(email.value)) return false
  if (turnstileSiteKey && !captchaToken.value) return false
  return true
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

function startCooldown(seconds) {
  cooldown.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) {
      cooldown.value = 0
      if (cooldownTimer) {
        clearInterval(cooldownTimer)
        cooldownTimer = null
      }
    }
  }, 1000)
}

async function handleSubmit() {
  if (!canSubmit.value || cooldown.value > 0) return
  infoMessage.value = ''
  auth.error = ''
  try {
    await auth.forgotPassword(email.value, captchaToken.value)
    // 无论后端是否真实发送，均提示相同信息以防止邮箱探测
    infoMessage.value = '如果该邮箱已注册，验证码已发送'
    startCooldown(60)
    // 跳转到重置密码页并携带 email query
    router.push({ path: '/reset-password', query: { email: email.value } })
  } catch {
    // 错误已写入 auth.error；Turnstile token 一次性，需重置
    resetTurnstile()
  }
}

onMounted(loadTurnstile)

onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
  if (window.turnstile && turnstileWidgetId !== null) {
    try {
      window.turnstile.remove(turnstileWidgetId)
    } catch {
      // ignore
    }
  }
})
</script>
