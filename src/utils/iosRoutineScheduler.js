// src/utils/iosRoutineScheduler.js
import {
  getFirestore,
  collectionGroup,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore'
import { scheduleOnIOS, cancelOnIOS, cancelAllOnIOS } from '@/utils/iosNotify'

// 루틴 상태 지문(fingerprint) 캐시 → 불필요한 재스케줄 방지
const fpMap = new Map()

// Firestore 문서 경로를 고유 ID로 변환 (iOS 알람 식별자에 사용)
function makeIdFromPath(doc) {
  // 예) users/uid/dogs/d1/routines/rA -> users_uid_dogs_d1_routines_rA
  return doc.ref.path.replace(/\//g, '_')
}

// 루틴 상태의 fingerprint (반복모드/알람정보만 반영)
function fingerprint(r) {
  const a = r?.alarm || {}
  return JSON.stringify({
    repeatMode: r?.repeatMode ?? null,
    hour: a.hour ?? null,
    minute: a.minute ?? null,
    weekdays: a.weekdays ?? null, // iOS 요일: 1=일 ... 7=토
    onceAt: a.onceAt ?? null,     // UNIX 초
  })
}

/**
 * iOS 로컬 알람 스케줄러 초기화
 * - MainView에서 한 번만 호출
 * - 반환된 함수로 정리(unsubscribe) 가능
 */
export function initIOSRoutineScheduler(uid) {
  if (!uid) return () => {}

  const db = getFirestore()
  const q = query(collectionGroup(db, 'routines'), where('userId', '==', uid))

  const unsub = onSnapshot(q, (snap) => {
    snap.docChanges().forEach(({ type, doc }) => {
      const d = doc.data() || {}
      const r = {
        id: makeIdFromPath(doc),
        name: d.name,
        repeatMode: d.repeatMode, // 'once' | 'daily' | 'weekly'
        alarm: d.alarm || null,
      }

      if (type === 'removed') {
        cancelOnIOS(r.id)
        fpMap.delete(r.id)
        return
      }

      // added / modified
      const newFP = fingerprint(r)
      const oldFP = fpMap.get(r.id)

      if (newFP !== oldFP) {
        // 과거 시각의 1회 알림은 스킵
        const oncePast = r.repeatMode === 'once' && (r?.alarm?.onceAt ?? 0) * 1000 < Date.now()
        if (oncePast) {
          fpMap.set(r.id, newFP)
        } else {
          // 기존 예약 취소 후 새로 등록
          cancelOnIOS(r.id)
          scheduleOnIOS(r)
          fpMap.set(r.id, newFP)
        }
      }
    })
  })

  return () => { unsub?.() }
}

/**
 * 로그인 직후 전량 리스케줄(선택)
 * - routines: [{ id, name, repeatMode, alarm:{hour,minute,weekdays,onceAt} }, ...]
 */
export function rescheduleAllIOS(routines) {
  cancelAllOnIOS()
  fpMap.clear()
  routines.forEach((r) => {
    const oncePast = r.repeatMode === 'once' && (r?.alarm?.onceAt ?? 0) * 1000 < Date.now()
    if (oncePast) return
    scheduleOnIOS(r)
    fpMap.set(r.id, fingerprint(r))
  })
}
