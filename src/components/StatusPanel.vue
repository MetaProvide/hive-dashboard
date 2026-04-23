<script setup lang="ts">
import { useStatus } from '../composables/useStatus'
import CopyHash from './shared/CopyHash.vue'

const { status, loading, error, refresh } = useStatus()
</script>

<template>
  <div>
    <div class="panel-header">
      <h2>Status</h2>
      <button type="button" class="outline" @click="refresh">Refresh</button>
    </div>

    <p v-if="loading && !status">Loading...</p>
    <p v-if="error" class="error-msg">{{ error }}</p>

    <article v-if="status">
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem;">
        <strong>Node ID</strong><CopyHash :hash="status.nodeId" :chars="16" />
        <strong>Content</strong><span>{{ status.contentCount }} items</span>
        <strong>Bridged</strong><span>{{ status.bridgedCount }} items</span>
      </div>
    </article>
  </div>
</template>