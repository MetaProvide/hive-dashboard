<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'

const props = defineProps<{
  blob: Blob
  contentType: string
  srcUrl?: string
}>()

const objectUrl = ref('')
const textContent = ref('')
const hexContent = ref('')

const isImage = computed(() => props.contentType.startsWith('image/'))
const isHtml = computed(() => props.contentType.includes('text/html'))
const isText = computed(() =>
  props.contentType.startsWith('text/') || props.contentType.includes('json'),
)
const srcUrlWithTrailingSlash = computed(() => {
  if (!props.srcUrl) return props.srcUrl
  try {
    const url = new URL(props.srcUrl)
    if (!url.pathname.endsWith('/')) url.pathname += '/'
    return url.toString()
  } catch {
    return props.srcUrl.endsWith('/') ? props.srcUrl : props.srcUrl + '/'
  }
})

watch(
  () => [props.blob, props.contentType, props.srcUrl],
  async () => {
    console.log('[ContentPreview] watcher fired', { blobSize: props.blob?.size, contentType: props.contentType, srcUrl: props.srcUrl, isHtml: isHtml.value, isText: isText.value, isImage: isImage.value })
    if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = ''
    textContent.value = ''
    hexContent.value = ''

    if (isHtml.value) {
      const text = await props.blob.text()
      console.log('[ContentPreview] html text length', text.length)
      textContent.value = text
      if (props.srcUrl) objectUrl.value = props.srcUrl
      console.log('[ContentPreview] html branch done', { textContent: textContent.value.length, objectUrl: objectUrl.value })
    } else if (props.srcUrl) {
      objectUrl.value = props.srcUrl
    } else if (isImage.value) {
      objectUrl.value = URL.createObjectURL(props.blob)
    } else if (isText.value) {
      const raw = await props.blob.text()
      if (props.contentType.includes('json')) {
        try {
          textContent.value = JSON.stringify(JSON.parse(raw), null, 2)
        } catch {
          textContent.value = raw
        }
      } else {
        textContent.value = raw
      }
    } else {
      const buf = await props.blob.slice(0, 256).arrayBuffer()
      hexContent.value = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})
</script>

<template>
  <div style="width: 100%;">
    <div v-if="isHtml && srcUrl">
      <a :href="srcUrlWithTrailingSlash" target="_blank" style="display: inline-block; margin-bottom: 0.5rem;">Open in browser</a>
    </div>
    <a v-else-if="isImage" :href="srcUrl || objectUrl" :title="srcUrl" target="_blank">
      <img :src="objectUrl" alt="" style="max-width: 100%; max-height: 400px;" />
    </a>
    <pre v-else-if="isText" style="max-height: 400px; overflow: auto;">{{ textContent }}</pre>
    <pre v-else style="max-height: 400px; overflow: auto; font-size: 0.8em; max-width:100%; box-sizing:border-box; white-space:pre-wrap; word-break:break-word;">{{ hexContent }}</pre>
  </div>
</template>
