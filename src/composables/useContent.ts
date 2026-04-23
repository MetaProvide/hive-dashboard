import { ref, computed } from 'vue'
import {
  getContentList,
  storeContent,
  deleteContent,
  getMetadata,
  getContent,
  uploadToBee,
  uploadToIpfs,
  type ContentMetadata,
  type StoreContentRequest,
} from '../api/hive'

export interface FolderDisplayItem {
  type: 'folder'
  key: string
  protocol: 'ipfs' | 'bzz'
  prefix: string
  items: ContentMetadata[]
}

export interface FileDisplayItem {
  type: 'file'
  item: ContentMetadata
}

export type DisplayItem = FolderDisplayItem | FileDisplayItem

export function useContent() {
  const items = ref<ContentMetadata[]>([])
  const loading = ref(false)
  const error = ref('')
  const expanded = ref<string | null>(null)
  const expandedMeta = ref<ContentMetadata | null>(null)
  const expandedBlob = ref<Blob | null>(null)
  const uploading = ref<Record<string, string | null>>({})
  const expandedFolder = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = ''
    try {
      const res = await getContentList()
      items.value = res.items
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function upload(file: File) {
    const buffer = await file.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ''),
    )
    const body: StoreContentRequest = {
      content: base64,
      contentType: file.type || 'application/octet-stream',
      filename: file.name,
    }
    await storeContent(body)
    await refresh()
  }

  async function remove(checksum: string) {
    await deleteContent(checksum)
    items.value = items.value.filter((i) => i.checksum !== checksum)
    if (expanded.value === checksum) {
      expanded.value = null
      expandedMeta.value = null
      expandedBlob.value = null
    }
  }

  async function toggleExpand(checksum: string) {
    if (expanded.value === checksum) {
      expanded.value = null
      expandedMeta.value = null
      expandedBlob.value = null
      return
    }
    expanded.value = checksum
    expandedBlob.value = null
    const [meta, content] = await Promise.all([
      getMetadata(checksum),
      getContent(checksum),
    ])
    expandedMeta.value = meta
    expandedBlob.value = content.blob
  }

  async function uploadToProvider(checksum: string, provider: 'bzz' | 'ipfs') {
    uploading.value = { ...uploading.value, [checksum]: provider }
    try {
      const { blob } = await getContent(checksum)
      const item = items.value.find((i) => i.checksum === checksum)

      const ref = provider === 'bzz'
        ? await uploadToBee(blob, item?.filename, item?.contentType)
        : await uploadToIpfs(blob, item?.filename)

      const buffer = await blob.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ''),
      )
      const updated = await storeContent({
        content: base64,
        contentType: item?.contentType || 'application/octet-stream',
        filename: item?.filename,
        ...(provider === 'bzz' ? { bzzHash: ref } : { ipfsCid: ref }),
      })

      const idx = items.value.findIndex((i) => i.checksum === checksum)
      if (idx !== -1) items.value[idx] = updated

      if (provider === 'ipfs') {
        await waitForBridge(checksum)
      }
    } catch (e) {
      error.value = `${provider} upload failed: ${(e as Error).message}`
    } finally {
      const copy = { ...uploading.value }
      delete copy[checksum]
      uploading.value = copy
    }
  }

  async function waitForBridge(checksum: string) {
    const maxAttempts = 10
    const delayMs = 1000
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, delayMs))
      const meta = await getMetadata(checksum)
      if (meta.bzzHash) {
        const idx = items.value.findIndex((i) => i.checksum === checksum)
        if (idx !== -1) items.value[idx] = meta
        if (expandedMeta.value?.checksum === checksum) expandedMeta.value = meta
        return
      }
    }
  }

  async function download(checksum: string, filename?: string) {
    const { blob } = await getContent(checksum)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || checksum.slice(0, 16)
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleFolder(key: string) {
    expandedFolder.value = expandedFolder.value === key ? null : key
  }

  const displayItems = computed<DisplayItem[]>(() => {
    const result: DisplayItem[] = []
    const folderMap = new Map<string, FolderDisplayItem>()
    const itemToFolderKey = new Map<string, string>()

    for (const item of items.value) {
      let folderKey: string | null = null
      let protocol: 'ipfs' | 'bzz' | null = null
      let prefix: string | null = null

      if (item.ipfsCid && item.ipfsCid.includes('/')) {
        prefix = item.ipfsCid.split('/')[0]
        folderKey = `ipfs:${prefix}`
        protocol = 'ipfs'
      } else if (item.bzzHash && item.bzzHash.includes('/')) {
        prefix = item.bzzHash.split('/')[0]
        folderKey = `bzz:${prefix}`
        protocol = 'bzz'
      }

      if (folderKey && prefix && protocol) {
        itemToFolderKey.set(item.checksum, folderKey)
        if (!folderMap.has(folderKey)) {
          folderMap.set(folderKey, { type: 'folder', key: folderKey, protocol, prefix, items: [] })
        }
        folderMap.get(folderKey)!.items.push(item)
      }
    }

    const seenFolders = new Set<string>()
    for (const item of items.value) {
      const fk = itemToFolderKey.get(item.checksum)
      if (fk) {
        if (!seenFolders.has(fk)) {
          seenFolders.add(fk)
          result.push(folderMap.get(fk)!)
        }
      } else {
        result.push({ type: 'file', item })
      }
    }

    return result
  })

  return { items, loading, error, expanded, expandedMeta, expandedBlob, expandedFolder, uploading, displayItems, refresh, upload, remove, toggleExpand, toggleFolder, download, uploadToProvider }
}
