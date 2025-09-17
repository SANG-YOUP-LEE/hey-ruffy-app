export function showNativeCardStack(el, items) {
  const plugin = window.Capacitor?.Plugins?.NativeCardStack
  if (!plugin || !el) return
  const r = el.getBoundingClientRect()
  return plugin.show({
    x: r.left,
    y: r.top + window.scrollY,
    w: r.width,
    h: r.height,
    radius: 16,
    items
  })
}

export function resizeNativeCardStack(el) {
  const plugin = window.Capacitor?.Plugins?.NativeCardStack
  if (!plugin || !el) return
  const r = el.getBoundingClientRect()
  return plugin.resize({
    x: r.left,
    y: r.top + window.scrollY,
    w: r.width,
    h: r.height
  })
}

export function updateNativeCardItems(items) {
  const plugin = window.Capacitor?.Plugins?.NativeCardStack
  if (!plugin) return
  return plugin.updateItems({ items })
}

export function hideNativeCardStack() {
  const plugin = window.Capacitor?.Plugins?.NativeCardStack
  if (!plugin) return
  return plugin.hide({})
}
