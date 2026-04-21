# Hive Dashboard

Web dashboard for monitoring and managing a Hive node. Built with Vue 3, TypeScript, and Vite.

## Features

- **Status** — Node identity, peer count, and stored content overview
- **Bee** — Bee node health, addresses, topology, chain state, wallet, and postage stamps
- **IPFS** — IPFS node identity, swarm peers, repo stats, and version info
- **Content** — Browse, upload, publish/unpublish, and delete stored content
- **Fetch** — Retrieve content by IPFS CID or Swarm hash through the node's proxy
- **Feeds** — View local, network, and peer content feeds
- **Drive** — Browse the node's private Hyperdrive filesystem

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- A running Hive node (default: `http://localhost:3000`)

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The dashboard opens at [http://localhost:80](http://localhost:80). Enter your Hive node URL on the connect screen to get started. The dashboard will automatically try to connect to the configured NODE_URL on first load.

## Scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start Vite dev server with hot reload    |
| `npm run build`   | Type-check and build for production      |
| `npm run preview` | Serve the production build locally       |
## API Proxy

During development, Vite proxies the following paths to `NODE_URL`:

`/hive` `/ipfs` `/bzz` `/chunks` `/bytes` `/health` `/stamps` `/addresses` `/topology` `/chainstate` `/wallet` `/readiness` `/peers` `/api/v0`

To change the proxy target in dev, set `NODE_URL` before starting Vite. In Docker, change the container `NODE_URL` environment variable and restart the container.

## Project Structure

```
src/
├── api/
│   └── hive.ts            # All API calls (Hive, Bee, IPFS)
├── components/
│   ├── ConnectPage.vue     # Node URL connect screen
│   ├── HeaderBar.vue       # Top bar
│   ├── SidebarNav.vue      # Navigation sidebar
│   ├── StatusPanel.vue     # Node status view
│   ├── BeePanel.vue        # Bee node details
│   ├── IpfsPanel.vue       # IPFS node details
│   ├── ContentPanel.vue    # Content management
│   ├── FetchPanel.vue      # Content fetching
│   ├── FeedsPanel.vue      # Activity feeds
│   ├── DrivePanel.vue      # Drive file browser
│   └── shared/             # Reusable components
├── composables/            # Vue composables for data fetching
├── style.css               # Global styles
├── App.vue                 # Root component
└── main.ts                 # App entry point
```

## Tech Stack

- [Vue 3](https://vuejs.org/) with `<script setup>` SFCs
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
