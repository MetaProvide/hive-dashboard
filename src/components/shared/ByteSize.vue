<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  bytes: number
}>()

const label = computed(() => {
  const n = props.bytes
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
})
</script>

<template>
  <span>{{ label }}</span>
</template>
