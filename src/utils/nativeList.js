const P = () => window.Capacitor?.Plugins?.NativeRoutineList

function rectOf(el) {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height }
}

export function showNativeRoutineList(el, items) {
  const plugin = P()
  if (!plugin || !el) return
  const { x, y, w, h } = rectOf(el)
  return plugin.show({ x, y, w, h, radius: 16, shadow: true, items })
}

export function resizeNativeRoutineList(el) {
  const plugin = P()
  if (!plugin || !el) return
  const { x, y, w, h } = rectOf(el)
  return plugin.resize({ x, y, w, h })
}

export function hideNativeRoutineList() {
  const plugin = P()
  if (!plugin) return
  return plugin.hide({})
}

export function updateNativeRoutineItems(items) {
  const plugin = P()
  if (!plugin) return
  return plugin.updateItems({ items })
}

export function setNativeRoutineMode(mode) {
  const plugin = P()
  if (!plugin) return
  return plugin.setMode({ mode })
}

export function attachNativeRoutineAutoResize(el) {
  const plugin = P()
  if (!plugin || !el) return () => {}
  let raf = 0
  const onResize = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => resizeNativeRoutineList(el))
  }
  const ro = new ResizeObserver(onResize)
  ro.observe(el)
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('scroll', onResize, { passive: true })
  document.addEventListener('visibilitychange', onResize)
  return () => {
    ro.disconnect()
    window.removeEventListener('resize', onResize)
    window.removeEventListener('scroll', onResize)
    document.removeEventListener('visibilitychange', onResize)
  }
}
