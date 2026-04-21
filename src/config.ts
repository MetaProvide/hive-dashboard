declare const __NODE_URL__: string

declare global {
  interface Window {
    __HIVE_CONFIG__?: {
      nodeUrl?: string
    }
  }
}

function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, '')
}

export function getDefaultNodeUrl() {
  return normalizeUrl(window.__HIVE_CONFIG__?.nodeUrl || __NODE_URL__)
}
