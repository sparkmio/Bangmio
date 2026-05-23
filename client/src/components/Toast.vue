<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <transition-group name="fade">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-w-60 backdrop-blur',
          toast.type === 'success' ? 'bg-green-600/90 text-white' :
          toast.type === 'error' ? 'bg-red-600/90 text-white' :
          'bg-gray-800/90 text-gray-100'
        ]"
      >
        {{ toast.message }}
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToastStore } from '../stores/toast'
import { storeToRefs } from 'pinia'

const { toasts } = storeToRefs(useToastStore())
</script>
