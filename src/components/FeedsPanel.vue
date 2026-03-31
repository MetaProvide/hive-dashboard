<script setup lang="ts">
import { onMounted } from 'vue'
import { useFeeds } from '../composables/useFeeds'
import CopyHash from './shared/CopyHash.vue'
import ByteSize from './shared/ByteSize.vue'
import RelativeTime from './shared/RelativeTime.vue'

const { scope, items, loading, error, autoRefresh, refresh, toggleAutoRefresh, switchScope } = useFeeds()

const scopes: Array<{ id: 'local' | 'network' | 'peers'; label: string }> = [
  { id: 'local', label: 'Local' },
  { id: 'network', label: 'Network' },
  { id: 'peers', label: 'Peers' },
]

onMounted(refresh)
</script>

<template>
  <div>
    <div class="panel-header">
      <h2>Feeds</h2>
      <div style="display: flex; gap: 0.5rem;">
        <button class="outline" @click="refresh">Refresh</button>
        <button :class="{ 'outline': !autoRefresh }" @click="toggleAutoRefresh">
          Auto {{ autoRefresh ? 'ON' : 'OFF' }}
        </button>
      </div>
    </div>

    <div class="tab-bar">
      <button
        v-for="s in scopes"
        :key="s.id"
        :class="{ active: scope === s.id }"
        @click="switchScope(s.id)"
      >
        {{ s.label }}
      </button>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading && items.length === 0">Loading...</p>
    <p v-else-if="items.length === 0" class="empty-state">No feed entries</p>

    <table v-else>
      <thead>
        <tr>
          <th>Checksum</th>
          <th>Type</th>
          <th>Size</th>
          <th>Peer</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(entry, i) in items" :key="i">
          <td><CopyHash :hash="entry.checksum" /></td>
          <td>{{ entry.contentType }}</td>
          <td><ByteSize :bytes="entry.size" /></td>
          <td><CopyHash :hash="entry.peerHash" :chars="8" /></td>
          <td>
            <RelativeTime v-if="entry.timestamp" :timestamp="entry.timestamp" />
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
