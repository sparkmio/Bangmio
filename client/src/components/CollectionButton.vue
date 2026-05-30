<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="btn btn-sm gap-2"
      :class="currentStatus ? 'btn-primary' : 'btn-outline border-base-300'"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
      </svg>
      {{ currentStatusText || '收藏' }}
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
    </button>

    <div v-if="open" class="absolute top-full mt-1 left-0 bg-base-100 rounded-lg shadow-xl z-30 border border-base-300 min-w-40">
      <ul class="menu menu-sm p-1">
        <li v-for="option in statusOptions" :key="option.value">
          <button @click="selectStatus(option.value)" class="flex items-center justify-between">
            {{ option.label }}
            <svg v-if="modelValue === option.value" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </button>
        </li>
        <div v-if="modelValue" class="divider my-0"></div>
        <li v-if="modelValue">
          <button @click="remove" class="text-error">移除收藏</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue', 'remove'])

const open = ref(false)

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
