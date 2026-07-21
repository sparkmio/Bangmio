<template>
  <div class="rating rating-sm gap-0.5">
    <input
      v-for="i in 10"
      :key="i"
      type="radio"
      :name="'rating-' + uid"
      class="mask mask-star-2"
      :class="i <= modelValue ? 'bg-amber-400' : 'bg-base-content/20'"
      :checked="i === modelValue"
      @click="$emit('update:modelValue', i)"
    />
  </div>
  <span v-if="showValue" class="ml-2 text-sm text-base-content/60">{{
    modelValue > 0 ? modelValue : '评分'
  }}</span>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: { type: Number, default: 0 },
  showValue: { type: Boolean, default: false }
})
defineEmits(['update:modelValue'])

const uid = ref(Math.random().toString(36).slice(2, 8))
</script>
