<template>
  <div class="rich-text whitespace-normal break-words leading-7">
    <template v-for="(line, lineIndex) in lines" :key="lineIndex">
      <span v-for="(segment, segmentIndex) in line" :key="segmentIndex">
        <a
          v-if="segment.href"
          :href="segment.href"
          target="_blank"
          rel="noopener noreferrer"
          class="link link-primary break-all"
          >{{ segment.text }}</a
        >
        <template v-else>{{ segment.text }}</template>
      </span>
      <br v-if="lineIndex < lines.length - 1" />
    </template>
    <span v-if="!lines.length" class="text-base-content/50">暂无内容。</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [String, Number], default: '' },
  fallback: { type: String, default: '暂无内容。' }
})

const URL_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/gi

function splitUrlPunctuation(raw) {
  const match = String(raw).match(/[.,!?;:，。！？；：)\]】》]+$/u)
  if (!match) return { url: String(raw), punctuation: '' }
  const punctuation = match[0]
  return { url: String(raw).slice(0, -punctuation.length), punctuation }
}

function tokenize(line) {
  const text = String(line || '')
  const segments = []
  let cursor = 0
  let match
  URL_PATTERN.lastIndex = 0
  while ((match = URL_PATTERN.exec(text))) {
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index) })
    const label = match[1]
    const rawUrl = match[2] || match[3]
    const { url, punctuation } = splitUrlPunctuation(rawUrl)
    segments.push({ text: label || url, href: url })
    if (punctuation) segments.push({ text: punctuation })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments.length ? segments : [{ text }]
}

const lines = computed(() => {
  const raw = props.value === null || props.value === undefined ? '' : String(props.value)
  const value = raw.trim() || props.fallback
  return value.split(/\r?\n/).map(tokenize)
})
</script>
