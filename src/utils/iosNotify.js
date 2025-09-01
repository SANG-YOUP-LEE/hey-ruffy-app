// src/utils/iosNotify.js

// --- 브릿지 존재 체크 ---
function hasNewScheduleBridge() {
  return !!window.webkit?.messageHandlers?.scheduleRepeatingLocal
}
function hasNewCancelBridge() {
  return !!window.webkit?.messageHandlers?.cancelRepeatingLocal
}
function hasOldBridge() {
  return !!window.webkit?.messageHandlers?.notify
}

// --- 브릿지 호출 ---
function postNewSchedule(msg) {
  window.webkit.messageHandlers.scheduleRepeatingLocal.postMessage(msg)
}
function postNewCancel(groupId) {
  window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId })
}
function postOld(action, payload) {
  window.webkit.messageHandlers.notify.postMessage({ action, ...payload })
}

// --- 공통 기본값 ---
const DEFAULT_MONTHS_AHEAD = 12

// --- offsets 정규화: 숫자만, 중복 제거, 0은 최대 1개만 ---
function normOffsets(v) {
  const arr = Array.isArray(v) ? v : (v == null ? [0] : [Number(v)])
  const nums = arr.map(Number).filter(Number.isFinite)
  const hasZero = nums.includes(0)
  const dedupNonZero = Array.from(new Set(nums.filter(n => n !== 0)))
  return hasZero ? [0, ...dedupNonZero] : dedupNonZero
}

// ---- 새 브릿지용 통합 스케줄러 ----
export function scheduleRoutineAlerts(payload) {
  if (!hasNewScheduleBridge()) return
  // payload.offsets 정규화(안전)
  if (Array.isArray(payload?.offsets)) {
    payload = { ...payload, offsets: normOffsets(payload.offsets) }
  }
  postNewSchedule(payload)
}

export function cancelRoutineAlerts(groupId) {
  if (!(hasNewScheduleBridge() && hasNewCancelBridge())) return
  // base만 들어오면 daily/weekly 파생 아이디까지 같이 정리
  const bases = new Set([groupId])
  if (!/__wd\d$/.test(groupId) && !/__daily__wd\d$/.test(groupId)) {
    for (let d = 1; d <= 7; d++) {
      bases.add(`${groupId}__daily__wd${d}`) // daily
      bases.add(`${groupId}__wd${d}`)        // weekly
    }
  }
  bases.forEach((gid) => postNewCancel(gid))
}

// ======================================================================
// 기존 API 유지: scheduleOnIOS / cancelOnIOS / cancelAllOnIOS
// ======================================================================

/**
 * r: {
 *   id, name, repeatMode: 'once' | 'daily' | 'weekly' | 'monthly-date' | 'monthly-nth',
 *   alarm: { hour, minute, offsets, soundName, monthsAhead, onceAt, weekdays, weeksInterval, monthDays, nthWeek, weekday }
 * }
 */
export function scheduleOnIOS(r) {
  if (!r?.id || !r?.repeatMode || !r?.alarm) return

  // ✅ 새 브릿지 존재 시: 이 레거시 함수는 중복 방지를 위해 아무 것도 하지 않음.
  // (반드시 initIOSRoutineScheduler + scheduleRoutineAlerts 파이프라인만 사용)
  if (hasNewScheduleBridge()) return

  const title = '헤이러피'
  const body = `${r.name || '루틴'} 시간이에요!`
  const groupBase = `routine-${r.id}`
  const {
    hour,
    minute,
    weekdays = [],
    weeksInterval = 1,
    offsets = [0],
    soundName = null,
    onceAt,
    monthDays = [],
    nthWeek,
    weekday, // monthly-nth 용
  } = r.alarm

  // --- 구 브릿지 폴백 (monthly-* 미지원) ---
  if (hasOldBridge()) {
    switch (r.repeatMode) {
      case 'once': {
        if (!Number(onceAt)) return
        const ts = Number(onceAt)
        const seconds = ts > 1_000_000_000_000 ? Math.floor(ts / 1000) : ts
        postOld('scheduleOnce', { id: groupBase, title, body, timestamp: seconds })
        break
      }
      case 'daily': {
        if (hour == null || minute == null) return
        postOld('scheduleDaily', { id: groupBase, title, body, hour: Number(hour), minute: Number(minute) })
        break
      }
      case 'weekly': {
        if (hour == null || minute == null || !Array.isArray(weekdays) || weekdays.length === 0) return
        // ❗ 구 브릿지는 N주 간격 지원 X → 매주 예약
        postOld('scheduleWeekly', { id: groupBase, title, body, hour: Number(hour), minute: Number(minute), weekdays })
        break
      }
      default:
        // monthly-* 은 구 브릿지에서 지원 불가 → 무시
        break
    }
  }
}

export function cancelOnIOS(routineId) {
  if (!routineId) return
  const groupBase = `routine-${routineId}`

  if (hasNewScheduleBridge() && hasNewCancelBridge()) {
    const bases = new Set([groupBase])
    for (let d = 1; d <= 7; d++) {
      bases.add(`${groupBase}__daily__wd${d}`)
      bases.add(`${groupBase}__wd${d}`)
    }
    bases.forEach((gid) => postNewCancel(gid))
  } else if (hasOldBridge()) {
    postOld('cancel', { id: groupBase })
  }
}

export function cancelAllOnIOS() {
  if (hasNewScheduleBridge() && hasNewCancelBridge()) {
    // 새 브릿지는 cancelAll 미구현 → 루틴 id 목록을 돌면서 cancelOnIOS 사용 권장
    return
  } else if (hasOldBridge()) {
    postOld('cancelAll', {})
  }
}
