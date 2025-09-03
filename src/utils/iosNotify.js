// src/utils/iosNotify.js
// ✅ iOS 브릿지가 있으면 실제 postMessage, 없으면 안전 NO-OP(Promise 유지)
// - 스케줄: notify 브릿지로 schedule류 액션을 순차 시도
// - 취소: 기존 cancel 경로 유지 + 새 cancelRepeatingLocal 지원
// - 모든 함수는 Promise 반환(호출부 안정성)

function hasOldBridge() { return !!window.webkit?.messageHandlers?.notify }
function hasNewCancelBridge() { return !!window.webkit?.messageHandlers?.cancelRepeatingLocal }

function log(tag, payload) {
  try { console.warn(`[iosNotify] ${tag}`, payload ?? '') } catch (_) {}
}

function postOld(action, payload) {
  try { window.webkit.messageHandlers.notify.postMessage({ action, ...payload }) } catch (_) {}
}

function tryPostMany(actions, payload) {
  for (const action of actions) {
    try {
      window.webkit.messageHandlers.notify.postMessage({ action, ...payload })
      return true
    } catch (_) {
      /* 다음 액션으로 시도 */
    }
  }
  return false
}

// -------- 유틸: 페이로드 정규화(최소 필드 보완) --------
function normalizeSchedulePayload(msg) {
  const safe = { ...(msg || {}) }
  // id 필수: 없으면 생성
  if (!safe.id) safe.id = `rt_${Date.now()}`
  // 제목/본문 보완
  if (!safe.title && safe.name) safe.title = String(safe.name)
  if (!safe.body && safe.title) safe.body = String(safe.title)
  // 시간 보완: {hour, minute} 또는 {alarm:{hour,minute}}
  if (!safe.alarm) {
    const hour = Number(safe.hour), minute = Number(safe.minute)
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      safe.alarm = { hour, minute }
    }
  }
  return safe
}

// ----- 스케줄 계열: 브릿지 있으면 실제 전송, 없으면 NO-OP -----
export function scheduleRoutineAlerts(payload) {
  const msg = normalizeSchedulePayload(payload)
  if (hasOldBridge()) {
    // 여러 액션 키 호환 시도
    const ok = tryPostMany(
      ['scheduleRepeatingLocal', 'schedule', 'notifySchedule'],
      msg
    )
    log(ok ? 'scheduleRoutineAlerts:POST' : 'scheduleRoutineAlerts:POST_FAIL', msg)
    return Promise.resolve(ok)
  }
  log('scheduleRoutineAlerts:NO_BRIDGE', msg)
  return Promise.resolve(false)
}

export function scheduleOnIOS(r) {
  const msg = normalizeSchedulePayload(r)
  if (hasOldBridge()) {
    const ok = tryPostMany(
      ['scheduleRepeatingLocal', 'schedule', 'notifySchedule'],
      msg
    )
    log(ok ? 'scheduleOnIOS:POST' : 'scheduleOnIOS:POST_FAIL', msg)
    return Promise.resolve(ok)
  }
  log('scheduleOnIOS:NO_BRIDGE', msg)
  return Promise.resolve(false)
}

export function scheduleRepeatingLocal(msg) {
  const payload = normalizeSchedulePayload(msg)
  if (hasOldBridge()) {
    const ok = tryPostMany(
      ['scheduleRepeatingLocal', 'schedule', 'notifySchedule'],
      payload
    )
    log(ok ? 'scheduleRepeatingLocal:POST' : 'scheduleRepeatingLocal:POST_FAIL', payload)
    return Promise.resolve(ok)
  }
  log('scheduleRepeatingLocal:NO_BRIDGE', payload)
  return Promise.resolve(false)
}

// ----- 취소 계열: 가능하면 notify/cancelRepeatingLocal 사용 -----
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
  log('cancelRoutineAlerts:NO_BRIDGE', groupId)
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
  log('cancelOnIOS:NO_BRIDGE', groupBase)
  return Promise.resolve(false)
}

export function cancelRepeatingLocal(msg) {
  log('cancelRepeatingLocal:REQ', msg)
  const groupId = msg?.groupId
  if (!groupId) return Promise.resolve(false)

  if (hasOldBridge()) {
    postOld('cancel', { id: groupId })
    log('cancelRepeatingLocal:POST_OLD', groupId)
    return Promise.resolve(true)
  }
  if (hasNewCancelBridge()) {
    try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId }) } catch (_) {}
    log('cancelRepeatingLocal:POST_NEW', groupId)
    return Promise.resolve(true)
  }
  log('cancelRepeatingLocal:NO_BRIDGE', groupId)
  return Promise.resolve(false)
}

// (옵션) 전체 취소가 네이티브에 없다면 NO-OP
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
