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
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')

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

const canSubmit = computed(
  () =>
    EMAIL_REGEX.test(email.value) &&
    password.value.length >= 8 &&
    confirmPassword.value === password.value
)

async function handleSubmit() {
  if (!canSubmit.value) return
  try {
    await auth.registerWithBangmio(email.value, password.value)
  } catch {
    // 错误已写入 auth.error
  }
}
</script>
