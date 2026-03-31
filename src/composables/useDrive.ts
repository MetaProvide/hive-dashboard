import { ref, type Ref } from 'vue'
import {
  getDriveListing, getContentList, getMetadata, getContent, storeContent,
  publishContent, unpublishContent, storePrivate,
  uploadToBee, uploadToIpfs,
  type DriveEntry, type ContentMetadata,
} from '../api/hive'

export function useDrive() {
  const currentPath = ref('/')
  const entries = ref<DriveEntry[]>([])
  const loading = ref(false)
  const error = ref('')
  const busy: Ref<Record<string, boolean>> = ref({})
  const published: Ref<Set<string>> = ref(new Set())
  const meta: Ref<Record<string, ContentMetadata>> = ref({})
  const providerUploading: Ref<Record<string, string | null>> = ref({})

  const breadcrumbs = ref<{ label: string; path: string }[]>([])

  function buildBreadcrumbs(path: string) {
    const parts = path.split('/').filter(Boolean)
    const crumbs = [{ label: '/', path: '/' }]
    let acc = ''
    for (const p of parts) {
      acc += `/${p}`
      crumbs.push({ label: p, path: acc })
    }
    breadcrumbs.value = crumbs
  }

  async function refreshPublished() {
    try {
      const res = await getContentList()
      published.value = new Set(res.items.map((i) => i.checksum))
    } catch {
      // non-critical — button will default to "Publish"
    }
  }

  async function refreshMeta(driveEntries: DriveEntry[]) {
    const checksums = driveEntries
      .map((e) => extractChecksum(e.key))
      .filter((c): c is string => c !== null)
    if (!checksums.length) return

    const results = await Promise.allSettled(
      checksums.map((c) => getMetadata(c).then((m) => [c, m] as const)),
    )
    const updated: Record<string, ContentMetadata> = { ...meta.value }
    for (const r of results) {
      if (r.status === 'fulfilled') {
        updated[r.value[0]] = r.value[1]
      }
    }
    meta.value = updated
  }

  async function navigate(path: string) {
    loading.value = true
    error.value = ''
    currentPath.value = path
    buildBreadcrumbs(path)
    try {
      const [res] = await Promise.all([getDriveListing(path), refreshPublished()])
      entries.value = res.entries
      await refreshMeta(res.entries)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  function extractChecksum(key: string): string | null {
    const match = key.match(/^\/content\/([a-f0-9]{64})$/)
    return match ? match[1] : null
  }

  function isPublished(checksum: string): boolean {
    return published.value.has(checksum)
  }

  function getFilename(checksum: string): string | undefined {
    return meta.value[checksum]?.filename
  }

  async function togglePublish(checksum: string) {
    busy.value[checksum] = true
    error.value = ''
    try {
      if (isPublished(checksum)) {
        await unpublishContent(checksum)
        const next = new Set(published.value)
        next.delete(checksum)
        published.value = next
      } else {
        const res = await publishContent(checksum)
        published.value = new Set([...published.value, checksum])
        meta.value = { ...meta.value, [checksum]: res }
      }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      busy.value[checksum] = false
    }
  }

  const uploading = ref(false)

  async function upload(file: File) {
    uploading.value = true
    error.value = ''
    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ''),
      )
      await storePrivate({
        content: base64,
        contentType: file.type || 'application/octet-stream',
        filename: file.name,
      })
      await navigate(currentPath.value)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      uploading.value = false
    }
  }

  async function uploadToProvider(checksum: string, provider: 'bzz' | 'ipfs') {
    providerUploading.value = { ...providerUploading.value, [checksum]: provider }
    try {
      const { blob } = await getContent(checksum)
      const item = meta.value[checksum]

      const providerRef = provider === 'bzz'
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
        ...(provider === 'bzz' ? { bzzHash: providerRef } : { ipfsCid: providerRef }),
      })
      meta.value = { ...meta.value, [checksum]: updated }
    } catch (e) {
      error.value = `${provider} upload failed: ${(e as Error).message}`
    } finally {
      const copy = { ...providerUploading.value }
      delete copy[checksum]
      providerUploading.value = copy
    }
  }

  return { currentPath, entries, breadcrumbs, loading, error, busy, uploading, providerUploading, meta, navigate, upload, extractChecksum, isPublished, getFilename, togglePublish, uploadToProvider }
}
