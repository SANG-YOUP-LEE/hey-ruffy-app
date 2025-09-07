// src/utils/deeplink.js
import router from '@/router'

const MAIN_ROUTE_NAME = 'main'
let _installed = false

function toQuery(obj) {
  const q = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, v) })
  return q
}

async function openByQuery(id, tab) {
  if (!id && !tab) return
  const query = {}
  if (id) query.r = id
  if (tab) query.tab = tab

  try {
    await router.isReady?.()
    await router.push({ name: MAIN_ROUTE_NAME, query })
  } catch {
    const url = new URL(window.location.href)
    const q = toQuery(query).toString()
    url.hash = `#/${MAIN_ROUTE_NAME}?${q}`
    window.location.replace(url.toString())
  }
}

function parseAndOpen(urlStr) {
  try {
    const u = new URL(urlStr)
    const path = (u.pathname || '').replace(/^\/+/, '').toLowerCase()
    const rid = u.searchParams.get('r') || u.searchParams.get('rid')
    const tab = u.searchParams.get('tab') || u.searchParams.get('view')
    if (path && path !== MAIN_ROUTE_NAME && !rid && !tab) return
    openByQuery(rid, tab)
  } catch {}
}

export function installDeepLinkListener() {
  if (_installed) return
  _installed = true

  window.addEventListener('appUrlOpen', (ev) => {
    try {
      const detail = ev?.detail
      const payload = typeof detail === 'string' ? JSON.parse(detail) : (detail || {})
      const urlStr = payload?.url || payload?.data?.url
      if (urlStr) parseAndOpen(urlStr)
    } catch {}
  })

  try {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', ({ url }) => parseAndOpen(url))
    }).catch(() => {})
  } catch {}

  parseAndOpen(window.location.href)
}
