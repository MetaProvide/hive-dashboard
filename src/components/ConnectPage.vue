<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { baseUrl, connect, shouldAutoConnect } from '../api/hive'
import { getDefaultNodeUrl } from '../config'
import HiveLogo from './shared/HiveLogo.vue'

const defaultNodeUrl = getDefaultNodeUrl()

const url = ref(baseUrl.value || defaultNodeUrl)
const error = ref('')
const connecting = ref(false)

async function onConnect(target = url.value) {
  const normalizedUrl = target.trim().replace(/\/+$/, '')

  if (!normalizedUrl) {
    error.value = 'Enter a node URL'
    return
  }

  url.value = normalizedUrl
  error.value = ''
  connecting.value = true
  try {
    const res = await fetch(`${normalizedUrl}/hive/status`)
    if (!res.ok) throw new Error(`Node returned ${res.status}`)
    connect(normalizedUrl)
  } catch (e) {
    error.value = `Cannot reach node: ${(e as Error).message}`
  } finally {
    connecting.value = false
  }
}

onMounted(() => {
  if (!shouldAutoConnect()) return

  void onConnect(defaultNodeUrl)
})
</script>

<template>
  <div class="connect-page">
    <div class="connect-box">
      <HiveLogo class="ascii-logo" />

      <form @submit.prevent="onConnect()">
        <label>
          <span>Node URL</span>
          <input v-model="url" type="text" :placeholder="defaultNodeUrl" />
        </label>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" :disabled="connecting">
          {{ connecting ? 'CONNECTING...' : 'CONNECT' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.connect-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.connect-box {
  width: 100%;
  max-width: 420px;
}

.ascii-logo {
  color: var(--t-bright);
  text-shadow: var(--t-glow);
  text-align: center;
  border: none;
  background: none;
  margin-bottom: 2rem;
  font-size: 0.8rem;
  line-height: 1.3;
}

label {
  display: block;
  margin-bottom: 0.75rem;
}

label span {
  display: block;
  font-size: 0.8rem;
  color: var(--t-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.25rem;
}

input {
  width: 100%;
}

button {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.6rem;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
}

button:hover:not(:disabled) {
  background: var(--t-dim);
  color: #000;
  text-shadow: none;
}
</style>
