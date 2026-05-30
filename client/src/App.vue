<template>
  <div class="min-h-screen transition-colors duration-300" :style="{ background: 'var(--bg)' }">
    <Sidebar />
    <Navbar />

    <div class="md:ml-56 pb-14 md:pb-0 min-h-screen flex flex-col">
      <main class="flex-1 px-4 py-6 max-w-7xl mx-auto w-full md:px-8">
        <router-view v-slot="{ Component, route }">
          <transition
            @before-enter="onBeforeEnter"
            @enter="onEnter"
            @leave="onLeave"
            :css="false"
            mode="out-in"
          >
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
      <Footer />
    </div>
    <Toast />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { gsap } from 'gsap'
import Navbar from './components/Navbar.vue'
import Sidebar from './components/Sidebar.vue'
import Footer from './components/Footer.vue'
import Toast from './components/Toast.vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()

function onBeforeEnter(el) {
  gsap.set(el, { opacity: 0, y: 12 })
}

function onEnter(el, done) {
  gsap.to(el, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', onComplete: done })
}

function onLeave(el, done) {
  gsap.to(el, { opacity: 0, y: -8, duration: 0.2, ease: 'power2.in', onComplete: done })
}

onMounted(() => {
  auth.checkAuth()
})
</script>
