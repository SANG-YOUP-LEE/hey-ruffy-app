import { reactive } from 'vue'

export const topLoader = reactive({ active: false, progress: 0 })
let timer = null

function loop() {
  timer = setTimeout(() => {
    if (!topLoader.active) return
    const p = topLoader.progress
    const delta = p < 0.6 ? 0.1 : p < 0.8 ? 0.04 : p < 0.95 ? 0.02 : 0
    topLoader.progress = Math.min(0.98, p + delta)
    loop()
  }, 200)
}

export function topLoaderStart() {
  if (topLoader.active) return
  topLoader.active = true
  topLoader.progress = 0.08
  loop()
}

export function topLoaderDone() {
  clearTimeout(timer)
  topLoader.progress = 1
  setTimeout(() => {
    topLoader.active = false
    topLoader.progress = 0
  }, 300)
}
