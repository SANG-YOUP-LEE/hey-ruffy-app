// src/utils/iosNotify.js

function hasOldBridge() { return !!window.webkit?.messageHandlers?.notify }
function hasNewCancelBridge() { return !!window.webkit?.messageHandlers?.cancelRepeatingLocal }

function log(tag, payload) {
  try { console.warn(`[iosNotify] ${tag}`, payload ?? '') } catch (_) {}
}
function postOld(action, payload) {
  try { window.webkit.messageHandlers.notify.postMessage({ action, ...payload }) } catch (_) {}
}

// ----- 스케줄 계열 -----

export function scheduleRoutineAlerts(payload) {
  // 필요 시 여러 건을 외부에서 만들어 넘기고 여기서는 그대로 브리지로
  log('scheduleRoutineAlerts:REQ', payload)
  if (hasOldBridge()) {
    postOld('schedule', payload)         // ✅ old bridge는 'schedule'만 인식
    log('scheduleRoutineAlerts:POST_OLD', payload)
    return Promise.resolve(true)
  }
  // 새 브리지(없다면 NO-OP)
  log('scheduleRoutineAlerts:NOOP', payload)
  return Promise.resolve(true)
}

export function scheduleOnIOS(msg) {
  // 단건 스케줄도 동일하게 'schedule'로 매핑
  log('scheduleOnIOS:REQ', msg)
  if (hasOldBridge()) {
    postOld('schedule', msg)             // ✅ 여기도 'schedule'
    log('scheduleOnIOS:POST_OLD', msg)
    return Promise.resolve(true)
  }
  log('scheduleOnIOS:NOOP', msg)
  return Promise.resolve(true)
}

export function scheduleRepeatingLocal(msg) {
  // 반복 스케줄 이름이 달라도 old bridge에는 'schedule' 하나로 보내면 됨
  log('scheduleRepeatingLocal:REQ', msg)
  if (hasOldBridge()) {
    postOld('schedule', msg)             // ✅ 문제 원인: 'scheduleRepeatingLocal' → 'schedule'
    log('scheduleRepeatingLocal:POST_OLD', msg)
    return Promise.resolve(true)
  }
  log('scheduleRepeatingLocal:NOOP', msg)
  return Promise.resolve(true)
}

// ----- 취소 계열(현재도 OK) -----

export function cancelRoutineAlerts(groupId) {
  log('cancelRoutineAlerts:REQ', groupId)
  if (!groupId) return Promise.resolve(false)

  if (hasOldBridge()) {
    postOld('cancel', { id: groupId })
    log('cancelRoutineAlerts:POST_OLD', groupId)
    return Promise.resolve(true)
  }
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId }) } catch (_) {}
    log('cancelRoutineAlerts:POST_NEW', groupId)
    return Promise.resolve(true)
  }
  return Promise.resolve(false)
}

export function cancelOnIOS(routineId) {
  log('cancelOnIOS:REQ', routineId)
  if (!routineId) return Promise.resolve(false)
  const groupBase = `routine-${routineId}`

  if (hasOldBridge()) {
    postOld('cancel', { id: groupBase })
    log('cancelOnIOS:POST_OLD', groupBase)
    return Promise.resolve(true)
  }
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId: groupBase }) } catch (_) {}
    log('cancelOnIOS:POST_NEW', groupBase)
    return Promise.resolve(true)
  }
  return Promise.resolve(false)
}

export function cancelRepeatingLocal(msg) {
  log('cancelRepeatingLocal:REQ', msg)
  if (hasOldBridge() && msg?.groupId) {
    postOld('cancel', { id: msg.groupId })
    log('cancelRepeatingLocal:POST_OLD', msg)
    return Promise.resolve(true)
  }
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId: msg?.groupId }) } catch (_) {}
    log('cancelRepeatingLocal:POST_NEW', msg)
    return Promise.resolve(true)
  }
  return Promise.resolve(false)
}

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
