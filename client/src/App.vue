<template>
  <div class="min-h-screen bg-base-100">
    <Sidebar />
    <Navbar />

    <div
      class="md:ml-56 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 min-h-screen flex flex-col"
    >
      <main class="flex-1 w-full px-4 py-4 sm:px-5 sm:py-6 md:px-8">
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
    <BindBangumiModal
      :visible="auth.showBindModal"
      :return-url="currentPath"
      @close="auth.setShowBindModal(false)"
      @bound="auth.setShowBindModal(false)"
    />
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import Navbar from './components/Navbar.vue'
import Sidebar from './components/Sidebar.vue'
import Toast from './components/Toast.vue'
import BindBangumiModal from './components/BindBangumiModal.vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const currentRoute = useRoute()
const currentPath = computed(() => currentRoute.fullPath)

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
