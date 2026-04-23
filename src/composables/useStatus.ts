import { ref, onMounted, onUnmounted } from 'vue'
import { getStatus, getBeeHealth, getIpfsId, type NodeStatus } from '../api/hive'

const status = ref<NodeStatus | null>(null)
const loading = ref(true)
const error = ref('')
const connected = ref(false)
const beeUp = ref<boolean | null>(null)
const ipfsUp = ref<boolean | null>(null)

let timer: ReturnType<typeof setInterval> | null = null
let refCount = 0

function schedulePoll() {
  if (refCount <= 0) {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    return
  }

  const bothUp = beeUp.value === true && ipfsUp.value === true
  const delayMs = bothUp ? 15 * 60_000 : 10_000

  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
  timer = setInterval(refresh, delayMs)

  if (import.meta.env.DEV) {
    console.debug('[useStatus] scheduled poll', {
      delayMs,
      delayLabel: bothUp ? '15m' : '10s',
      beeUp: beeUp.value,
      ipfsUp: ipfsUp.value,
      refCount,
    })
  }
}

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

  if (import.meta.env.DEV) {
    console.debug('[useStatus] health check', {
      bee: bee.status,
      ipfs: ipfs.status,
      beeReason: bee.status === 'rejected' ? String((bee as PromiseRejectedResult).reason) : undefined,
      ipfsReason: ipfs.status === 'rejected' ? String((ipfs as PromiseRejectedResult).reason) : undefined,
    })
  }

  schedulePoll()
}

export function useStatus() {
  onMounted(() => {
    refCount++
    if (refCount === 1) {
      void refresh()
      // Until `refresh` finishes and `schedulePoll` runs, keep trying (covers stuck `getStatus`).
      timer = setInterval(refresh, 10_000)
    }
  })

  onUnmounted(() => {
    refCount--
    if (refCount === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return { status, loading, error, connected, beeUp, ipfsUp, refresh }
}