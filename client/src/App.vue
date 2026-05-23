<template>
  <div class="min-h-screen transition-colors duration-300" :style="{ background: 'var(--bg)' }">
    <Sidebar />
    <Navbar />

    <div class="lg:ml-56 pb-14 lg:pb-0 min-h-screen flex flex-col">
      <main class="flex-1 px-4 py-6 max-w-7xl mx-auto w-full lg:px-8">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
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
import Navbar from './components/Navbar.vue'
import Sidebar from './components/Sidebar.vue'
import Footer from './components/Footer.vue'
import Toast from './components/Toast.vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()

onMounted(() => {
  auth.checkAuth()
})
</script>
