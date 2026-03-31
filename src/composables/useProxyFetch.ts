import { ref } from 'vue'
import { fetchProxy, type FetchResult } from '../api/hive'

export function useProxyFetch() {
  const protocol = ref('bzz')
  const identifier = ref('')
  const result = ref<FetchResult | null>(null)
  const loading = ref(false)
  const error = ref('')

  async function execute() {
    if (!identifier.value.trim()) return
    loading.value = true
    error.value = ''
    result.value = null
    try {
      result.value = await fetchProxy(protocol.value, identifier.value.trim())
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  function reset() {
    result.value = null
    error.value = ''
  }

  return { protocol, identifier, result, loading, error, execute, reset }
}
