<template>
  <div v-if="loading && skeleton" class="anime-grid">
    <div v-for="i in 8" :key="i" class="rounded-xl overflow-hidden">
      <div class="skeleton aspect-[2/3]" />
      <div class="skeleton h-3 mt-2 rounded" />
      <div class="skeleton h-2 mt-1 rounded w-2/3" />
    </div>
  </div>
  <div v-else-if="loading" class="flex justify-center py-12">
    <span class="loading loading-spinner loading-lg text-primary/60" />
  </div>
  <div v-else-if="error" class="text-center py-12">
    <p class="mb-2 text-error">
      {{ error }}
    </p>
    <button class="btn btn-ghost btn-sm text-primary" @click="$emit('retry')">重试</button>
  </div>
</template>

<script setup>
defineProps({
  loading: Boolean,
  error: { type: String, default: '' },
  skeleton: { type: Boolean, default: false }
})
defineEmits(['retry'])
</script>
