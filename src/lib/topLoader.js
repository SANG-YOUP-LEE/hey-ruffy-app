import { reactive } from 'vue'

export const topLoader = reactive({ active: false, progress: 0 })

let timer = null
let minShownAt = 0
const counts = { route: 0, data: 0 }
let target = 0

function anyActive() {
  return counts.route > 0 || counts.data > 0
}

function computeTarget() {
  if (counts.route > 0) return 0.6
  if (counts.data > 0) return 0.98
  return 1
}

function tick() {
  timer = setTimeout(() => {
    if (!topLoader.active) return
    target = computeTarget()
    const p = topLoader.progress
    const speed =
      target > p
        ? (target - p) * (p < 0.6 ? 0.35 : p < 0.9 ? 0.18 : 0.08)
        : 0
    topLoader.progress = Math.min(target, p + Math.max(0.008, speed))
    tick()
  }, 120)
}

function ensureStart() {
  if (topLoader.active) return
  topLoader.active = true
  topLoader.progress = 0.08
  minShownAt = Date.now()
  tick()
}

function maybeFinish() {
  if (anyActive()) return
  target = 1
  const elapsed = Date.now() - minShownAt
  const wait = Math.max(0, 300 - elapsed)
  setTimeout(() => {
    topLoader.progress = 1
    setTimeout(() => {
      clearTimeout(timer)
      topLoader.active = false
      topLoader.progress = 0
      target = 0
    }, 220)
  }, wait)
}

export function topLoaderStart(phase = 'route') {
  if (phase !== 'route' && phase !== 'data') phase = 'route'
  counts[phase]++
  ensureStart()
}

export function topLoaderDone(phase = 'route') {
  if (phase !== 'route' && phase !== 'data') phase = 'route'
  counts[phase] = Math.max(0, counts[phase] - 1)
  maybeFinish()
}
