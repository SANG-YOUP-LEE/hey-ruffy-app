// src/utils/ruffyTimePicker.js
import { registerPlugin } from '@capacitor/core'

const RuffyTimePicker = registerPlugin('RuffyTimePicker')

// 전역 억제 플래그 (편집 라우팅 직전 한 번 켜기)
if (!globalThis.__RUFFY_SUPPRESS_ONCE) {
  globalThis.__RUFFY_SUPPRESS_ONCE = false
}

// 편집 진입 직후 Nms 동안 가드
let editingSince = 0
export function setEditingGuard() {
  editingSince = Date.now()
}
function withinGuard(ms = 1500) {
  return (Date.now() - editingSince) < ms
}

/**
 * time picker를 띄우고 결과를 반환
 * @param {string|null} initialISO - "yyyy-MM-dd'T'HH:mm:ss" (로컬, Z 없음) 또는 null
 * @returns {Promise<string>} 같은 포맷의 ISO 문자열
 */
export async function presentTime(initialISO) {
  if (globalThis.__RUFFY_SUPPRESS_ONCE || withinGuard()) {
    globalThis.__RUFFY_SUPPRESS_ONCE = false // one-shot 해제
    return null
  }
  const { value } = await RuffyTimePicker.present({
    mode: 'time',
    value: initialISO ?? null,
    format: "yyyy-MM-dd'T'HH:mm:ss",
    cancelButtonText: '취소',
    doneButtonText: '완료',
  })
  return value
}
