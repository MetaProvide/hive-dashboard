<script setup lang="ts">
import { onMounted } from 'vue'
import { useBee } from '../composables/useBee'
import CopyHash from './shared/CopyHash.vue'

const { health, addresses, stamps, topology, chainstate, wallet, loading, error, connected, refresh } = useBee()

onMounted(refresh)

function formatBzz(amount: string): string {
  const n = Number(amount)
  if (Number.isNaN(n)) return amount
  return (n / 1e16).toFixed(4) + ' BZZ'
}

function formatTtl(seconds: number): string {
  if (seconds < 0) return 'expired'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  if (d > 0) return `${d}d ${h}h`
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}
</script>

<template>
  <div>
    <div class="panel-header">
      <h2>Bee</h2>
      <button type="button" class="outline" @click="refresh">Refresh</button>
    </div>

    <p v-if="loading && !health">Loading...</p>
    <p v-if="error" class="error-msg">{{ error }}</p>

    <article v-if="health">
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1rem;">
        <strong>Status</strong>
        <span>
          <span class="status-dot" :class="connected ? 'online' : 'offline'"></span>
          {{ health.status }}
        </span>
        <strong>Version</strong><span>{{ health.version }}</span>
        <strong>API</strong><span>{{ health.apiVersion }}</span>
        <template v-if="addresses">
          <strong>Overlay</strong><CopyHash :hash="addresses.overlay" :chars="16" />
          <strong>Ethereum</strong><CopyHash :hash="addresses.ethereum" :chars="16" />
        </template>
        <template v-if="topology">
          <strong>Connected</strong><span>{{ topology.connected }} peers</span>
          <strong>Population</strong><span>{{ topology.population }}</span>
          <strong>Depth</strong><span>{{ topology.depth }}</span>
          <strong>Reachability</strong><span>{{ topology.reachability }}</span>
          <strong>Availability</strong><span>{{ topology.networkAvailability }}</span>
        </template>
        <template v-if="chainstate">
          <strong>Block</strong><span>{{ chainstate.block }}</span>
          <strong>Price</strong><span>{{ chainstate.currentPrice }}</span>
        </template>
        <template v-if="wallet">
          <strong>BZZ</strong><span>{{ formatBzz(wallet.bzzBalance) }}</span>
          <strong>xDAI</strong><span>{{ formatBzz(wallet.nativeTokenBalance) }}</span>
          <strong>Wallet</strong><CopyHash :hash="wallet.walletAddress" :chars="16" />
        </template>
      </div>
    </article>

    <h3>Postage Stamps</h3>
    <p v-if="stamps.length === 0" class="empty-state">No stamps found</p>

    <table v-else>
      <thead>
        <tr>
          <th>Batch ID</th>
          <th>Usable</th>
          <th>Depth</th>
          <th>Amount</th>
          <th>Utilization</th>
          <th>TTL</th>
          <th>Label</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in stamps" :key="s.batchID">
          <td><CopyHash :hash="s.batchID" /></td>
          <td>
            <span class="status-dot" :class="s.usable ? 'online' : 'offline'"></span>
            {{ s.usable ? 'YES' : 'NO' }}
          </td>
          <td>{{ s.depth }}</td>
          <td>{{ formatBzz(s.amount) }}</td>
          <td>{{ s.utilization }}</td>
          <td>{{ formatTtl(s.batchTTL) }}</td>
          <td>{{ s.label || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
