import { ref, computed } from 'vue'
import {
  getContentList,
  storeContent,
  deleteContent,
  getMetadata,
  getContent,
  uploadToBee,
  uploadToIpfs,
  uploadDirToBzz,
  purgeStorage,
  finalizeIpfsDirectoryManifest,
  type ContentMetadata,
  type StoreContentRequest,
} from '../api/hive'

export interface FolderDisplayItem {
  type: 'folder'
  key: string
  protocol: 'ipfs' | 'bzz'
  prefix: string
  rootItem: ContentMetadata
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
  const notice = ref('')
  const expanded = ref<string | null>(null)
  const expandedMeta = ref<ContentMetadata | null>(null)
  const expandedBlob = ref<Blob | null>(null)
  const uploading = ref<Record<string, string | null>>({})
  const expandedFolder = ref<string | null>(null)
  const finalizingFolder = ref<string | null>(null)

  async function purge() {
    try {
      await purgeStorage()
      await refresh()
      notice.value = 'Storage purged.'
    } catch (e) {
      error.value = `Purge failed: ${(e as Error).message}`
    }
  }

  async function refresh() {
    loading.value = true
    error.value = ''
    notice.value = ''
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

  async function handleDirToBzz(checksum: string) {
    uploading.value = { ...uploading.value, [checksum]: 'bzz' }
    try {
      const updated = await uploadDirToBzz(checksum)
      const idx = items.value.findIndex((i) => i.checksum === checksum)
      if (idx !== -1) items.value[idx] = updated
      if (expandedMeta.value?.checksum === checksum) expandedMeta.value = updated
      await refresh()
      notice.value = `Directory uploaded to Swarm. Root bzz: ${updated.bzzHash?.slice(0, 20)}…`
    } catch (e) {
      error.value = `Directory upload failed: ${(e as Error).message}`
    } finally {
      const copy = { ...uploading.value }
      delete copy[checksum]
      uploading.value = copy
    }
  }

  async function handlePublish(entry: FolderDisplayItem) {
    if (!entry.rootItem) return
    uploading.value = { ...uploading.value, [entry.rootItem.checksum]: 'publish' }
    try {
      const updated = await uploadDirToBzz(entry.rootItem.checksum)
      const idx = items.value.findIndex((i) => i.checksum === entry.rootItem!.checksum)
      if (idx !== -1) items.value[idx] = updated
      if (expandedMeta.value?.checksum === entry.rootItem!.checksum) expandedMeta.value = updated
      await refresh()
      if (updated.manifestBzzHash) {
        notice.value = `Published. Manifest: ${updated.manifestBzzHash.slice(0, 20)}…`
      }
    } catch (e) {
      error.value = `Publish failed: ${(e as Error).message}`
    } finally {
      const copy = { ...uploading.value }
      delete copy[entry.rootItem!.checksum]
      uploading.value = copy
    }
  }

  async function uploadToProvider(checksum: string, provider: 'bzz' | 'ipfs') {
    uploading.value = { ...uploading.value, [checksum]: provider }
    try {
      const item = items.value.find((i) => i.checksum === checksum)
      const isIpfsDir = item?.contentType === 'application/vnd.hive.ipfs-directory+json'

      if (provider === 'bzz' && isIpfsDir) {
        const updated = await uploadDirToBzz(checksum)
        const idx = items.value.findIndex((i) => i.checksum === checksum)
        if (idx !== -1) items.value[idx] = updated
        if (expandedMeta.value?.checksum === checksum) expandedMeta.value = updated
        await refresh()
      } else {
        const { blob } = await getContent(checksum)
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

  function ipfsFolderReadyForRootManifest(entry: FolderDisplayItem): boolean {
    if (entry.protocol !== 'ipfs' || entry.items.length === 0) return false
    return entry.items.every((i) => Boolean(i.bzzHash))
  }

  async function buildIpfsRootManifest(entry: FolderDisplayItem) {
    if (entry.protocol !== 'ipfs') return
    if (!ipfsFolderReadyForRootManifest(entry)) {
      error.value =
        'Each file under the folder must have a bzz ref first (use +bzz on every row, or open paths so they bridge).'
      return
    }
    const prefix = entry.prefix
    finalizingFolder.value = entry.key
    error.value = ''
    notice.value = ''
    try {
      const files = entry.items.map((child) => {
        const relPath = (child.ipfsCid as string).slice(prefix.length + 1)
        return {
          relPath,
          bzzHash: child.bzzHash as string,
          contentType: child.contentType,
          filename: child.filename,
        }
      })
      const res = await finalizeIpfsDirectoryManifest({
        rootCid: prefix,
        files,
      })
      await refresh()
      notice.value = `Root manifest: ${res.manifestReference.slice(0, 20)}… (${res.fileCount} files). Root /ipfs ref now uses this bzz.`
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      finalizingFolder.value = null
    }
  }

  const displayItems = computed<DisplayItem[]>(() => {
    const result: DisplayItem[] = []
    const folderMap = new Map<string, FolderDisplayItem>()
    const itemToFolderKey = new Map<string, string>()

    for (const item of items.value) {
      if (item.ipfsCid && item.ipfsCid.includes('/')) {
        const prefix = item.ipfsCid.split('/')[0]
        const folderKey = `ipfs:${prefix}`
        itemToFolderKey.set(item.checksum, folderKey)
        if (!folderMap.has(folderKey)) {
          const rootItem = items.value.find((i) => i.ipfsCid === prefix && !i.ipfsCid.includes('/'))
          folderMap.set(folderKey, { type: 'folder', key: folderKey, protocol: 'ipfs', prefix, rootItem: rootItem!, items: [] })
        }
        itemToFolderKey.set(item.checksum, folderKey)
        folderMap.get(folderKey)!.items.push(item)
      } else if (item.bzzHash && item.bzzHash.includes('/')) {
        const prefix = item.bzzHash.split('/')[0]
        const folderKey = `bzz:${prefix}`
        itemToFolderKey.set(item.checksum, folderKey)
        if (!folderMap.has(folderKey)) {
          const rootItem = items.value.find((i) => i.bzzHash === prefix && !i.bzzHash.includes('/'))
          folderMap.set(folderKey, { type: 'folder', key: folderKey, protocol: 'bzz', prefix, rootItem: rootItem!, items: [] })
        }
        itemToFolderKey.set(item.checksum, folderKey)
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
        const isRootOfFolder = [...folderMap.values()].some((f) => f.rootItem?.checksum === item.checksum)
        if (!isRootOfFolder) {
          result.push({ type: 'file', item })
        }
      }
    }

    return result
  })

  return {
    items,
    loading,
    error,
    notice,
    expanded,
    expandedMeta,
    expandedBlob,
    expandedFolder,
    finalizingFolder,
    uploading,
    displayItems,
    refresh,
    purge,
    upload,
    remove,
    toggleExpand,
    toggleFolder,
    download,
    uploadToProvider,
    handleDirToBzz,
    handlePublish,
    finalizeIpfsDirectoryManifest,
    ipfsFolderReadyForRootManifest,
    buildIpfsRootManifest,
  }
}
