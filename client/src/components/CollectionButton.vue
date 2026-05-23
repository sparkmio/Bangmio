<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2"
      :class="currentStatus ? 'active-collection' : ''"
      :style="currentStatus 
        ? { background: 'var(--primary-bg)', color: 'var(--primary)', borderColor: 'var(--primary)' }
        : { background: 'var(--bg-hover)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
      </svg>
      {{ currentStatusText || '收藏' }}
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
    </button>

    <div v-if="open" class="absolute top-full mt-1 left-0 rounded-lg shadow-xl z-30 py-1 min-w-40 border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
      <button
        v-for="option in statusOptions"
        :key="option.value"
        @click="selectStatus(option.value)"
        class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between"
        :style="{ color: modelValue === option.value ? 'var(--primary)' : 'var(--text-secondary)' }"
        @mouseenter="e => e.target.style.background = 'var(--bg-hover)'"
        @mouseleave="e => e.target.style.background = 'transparent'"
      >
        {{ option.label }}
        <svg v-if="modelValue === option.value" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style="color: var(--primary)">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
      </button>
      <div :style="{ borderTop: '1px solid var(--border)' }" v-if="modelValue">
        <button @click="remove" class="w-full text-left px-3 py-2 text-sm transition-colors" style="color: var(--danger)" @mouseenter="e => e.target.style.background = 'var(--bg-hover)'" @mouseleave="e => e.target.style.background = 'transparent'">
          移除收藏
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue', 'remove'])

const open = ref(false)

// Bangumi API status: 1=wish 想看, 2=collect 看过, 3=do 在看, 4=on_hold 搁置, 5=dropped 弃番
const statusOptions = [
  { label: '想看', value: 1 },
  { label: '看过', value: 2 },
  { label: '在看', value: 3 },
  { label: '搁置', value: 4 },
  { label: '弃番', value: 5 }
]

const currentStatusText = computed(() => {
  return statusOptions.find(o => o.value === props.modelValue)?.label
})

const currentStatus = computed(() => props.modelValue > 0)

function selectStatus(value) {
  emit('update:modelValue', value)
  open.value = false
}

function remove() {
  emit('remove')
  open.value = false
}
</script>
