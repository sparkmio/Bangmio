import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(localStorage.getItem('theme') || 'light')

  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(t) {
    theme.value = t
  }

  watchEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme.value === 'dark')
    root.classList.toggle('light', theme.value === 'light')
    localStorage.setItem('theme', theme.value)
  })

  return { theme, toggle, setTheme }
})
