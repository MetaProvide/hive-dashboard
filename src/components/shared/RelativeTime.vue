<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  timestamp: number
}>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const label = computed(() => {
  const t = props.timestamp
  if (!t || !Number.isFinite(t)) return '—'
  const ms = now.value - t
  if (ms < 0) return 'just now'
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
})

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 30_000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <time :datetime="new Date(timestamp).toISOString()">{{ label }}</time>
</template>
