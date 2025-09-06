// src/utils/deeplink.js
// 라우팅 유틸
import router from '@/router'
let MAIN_ROUTE_NAME = 'Main' // 라우터 name이 'main'이라면 'Main' → 'main'으로 바꿔주세요

function openByQuery(id, tab) {
  if (!id && !tab) return
  const query = {}
  if (id) query.r = id
  if (tab) query.tab = tab

  try {
    router.push({ name: MAIN_ROUTE_NAME, query })
  } catch {
    // 라우터 준비 전 폴백
    const url = new URL(window.location.href)
    const q = new URLSearchParams(query).toString()
    url.hash = `#/${MAIN_ROUTE_NAME.toLowerCase()}?${q}`
    window.location.replace(url.toString())
  }
}

// 공통 파서
function parseAndOpen(urlStr) {
  try {
    const u = new URL(urlStr)
    const rid = u.searchParams.get('r') || u.searchParams.get('rid')
    const tab = u.searchParams.get('tab') || u.searchParams.get('view')
    openByQuery(rid, tab)
  } catch {}
}

export function installDeepLinkListener() {
  // A) 네이티브가 triggerJSEvent("appUrlOpen", target:"window") 로 보낼 때
  window.addEventListener('appUrlOpen', (ev) => {
    const detail = ev?.detail
    // AppDelegate에서 data: json 문자열을 보냄 → ev.detail 에 그대로 들어옴
    const payload = typeof detail === 'string' ? JSON.parse(detail) : (detail || {})
    const urlStr = payload?.url || payload?.data?.url
    if (urlStr) parseAndOpen(urlStr)
  })

  // B) (옵션) Capacitor App 플러그인 이벤트도 겸용 수신
  try {
    // 동적 import: 빌드 시 번들 문제 피함
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', ({ url }) => parseAndOpen(url))
    }).catch(() => {})
  } catch {}

  // C) 콜드 스타트: 현재 주소 자체가 스킴/쿼리를 포함할 수 있음
  parseAndOpen(window.location.href)
}
