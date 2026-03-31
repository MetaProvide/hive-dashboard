<script setup lang="ts">
import { ref } from 'vue'
import { isConnected } from './api/hive'
import ConnectPage from './components/ConnectPage.vue'
import HeaderBar from './components/HeaderBar.vue'
import SidebarNav from './components/SidebarNav.vue'
import StatusPanel from './components/StatusPanel.vue'
import ContentPanel from './components/ContentPanel.vue'
import BeePanel from './components/BeePanel.vue'
import IpfsPanel from './components/IpfsPanel.vue'
import FetchPanel from './components/FetchPanel.vue'
import FeedsPanel from './components/FeedsPanel.vue'
import DrivePanel from './components/DrivePanel.vue'

const activePanel = ref('status')
</script>

<template>
  <ConnectPage v-if="!isConnected" />
  <template v-else>
    <HeaderBar />
    <div class="app-body">
      <SidebarNav :active="activePanel" @navigate="activePanel = $event" />
      <main class="app-main">
        <StatusPanel v-if="activePanel === 'status'" />
        <BeePanel v-else-if="activePanel === 'bee'" />
        <IpfsPanel v-else-if="activePanel === 'ipfs'" />
        <ContentPanel v-else-if="activePanel === 'content'" />
        <FetchPanel v-else-if="activePanel === 'fetch'" />
        <FeedsPanel v-else-if="activePanel === 'feeds'" />
        <DrivePanel v-else-if="activePanel === 'drive'" />
      </main>
    </div>
  </template>
</template>
