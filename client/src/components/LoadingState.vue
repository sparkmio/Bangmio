<template>
  <div v-if="loading" class="flex justify-center py-12">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
  <div v-else-if="error" class="text-center py-12">
    <p class="mb-2 text-error">{{ error }}</p>
    <button @click="$emit('retry')" class="btn btn-ghost btn-sm text-primary">重试</button>
  </div>
</template>

<script setup>
defineProps({ loading: Boolean, error: String })
defineEmits(['retry'])
</script>
