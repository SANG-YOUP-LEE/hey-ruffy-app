// src/utils/iosNotify.js
// ✅ 중복 경로 차단 버전 (DROP-IN)
// - 모든 "스케줄" 함수는 NO-OP (중복 예약 방지)
// - "취소" 함수는 가능한 한 'notify' 브리지로만 보냄
// - 콘솔에 호출 흔적만 남겨서 추적 가능

// ---- 브리지 체크 ----
function hasOldBridge() { return !!window.webkit?.messageHandlers?.notify }
function hasNewScheduleBridge() { return !!window.webkit?.messageHandlers?.scheduleRepeatingLocal }
function hasNewCancelBridge() { return !!window.webkit?.messageHandlers?.cancelRepeatingLocal }

// ---- 공통 로그 ----
function log(tag, payload) {
  try { console.warn(`[iosNotify disabled] ${tag}`, payload ?? '') } catch (_) {}
}

// ---- post helpers ----
function postOld(action, payload) {
  try { window.webkit.messageHandlers.notify.postMessage({ action, ...payload }) } catch (_) {}
}
// (참고: 새 브리지는 더 이상 사용하지 않음 — 중복 방지 목적)

// ======================================================================
// 예약 계열: 전부 NO-OP (중복 스케줄 차단)
// ======================================================================
export function scheduleRoutineAlerts(payload) {
  log('scheduleRoutineAlerts:NOOP', payload)
  // 의도적으로 아무 것도 하지 않음 (중복 경로 차단)
}

export function scheduleOnIOS(r) {
  log('scheduleOnIOS:NOOP', r)
  // 의도적으로 아무 것도 하지 않음 (중복 경로 차단)
}

export function scheduleRepeatingLocal(msg) {
  log('scheduleRepeatingLocal:NOOP', msg)
  // 의도적으로 아무 것도 하지 않음 (중복 경로 차단)
}

// ======================================================================
// 취소 계열: 가능하면 'notify' 브리지로만 보냄 (안전)
// ======================================================================
export function cancelRoutineAlerts(groupId) {
  log('cancelRoutineAlerts', groupId)
  if (!groupId) return

  // 신규 플러그인 경로는 사용하지 않음(중복 방지).
  // 구 브리지만 사용: AppDelegate에서 prefix 기반으로 업서트/취소 처리.
  if (hasOldBridge()) {
    postOld('cancel', { id: groupId })
    return
  }

  // 최후 수단(구 브리지 없고 새 취소만 있는 케이스): 새 취소 사용
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId }) } catch (_) {}
  }
}

export function cancelOnIOS(routineId) {
  log('cancelOnIOS', routineId)
  if (!routineId) return
  const groupBase = `routine-${routineId}`

  if (hasOldBridge()) {
    postOld('cancel', { id: groupBase })
    return
  }
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId: groupBase }) } catch (_) {}
  }
}

export function cancelRepeatingLocal(msg) {
  log('cancelRepeatingLocal', msg)
  // 새 브리지 취소를 직접 부르는 코드가 있을 수 있어, 여기서도 가능하면 구 브리지로 보정
  if (hasOldBridge() && msg?.groupId) {
    postOld('cancel', { id: msg.groupId })
    return
  }
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId: msg?.groupId }) } catch (_) {}
  }
}

// default export(호환)
export default {
  scheduleRoutineAlerts,
  cancelRoutineAlerts,
  scheduleOnIOS,
  cancelOnIOS,
  scheduleRepeatingLocal,
  cancelRepeatingLocal,
  cancelAllOnIOS,
}
