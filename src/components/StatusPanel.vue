<script setup lang="ts">
import { useStatus } from '../composables/useStatus'
import CopyHash from './shared/CopyHash.vue'
import RelativeTime from './shared/RelativeTime.vue'

const { status, peers, loading, error, refresh } = useStatus()
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
        <strong>Node ID</strong><span>{{ status.nodeId }}</span>
        <strong>Peer Key</strong><CopyHash :hash="status.peerKey" :chars="16" />
        <strong>Drive Key</strong><CopyHash :hash="status.driveKey" :chars="16" />
        <strong>Seed</strong><span>{{ status.seed }}</span>
        <strong>Peers</strong><span>{{ status.connectedPeers }}</span>
        <strong>Content</strong><span>{{ status.storedContent }} items</span>
      </div>
    </article>

    <h3>Peers</h3>
    <p v-if="peers.length === 0" class="empty-state">No connected peers</p>
    <table v-else>
      <thead>
        <tr>
          <th>Key Hash</th>
          <th>Connected</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="peer in peers" :key="peer.keyHash">
          <td><CopyHash :hash="peer.keyHash" /></td>
          <td><RelativeTime :timestamp="peer.connectedAt" /></td>
          <td>
            <span class="status-dot" :class="peer.isConnected ? 'online' : 'offline'" />
            {{ peer.isConnected ? 'Online' : 'Offline' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
