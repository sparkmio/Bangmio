import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])
  let id = 0

  function show(message, type = 'info', duration = 3000) {
    const toast = { id: ++id, message, type, duration }
    toasts.value.push(toast)
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== toast.id)
    }, duration)
  }

  function success(msg) {
    show(msg, 'success')
  }
  function error(msg) {
    show(msg, 'error')
  }
  function info(msg) {
    show(msg, 'info')
  }

  return { toasts, show, success, error, info }
})
