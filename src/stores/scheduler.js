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
  const { hour, minute } = resolveAlarmHM(r)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { baseId, items: [] }

  const title = r.title || ''
  const mode = String(r.repeatType || 'daily').toLowerCase()
  const items = []

  if (mode.startsWith('daily')) {
    items.push({
      id: `${baseId}-daily`,
      rid: r.id,
      repeatMode: 'daily',
      hour, minute, title,
    })
  } else if (mode.startsWith('week')) {
    const days = Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays : r.repeatDays || []
    if (days.length === 7) {
      items.push({
        id: `${baseId}-daily`,
        rid: r.id,
        repeatMode: 'daily',
        hour, minute, title,
      })
    } else if (days.length) {
      items.push({
        id: `${baseId}-weekly`,
        rid: r.id,
        repeatMode: 'weekly',
        hour, minute, title,
        weekdays: days,
      })
    }
  } else if (mode.startsWith('month')) {
    const md = Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []
    md.forEach(d => {
      items.push({
        id: `${baseId}-m-${d}`,
        rid: r.id,
        repeatMode: 'monthly-date',
        hour, minute, title,
        day: d,
      })
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