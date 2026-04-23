<script setup lang="ts">
import HiveLogo from './shared/HiveLogo.vue'

defineProps<{ active: string }>()
const emit = defineEmits<{ navigate: [panel: string] }>()

const panels = [
  { id: 'status', label: 'Status' },
  { id: 'bee', label: 'Bee' },
  { id: 'ipfs', label: 'IPFS' },
  { id: 'content', label: 'Drive' },
  { id: 'fetch', label: 'Fetch' },
  { id: 'feeds', label: 'Feeds' },
]
</script>

<template>
  <aside class="app-sidebar">
    <div style="padding: 0.5rem 1rem 0.75rem;te">
      <HiveLogo />
    </div>
    <!--div style="padding: 0.5rem 1rem 0.75rem;text-align: center;border-top: 1px dashed var(--t-border);border-bottom: 1px dashed var(--t-border);background:#000;">
    <button class="outline" @click="disconnect" style="font-size: 0.7rem; padding: 0.2rem 0.6rem;border-style:solid;">
        DISCONNECT
      </button>
      </div-->
    
    <nav>
      <ul>
        <li v-for="p in panels" :key="p.id">
          <a
            href="#"
            :class="{ active: active === p.id }"
            @click.prevent="emit('navigate', p.id)"
          >
            {{ p.label }}
          </a>
        </li>
      </ul>
    </nav>
    
  </aside>
</template>
