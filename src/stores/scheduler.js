// src/stores/scheduler.js
import { defineStore } from 'pinia'
import { waitBridgeReady, scheduleOnIOS, cancelOnIOS } from '@/utils/iosNotify'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`

// 12시간제 → 24시간제 변환
// 문자열("HH:mm" / "HH.mm" / 오전/오후 / AM/PM) + 객체 + 낱개 hour/minute 모두 지원
function resolveAlarmHM(r) {
  const a = r?.alarmTime;

  // 문자열 처리
  if (typeof a === 'string') {
    // 점(·)/가운뎃점/공백 → ":" 로 통일
    const s0 = a.trim().replace(/[.\u00B7\s]+/g, ':').replace(/:+/g, ':');

    // (1) 오전/오후/AM/PM 포함 패턴 (앞/뒤 모두 허용)
    let m = s0.match(/^(?:\s*(오전|오후|AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(오전|오후|AM|PM))?$/i);
    if (m && (m[1] || m[4])) {
      let h = +m[2], mm = +m[3];
      const tag = (m[1] || m[4] || '').toUpperCase();
      if (tag === 'PM' || tag === '오후') { if (h < 12) h += 12; }
      if (tag === 'AM' || tag === '오전') { if (h === 12) h = 0; }
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) };
    }

    // (2) 순수 24시간 "HH:mm"
    m = s0.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const h = Math.max(0, Math.min(23, +m[1]));
      const mm = Math.max(0, Math.min(59, +m[2]));
      return { hour: h, minute: mm };
    }
  }

  // 객체 {ampm, hour, minute}
  if (a && typeof a === 'object' && a.hour != null && a.minute != null) {
    let h = parseInt(String(a.hour), 10);
    const mm = parseInt(String(a.minute), 10);
    const tag = String(a.ampm || '').toUpperCase();
    if (tag === 'PM' || a.ampm === '오후') { if (h < 12) h += 12; }
    if (tag === 'AM' || a.ampm === '오전') { if (h === 12) h = 0; }
    if (Number.isFinite(h) && Number.isFinite(mm)) {
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) };
    }
  }

  // 낱개 필드(r.hour/minute or r.alarm.hour/minute)
  const h2 = Number(r?.hour ?? r?.alarm?.hour);
  const m2 = Number(r?.minute ?? r?.alarm?.minute);
  if (Number.isFinite(h2) && Number.isFinite(m2)) {
    return { hour: h2, minute: m2 };
  }

  // 못 읽으면 null (스케줄러가 이 루틴은 skip해서 09:00 기본값 방지)
  return null;
}

// 마지막 등록 상태 기억
const lastIdsByBase = new Map()

// 루틴 → 필요한 알람 id와 페이로드 계산
function computeDesired(r) {
  const baseId = baseOf(r.id)

  const hm = resolveAlarmHM(r)
  if (!hm) return { baseId, items: [] }
  const { hour, minute } = hm

  const title = r.title || ''
  const mode = String(r.repeatType || 'daily').toLowerCase()
  const items = []

  if (mode.startsWith('daily')) {
    // 매일 1개
    items.push({
      id: `${baseId}-daily`,
      rid: r.id,
      repeatMode: 'daily',
      hour, minute, title,
    })
  } else if (mode.startsWith('week')) {
    // 요일 배열 수집/정규화 (숫자 1..7)
    let raw = Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays.slice()
            : Array.isArray(r.repeatDays)     ? r.repeatDays.slice()
            : []

    // 주간-매일 토글 보정: weeklyDaily 켜져 있고 배열이 비었으면 1..7
    if (r.weeklyDaily === true && raw.length === 0) {
      raw = [1,2,3,4,5,6,7]
    }

    const toNum = (d) => {
      if (d == null) return null
      if (typeof d === 'number' && Number.isFinite(d)) return d
      const s = String(d).replace(/['"]/g,'').trim()
      if (!s) return null
      const kor = { '월':1,'화':2,'수':3,'목':4,'금':5,'토':6,'일':7 }
      if (kor[s[0]]) return kor[s[0]]
      const n = parseInt(s,10)
      return Number.isFinite(n) ? n : null
    }

    const weekdays = Array.from(new Set(raw.map(toNum).filter(n => n>=1 && n<=7))).sort((a,b)=>a-b)

    if (weekdays.length === 0) return { baseId, items: [] }

    if (weekdays.length === 7) {
      // 7일 전부면 daily 하나로 축약
      items.push({
        id: `${baseId}-daily`,
        rid: r.id,
        repeatMode: 'daily',
        hour, minute, title,
      })
    } else {
      // ✅ 한 번의 호출에 weekdays 배열을 통째로 전달 (purge 충돌 방지)
      items.push({
        id: `${baseId}-weekly`,
        rid: r.id,
        repeatMode: 'weekly',
        hour, minute, title,
        weekdays,              // <— 핵심
      })
    }
  } else if (mode.startsWith('month')) {
    // 월간 날짜들(여러 개면 한 번의 호출에 배열로)
    const uniq = Array.from(
      new Set((Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []).map(d => parseInt(d,10)))
    ).filter(d => d>=1 && d<=31).sort((a,b)=>a-b)

    if (uniq.length === 0) return { baseId, items: [] }

    // ✅ 한 번의 호출에 repeatMonthDays 통째로 전달 (purge 충돌 방지)
    items.push({
      id: `${baseId}-monthly`,
      rid: r.id,
      repeatMode: 'monthly-date',
      hour, minute, title,
      repeatMonthDays: uniq,   // <— 핵심
    })
  }

  return { baseId, items }
}

export const useSchedulerStore = defineStore('scheduler', {
  actions: {
    // 루틴 전체 재하이드레이트 (purge 없음)
    async rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      await waitBridgeReady()

      for (const r of list) {
        if (!r || r.isPaused) continue
        const { baseId, items } = computeDesired(r)

        const prevIds = lastIdsByBase.get(baseId) || new Set()
        const nextIds = new Set(items.map(i => i.id))

        // 필요 없는 id는 cancel
        for (const oldId of prevIds) {
          if (!nextIds.has(oldId)) {
            await cancelOnIOS(oldId)
            await sleep(10)
          }
        }

        // 새 id는 schedule
        for (const it of items) {
          if (!prevIds.has(it.id)) {
            await scheduleOnIOS(it)
            await sleep(10)
          }
        }

        // 상태 갱신
        lastIdsByBase.set(baseId, nextIds)
      }
    },

    // 특정 루틴만 다시 예약
    async reschedule(routine) {
      if (!routine) return
      await this.rehydrateFromRoutines([routine])
    },

    // 특정 루틴 제거
    async cancelRoutine(routineId) {
      const baseId = baseOf(routineId)
      const prev = lastIdsByBase.get(baseId)
      if (prev) {
        for (const id of prev) {
          await cancelOnIOS(id)
          await sleep(10)
        }
        lastIdsByBase.delete(baseId)
      }
    }
  }
})
