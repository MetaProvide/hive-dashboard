import { ref, onMounted, onUnmounted } from 'vue'
import { getStatus, getPeers, getBeeHealth, getIpfsId, type NodeStatus, type PeerInfo } from '../api/hive'

export function useStatus() {
  const status = ref<NodeStatus | null>(null)
  const peers = ref<PeerInfo[]>([])
  const loading = ref(true)
  const error = ref('')
  const connected = ref(false)
  const beeUp = ref<boolean | null>(null)
  const ipfsUp = ref<boolean | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  async function refresh() {
    try {
      const [s, p] = await Promise.all([getStatus(), getPeers()])
      status.value = s
      peers.value = p.peers
      connected.value = true
      error.value = ''
    } catch (e) {
      error.value = (e as Error).message
      connected.value = false
    } finally {
      loading.value = false
    }

    const [bee, ipfs] = await Promise.allSettled([getBeeHealth(), getIpfsId()])
    beeUp.value = bee.status === 'fulfilled'
    ipfsUp.value = ipfs.status === 'fulfilled'
  }

  onMounted(() => {
    refresh()
    timer = setInterval(refresh, 10_000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { status, peers, loading, error, connected, beeUp, ipfsUp, refresh }
}
