<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <transition-group name="fade">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'alert shadow-lg text-sm min-w-60',
          toast.type === 'success'
            ? 'alert-success'
            : toast.type === 'error'
              ? 'alert-error'
              : 'alert-info'
        ]"
      >
        <span>{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToastStore } from '../stores/toast'
import { storeToRefs } from 'pinia'

const { toasts } = storeToRefs(useToastStore())
</script>
