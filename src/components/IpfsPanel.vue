<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useIpfs } from '../composables/useIpfs'
import CopyHash from './shared/CopyHash.vue'
import ByteSize from './shared/ByteSize.vue'

const { identity, swarmPeers, repoStat, version, loading, error, connected, refresh } = useIpfs()

const peerCount = computed(() => swarmPeers.value?.Peers?.length ?? 0)

onMounted(refresh)
</script>

<template>
  <div>
    <div class="panel-header">
      <h2>IPFS</h2>
      <button type="button" class="outline" @click="refresh">Refresh</button>
    </div>

    <p v-if="loading && !identity">Loading...</p>
    <p v-if="error" class="error-msg">{{ error }}</p>

    <article v-if="identity || version">
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1rem;">
        <strong>Status</strong>
        <span>
          <span class="status-dot" :class="connected ? 'online' : 'offline'"></span>
          {{ connected ? 'CONNECTED' : 'OFFLINE' }}
        </span>
        <template v-if="version">
          <strong>Version</strong><span>{{ version.Version }}</span>
          <strong>Repo</strong><span>{{ version.Repo }}</span>
          <strong>Go</strong><span>{{ version.Golang }}</span>
        </template>
        <template v-if="identity">
          <strong>Peer ID</strong><CopyHash :hash="identity.ID" :chars="16" />
          <strong>Protocol</strong><span>{{ identity.ProtocolVersion }}</span>
          <strong>Agent</strong><span>{{ identity.AgentVersion }}</span>
        </template>
        <strong>Swarm Peers</strong><span>{{ peerCount }}</span>
        <template v-if="repoStat">
          <strong>Repo Size</strong><ByteSize :bytes="repoStat.RepoSize" />
          <strong>Storage Max</strong><ByteSize :bytes="repoStat.StorageMax" />
          <strong>Objects</strong><span>{{ repoStat.NumObjects.toLocaleString() }}</span>
        </template>
      </div>
    </article>

    <h3>Swarm Peers</h3>
    <p v-if="peerCount === 0" class="empty-state">No connected peers</p>

    <table v-else>
      <thead>
        <tr>
          <th>Peer ID</th>
          <th>Address</th>
          <th>Latency</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="peer in swarmPeers?.Peers ?? []" :key="peer.Peer">
          <td><CopyHash :hash="peer.Peer" /></td>
          <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {{ peer.Addr }}
          </td>
          <td>{{ peer.Latency || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
