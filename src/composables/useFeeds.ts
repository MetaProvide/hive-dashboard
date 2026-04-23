import { ref, onUnmounted } from 'vue'
import { getFeed, type FeedEntry } from '../api/hive'

export function useFeeds() {
  const items = ref<FeedEntry[]>([])
  const loading = ref(false)
  const error = ref('')
  const autoRefresh = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      const res = await getFeed(20)
      items.value = res.items
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  function toggleAutoRefresh() {
    autoRefresh.value = !autoRefresh.value
    if (autoRefresh.value) {
      timer = setInterval(refresh, 5_000)
    } else if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { items, loading, error, autoRefresh, refresh, toggleAutoRefresh }
}