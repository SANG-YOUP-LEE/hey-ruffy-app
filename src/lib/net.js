// src/lib/net.js
import { reactive } from 'vue'
export const net = reactive({ isOnline: navigator.onLine })

export function initNetworkWatch() {
  const update = () => (net.isOnline = navigator.onLine)
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
  update()
}
