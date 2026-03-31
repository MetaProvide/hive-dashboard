import { ref } from 'vue'
import {
  getBeeHealth,
  getBeeAddresses,
  getBeeStamps,
  getBeeTopology,
  getBeeChainstate,
  getBeeWallet,
  type BeeHealth,
  type BeeAddresses,
  type BeeStamp,
  type BeeTopology,
  type BeeChainstate,
  type BeeWallet,
} from '../api/hive'

export function useBee() {
  const health = ref<BeeHealth | null>(null)
  const addresses = ref<BeeAddresses | null>(null)
  const stamps = ref<BeeStamp[]>([])
  const topology = ref<BeeTopology | null>(null)
  const chainstate = ref<BeeChainstate | null>(null)
  const wallet = ref<BeeWallet | null>(null)
  const loading = ref(false)
  const error = ref('')
  const connected = ref(false)

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      const [h, a, s, t, c, w] = await Promise.allSettled([
        getBeeHealth(),
        getBeeAddresses(),
        getBeeStamps(),
        getBeeTopology(),
        getBeeChainstate(),
        getBeeWallet(),
      ])

      health.value = h.status === 'fulfilled' ? h.value : null
      addresses.value = a.status === 'fulfilled' ? a.value : null
      stamps.value = s.status === 'fulfilled' ? s.value.stamps : []
      topology.value = t.status === 'fulfilled' ? t.value : null
      chainstate.value = c.status === 'fulfilled' ? c.value : null
      wallet.value = w.status === 'fulfilled' ? w.value : null
      connected.value = h.status === 'fulfilled'

      if (!connected.value) {
        error.value = 'Bee node unreachable'
      }
    } catch (e) {
      error.value = (e as Error).message
      connected.value = false
    } finally {
      loading.value = false
    }
  }

  return { health, addresses, stamps, topology, chainstate, wallet, loading, error, connected, refresh }
}
