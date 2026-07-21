<template>
  <div class="relative">
    <button
      class="btn btn-sm gap-2"
      :class="currentStatus ? 'btn-primary' : 'btn-outline border-base-300'"
      @click="open = !open"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      {{ currentStatusText || '收藏' }}
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute top-full mt-1 left-0 bg-base-100 rounded-lg shadow-xl z-30 border border-base-300 min-w-40"
    >
      <ul class="menu menu-sm p-1">
        <li v-for="option in statusOptions" :key="option.value">
          <button class="flex items-center justify-between" @click="selectStatus(option.value)">
            {{ option.label }}
            <svg
              v-if="pendingValue === option.value"
              class="w-4 h-4 text-primary"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </li>
        <div v-if="pendingValue" class="divider my-0" />
        <li v-if="pendingValue">
          <button class="text-error" @click="remove">移除收藏</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { getStatusOptions } from '../utils/subjectType'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  subjectType: { type: Number, default: 2 },
  epStatus: { type: Number, default: 0 },
  comment: { type: String, default: '' },
  tags: { type: Array, default: () => [] },
  score: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'remove'])

const open = ref(false)

// 即时 UI 反馈：用户点击后的本地值，无需等待父组件回填 modelValue
const pendingValue = ref(props.modelValue)

// 上次同步到后端的状态快照
// type: Bangumi collection type (1=wish, 2=collect, 3=do, 4=on_hold, 5=dropped)
const lastSyncedState = ref({
  type: props.modelValue,
  ep_status: props.epStatus,
  comment: props.comment,
  tags: [...props.tags],
  score: props.score
})

// 状态选项与标签（按 subjectType 动态生成）
const statusOptions = computed(() => getStatusOptions(props.subjectType))

const currentStatusText = computed(
  () => statusOptions.value.find(o => o.value === pendingValue.value)?.label
)

const currentStatus = computed(() => pendingValue.value > 0)

// 自定义 debounce（项目未装 lodash）
function debounce(fn, wait) {
  let timer = null
  function debounced(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn.apply(this, args)
    }, wait)
  }
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return debounced
}

function arrayEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

// 当前状态快照（pendingValue + 其他 props）
function currentState() {
  return {
    type: pendingValue.value,
    ep_status: props.epStatus,
    comment: props.comment,
    tags: [...props.tags],
    score: props.score
  }
}

// 对比当前状态与 lastSyncedState
function hasStateChanged() {
  const cur = currentState()
  const last = lastSyncedState.value
  return (
    cur.type !== last.type ||
    cur.ep_status !== last.ep_status ||
    cur.comment !== last.comment ||
    cur.score !== last.score ||
    !arrayEqual(cur.tags, last.tags)
  )
}

// 防抖同步：500ms 内若有新变更则重置，结束后只在 hasStateChanged 时 emit
const scheduleSync = debounce(() => {
  if (!hasStateChanged()) return
  emit('update:modelValue', pendingValue.value)
  // 乐观更新 type（其他字段由各自 watcher 维护）
  lastSyncedState.value = { ...lastSyncedState.value, type: pendingValue.value }
}, 500)

function selectStatus(value) {
  pendingValue.value = value
  scheduleSync()
  open.value = false
}

function remove() {
  emit('remove')
  open.value = false
}

// 父组件回填 modelValue（初次加载 / 外部重置 / 本组件 emit 回流）
watch(
  () => props.modelValue,
  val => {
    pendingValue.value = val
    lastSyncedState.value = { ...lastSyncedState.value, type: val }
  }
)

// 其他字段由父组件维护，变更时同步到 lastSyncedState
watch(
  () => [props.epStatus, props.comment, props.score, props.tags],
  ([ep, cmt, sc, tags]) => {
    lastSyncedState.value = {
      ...lastSyncedState.value,
      ep_status: ep,
      comment: cmt,
      score: sc,
      tags: [...tags]
    }
  }
)

onBeforeUnmount(() => {
  // 卸载前若有未同步变更，立即 flush（避免丢失用户最后操作）
  scheduleSync.cancel()
  if (hasStateChanged()) {
    emit('update:modelValue', pendingValue.value)
  }
})

defineExpose({
  lastSyncedState,
  hasStateChanged,
  scheduleSync,
  pendingValue
})
</script>
