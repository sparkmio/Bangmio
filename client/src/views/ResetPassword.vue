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
          <h1 class="text-2xl font-bold text-base-content">重置密码</h1>
          <p v-if="email" class="text-sm text-base-content/60 mt-1">验证码已发送至 {{ email }}</p>
        </div>

        <div v-if="auth.error" class="alert alert-error mb-4">
          <span>{{ auth.error }}</span>
        </div>

        <div v-if="successMessage" class="alert alert-success mb-4">
          <span>{{ successMessage }}</span>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
          <div class="flex flex-col gap-1.5">
            <input
              v-model="code"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              placeholder="邮箱验证码"
              class="input input-bordered w-full"
              autocomplete="one-time-code"
            />
            <p v-if="codeError" class="text-xs text-error ml-1">{{ codeError }}</p>
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
            :disabled="auth.loading || !canSubmit"
            class="btn btn-primary w-full mt-1"
          >
            {{ auth.loading ? '重置中...' : '重置密码' }}
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
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()

const email = ref((route.query.email && String(route.query.email)) || '')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const successMessage = ref('')

const codeError = computed(() => {
  if (!code.value) return ''
  if (!/^\d{6}$/.test(code.value)) return '验证码为 6 位数字'
  return ''
})

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

const canSubmit = computed(
  () =>
    /^\d{6}$/.test(code.value) &&
    newPassword.value.length >= 8 &&
    confirmPassword.value === newPassword.value
)

async function handleSubmit() {
  if (!canSubmit.value) return
  if (!email.value) {
    auth.error = '缺少邮箱参数，请返回忘记密码页重新操作'
    return
  }
  auth.error = ''
  successMessage.value = ''
  try {
    await auth.resetPassword(email.value, code.value, newPassword.value)
    toast.success('密码已重置，请登录')
    router.push('/login')
  } catch {
    // 错误已写入 auth.error
  }
}
</script>
