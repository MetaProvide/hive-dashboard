<script setup lang="ts">
import { useProxyFetch } from '../composables/useProxyFetch'
import ContentPreview from './shared/ContentPreview.vue'

const { protocol, identifier, result, loading, error, execute } = useProxyFetch()

const protocols = ['bzz', 'ipfs', 'chunks', 'bytes']
</script>

<template>
  <div>
    <div class="panel-header">
      <h2>Fetch</h2>
    </div>

    <form @submit.prevent="execute" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
      <select v-model="protocol" style="width: auto; flex-shrink: 0;">
        <option v-for="p in protocols" :key="p" :value="p">{{ p }}</option>
      </select>
      <input
        v-model="identifier"
        type="text"
        placeholder="CID, hash, or address..."
        style="flex: 1;"
      />
      <button type="submit" :disabled="loading || !identifier.trim()">
        {{ loading ? 'Fetching...' : 'Fetch' }}
      </button>
    </form>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <article v-if="result">
      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
        <span class="badge" :style="{ background: result.status < 400 ? '#4caf50' : '#f44336' }">
          {{ result.status }}
        </span>
        <span v-if="result.cacheHeader">
          Cache: <strong>{{ result.cacheHeader }}</strong>
        </span>
        <span>{{ result.elapsed }}ms</span>
        <span>{{ result.contentType }}</span>
        <span>{{ (result.content.size / 1024).toFixed(1) }} KB</span>
      </div>
      <ContentPreview :blob="result.content" :content-type="result.contentType" />
    </article>
  </div>
</template>
