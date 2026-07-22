<template>
  <div class="bg-base-200/40 rounded-xl p-5 space-y-4">
    <div>
      <h3 class="text-base font-semibold text-base-content line-clamp-2">
        {{ title }}
      </h3>

      <!-- 豆瓣评分与 meta -->
      <template v-if="source === 'douban'">
        <div v-if="meta?.rate" class="mt-3">
          <p class="text-4xl font-black" style="color: #ff6b81">
            {{ meta.rate }}
          </p>
          <div class="flex items-center gap-0.5 mt-1">
            <svg
              v-for="i in 5"
              :key="i"
              class="w-4 h-4"
              :class="
                i <= Math.round(parseFloat(meta.rate) / 2) ? 'text-amber-400' : 'text-base-300'
              "
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          </div>
        </div>
        <p v-if="doubanMetaText" class="text-xs text-base-content/50 mt-2">
          {{ doubanMetaText }}
        </p>
      </template>
    </div>

    <!-- 摘要内容 -->
    <div
      v-if="content"
      v-safe-html="content"
      class="text-sm text-base-content/70 leading-relaxed break-words"
    />
    <p v-else class="text-sm text-base-content/40">无法加载摘要</p>

    <!-- 操作按钮 -->
    <div class="flex flex-wrap items-center gap-3 pt-1">
      <a
        :href="url"
        target="_blank"
        class="btn btn-sm border-0 text-white hover:opacity-90"
        style="background-color: #ff6b81"
      >
        查看原站 →
      </a>
      <button class="btn btn-sm btn-ghost" @click="$emit('retry')">重试</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { vSafeHtml } from '../directives/safeHtml'

const props = defineProps({
  source: {
    type: String,
    required: true,
    validator: v => ['douban', 'moegirl'].includes(v)
  },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  url: { type: String, default: '' },
  meta: { type: Object, default: () => ({}) }
})

defineEmits(['retry'])

const doubanMetaText = computed(() => {
  const parts = []
  if (props.meta?.year) parts.push(props.meta.year)
  if (props.meta?.genre) {
    const genre = Array.isArray(props.meta.genre) ? props.meta.genre.join(' / ') : props.meta.genre
    if (genre) parts.push(genre)
  }
  if (props.meta?.keyInfo) {
    const info = Array.isArray(props.meta.keyInfo)
      ? props.meta.keyInfo.join(' / ')
      : props.meta.keyInfo
    if (info) parts.push(info)
  }
  return parts.join(' / ')
})
</script>
