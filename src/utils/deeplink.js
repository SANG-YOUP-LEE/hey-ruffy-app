// src/utils/deeplink.js
import { App } from '@capacitor/app'
import router from '@/router'

// r 쿼리 파라미터로 메인으로 이동 (달성현황 카드가 이 라우트에서 열리도록)
function openByQuery(id) {
  if (!id) return
  try {
    // 라우터가 있으면 라우터로
    router.push({ name: 'main', query: { r: id } })
  } catch (_) {
    // 라우터가 아직 준비 전이면 해시로 폴백
    const url = new URL(window.location.href)
    url.hash = `#/main?r=${encodeURIComponent(id)}`
    window.location.replace(url.toString())
  }
}

export function installDeepLinkListener() {
  // 1) 앱이 이미 켜져 있고, 알림에서 들어온 경우 (Capacitor 이벤트)
  App.addListener('appUrlOpen', ({ url }) => {
    try {
      const u = new URL(url)
      const rid = u.searchParams.get('r')
      if (rid) openByQuery(rid)
    } catch (_) {}
  })

  // 2) 앱이 꺼진 상태에서 딥링크로 바로 실행된 경우(초기 진입 주소에 스킴 포함)
  try {
    const u = new URL(window.location.href)
    // iOS에서 AppDelegate가 heyruffy://main?r=... 를 넘겨준 뒤
    // Capacitor가 웹뷰를 띄울 때 이 URL로 시작할 수 있음
    const rid = u.searchParams.get('r')
    if (rid) openByQuery(rid)
  } catch (_) {}
}
