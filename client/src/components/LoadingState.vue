<template>
  <div v-if="loading" class="flex flex-col items-center justify-center py-16 gap-3">
    <div class="flex gap-1">
      <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0s"></div>
      <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0.15s"></div>
      <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0.3s"></div>
    </div>
    <p class="text-xs text-base-content/30">加载中...</p>
  </div>
  <div v-else-if="error" class="text-center py-16">
    <p class="text-sm text-error mb-2">{{ error }}</p>
    <button @click="$emit('retry')" class="text-sm text-primary hover-underline-wipe">重试</button>
  </div>
</template>

<script setup>
defineProps({ loading: Boolean, error: String })
defineEmits(['retry'])
</script>
