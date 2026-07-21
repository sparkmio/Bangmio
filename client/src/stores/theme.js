import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(localStorage.getItem('theme') || 'light')
  const fontSize = ref(Number(localStorage.getItem('fontSize')) || 14)
  const density = ref(localStorage.getItem('density') || 'comfortable')
  const nameLang = ref(localStorage.getItem('nameLang') || 'cn')
  const nsfw = ref(localStorage.getItem('nsfw') || 'hide')

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

  function setNameLang(v) {
    nameLang.value = v
    localStorage.setItem('nameLang', v)
  }

  function setNsfw(v) {
    nsfw.value = v
    localStorage.setItem('nsfw', v)
  }

  function reset() {
    theme.value = 'light'
    fontSize.value = 14
    density.value = 'comfortable'
    nameLang.value = 'cn'
    nsfw.value = 'hide'
    localStorage.removeItem('fontSize')
    localStorage.removeItem('density')
    localStorage.removeItem('nameLang')
    localStorage.removeItem('nsfw')
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

  return {
    theme,
    fontSize,
    density,
    nameLang,
    nsfw,
    toggle,
    setTheme,
    setFontSize,
    setDensity,
    setNameLang,
    setNsfw,
    reset
  }
})
