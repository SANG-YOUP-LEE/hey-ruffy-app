// src/stores/scheduler.js
import { defineStore } from 'pinia'


const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`

// ── "HH:mm" / "HH.mm" / 오전/오후 / AM/PM / 객체({hour,minute,ampm}) / 낱개(hour,minute)
function resolveAlarmHM(r) {
  const a = r?.alarmTime

  // 문자열
  if (typeof a === 'string') {
    const s0 = a.trim().replace(/[.\u00B7\s]+/g, ':').replace(/:+/g, ':')
    // 오전/오후/AM/PM
    let m = s0.match(/^(?:\s*(오전|오후|AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(오전|오후|AM|PM))?$/i)
    if (m && (m[1] || m[4])) {
      let h = +m[2], mm = +m[3]
      const tag = (m[1] || m[4] || '').toUpperCase()
      if (tag === 'PM' || tag === '오후') { if (h < 12) h += 12 }
      if (tag === 'AM' || tag === '오전') { if (h === 12) h = 0 }
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
    // 24시간
    m = s0.match(/^(\d{1,2}):(\d{2})$/)
    if (m) {
      const h = Math.max(0, Math.min(23, +m[1]))
      const mm = Math.max(0, Math.min(59, +m[2]))
      return { hour: h, minute: mm }
    }
  }

  // 객체
  if (a && typeof a === 'object' && a.hour != null && a.minute != null) {
    let h = parseInt(String(a.hour), 10)
    const mm = parseInt(String(a.minute), 10)
    const tag = String(a.ampm || '').toUpperCase()
    if (tag === 'PM' || a.ampm === '오후') { if (h < 12) h += 12 }
    if (tag === 'AM' || a.ampm === '오전') { if (h === 12) h = 0 }
    if (Number.isFinite(h) && Number.isFinite(mm)) {
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
  }

  // 낱개
  const h2 = Number(r?.hour ?? r?.alarm?.hour)
  const m2 = Number(r?.minute ?? r?.alarm?.minute)
  if (Number.isFinite(h2) && Number.isFinite(m2)) return { hour: h2, minute: m2 }

  return null
}

// ── 요일 정규화: 숫자(1~7) 우선, '월'~'일'도 허용
const KOR2NUM = { '월':1,'화':2,'수':3,'목':4,'금':5,'토':6,'일':7 }
function normalizeWeekdays(raw) {
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  const toNum = (v) => {
    if (v == null) return null
    if (typeof v === 'number' && Number.isFinite(v)) return v
    const s = String(v).replace(/['"]/g,'').trim()
    if (!s) return null
    if (KOR2NUM[s[0]]) return KOR2NUM[s[0]]
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : null
  }
  return Array.from(new Set(arr.map(toNum).filter(n => n >= 1 && n <= 7))).sort((a,b)=>a-b)
}

// ── 일/주/월 루틴 → 단 한 번의 scheduleOnIOS 호출로 끝내는 payload 생성
function computeDesiredFromRoutine(r) {
  const baseId = baseOf(r.id)
  const hm = resolveAlarmHM(r)
  if (!hm) return { baseId, items: [] }
  const { hour, minute } = hm

  const title = r.title || ''
  const mode = String(r.repeatType || 'daily').toLowerCase()

  // DAILY
  if (mode.startsWith('daily')) {
    return {
      baseId,
      items: [{
        id: `${baseId}-daily`,
        rid: r.id,
        repeatMode: 'daily',
        hour, minute, title,
      }]
    }
  }

  // WEEKLY (요일 배열 1회 전송)
  if (mode.startsWith('week')) {
    let days = Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays
             : Array.isArray(r.repeatDays)     ? r.repeatDays
             : []
    // weeklyDaily 토글 보정
    if (r.weeklyDaily === true && (!days || days.length === 0)) {
      days = [1,2,3,4,5,6,7]
    }
    const weekdays = normalizeWeekdays(days)
    if (weekdays.length === 0) return { baseId, items: [] }

    // 전부 선택 → daily 1개로 축약
    if (weekdays.length === 7) {
      return {
        baseId,
        items: [{
          id: `${baseId}-daily`,
          rid: r.id,
          repeatMode: 'daily',
          hour, minute, title,
        }]
      }
    }
    return {
      baseId,
      items: [{
        id: `${baseId}-weekly`,
        rid: r.id,
        repeatMode: 'weekly',
        hour, minute, title,
        weekdays,                // 한 번에 전달
      }]
    }
  }

  // MONTHLY (여러 날짜 → 한 번에 배열로 전달)
  if (mode.startsWith('month')) {
    const md = (Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : [])
      .map(n => parseInt(n,10))
      .filter(n => n>=1 && n<=31)
      .sort((a,b)=>a-b)
    if (!md.length) return { baseId, items: [] }
    return {
      baseId,
      items: [{
        id: `${baseId}-monthly`,      // 가상 id (iOS에서 내부로 -m-# 여러개 발행)
        rid: r.id,
        repeatMode: 'monthly-date',
        hour, minute, title,
        repeatMonthDays: md,          // 배열로 한 번에
      }]
    }
  }

  return { baseId, items: [] }
}

// ── routineForm.save() 가 두 번째 인자 repeat {mode, days} 를 줄 때 대응
function computeDesiredFromRepeat(routine, repeat) {
  const baseId = baseOf(routine.id)
  const hm = resolveAlarmHM(routine)
  if (!hm) return { baseId, items: [] }
  const { hour, minute } = hm
  const title = routine.title || ''

  const mode = String(repeat?.mode || '').toUpperCase()

  // DAILY
  if (mode === 'DAILY' || mode === 'DAILY_EVERY_1') {
    return {
      baseId,
      items: [{
        id: `${baseId}-daily`,
        rid: routine.id,
        repeatMode: 'daily',
        hour, minute, title,
      }]
    }
  }

  // WEEKLY
  if (mode === 'WEEKLY') {
    const weekdays = normalizeWeekdays(repeat?.days || [])
    if (weekdays.length === 0) return { baseId, items: [] }
    if (weekdays.length === 7) {
      return {
        baseId,
        items: [{
          id: `${baseId}-daily`,
          rid: routine.id,
          repeatMode: 'daily',
          hour, minute, title,
        }]
      }
    }
    return {
      baseId,
      items: [{
        id: `${baseId}-weekly`,
        rid: routine.id,
        repeatMode: 'weekly',
        hour, minute, title,
        weekdays,
      }]
    }
  }

  // MONTHLY
  if (mode === 'MONTHLY') {
    const md = (Array.isArray(repeat?.days) ? repeat.days : [])
      .map(n => parseInt(n,10))
      .filter(n => n>=1 && n<=31)
      .sort((a,b)=>a-b)
    if (!md.length) return { baseId, items: [] }
    return {
      baseId,
      items: [{
        id: `${baseId}-monthly`,
        rid: routine.id,
        repeatMode: 'monthly-date',
        hour, minute, title,
        repeatMonthDays: md,
      }]
    }
  }

  // 그 외는 스킵
  return { baseId, items: [] }
}

// 마지막 등록 상태(논리 id) 추적 — 필요시 UI내 중복 호출 억제용
const lastIdsByBase = new Map()

export const useSchedulerStore = defineStore('scheduler', {
  actions: {
    // 루틴들 한번에 재하이드레이트
    async rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      await waitBridgeReady()

      for (const r of list) {
        if (!r || r.isPaused) continue

        const { baseId, items } = computeDesiredFromRoutine(r)

        // 베이스 단위로 항상 먼저 purge (다중 호출 레이스 방지)
        await cancelOnIOS(baseId)
        await sleep(20)

        if (!items.length) {
          lastIdsByBase.set(baseId, new Set())
          continue
        }

        // 한 베이스당 단 한번 scheduleOnIOS
        await scheduleOnIOS(items[0])
        await sleep(20)

        lastIdsByBase.set(baseId, new Set([items[0].id]))
      }
    },

    // routineForm.save()에서 호출: (routine, repeat) 모두 허용
    async reschedule(routine, repeat) {
      if (!routine) return
      await waitBridgeReady()

      const src = repeat
        ? computeDesiredFromRepeat(routine, repeat)
        : computeDesiredFromRoutine(routine)

      const { baseId, items } = src

      // 항상 베이스 purge 후, 단 한번 schedule
      await cancelOnIOS(baseId)
      await sleep(20)

      if (!items.length) {
        lastIdsByBase.set(baseId, new Set())
        return
      }

      await scheduleOnIOS(items[0])
      await sleep(20)

      lastIdsByBase.set(baseId, new Set([items[0].id]))
    },

    // 특정 루틴 전체 제거
    async cancelRoutine(routineId) {
      const baseId = baseOf(routineId)
      await cancelOnIOS(baseId) // 베이스 통째 purge
      await sleep(20)
      lastIdsByBase.delete(baseId)
    },
  }
})
