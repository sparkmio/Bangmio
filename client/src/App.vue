<template>
  <div class="min-h-screen relative">
    <!-- 樱花飘落装饰 -->
    <div class="petal" v-for="i in 6" :key="i" :style="petalStyle(i)"></div>

    <Sidebar />
    <Navbar />

    <div class="md:ml-56 pb-14 md:pb-0 min-h-screen flex flex-col relative z-10">
      <main class="flex-1 w-full px-5 py-6 md:px-10 md:py-8">
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

function petalStyle(i) {
  const left = (i * 17 + 5) % 100
  const delay = (i * 2.3) % 12
  const duration = 12 + (i % 3) * 4
  const size = 6 + (i % 2) * 3
  return {
    left: left + '%',
    animationDelay: -delay + 's',
    animationDuration: duration + 's',
    width: size + 'px',
    height: size + 'px',
  }
}

function onBeforeEnter(el) { gsap.set(el, { opacity: 0, y: 12 }) }
function onEnter(el, done) { gsap.to(el, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', onComplete: done }) }
function onLeave(el, done) { gsap.to(el, { opacity: 0, y: -8, duration: 0.25, ease: 'power2.in', onComplete: done }) }

onMounted(() => { auth.checkAuth() })
</script>
