// Firestore 루틴을 실시간 구독해서 iOS 네이티브 알림에 예약/취소 동기화
import { getFirestore, collectionGroup, query, where, onSnapshot } from 'firebase/firestore'
import { scheduleRoutineAlerts, cancelRoutineAlerts } from '@/utils/iosNotify'

// 브릿지 체크 (웹에서도 에러 안 나게)
function hasIOSBridge() {
  return !!(window.webkit?.messageHandlers?.scheduleRepeatingLocal || window.webkit?.messageHandlers?.notify)
}

// 문서 경로 → 고유 키
function makeIdFromPath(doc) {
  return doc.ref.path.replace(/\//g, '_') // users_uid_..._routines_xxx
}

// 루틴 → iOS 예약 payload 매핑
function toIOSPayloads(r) {
  const groupBase = `routine-${r.id}`

  const base = {
    groupId: groupBase,
    title: '헤이러피',
    body: `${r.name || '루틴'} 시간이에요!`,
    hour: r.timeHour ?? r?.time?.hour ?? r?.alarm?.hour ?? 8,
    minute: r.timeMinute ?? r?.time?.minute ?? r?.alarm?.minute ?? 0,
    monthsAhead: r.monthsAhead ?? 12,
    offsets: Array.isArray(r?.alert?.offsets) ? r.alert.offsets : (r.offsets || [0]),
    soundName: r?.alert?.soundName || r.soundName || null,
  }

  const mode = r.repeatMode || r.mode // 호환
  if (mode === 'daily') {
    // daily는 스케줄러가 7요일로 확장
    return [ { ...base } ]
  }

  if (mode === 'weekly') {
    const everyWeeks = r.everyWeeks ?? r.weeksInterval ?? 1   // 1=매주, 2=격주, 4/5=매4/5주
    const weekdays = Array.isArray(r?.alarm?.weekdays) && r.alarm.weekdays.length
      ? r.alarm.weekdays
      : (Array.isArray(r.weekdays) && r.weekdays.length ? r.weekdays : (r.weekday ? [r.weekday] : []))

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
    return [ { ...base, monthDays } ]
  }

  if (mode === 'monthly-nth') {
    // nthWeek: 1~5, -1(마지막), weekday: 1~7
    const nthWeek = r.nthWeek ?? r?.alarm?.nthWeek ?? 1
    const weekday = r.weekday ?? r?.alarm?.weekday ?? (Array.isArray(r.weekdays) ? r.weekdays[0] : null)
    if (!weekday) return []
    return [ { ...base, nthWeek, weekday } ]
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
    weekdays: r?.alarm?.weekdays ?? r.weekdays ?? (r.weekday ? [r.weekday] : null),
    everyWeeks: r.everyWeeks ?? r.weeksInterval ?? null,
    monthDays: r.monthDays ?? null,
    nthWeek: r.nthWeek ?? null,
    weekday: r.weekday ?? null,
    offsets: (Array.isArray(r?.alert?.offsets) ? r.alert.offsets : r.offsets) ?? null,
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

/**
 * 메인뷰(or App.vue) 마운트 시 한 번 호출해서 iOS 예약과 동기화
 */
export function initIOSRoutineScheduler(uid) {
  if (!uid) return () => {}
  if (!hasIOSBridge()) return () => {}

  const db = getFirestore()
  const q = query(collectionGroup(db, 'routines'), where('userId', '==', uid))
  const poster = createBatchPoster()

  const unsub = onSnapshot(q, (snap) => {
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
      if (type === 'removed' || !r.enabled) {
        // 삭제/비활성 → 취소
        poster.cancel(`routine-${id}`)
        // 요일별로 만든 것들도 함께 지울 수 있도록, cancel 함수가 패턴 전체를 지우도록 구현되어 있음
        fpMap.delete(id)
        return
      }

      const newFP = fingerprint(r)
      const oldFP = fpMap.get(id)
      if (newFP === oldFP) return

      // 1회 알림이 과거 시각이면 스킵
      const onceAt = r?.alarm?.onceAt ?? d.onceAt
      const isOncePast = (r.repeatMode === 'once' || r.mode === 'once') && (Number(onceAt) * 1000 < Date.now())
      if (isOncePast) { fpMap.set(id, newFP); return }

      // 기존 예약 취소 후 새로 등록(간단·안전)
      poster.cancel(`routine-${id}`)

      const payloads = toIOSPayloads(r)
      payloads.forEach(p => poster.schedule(p))
      fpMap.set(id, newFP)
    })
  })

  return () => { poster.stop(); unsub?.() }
}
