import { ref, onMounted, onUnmounted } from 'vue'
import { getStatus, getBeeHealth, getIpfsId, type NodeStatus } from '../api/hive'

export function useStatus() {
  const status = ref<NodeStatus | null>(null)
  const loading = ref(true)
  const error = ref('')
  const connected = ref(false)
  const beeUp = ref<boolean | null>(null)
  const ipfsUp = ref<boolean | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  async function refresh() {
    try {
      const s = await getStatus()
      status.value = s
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

  return { status, loading, error, connected, beeUp, ipfsUp, refresh }
}