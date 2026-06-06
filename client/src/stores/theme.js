import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(localStorage.getItem('theme') || 'light')
  const fontSize = ref(Number(localStorage.getItem('fontSize')) || 14)
  const density = ref(localStorage.getItem('density') || 'comfortable')

  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(t) {
    theme.value = t
  }

  function setFontSize(size) {
    fontSize.value = size
  }

  function setDensity(d) {
    density.value = d
  }

  function reset() {
    theme.value = 'light'
    fontSize.value = 14
    density.value = 'comfortable'
    localStorage.removeItem('fontSize')
    localStorage.removeItem('density')
  }

  watchEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme.value)
    root.classList.toggle('dark', theme.value === 'dark')
    root.classList.toggle('light', theme.value === 'light')
    localStorage.setItem('theme', theme.value)
  })

  watchEffect(() => {
    document.documentElement.style.fontSize = fontSize.value + 'px'
    localStorage.setItem('fontSize', String(fontSize.value))
  })

  watchEffect(() => {
    document.documentElement.setAttribute('data-density', density.value)
    localStorage.setItem('density', density.value)
  })

  return { theme, fontSize, density, toggle, setTheme, setFontSize, setDensity, reset }
})
