// utils/iosRoutineScheduler.js
// Firestore 루틴을 실시간 구독해서 iOS 네이티브 "로컬 알림만" 예약/취소 동기화 (완성본)

import { getFirestore, collectionGroup, query, where, onSnapshot } from 'firebase/firestore'
import { scheduleRoutineAlerts, cancelRoutineAlerts } from '@/utils/iosNotify'

// ───────────────────────────────────────────────────────────────────────────────
// iOS 브릿지 체크 (웹/안드에서 에러 방지)
function hasIOSBridge() {
  return !!(window.webkit?.messageHandlers?.scheduleRepeatingLocal || window.webkit?.messageHandlers?.notify)
}

// 문서 경로 → 고유 키
function makeIdFromPath(doc) {
  return doc.ref.path.replace(/\//g, '_') // users_uid_..._routines_xxx
}

// offsets 정규화: 숫자만, 중복 제거, 0은 최대 1개만 허용
function normOffsets(v) {
  const arr = Array.isArray(v) ? v : (v == null ? [0] : [Number(v)])
  const nums = arr.map(Number).filter(Number.isFinite)
  const hasZero = nums.includes(0)
  const dedup = Array.from(new Set(nums.filter(n => n !== 0)))
  return hasZero ? [0, ...dedup] : dedup
}

// 루틴 → iOS 예약 payload 매핑 (로컬 알람 전용)
function toIOSPayloads(r) {
  const groupBase = `routine-${r.id}`

  const base = {
    groupId: groupBase,
    title: '헤이러피',
    body: `${r.name || '루틴'} 시간이에요!`,
    hour: r.timeHour ?? r?.time?.hour ?? r?.alarm?.hour ?? 8,
    minute: r.timeMinute ?? r?.time?.minute ?? r?.alarm?.minute ?? 0,
    monthsAhead: r.monthsAhead ?? 12,
    offsets: normOffsets(r?.alert?.offsets ?? r.offsets),
    soundName: r?.alert?.soundName || r.soundName || null,
  }

  const mode = r.repeatMode || r.mode // 'daily' | 'weekly' | 'monthly-date' | 'monthly-nth' | 'once'

  if (mode === 'daily') {
    // daily는 스케줄러가 내부적으로 7요일로 확장
    return [{ ...base }]
  }

  
const __mapWeekdayToIOS = (wd) => {
  const n = Number(wd);
  if (!Number.isFinite(n)) return wd;
  // UI 저장은 1=월..7=일로 들어올 수 있음 -> iOS는 1=일..7=토
  if (n >= 1 && n <= 7) return n === 7 ? 1 : n + 1;
  return wd;
};

if (mode === 'weekly') {
    const everyWeeks = r.everyWeeks ?? r.weeksInterval ?? 1   // 1=매주, 2=격주, 4/5=매4/5주
    let weekdays = Array.isArray(r?.alarm?.weekdays) && r.alarm.weekdays.length
      ? r.alarm.weekdays
      : (Array.isArray(r.weekdays) && r.weekdays.length ? r.weekdays : (r.weekday ? [r.weekday] : []))

    weekdays = weekdays.map(__mapWeekdayToIOS);
    return weekdays.map((wd) => ({
      ...base,
      groupId: `${groupBase}__wd${wd}`, // 요일별 분리(취소 쉬움)
      weekday: wd,                      // 1=일 ~ 7=토
      weeksInterval: everyWeeks
    }))
  }

  if (mode === 'monthly-date') {
    const monthDays = Array.isArray(r.monthDays) ? r.monthDays.filter(n => Number(n) >= 1) : []
    if (!monthDays.length) return []
    return [{ ...base, monthDays }]
  }

  if (mode === 'monthly-nth') {
    // nthWeek: 1~5, -1(마지막), weekday: 1~7
    const nthWeek = r.nthWeek ?? r?.alarm?.nthWeek ?? 1
    const weekday = r.weekday ?? r?.alarm?.weekday ?? (Array.isArray(r.weekdays) ? r.weekdays[0] : null)
    if (!weekday) return []
    return [{ ...base, nthWeek, weekday }]
  }

  // once(1회)는 여기서 다루지 않음(저장 직후 바로 쏘거나 별도 구현)
  return []
}

// fingerprint: 반복 규칙 + 알림 옵션 변화만 추적 (불필요 재스케줄 방지)
function fingerprint(r) {
  return JSON.stringify({
    mode: r.repeatMode || r.mode,
    hour: r.timeHour ?? r?.time?.hour ?? r?.alarm?.hour ?? null,
    minute: r.timeMinute ?? r?.time?.minute ?? r?.alarm?.minute ?? null,
    weekdays: r?.alarm?.weekdays ?? r.weekdays ?? (r.weekday ? [r.weekday] : []),
    everyWeeks: r.everyWeeks ?? r.weeksInterval ?? 1,
    monthDays: r.monthDays ?? [],
    nthWeek: r.nthWeek ?? null,
    weekday: r.weekday ?? null,
    offsets: normOffsets(r?.alert?.offsets ?? r.offsets),
    soundName: r?.alert?.soundName || r.soundName || null,
  })
}

const fpMap = new Map()

// 빠른 연속변경 배치 전송
function createBatchPoster() {
  let q = new Map()
  let t = null
  const flush = () => {
    const items = Array.from(q.values())
    q.clear(); t = null
    for (const it of items) {
      if (it.type === 'cancel') cancelRoutineAlerts(it.groupId)
      else if (it.type === 'schedule') scheduleRoutineAlerts(it.payload)
    }
  }
  return {
    schedule(payload) { q.set('S:'+payload.groupId, { type:'schedule', groupId:payload.groupId, payload }); if (!t) t = setTimeout(flush, 150) },
    cancel(groupId)   { q.set('C:'+groupId,         { type:'cancel',   groupId });                          if (!t) t = setTimeout(flush, 150) },
    stop() { if (t) { clearTimeout(t); t=null; q.clear() } }
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 싱글톤 가드: 같은 uid로 중복 init 방지
let __iosSchedulerLiveForUid = null
let __iosSchedulerUnsub = null
let __iosSchedulerPoster = null

/**
 * 메인뷰(or App.vue) 마운트 시 한 번 호출해서 iOS 예약과 동기화
 */
export function initIOSRoutineScheduler(uid) {
  if (!uid) return () => {}
  if (!hasIOSBridge()) return () => {}

  // 같은 uid로 이미 구독 중이면 재진입 방지
  if (__iosSchedulerLiveForUid === uid) {
    return () => {}
  }

  const db = getFirestore()
  const qy = query(collectionGroup(db, 'routines'), where('userId', '==', uid))
  const poster = createBatchPoster()

  const unsub = onSnapshot(qy, (snap) => {
    snap.docChanges().forEach(({ type, doc }) => {
      const d = doc.data() || {}
      const r = {
        id: makeIdFromPath(doc),
        name: d.name,
        repeatMode: d.repeatMode || d.mode, // 'daily' | 'weekly' | 'monthly-date' | 'monthly-nth' | 'once'
        timeHour: d.timeHour, timeMinute: d.timeMinute,
        weekday: d.weekday, weekdays: d.weekdays,
        everyWeeks: d.everyWeeks, weeksInterval: d.weeksInterval,
        monthDays: d.monthDays, nthWeek: d.nthWeek,
        alert: d.alert, offsets: d.offsets, soundName: d.soundName,
        alarm: d.alarm, // 하위 호환(weekday/hour/minute 등이 alarm 밑에 있을 수 있음)
        enabled: d.enabled !== false,     // 없으면 true 취급
      }

      const id = r.id

      const fullyCancel = () => {
        // 베이스 + 요일별 잔재까지 싹 정리
        poster.cancel(`routine-${id}`)
        for (let wd = 1; wd <= 7; wd++) poster.cancel(`routine-${id}__wd${wd}`)
      }

      if (type === 'removed' || !r.enabled) {
        fullyCancel()
        fpMap.delete(id)
        return
      }

      const newFP = fingerprint(r)
      const oldFP = fpMap.get(id)
      if (newFP === oldFP) return

      // 1회 알림이 과거 시각이면 스킵
      const onceAt = r?.alarm?.onceAt ?? d.onceAt
      const isOnce = (r.repeatMode === 'once' || r.mode === 'once')
      const isOncePast = isOnce && (Number(onceAt) * 1000 < Date.now())
      if (isOnce && isOncePast) { fpMap.set(id, newFP); return }

      // 기존 예약 전부 취소 후 새로 등록(중복 방지)
      fullyCancel()

      const payloads = toIOSPayloads(r)
      payloads.forEach(p => poster.schedule(p))
      fpMap.set(id, newFP)
    })
  })

  __iosSchedulerLiveForUid = uid
  __iosSchedulerUnsub = unsub
  __iosSchedulerPoster = poster

  return () => {
    try { __iosSchedulerPoster?.stop?.() } catch {}
    try { __iosSchedulerUnsub?.() } catch {}
    __iosSchedulerPoster = null
    __iosSchedulerUnsub = null
    __iosSchedulerLiveForUid = null
  }
}
