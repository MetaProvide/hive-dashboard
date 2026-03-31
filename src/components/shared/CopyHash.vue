<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  hash: string
  chars?: number
}>(), { chars: 12 })

const copied = ref(false)

async function copy() {
  await navigator.clipboard.writeText(props.hash)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}
</script>

<template>
  <code class="copy-hash" role="button" :title="hash" @click="copy">
    {{ hash.slice(0, chars) }}…
    <small v-if="copied" class="copied-badge">OK</small>
  </code>
</template>

<style scoped>
.copy-hash {
  cursor: pointer;
  position: relative;
  font-size: 0.85em;
  color: var(--t-accent);
}
.copy-hash:hover {
  text-shadow: 0 0 4px rgba(255, 204, 0, 0.4);
}
.copied-badge {
  position: absolute;
  top: -1.4em;
  left: 0;
  color: var(--t-fg);
  font-size: 0.7em;
  white-space: nowrap;
  text-shadow: var(--t-glow);
}
</style>
