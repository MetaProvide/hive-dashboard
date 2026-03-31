import { ref } from 'vue'
import {
  getIpfsId,
  getIpfsSwarmPeers,
  getIpfsRepoStat,
  getIpfsVersion,
  type IpfsId,
  type IpfsSwarmPeers,
  type IpfsRepoStat,
  type IpfsVersion,
} from '../api/hive'

export function useIpfs() {
  const identity = ref<IpfsId | null>(null)
  const swarmPeers = ref<IpfsSwarmPeers | null>(null)
  const repoStat = ref<IpfsRepoStat | null>(null)
  const version = ref<IpfsVersion | null>(null)
  const loading = ref(false)
  const error = ref('')
  const connected = ref(false)

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      const [id, peers, repo, ver] = await Promise.allSettled([
        getIpfsId(),
        getIpfsSwarmPeers(),
        getIpfsRepoStat(),
        getIpfsVersion(),
      ])

      identity.value = id.status === 'fulfilled' ? id.value : null
      swarmPeers.value = peers.status === 'fulfilled' ? peers.value : null
      repoStat.value = repo.status === 'fulfilled' ? repo.value : null
      version.value = ver.status === 'fulfilled' ? ver.value : null
      connected.value = id.status === 'fulfilled'

      if (!connected.value) {
        error.value = 'IPFS node unreachable'
      }
    } catch (e) {
      error.value = (e as Error).message
      connected.value = false
    } finally {
      loading.value = false
    }
  }

  return { identity, swarmPeers, repoStat, version, loading, error, connected, refresh }
}
