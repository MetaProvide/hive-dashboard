import { ref } from 'vue'

export interface NodeStatus {
  nodeId: string
  contentCount: number
  bridgedCount: number
}

export interface ContentMetadata {
  checksum: string
  contentType: string
  size: number
  filename?: string
  timestamp: number
  lastModified?: number
  sourcePath?: string
  ipfsCid?: string
  bzzHash?: string
  manifestBzzHash?: string
}

export interface ContentListResponse {
  items: ContentMetadata[]
  count: number
}

export interface DriveEntry {
  key: string
  size: number
  isDirectory: boolean
}

export interface DriveListResponse {
  path: string
  entries: DriveEntry[]
  count: number
}

export interface FeedEntry {
  checksum: string
  contentType: string
  size: number
  timestamp?: number
}

export interface FeedResponse {
  items: FeedEntry[]
  count: number
}

export interface StoreContentRequest {
  content: string
  contentType?: string
  filename?: string
  lastModified?: number
  sourcePath?: string
  ipfsCid?: string
  bzzHash?: string
}

export interface DirectoryManifestFile {
  relPath: string
  bzzHash: string
  contentType?: string
  filename?: string
}

export interface FinalizeDirectoryManifestRequest {
  rootCid: string
  files: DirectoryManifestFile[]
  indexDocument?: string
}

export interface FinalizeDirectoryManifestResponse {
  rootCid: string
  manifestReference: string
  fileCount: number
}

export interface FetchResult {
  content: Blob
  contentType: string
  cacheHeader: string | null
  status: number
  elapsed: number
}

const STORAGE_KEY = 'hive-node-url'
let hasAttemptedAutoConnect = !!localStorage.getItem(STORAGE_KEY)

export const baseUrl = ref(localStorage.getItem(STORAGE_KEY) || '')
export const isConnected = ref(!!localStorage.getItem(STORAGE_KEY))

export function shouldAutoConnect() {
  if (hasAttemptedAutoConnect) return false

  hasAttemptedAutoConnect = true
  return true
}

export function connect(url: string) {
  baseUrl.value = url.replace(/\/+$/, '')
  localStorage.setItem(STORAGE_KEY, baseUrl.value)
  isConnected.value = true
}

export function disconnect() {
  baseUrl.value = ''
  localStorage.removeItem(STORAGE_KEY)
  isConnected.value = false
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl.value}${path}`, init)
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.message || body.error || JSON.stringify(body)
    } catch { /* no json body */ }
    throw new Error(detail || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function getStatus(): Promise<NodeStatus> {
  return api('/hive/status')
}

export async function finalizeIpfsDirectoryManifest(
  body: FinalizeDirectoryManifestRequest,
): Promise<FinalizeDirectoryManifestResponse> {
  return api(
    '/hive/bridge/ipfs/directory/finalize',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  ) as Promise<FinalizeDirectoryManifestResponse>
}

export async function getContentList(): Promise<ContentListResponse> {
  return api('/hive/list')
}

export async function getContent(checksum: string): Promise<{ blob: Blob; contentType: string }> {
  const res = await fetch(`${baseUrl.value}/hive/content/${checksum}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  return { blob: await res.blob(), contentType }
}

export async function getMetadata(checksum: string): Promise<ContentMetadata> {
  return api(`/hive/meta/${checksum}`)
}

export async function storeContent(body: StoreContentRequest): Promise<ContentMetadata> {
  return api('/hive/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function storePrivate(body: StoreContentRequest): Promise<ContentMetadata> {
  return api('/hive/drive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function uploadDirToBzz(checksum: string): Promise<ContentMetadata> {
  return api(`/hive/upload-dir-to-bzz/${checksum}`, { method: 'POST' })
}

export async function deleteContent(checksum: string): Promise<{ deleted: boolean; checksum: string }> {
  return api(`/hive/content/${checksum}`, { method: 'DELETE' })
}

export async function purgeStorage(): Promise<{ purged: boolean; storagePath: string }> {
  return api('/hive/storage/purge', { method: 'POST' })
}

export async function getFeed(limit = 20): Promise<FeedResponse> {
  return api(`/hive/feed/local?limit=${limit}`)
}

export async function getDriveListing(path = '/'): Promise<DriveListResponse> {
  const p = path === '/' ? '' : `/${path}`
  return api(`/hive/ls${p}`)
}

export async function fetchProxy(protocol: string, id: string): Promise<FetchResult> {
  const start = performance.now()
  const res = await fetch(`${baseUrl.value}/${protocol}/${id}`)
  const elapsed = Math.round(performance.now() - start)
  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const cacheHeader = res.headers.get('x-hive-cache')
  return {
    content: await res.blob(),
    contentType,
    cacheHeader,
    status: res.status,
    elapsed,
  }
}

// ── Upload to provider (via catch-all proxy) ─────────

export async function uploadToBee(content: Blob, filename = 'file', contentType?: string): Promise<string> {
  const { stamps } = await getBeeStamps()
  const stamp = stamps.find((s) => s.usable)
  if (!stamp) throw new Error('No usable postage stamp found')

  const ct = contentType || content.type || 'application/octet-stream'
  const url = `${baseUrl.value}/bzz?name=${encodeURIComponent(filename)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': ct,
      'swarm-postage-batch-id': stamp.batchID,
    },
    body: content,
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.message || body.error || ''
    } catch { /* no json body */ }
    throw new Error(detail || `Bee upload failed: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return data.reference as string
}

export async function uploadToIpfs(content: Blob, filename = 'file'): Promise<string> {
  const form = new FormData()
  form.append('file', content, filename)

  const res = await fetch(`${baseUrl.value}/api/v0/add?pin=true`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.message || body.error || ''
    } catch { /* no json body */ }
    throw new Error(detail || `IPFS upload failed: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return data.Hash as string
}

// ── Bee API (proxied through catch-all → Bee node) ────

export interface BeeHealth {
  status: string
  version: string
  apiVersion: string
}

export interface BeeAddresses {
  overlay: string
  underlay: string[]
  ethereum: string
  publicKey: string
  pssPublicKey: string
}

export interface BeeStamp {
  batchID: string
  utilization: number
  usable: boolean
  label: string
  depth: number
  amount: string
  bucketDepth: number
  blockNumber: number
  immutableFlag: boolean
  exists: boolean
  batchTTL: number
}

export interface BeeTopology {
  baseAddr: string
  population: number
  connected: number
  timestamp: string
  nnLowWatermark: number
  depth: number
  reachability: string
  networkAvailability: string
  bins: Record<string, { population: number; connected: number; disconnectedPeers: any[]; connectedPeers: any[] }>
}

export interface BeeChainstate {
  block: number
  totalAmount: string
  currentPrice: string
}

export interface BeeWallet {
  bzzBalance: string
  nativeTokenBalance: string
  chainID: number
  chequebookContractAddress: string
  walletAddress: string
}

export async function getBeeHealth(): Promise<BeeHealth> {
  return api('/health')
}

export async function getBeeAddresses(): Promise<BeeAddresses> {
  return api('/addresses')
}

export async function getBeeStamps(): Promise<{ stamps: BeeStamp[] }> {
  return api('/stamps')
}

export async function getBeeTopology(): Promise<BeeTopology> {
  return api('/topology')
}

export async function getBeeChainstate(): Promise<BeeChainstate> {
  return api('/chainstate')
}

export async function getBeeWallet(): Promise<BeeWallet> {
  return api('/wallet')
}

// ── IPFS API (proxied through catch-all → IPFS node) ─

export interface IpfsId {
  ID: string
  PublicKey: string
  Addresses: string[]
  AgentVersion: string
  ProtocolVersion: string
}

export interface IpfsSwarmPeers {
  Peers: { Addr: string; Peer: string; Direction: number; Latency: string; Streams: any[] }[] | null
}

export interface IpfsRepoStat {
  NumObjects: number
  RepoPath: string
  RepoSize: number
  StorageMax: number
  Version: string
}

export interface IpfsVersion {
  Version: string
  Commit: string
  Repo: string
  System: string
  Golang: string
}

async function ipfsApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${baseUrl.value}/api/v0/${endpoint}`, { method: 'POST' })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.Message || body.message || body.error || ''
    } catch { /* no json body */ }
    throw new Error(detail || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function getIpfsId(): Promise<IpfsId> {
  return ipfsApi('id')
}

export async function getIpfsSwarmPeers(): Promise<IpfsSwarmPeers> {
  return ipfsApi('swarm/peers')
}

export async function getIpfsRepoStat(): Promise<IpfsRepoStat> {
  return ipfsApi('repo/stat')
}

export async function getIpfsVersion(): Promise<IpfsVersion> {
  return ipfsApi('version')
}
