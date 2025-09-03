// src/utils/iosNotify.js
function hasOldBridge() { return !!window.webkit?.messageHandlers?.notify }
function hasNewCancelBridge() { return !!window.webkit?.messageHandlers?.cancelRepeatingLocal }
function log(tag, payload) { try { console.warn(`[iosNotify disabled] ${tag}`, payload ?? '') } catch (_) {} }

// ---- 스케줄: 무조건 NO-OP + Promise ----
export function scheduleRoutineAlerts(payload) { log('scheduleRoutineAlerts:NOOP', payload); return Promise.resolve(true) }
export function scheduleOnIOS(r) { log('scheduleOnIOS:NOOP', r); return Promise.resolve(true) }
export function scheduleRepeatingLocal(msg) { log('scheduleRepeatingLocal:NOOP', msg); return Promise.resolve(true) }

// ---- 취소: 브릿지 있으면 cancel만 보냄 ----
export function cancelRoutineAlerts(groupId) {
  log('cancelRoutineAlerts', groupId)
  if (!groupId) return Promise.resolve(false)
  if (hasOldBridge()) { try { window.webkit.messageHandlers.notify.postMessage({ action: 'cancel', id: groupId }) } catch (_) {} return Promise.resolve(true) }
  if (hasNewCancelBridge()) { try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId }) } catch (_) {} return Promise.resolve(true) }
  return Promise.resolve(false)
}
export function cancelOnIOS(routineId) {
  log('cancelOnIOS', routineId)
  if (!routineId) return Promise.resolve(false)
  const groupBase = `routine-${routineId}`
  if (hasOldBridge()) { try { window.webkit.messageHandlers.notify.postMessage({ action: 'cancel', id: groupBase }) } catch (_) {} return Promise.resolve(true) }
  if (hasNewCancelBridge()) { try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId: groupBase }) } catch (_) {} return Promise.resolve(true) }
  return Promise.resolve(false)
}
export function cancelRepeatingLocal(msg) {
  log('cancelRepeatingLocal', msg)
  if (msg?.groupId && hasOldBridge()) { try { window.webkit.messageHandlers.notify.postMessage({ action: 'cancel', id: msg.groupId }) } catch (_) {} return Promise.resolve(true) }
  if (hasNewCancelBridge()) { try { window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId: msg?.groupId }) } catch (_) {} return Promise.resolve(true) }
  return Promise.resolve(false)
}
export function cancelAllOnIOS() { log('cancelAllOnIOS:NOOP'); return Promise.resolve(true) }

export default {
  scheduleRoutineAlerts,
  cancelRoutineAlerts,
  scheduleOnIOS,
  cancelOnIOS,
  scheduleRepeatingLocal,
  cancelRepeatingLocal,
  cancelAllOnIOS,
}
