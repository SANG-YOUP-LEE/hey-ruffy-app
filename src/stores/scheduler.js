// src/stores/scheduler.js
import { defineStore } from 'pinia'
import { waitBridgeReady, scheduleOnIOS, cancelOnIOS } from '@/utils/iosNotify'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`

// 12시간제/문자열 → 24시간제(HH, mm)
function resolveAlarmHM(r) {
  const a = r?.alarmTime

  // 문자열 ("HH:mm" / "HH.mm" / 공백/중점 → ":" )
  if (typeof a === 'string') {
    const s0 = a.trim().replace(/[.\u00B7\s]+/g, ':').replace(/:+/g, ':')
    // AM/PM or 오전/오후
    let m = s0.match(/^(?:\s*(오전|오후|AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(오전|오후|AM|PM))?$/i)
    if (m && (m[1] || m[4])) {
      let h = +m[2], mm = +m[3]
      const tag = (m[1] || m[4] || '').toUpperCase()
      if (tag === 'PM' || tag === '오후') { if (h < 12) h += 12 }
      if (tag === 'AM' || tag === '오전') { if (h === 12) h = 0 }
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
    // 순수 24시간
    m = s0.match(/^(\d{1,2}):(\d{2})$/)
    if (m) {
      const h = Math.max(0, Math.min(23, +m[1]))
      const mm = Math.max(0, Math.min(59, +m[2]))
      return { hour: h, minute: mm }
    }
  }

  // 객체 {ampm, hour, minute}
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

  // 낱개 필드
  const h2 = Number(r?.hour ?? r?.alarm?.hour)
  const m2 = Number(r?.minute ?? r?.alarm?.minute)
  if (Number.isFinite(h2) && Number.isFinite(m2)) {
    return { hour: h2, minute: m2 }
  }

  return null
}

// 마지막 등록 상태 기억: baseId → Set(ids)
const lastIdsByBase = new Map()

// 요일 토큰 → 숫자(1..7)
function dayTokenToNum(d) {
  if (d == null) return null
  if (typeof d === 'number' && Number.isFinite(d)) return d
  const s = String(d).replace(/['"]/g,'').trim()
  if (!s) return null
  const kor = { '월':1,'화':2,'수':3,'목':4,'금':5,'토':6,'일':7 }
  if (kor[s[0]]) return kor[s[0]]
  const n = parseInt(s,10)
  return Number.isFinite(n) ? n : null
}

// plan(옛 인터페이스) → items 계산
function computeFromPlan(baseId, rid, title, hour, minute, plan) {
  const items = []
  const mode = String(plan?.mode || '').toUpperCase()

  if (mode === 'DAILY' || mode === 'DAILY_EVERY_1') {
    items.push({
      id: `${baseId}-daily`,
      rid, repeatMode: 'daily',
      hour, minute, title,
    })
    return items
  }

  if (mode === 'DAILY_EVERY_N') {
    // 네이티브가 interval daily를 직접 처리하는 경로가 있다면 아래처럼 넘길 수도 있음.
    // 여기서는 iosNotify의 일반 경로를 믿고 그대로 넘긴다.
    const n = Math.max(2, parseInt(plan.n ?? 2, 10))
    items.push({
      id: `${baseId}-d${n}`,
      rid, repeatMode: 'daily',
      hour, minute, title,
      interval: n,
    })
    return items
  }

  if (mode === 'WEEKLY') {
    const raw = Array.isArray(plan.days) ? plan.days : []
    const days = Array.from(new Set(raw.map(dayTokenToNum).filter(n => n>=1 && n<=7))).sort((a,b)=>a-b)
    // ✅ 요일별 개별 id로 7개까지 분할
    days.forEach((wd) => {
      items.push({
        id: `${baseId}-w-${wd}__wd${wd}`,
        rid, repeatMode: 'weekly',
        hour, minute, title,
        weekday: wd,
      })
    })
    return items
  }

  if (mode === 'MONTHLY') {
    const raw = Array.isArray(plan.days) ? plan.days : []
    const days = Array.from(new Set(raw.map(d => parseInt(d,10)).filter(d => d>=1 && d<=31))).sort((a,b)=>a-b)
    days.forEach(d => {
      items.push({
        id: `${baseId}-m-${d}`,
        rid, repeatMode: 'monthly-date',
        hour, minute, title,
        day: d,
      })
    })
    return items
  }

  // 알 수 없는 plan은 무시
  return items
}

// 루틴(routine 객체만) → items 계산
function computeFromRoutine(r) {
  const baseId = baseOf(r.id)
  const hm = resolveAlarmHM(r)
  if (!hm) return { baseId, items: [] }
  const { hour, minute } = hm

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
    // 주간: 요일별로 분할(7개까지)
    let rawDays = Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays
               : (Array.isArray(r.repeatDays) ? r.repeatDays : [])
    rawDays = Array.from(new Set((rawDays||[]).map(dayTokenToNum).filter(n => n>=1 && n<=7))).sort((a,b)=>a-b)
    rawDays.forEach((wd) => {
      items.push({
        id: `${baseId}-w-${wd}__wd${wd}`,
        rid: r.id,
        repeatMode: 'weekly',
        hour, minute, title,
        weekday: wd,
      })
    })
  } else if (mode.startsWith('month')) {
    const md = Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []
    Array.from(new Set(md.map(d => parseInt(d,10)).filter(d=>d>=1&&d<=31))).sort((a,b)=>a-b)
      .forEach(d => {
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
    // 루틴 전체 재하이드레이트 (plan 없이 routine 기반)
    async rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      await waitBridgeReady()

      for (const r of list) {
        if (!r || r.isPaused) continue

        const { baseId, items } = computeFromRoutine(r)

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

        lastIdsByBase.set(baseId, nextIds)
      }
    },

    // ✅ 예전 인터페이스 호환: reschedule(routine, plan?)
    // plan이 있으면 plan 기준으로 정확히 생성(특히 WEEKLY 요일별 분할)
    async reschedule(routine, plan = null) {
      if (!routine) return
      await waitBridgeReady()

      const baseId = baseOf(routine.id)
      const hm = resolveAlarmHM(routine)
      if (!hm) return
      const { hour, minute } = hm
      const title = routine.title || ''

      // items 계산
      let items = []
      if (plan) {
        items = computeFromPlan(baseId, routine.id, title, hour, minute, plan)
      } else {
        items = computeFromRoutine(routine).items
      }

      // 아무 것도 없으면 스킵
      if (!items.length) return

      // 전체 purge 후 재등록 (명시적 재설정 시에는 깨끗이)
      await cancelOnIOS(baseId)
      await sleep(100)

      const nextIds = new Set()
      for (const it of items) {
        await scheduleOnIOS(it)
        nextIds.add(it.id)
        await sleep(10)
      }
      lastIdsByBase.set(baseId, nextIds)
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