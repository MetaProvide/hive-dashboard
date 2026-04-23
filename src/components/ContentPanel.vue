<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useContent } from '../composables/useContent'
import { baseUrl } from '../api/hive'
import CopyHash from './shared/CopyHash.vue'
import ByteSize from './shared/ByteSize.vue'
import RelativeTime from './shared/RelativeTime.vue'
import ContentPreview from './shared/ContentPreview.vue'
import { Folder, FileText, ChevronUp, ChevronDown } from 'lucide-vue-next'

const {
  items,
  loading,
  error,
  notice,
  expanded,
  expandedMeta,
  expandedBlob,
  expandedFolder,
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
} = useContent()
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

function confirmPurge() {
  if (confirm('Purge all stored content, cache, refs, and the file index? This cannot be undone.')) {
    purge()
  }
}

function gatewayUrl(protocol: string, id: string): string {
  return `${baseUrl.value}/${protocol}/${id}`
}

const statusMsg = computed(() => {
  if (error.value) return { text: error.value, type: 'error' as const }
  if (notice.value) return { text: notice.value, type: 'ok' as const }
  const active = Object.entries(uploading.value)
  if (active.length) {
    const labels = active.map(([, p]) => p).join(', ')
    return { text: `Uploading to ${labels}…`, type: 'info' as const }
  }
  if (loading.value) return { text: 'Loading…', type: 'info' as const }
  return { text: '', type: 'idle' as const }
})

onMounted(refresh)

async function onFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  for (const file of files) await upload(file)
}

async function onDrop(e: DragEvent) {
  dragging.value = false
  const files = e.dataTransfer?.files
  if (!files?.length) return
  for (const file of files) await upload(file)
}
</script>

<template>
  <div
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <div class="panel-header">
      <h2>Drive</h2>
      <div style="display: flex; gap: 0.5rem;">
        <button type="button" class="outline" @click="refresh">Refresh</button>
        <button type="button" class="outline" style="color: var(--t-error); border-color: var(--t-error);" @click="confirmPurge">Purge</button>
      </div>
      <input ref="fileInput" type="file" multiple hidden @change="onFileSelect">
    </div>

    <div
      class="upload-zone"
      :class="{ 'upload-zone--active': dragging }"
      @click="fileInput?.click()"
    >
      <span v-if="dragging">[ DROP FILE ]</span>
      <span v-else>Drop file here or click to upload</span>
    </div>

    <p
      class="status-bar"
      :class="[
        'status-bar--' + statusMsg.type,
        statusMsg.type === 'ok' ? 'status-bar--ok' : '',
      ]"
    >
      {{ statusMsg.text }}&nbsp;
    </p>

    <p v-if="!loading && items.length === 0" class="empty-state">No content stored yet</p>

    <table v-if="items.length > 0">
      <thead>
        <tr>
          <th>Checksum</th>
          <th>Name</th>
          <th>Type</th>
          <th>Size</th>
          <th>Time</th>
          <th>Refs</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="entry in displayItems" :key="entry.type === 'folder' ? entry.key : entry.item.checksum">
          <template v-if="entry.type === 'folder'">
            <tr class="folder-row" @click="toggleFolder(entry.key)" style="cursor: pointer;">
              <td><Folder :size="14" style="vertical-align: middle;" /> <CopyHash :hash="entry.prefix" /></td>
              <td>{{ entry.rootItem?.filename || `${entry.items.length} item${entry.items.length !== 1 ? 's' : ''}` }}</td>
              <td>{{ entry.rootItem?.contentType || 'directory' }}</td>
              <td><ByteSize :bytes="entry.rootItem ? entry.rootItem.size + entry.items.reduce((s, i) => s + i.size, 0) : entry.items.reduce((s, i) => s + i.size, 0)" /></td>
              <td><RelativeTime v-if="entry.rootItem" :timestamp="entry.rootItem.timestamp" /></td>
              <td style="white-space: nowrap;" @click.stop>
                <a
                  v-if="entry.rootItem?.bzzHash"
                  class="ref-upload-btn ref-upload-btn--active"
                  :href="gatewayUrl('bzz', entry.rootItem.bzzHash)"
                  :title="gatewayUrl('bzz', entry.rootItem.bzzHash)"
                  target="_blank"
                >bzz</a>
                <button
                  v-else-if="entry.rootItem"
                  class="ref-upload-btn"
                  type="button"
                  :disabled="!!uploading[entry.rootItem.checksum]"
                  @click="handleDirToBzz(entry.rootItem.checksum)"
                >
                  <span v-if="uploading[entry.rootItem.checksum]" class="spinner"></span>
                  <template v-else>+bzz</template>
                </button>
                <a
                  v-if="entry.rootItem?.ipfsCid"
                  class="ref-upload-btn ref-upload-btn--active"
                  :href="gatewayUrl('ipfs', entry.rootItem.ipfsCid)"
                  :title="gatewayUrl('ipfs', entry.rootItem.ipfsCid)"
                  target="_blank"
                >ipfs</a>
                <template v-else>
                  <a
                    class="ref-upload-btn ref-upload-btn--active"
                    :href="gatewayUrl(entry.protocol, entry.prefix)"
                    :title="gatewayUrl(entry.protocol, entry.prefix)"
                    target="_blank"
                  >{{ entry.protocol }}</a>
                </template>
              </td>
              <td style="white-space: nowrap;">
                <template v-if="entry.rootItem">
                  <a style="width: 60px; display: inline-block;" href="#" @click.prevent.stop="toggleExpand(entry.rootItem.checksum)">
                    {{ expanded === entry.rootItem.checksum ? 'Collapse' : 'Details' }}
                  </a>
                  &nbsp;
                  <button
                    v-if="!entry.rootItem.manifestBzzHash"
                    class="ref-upload-btn"
                    type="button"
                    :disabled="!!uploading[entry.rootItem.checksum] || !entry.rootItem.bzzHash"
                    @click.stop="handlePublish(entry)"
                  >
                    <span v-if="uploading[entry.rootItem.checksum] === 'publish'" class="spinner"></span>
                    <template v-else>+publish</template>
                  </button>
                  <a
                    v-if="entry.rootItem.manifestBzzHash"
                    class="ref-upload-btn ref-upload-btn--active"
                    :href="gatewayUrl('bzz', entry.rootItem.manifestBzzHash) + '/'"
                    target="_blank"
                    @click.stop
                  >open</a>
                  &nbsp;
                </template>
                <ChevronUp v-if="expandedFolder === entry.key" :size="14" style="vertical-align: middle;" /><ChevronDown v-else :size="14" style="vertical-align: middle;" />
              </td>
            </tr>
            <tr v-if="entry.rootItem && expanded === entry.rootItem.checksum && expandedMeta">
              <td colspan="7">
                <pre style="font-size: 0.8em; max-height: 300px; overflow: auto; margin-bottom: 0.75rem;">{{ JSON.stringify(expandedMeta, null, 2) }}</pre>
<ContentPreview
                  v-if="expandedBlob"
                  :blob="expandedBlob"
                  :content-type="entry.rootItem.contentType"
                  :src-url="entry.rootItem.ipfsCid ? gatewayUrl('ipfs', entry.rootItem.ipfsCid) : entry.rootItem.bzzHash ? gatewayUrl('bzz', entry.rootItem.bzzHash) : gatewayUrl('hive/content', entry.rootItem.checksum)"
                />
              </td>
            </tr>
            <template v-if="expandedFolder === entry.key">
              <template v-for="child in entry.items" :key="child.checksum">
                <tr class="child-row">
                  <td style="cursor: pointer; padding-left: 1.5em;" @click="toggleExpand(child.checksum)"><FileText :size="14" style="vertical-align: middle;" /> <CopyHash :hash="child.checksum" /></td>
                  <td>{{ child.filename || '—' }}</td>
                  <td>{{ child.contentType }}</td>
                  <td><ByteSize :bytes="child.size" /></td>
                  <td><RelativeTime :timestamp="child.timestamp" /></td>
                  <td style="white-space: nowrap;">
                    <a
                      v-if="child.bzzHash"
                      class="ref-upload-btn ref-upload-btn--active"
                      :href="gatewayUrl('bzz', child.bzzHash)"
                      :title="gatewayUrl('bzz', child.bzzHash)"
                      target="_blank"
                    >bzz</a>
                    <button
                      v-else
                      class="ref-upload-btn"
                      :disabled="uploading[child.checksum] === 'bzz'"
                      @click="uploadToProvider(child.checksum, 'bzz')"
                    >
                      <span v-if="uploading[child.checksum] === 'bzz'" class="spinner"></span>
                      <template v-else>+bzz</template>
                    </button>
                    <a
                      v-if="child.ipfsCid"
                      class="ref-upload-btn ref-upload-btn--active"
                      :href="gatewayUrl('ipfs', child.ipfsCid)"
                      :title="gatewayUrl('ipfs', child.ipfsCid)"
                      target="_blank"
                    >ipfs</a>
                    <button
                      v-else
                      class="ref-upload-btn"
                      :disabled="uploading[child.checksum] === 'ipfs'"
                      @click="uploadToProvider(child.checksum, 'ipfs')"
                    >
                      <span v-if="uploading[child.checksum] === 'ipfs'" class="spinner"></span>
                      <template v-else>+ipfs</template>
                    </button>
                  </td>
                  <td style="white-space: nowrap;">
                    <a style="width: 60px; display: inline-block;" href="#" @click.prevent="toggleExpand(child.checksum)">
                      {{ expanded === child.checksum ? 'Collapse' : 'Details' }}
                    </a>
                    &nbsp;
                    <a href="#" @click.prevent="download(child.checksum, child.filename)">DL</a>
                    &nbsp;
                    <a href="#" style="color: var(--t-error);" @click.prevent="remove(child.checksum)">Del</a>
                  </td>
                </tr>
                <tr v-if="expanded === child.checksum && expandedMeta">
                  <td colspan="7">
                    <pre style="font-size: 0.8em; max-height: 300px; overflow: auto; margin-bottom: 0.75rem;">{{ JSON.stringify(expandedMeta, null, 2) }}</pre>
<ContentPreview
                      v-if="expandedBlob"
                      :blob="expandedBlob"
                      :content-type="child.contentType"
                      :src-url="child.ipfsCid ? gatewayUrl('ipfs', child.ipfsCid) : child.bzzHash ? gatewayUrl('bzz', child.bzzHash) : gatewayUrl('hive/content', child.checksum)"
                    />
                  </td>
                </tr>
              </template>
            </template>
          </template>
          <template v-else>
            <tr>
              <td style="cursor: pointer;" @click="toggleExpand(entry.item.checksum)"><FileText :size="14" style="vertical-align: middle;" /> <CopyHash :hash="entry.item.checksum" /></td>
              <td>{{ entry.item.filename || '—' }}</td>
              <td>{{ entry.item.contentType }}</td>
              <td><ByteSize :bytes="entry.item.size" /></td>
              <td><RelativeTime :timestamp="entry.item.timestamp" /></td>
              <td style="white-space: nowrap;">
                <a
                  v-if="entry.item.bzzHash"
                  class="ref-upload-btn ref-upload-btn--active"
                  :href="gatewayUrl('bzz', entry.item.bzzHash)"
                  :title="gatewayUrl('bzz', entry.item.bzzHash)"
                  target="_blank"
                >bzz</a>
                <button
                  v-else
                  class="ref-upload-btn"
                  :disabled="uploading[entry.item.checksum] === 'bzz'"
                  @click="uploadToProvider(entry.item.checksum, 'bzz')"
                >
                  <span v-if="uploading[entry.item.checksum] === 'bzz'" class="spinner"></span>
                  <template v-else>+bzz</template>
                </button>
                <a
                  v-if="entry.item.ipfsCid"
                  class="ref-upload-btn ref-upload-btn--active"
                  :href="gatewayUrl('ipfs', entry.item.ipfsCid)"
                  :title="gatewayUrl('ipfs', entry.item.ipfsCid)"
                  target="_blank"
                >ipfs</a>
                <button
                  v-else
                  class="ref-upload-btn"
                  :disabled="uploading[entry.item.checksum] === 'ipfs'"
                  @click="uploadToProvider(entry.item.checksum, 'ipfs')"
                >
                  <span v-if="uploading[entry.item.checksum] === 'ipfs'" class="spinner"></span>
                  <template v-else>+ipfs</template>
                </button>
              </td>
              <td style="white-space: nowrap;">
                <a style="width: 60px; display: inline-block;" href="#" @click.prevent="toggleExpand(entry.item.checksum)">
                  {{ expanded === entry.item.checksum ? 'Collapse' : 'Details' }}
                </a>
                &nbsp;
                <a href="#" @click.prevent="download(entry.item.checksum, entry.item.filename)">DL</a>
                &nbsp;
                <a href="#" style="color: var(--t-error);" @click.prevent="remove(entry.item.checksum)">Del</a>
              </td>
            </tr>
            <tr v-if="expanded === entry.item.checksum && expandedMeta">
              <td colspan="7">
                <pre style="font-size: 0.8em; max-height: 300px; overflow: auto; margin-bottom: 0.75rem;">{{ JSON.stringify(expandedMeta, null, 2) }}</pre>
<ContentPreview
                  v-if="expandedBlob"
                  :blob="expandedBlob"
                  :content-type="entry.item.contentType"
                  :src-url="entry.item.ipfsCid ? gatewayUrl('ipfs', entry.item.ipfsCid) : entry.item.bzzHash ? gatewayUrl('bzz', entry.item.bzzHash) : gatewayUrl('hive/content', entry.item.checksum)"
                />
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.status-bar {
  font-size: 0.85rem;
  min-height: 1.4em;
  margin-bottom: 0.5rem;
  color: var(--t-dim);
}
.status-bar--ok {
  color: var(--t-accent, #4caf50);
}
.status-bar--error {
  color: var(--t-error);
}
.status-bar--error::before {
  content: 'ERR: ';
  font-weight: 600;
}
.status-bar--idle {
  visibility: hidden;
}
.upload-zone {
  border: 1px dashed var(--t-accent);
  padding: 1.25rem;
  text-align: center;
  margin-bottom: 1rem;
  color: var(--t-accent);
  cursor: pointer;
  background: var(--t-input-bg);
  transition: border-color 0.15s, color 0.15s;
}
.upload-zone:hover {
  border-color: var(--t-dim);
  color: var(--t-fg);
}
.upload-zone--active {
  border-color: var(--t-accent);
  color: var(--t-accent);
  animation: blink-border 0.8s steps(2) infinite;
}
.ref-upload-btn {
  all: unset;
  cursor: pointer;
  font-size: 0.75em;
  padding: 0.1em 0.35em;
  border: 1px dashed var(--t-border);
  color: var(--t-dim);
  margin-right: 0.25rem;
  transition: border-color 0.15s, color 0.15s;
  text-decoration: none;
  display: inline-block;
}
.ref-upload-btn--active {
  border-style: solid;
  border-color: var(--t-accent);
  color: var(--t-accent);
  cursor: pointer;
  opacity: 1;
}
.ref-upload-btn:hover:not(:disabled) {
  border-color: var(--t-accent);
  color: var(--t-accent);
}
.ref-upload-btn:disabled:not(.ref-upload-btn--active) {
  opacity: 0.5;
  cursor: wait;
}
.spinner {
  display: inline-block;
  width: 0.7em;
  height: 0.7em;
  border: 1.5px solid var(--t-border);
  border-top-color: var(--t-accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
}
.child-row td {
  background: rgba(255, 255, 255, 0.02);
}
.folder-row:hover {
  background: rgba(255, 255, 255, 0.03);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
