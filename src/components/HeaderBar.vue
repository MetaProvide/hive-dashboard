<script setup lang="ts">
import { useStatus } from '../composables/useStatus'
import { disconnect } from '../api/hive'
import CopyHash from './shared/CopyHash.vue'

const { status, connected, beeUp, ipfsUp } = useStatus()
</script>

<template>
  <header class="app-header">
    
    <div style="margin-left: auto;">
    <div class="status-badges" v-if="status">
      <span>
        <span class="status-dot" :class="connected ? 'online' : 'offline'"></span>
        {{ connected ? 'ONLINE' : 'OFFLINE' }}
      </span>
      <span>peers:<strong>{{ status.connectedPeers }}</strong></span>
      <span>stored:<strong>{{ status.storedContent }}</strong></span>
      <CopyHash :hash="status.peerKey" :chars="8" />
      <span v-if="beeUp !== null || ipfsUp !== null" class="sep">|</span>
      <span v-if="beeUp !== null">
        <span class="status-dot" :class="beeUp ? 'online' : 'offline'"></span>
        bee
      </span>
      <span v-if="ipfsUp !== null">
        <span class="status-dot" :class="ipfsUp ? 'online' : 'offline'"></span>
        ipfs
      </span>
      <span class="sep">|</span>
      <button class="disconnect-btn" @click="disconnect">DISCONNECT</button>
    </div>
      
    </div>
  </header>
</template>

<style scoped>
.sep {
  color: var(--t-border);
}

.disconnect-btn {
  background: none;
  border: 1px solid var(--t-dim);
  color: var(--t-dim);
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
  letter-spacing: 0.06em;
  line-height: 1;
}

.disconnect-btn:hover {
  border-color: var(--t-bright);
  color: var(--t-bright);
}
</style>
