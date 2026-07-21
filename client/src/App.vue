<template>
  <div class="min-h-screen bg-base-100">
    <Sidebar />
    <Navbar />

    <div class="md:ml-56 pb-14 md:pb-0 min-h-screen flex flex-col">
      <main class="flex-1 w-full px-5 py-6 md:px-8">
        <router-view v-slot="{ Component, route }">
          <transition
            :css="false"
            mode="out-in"
            @before-enter="onBeforeEnter"
            @enter="onEnter"
            @leave="onLeave"
          >
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
    </div>
    <Toast />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { gsap } from 'gsap'
import Navbar from './components/Navbar.vue'
import Sidebar from './components/Sidebar.vue'
import Toast from './components/Toast.vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()

function onBeforeEnter(el) {
  gsap.set(el, { opacity: 0, y: 8 })
}
function onEnter(el, done) {
  gsap.to(el, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', onComplete: done })
}
function onLeave(el, done) {
  gsap.to(el, { opacity: 0, y: -6, duration: 0.15, ease: 'power2.in', onComplete: done })
}

onMounted(() => {
  auth.checkAuth()
})
</script>
