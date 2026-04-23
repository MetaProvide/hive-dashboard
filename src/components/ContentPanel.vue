<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useContent } from '../composables/useContent'
import { baseUrl } from '../api/hive'
import CopyHash from './shared/CopyHash.vue'
import ByteSize from './shared/ByteSize.vue'
import RelativeTime from './shared/RelativeTime.vue'
import ContentPreview from './shared/ContentPreview.vue'

const { items, loading, error, expanded, expandedMeta, expandedBlob, expandedFolder, uploading, displayItems, refresh, upload, remove, toggleExpand, toggleFolder, download, uploadToProvider } = useContent()
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

function gatewayUrl(protocol: string, id: string): string {
  return `${baseUrl.value}/${protocol}/${id}`
}

const statusMsg = computed(() => {
  if (error.value) return { text: error.value, type: 'error' as const }
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

    <p class="status-bar" :class="'status-bar--' + statusMsg.type">{{ statusMsg.text }}&nbsp;</p>

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
              <td>📁 <CopyHash :hash="entry.prefix" /></td>
              <td>{{ entry.items.length }} item{{ entry.items.length !== 1 ? 's' : '' }}</td>
              <td>directory</td>
              <td><ByteSize :bytes="entry.items.reduce((s, i) => s + i.size, 0)" /></td>
              <td></td>
              <td style="white-space: nowrap;">
                <a
                  class="ref-upload-btn ref-upload-btn--active"
                  :href="gatewayUrl(entry.protocol, entry.prefix)"
                  :title="gatewayUrl(entry.protocol, entry.prefix)"
                  target="_blank"
                >{{ entry.protocol }}</a>
              </td>
              <td>{{ expandedFolder === entry.key ? '▲' : '▼' }}</td>
            </tr>
            <template v-if="expandedFolder === entry.key">
              <template v-for="child in entry.items" :key="child.checksum">
                <tr class="child-row">
                  <td style="cursor: pointer; padding-left: 1.5em;" @click="toggleExpand(child.checksum)">📄 <CopyHash :hash="child.checksum" /></td>
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
              <td style="cursor: pointer;" @click="toggleExpand(entry.item.checksum)">📄 <CopyHash :hash="entry.item.checksum" /></td>
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
