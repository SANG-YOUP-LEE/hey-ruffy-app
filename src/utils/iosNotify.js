// src/utils/iosNotify.js
// ✅ 중복 경로 차단 + 안전 Promise NO-OP 버전
// - 모든 스케줄 함수는 NO-OP지만 Promise를 반환해 호출부가 절대 깨지지 않음
// - 취소 함수도 Promise 반환, 가능하면 notify 브리지로만 보냄
// - 콘솔에 호출 흔적만 남김

function hasOldBridge() { return !!window.webkit?.messageHandlers?.notify }
function hasNewCancelBridge() { return !!window.webkit?.messageHandlers?.cancelRepeatingLocal }

function log(tag, payload) {
  try { console.warn(`[iosNotify disabled] ${tag}`, payload ?? '') } catch (_) {}
}

function postOld(action, payload) {
  try { window.webkit.messageHandlers.notify.postMessage({ action, ...payload }) } catch (_) {}
}

// ----- 스케줄 계열: NO-OP + Promise -----
export function scheduleRoutineAlerts(payload) {
  log('scheduleRoutineAlerts:NOOP', payload)
  return Promise.resolve(true)
}
export function scheduleOnIOS(r) {
  log('scheduleOnIOS:NOOP', r)
  return Promise.resolve(true)
}
export function scheduleRepeatingLocal(msg) {
  log('scheduleRepeatingLocal:NOOP', msg)
  return Promise.resolve(true)
}

// ----- 취소 계열: 가능하면 notify 사용 + Promise -----
export function cancelRoutineAlerts(groupId) {
  log('cancelRoutineAlerts', groupId)
  if (!groupId) return Promise.resolve(false)

  if (hasOldBridge()) {
    postOld('cancel', { id: groupId })
    return Promise.resolve(true)
  }
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId }) } catch (_) {}
    return Promise.resolve(true)
  }
  return Promise.resolve(false)
}

export function cancelOnIOS(routineId) {
  log('cancelOnIOS', routineId)
  if (!routineId) return Promise.resolve(false)
  const groupBase = `routine-${routineId}`

  if (hasOldBridge()) {
    postOld('cancel', { id: groupBase })
    return Promise.resolve(true)
  }
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId: groupBase }) } catch (_) {}
    return Promise.resolve(true)
  }
  return Promise.resolve(false)
}

export function cancelRepeatingLocal(msg) {
  log('cancelRepeatingLocal', msg)
  if (hasOldBridge() && msg?.groupId) {
    postOld('cancel', { id: msg.groupId })
    return Promise.resolve(true)
  }
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId: msg?.groupId }) } catch (_) {}
    return Promise.resolve(true)
  }
  return Promise.resolve(false)
}

// (안 쓰면 지워도 됨)
export function cancelAllOnIOS() {
  log('cancelAllOnIOS:NOOP')
  return Promise.resolve(true)
}

export default {
  scheduleRoutineAlerts,
  cancelRoutineAlerts,
  scheduleOnIOS,
  cancelOnIOS,
  scheduleRepeatingLocal,
  cancelRepeatingLocal,
  cancelAllOnIOS,
}
