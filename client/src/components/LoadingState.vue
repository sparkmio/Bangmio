<template>
  <div class="flex justify-center py-12" v-if="loading">
    <div class="w-8 h-8 border-2 rounded-full animate-spin" :style="{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }"></div>
  </div>
  <div v-else-if="error" class="text-center py-12">
    <p class="mb-2" style="color: var(--danger)">{{ error }}</p>
    <button @click="$emit('retry')" class="text-sm hover:underline" style="color: var(--primary)">重试</button>
  </div>
</template>

<script setup>
defineProps({ loading: Boolean, error: String })
defineEmits(['retry'])
</script>
