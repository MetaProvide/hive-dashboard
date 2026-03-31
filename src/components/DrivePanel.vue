<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDrive } from '../composables/useDrive'
import ByteSize from './shared/ByteSize.vue'

const { currentPath, entries, breadcrumbs, loading, error, busy, uploading, providerUploading, meta, navigate, upload, extractChecksum, isPublished, getFilename, togglePublish, uploadToProvider } = useDrive()
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const statusMsg = computed(() => {
  if (error.value) return { text: error.value, type: 'error' as const }
  const active = Object.entries(providerUploading.value)
  if (active.length) {
    const labels = active.map(([, p]) => p).join(', ')
    return { text: `Uploading to ${labels}…`, type: 'info' as const }
  }
  if (uploading.value) return { text: 'Storing to drive…', type: 'info' as const }
  if (loading.value) return { text: 'Loading…', type: 'info' as const }
  return { text: '', type: 'idle' as const }
})

function navigateTo(key: string) {
  const path = key.startsWith('/') ? key : `/${key}`
  navigate(path)
}

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

onMounted(() => navigate('/'))
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
        <button type="button" class="outline" @click="navigate(currentPath)">Refresh</button>
      </div>
      <input ref="fileInput" type="file" multiple hidden @change="onFileSelect">
    </div>

    <nav aria-label="breadcrumb" style="margin-bottom: 1rem;">
      <span v-for="(crumb, i) in breadcrumbs" :key="crumb.path">
        <span v-if="i > 0"> / </span>
        <a
          v-if="i < breadcrumbs.length - 1"
          href="#"
          @click.prevent="navigate(crumb.path)"
        >{{ crumb.label }}</a>
        <strong v-else>{{ crumb.label }}</strong>
      </span>
    </nav>

    <div
      class="upload-zone"
      :class="{ 'upload-zone--active': dragging }"
      @click="fileInput?.click()"
    >
      <span v-if="uploading">Uploading...</span>
      <span v-else-if="dragging">[ DROP FILE ]</span>
      <span v-else>Drop file here or click to store privately</span>
    </div>

    <p class="status-bar" :class="'status-bar--' + statusMsg.type">{{ statusMsg.text }}&nbsp;</p>

    <p v-if="!loading && entries.length === 0" class="empty-state">Empty directory</p>

    <table v-if="entries.length > 0">
      <thead>
        <tr>
          <th>Path</th>
          <th>Filename</th>
          <th>Type</th>
          <th>Size</th>
          <th>Refs</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.key">
          <td>
            <a
              v-if="entry.isDirectory"
              href="#"
              @click.prevent="navigateTo(entry.key)"
            >{{ entry.key }}/</a>
            <span v-else>{{ entry.key }}</span>
          </td>
          <td>{{ extractChecksum(entry.key) ? (getFilename(extractChecksum(entry.key)!) || '—') : '—' }}</td>
          <td>{{ entry.isDirectory ? 'dir' : 'file' }}</td>
          <td>
            <ByteSize v-if="!entry.isDirectory" :bytes="entry.size" />
            <span v-else>—</span>
          </td>
          <td v-if="extractChecksum(entry.key)" style="white-space: nowrap;">
            <button
              v-if="meta[extractChecksum(entry.key)!]?.bzzHash"
              class="ref-upload-btn ref-upload-btn--active"
              disabled
            >bzz</button>
            <button
              v-else
              class="ref-upload-btn"
              :disabled="providerUploading[extractChecksum(entry.key)!] === 'bzz'"
              @click="uploadToProvider(extractChecksum(entry.key)!, 'bzz')"
            >
              <span v-if="providerUploading[extractChecksum(entry.key)!] === 'bzz'" class="spinner"></span>
              <template v-else>+bzz</template>
            </button>
            <button
              v-if="meta[extractChecksum(entry.key)!]?.ipfsCid"
              class="ref-upload-btn ref-upload-btn--active"
              disabled
            >ipfs</button>
            <button
              v-else
              class="ref-upload-btn"
              :disabled="providerUploading[extractChecksum(entry.key)!] === 'ipfs'"
              @click="uploadToProvider(extractChecksum(entry.key)!, 'ipfs')"
            >
              <span v-if="providerUploading[extractChecksum(entry.key)!] === 'ipfs'" class="spinner"></span>
              <template v-else>+ipfs</template>
            </button>
          </td>
          <td v-else>—</td>
          <td>
            <button
              v-if="extractChecksum(entry.key)"
              class="publish-btn"
              :class="{ 'publish-btn--active': isPublished(extractChecksum(entry.key)!) }"
              :disabled="busy[extractChecksum(entry.key)!]"
              @click="togglePublish(extractChecksum(entry.key)!)"
            >
              <template v-if="busy[extractChecksum(entry.key)!]">…</template>
              <template v-else-if="isPublished(extractChecksum(entry.key)!)">Unpublish</template>
              <template v-else>Publish</template>
            </button>
          </td>
        </tr>
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
.publish-btn {
  all: unset;
  cursor: pointer;
  font-size: 0.75em;
  padding: 0.1em 0.35em;
  border: 1px dashed var(--t-border);
  color: var(--t-dim);
  transition: border-color 0.15s, color 0.15s;
}
.publish-btn--active {
  border-style: solid;
  color: var(--t-accent);
  border-color: var(--t-accent);
}
.publish-btn:hover:not(:disabled) {
  border-color: var(--t-accent);
  color: var(--t-accent);
}
.publish-btn:disabled {
  opacity: 0.5;
  cursor: wait;
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
}
.ref-upload-btn--active {
  border-style: solid;
  border-color: var(--t-accent);
  color: var(--t-accent);
  cursor: default;
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
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
