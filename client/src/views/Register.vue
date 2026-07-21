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
          <h1 class="text-2xl font-bold text-base-content">注册 Bangmio</h1>
        </div>

        <div v-if="auth.error" class="alert alert-error mb-4">
          <span>{{ auth.error }}</span>
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

          <div class="flex flex-col gap-1.5">
            <input
              v-model="password"
              type="password"
              placeholder="密码（至少 8 位）"
              class="input input-bordered w-full"
              autocomplete="new-password"
            />
            <p v-if="passwordError" class="text-xs text-error ml-1">{{ passwordError }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="确认密码"
              class="input input-bordered w-full"
              autocomplete="new-password"
            />
            <p v-if="confirmError" class="text-xs text-error ml-1">{{ confirmError }}</p>
          </div>

          <!-- 人机验证（仅当配置了 Turnstile site key 时显示） -->
          <div v-if="turnstileSiteKey" class="flex flex-col gap-1.5">
            <div ref="turnstileContainer" class="cf-turnstile min-h-[65px]" />
            <p v-if="turnstileError" class="text-xs text-error ml-1">{{ turnstileError }}</p>
          </div>

          <!-- 邮箱验证码 -->
          <div class="flex flex-col gap-1.5">
            <div class="flex gap-2">
              <input
                v-model="code"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                placeholder="邮箱验证码"
                class="input input-bordered flex-1"
                autocomplete="one-time-code"
              />
              <button
                type="button"
                :disabled="cooldown > 0 || !canSendCode || auth.loading"
                class="btn btn-outline whitespace-nowrap"
                @click="handleSendCode"
              >
                {{ cooldown > 0 ? `${cooldown}s` : '发送验证码' }}
              </button>
            </div>
            <p v-if="codeError" class="text-xs text-error ml-1">{{ codeError }}</p>
            <p v-if="codeSent && !codeError" class="text-xs text-success ml-1">
              验证码已发送至邮箱，10 分钟内有效
            </p>
          </div>

          <button type="submit" :disabled="auth.loading" class="btn btn-primary w-full mt-1">
            {{ auth.loading ? '注册中...' : '注册' }}
          </button>
        </form>

        <p class="text-sm text-center mt-4 text-base-content/50">
          已有账号？
          <router-link to="/login" class="link link-primary">立即登录</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')
const codeSent = ref(false)
const cooldown = ref(0)
let cooldownTimer = null

// Turnstile 配置：未配置 site key 时跳过人机验证（后端也兼容跳过）
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

const passwordError = computed(() => {
  if (!password.value) return ''
  if (password.value.length < 8) return '密码至少 8 位'
  return ''
})

const confirmError = computed(() => {
  if (!confirmPassword.value) return ''
  if (confirmPassword.value !== password.value) return '两次密码不一致'
  return ''
})

const codeError = computed(() => {
  if (!code.value) return ''
  if (!/^\d{6}$/.test(code.value)) return '验证码为 6 位数字'
  return ''
})

// 是否允许发送验证码：邮箱合法 + （Turnstile 已通过或未启用）
const canSendCode = computed(() => {
  if (!EMAIL_REGEX.test(email.value)) return false
  if (turnstileSiteKey && !captchaToken.value) return false
  return true
})

const canSubmit = computed(
  () =>
    EMAIL_REGEX.test(email.value) &&
    password.value.length >= 8 &&
    confirmPassword.value === password.value &&
    /^\d{6}$/.test(code.value) &&
    (!turnstileSiteKey || captchaToken.value)
)

// 动态加载 Turnstile 脚本并渲染 widget
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

async function handleSendCode() {
  if (!canSendCode.value || cooldown.value > 0) return
  codeSent.value = false
  auth.error = ''
  try {
    const result = await auth.sendVerificationCode(email.value, captchaToken.value)
    if (result.sent) {
      codeSent.value = true
      startCooldown(60)
    } else if (result.cooldownSeconds > 0) {
      // 后端返回未到冷却时间，按后端值同步倒计时
      startCooldown(result.cooldownSeconds)
    }
    // Turnstile token 一次性使用，发送后需重置
    resetTurnstile()
  } catch {
    // 错误已写入 auth.error
    resetTurnstile()
  }
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
  if (!canSubmit.value) return
  try {
    await auth.registerWithBangmio(email.value, password.value, code.value, captchaToken.value)
    // 注册成功后 store 会自动跳转到 /bind-bangumi
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

// 邮箱变更时清空已发送状态
watch(email, () => {
  codeSent.value = false
})
</script>
