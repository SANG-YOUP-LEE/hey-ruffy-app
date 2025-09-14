// src/stores/scheduler.js
import { defineStore } from 'pinia'
import { projectInstances } from '@/utils/projection'
import iosBridge from '@/utils/iosNotify'

const { waitBridgeReady, scheduleOnIOS, cancelOnIOS, scheduleWeekly } = iosBridge

// ── 안정 구성(지피 추천) ─────────────────────────────────────
const PROJECTION_DAYS   = 30  // 앞으로 N일치 인스턴스 뽑기
const PER_ROUTINE_LIMIT = 10  // 루틴당 최대 예약
const GLOBAL_LIMIT      = 60  // 앱 전체 예약 상한

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`
const p2 = (n) => String(n).padStart(2, '0')
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
const toEpochSec = (ms) => Math.floor(ms / 1000)

// HH:mm 또는 {hour, minute, ampm} 파싱
function resolveAlarmHM(r) {
  const a = r?.alarmTime
  if (typeof a === 'string') {
    const s0 = a.trim().replace(/[.\u00B7\s]+/g, ':').replace(/:+/g, ':')
    let m = s0.match(/^(?:\s*(오전|오후|AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(오전|오후|AM|PM))?$/i)
    if (m && (m[1] || m[4])) {
      let h = +m[2], mm = +m[3]
      const tag = (m[1] || m[4] || '').toUpperCase()
      if (tag === 'PM' || tag === '오후') { if (h < 12) h += 12 }
      if (tag === 'AM' || tag === '오전') { if (h === 12) h = 0 }
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
    m = s0.match(/^(\d{1,2}):(\d{2})$/)
    if (m) {
      const h = Math.max(0, Math.min(23, +m[1]))
      const mm = Math.max(0, Math.min(59, +m[2]))
      return { hour: h, minute: mm }
    }
  }
  if (a && typeof a === 'object' && a.hour != null && a.minute != null) {
    let h = parseInt(String(a.hour), 10)
    let mm = parseInt(String(a.minute), 10)
    const tag = String(a.ampm || '').toUpperCase()
    if (tag === 'PM' || a.ampm === '오후') { if (h < 12) h += 12 }
    if (tag === 'AM' || a.ampm === '오전') { if (h === 12) h = 0 }
    if (Number.isFinite(h) && Number.isFinite(mm)) {
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
  }
  return null
}

const toISO = d => (d ? `${d.year}-${p2(d.month)}-${p2(d.day)}` : null)
const safeISOFromDateObj = (obj) => {
  const s = toISO(obj)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

const KOR_TO_NUM = { 월:1, 화:2, 수:3, 목:4, 금:5, 토:6, 일:7 }
function dayTokenToNum(d) {
  if (d == null) return null
  if (typeof d === 'number') return d
  const s = String(d).replace(/['"]/g,'').trim()
  if (!s) return null
  if (KOR_TO_NUM[s[0]]) return KOR_TO_NUM[s[0]]
  const n = parseInt(s,10)
  return Number.isFinite(n) ? n : null
}
const uniqSorted = (arr) => Array.from(new Set(arr)).sort((a,b)=>a-b)
function parseIntervalNum(s, fallback = 1) {
  const m = String(s || '').match(/(\d+)/)
  if (!m) return fallback
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n >= 1 ? n : fallback
}

// ── 앵커(가장 가까운 요일) 계산 유틸 ─────────────────────────
function jsWeekdayTo1to7(date) {
  const w = date.getDay()
  return w === 0 ? 7 : w
}
function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + n)
  return d
}
function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

// 루틴 → 후보 인스턴스(루틴별 상한 적용)
function projectRoutineCandidates(r, tz, hour, minute) {
  const type = String(r.repeatType || 'daily').toLowerCase()
  const today = todayISO()

  // 단발성
  if (type === 'daily' && Number(r.repeatEveryDays) === 0) {
    let startISO = safeISOFromDateObj(r.startDate) || r.start || today
    if (startISO < today) startISO = today
    const [Y,M,D] = startISO.split('-').map(n=>parseInt(n,10))
    const atMs = new Date(Y, M-1, D, hour, minute, 0, 0).getTime()
    if (!Number.isFinite(atMs) || atMs <= Date.now()) return []
    return [{ ms: atMs, routineId: r.id, title: r.title || '알림' }]
  }

  // 공통 projDef
  const projDefBase = {
    repeatMode: type,
    mode: type,
    hour, minute,
    intervalDays: (type==='daily' && Number(r.repeatEveryDays)>1) ? Number(r.repeatEveryDays) : undefined,
    intervalWeeks: (type==='weekly') ? parseIntervalNum(r.repeatWeeks, 1) : undefined,
    weekdays: (type==='weekly')
      ? uniqSorted((Array.isArray(r.repeatWeekDays)? r.repeatWeekDays:[])
          .map(dayTokenToNum).filter(n=>n>=1 && n<=7))
      : undefined,
    byMonthDay: (type==='monthly')
      ? uniqSorted((Array.isArray(r.repeatMonthDays)? r.repeatMonthDays:[])
          .map(d=>parseInt(d,10)).filter(d=>d>=1 && d<=31))
      : undefined,
    startDate: safeISOFromDateObj(r.startDate) || r.start || today,
    endDate: safeISOFromDateObj(r.endDate) || r.end || undefined,
    alarm: { hour, minute }
  }

  // ✅ 매 N주(>1), 시작일 없음, 요일 여러 개 → 각 요일별로 앵커 생성
  if (
    type === 'weekly' &&
    projDefBase.intervalWeeks && projDefBase.intervalWeeks > 1 &&
    (!r.startDate && !r.start) &&
    Array.isArray(projDefBase.weekdays) && projDefBase.weekdays.length > 0
  ) {
    const now = new Date()
    const todayW = jsWeekdayTo1to7(now)
    const results = []
    for (const wd of projDefBase.weekdays) {
      const delta = (wd - todayW + 7) % 7
      const anchor = addDays(now, delta)
      const projDef = { ...projDefBase, startDate: toISODate(anchor) }
      const epochsMs = projectInstances(projDef, Date.now(), tz, PROJECTION_DAYS) || []
      results.push(...epochsMs
        .filter(ms => Number.isFinite(ms) && ms > Date.now())
        .map(ms => ({ ms, routineId: r.id, title: r.title || '알림' }))
      )
    }
    return results.sort((a,b)=>a.ms-b.ms).slice(0, PER_ROUTINE_LIMIT)
  }

  // 나머지 케이스
  const epochsMs = projectInstances(projDefBase, Date.now(), tz, PROJECTION_DAYS) || []
  return epochsMs
    .filter(ms => Number.isFinite(ms) && ms > Date.now())
    .sort((a,b)=>a-b)
    .slice(0, PER_ROUTINE_LIMIT)
    .map(ms => ({ ms, routineId: r.id, title: r.title || '알림' }))
}

// 전역 컷팅 후 예약(once들만)
async function scheduleGlobal(candidates) {
  const picked = candidates.sort((a,b)=>a.ms-b.ms).slice(0, GLOBAL_LIMIT)
  const byRoutine = new Map()
  for (const c of picked) {
    const arr = byRoutine.get(c.routineId) || []
    arr.push(c.ms)
    byRoutine.set(c.routineId, arr)
  }
  for (const [routineId, list] of byRoutine.entries()) {
    const title = picked.find(x => x.routineId === routineId)?.title || '알림'
    const fireTimesEpoch = list.map(toEpochSec)
    await scheduleOnIOS({
      routineId,
      title,
      repeatMode: 'once',
      fireTimesEpoch,
      sound: 'ruffysound001.wav'
    })
    await sleep(8)
  }
}

export const useSchedulerStore = defineStore('scheduler', {
  state: () => ({ tz: 'Asia/Seoul' }),

  actions: {
    async rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      await waitBridgeReady()

      for (const r of list) {
        if (!r || r.isPaused) continue
        await cancelOnIOS(baseOf(r.id))
        await sleep(5)
      }

      const tz = this.tz || 'Asia/Seoul'
      const allOnceCandidates = []
      const weeklyQueue = []

      for (const r of list) {
        if (!r || r.isPaused) continue
        const hm = resolveAlarmHM(r)
        if (!hm) continue

        const title = r.title || '알림'
        const hour = hm.hour
        const minute = hm.minute
        const type = String(r.repeatType || 'daily').toLowerCase()

        if (type === 'weekly') {
          const intervalW = parseIntervalNum(r.repeatWeeks, 1)
          const days = uniqSorted((Array.isArray(r.repeatWeekDays)? r.repeatWeekDays:[])
            .map(dayTokenToNum).filter(n=>n>=1 && n<=7))
          const startISO = safeISOFromDateObj(r.startDate) || r.start || undefined
          const endISO   = safeISOFromDateObj(r.endDate)   || r.end   || undefined
          const today = todayISO()
          const startInFuture = !!(startISO && startISO > today)
          if (intervalW === 1 && !endISO && days.length && !startInFuture) {
            weeklyQueue.push({ baseId: baseOf(r.id), hour, minute, days, title })
            continue
          }
        }

        const cands = projectRoutineCandidates(r, tz, hour, minute)
        allOnceCandidates.push(...cands)
      }

      for (const w of weeklyQueue) {
        await scheduleWeekly(w.baseId, w.hour, w.minute, w.days, w.title)
        await sleep(8)
      }

      if (allOnceCandidates.length) {
        await scheduleGlobal(allOnceCandidates)
      }
    },

    async reschedule() {
      const routines = await fetchAllRoutinesFromDBOrStore()
      await this.rehydrateFromRoutines(routines)
    },

    async cancelRoutine(routineId) {
      await waitBridgeReady()
      await cancelOnIOS(baseOf(routineId))
    }
  }
})

async function fetchAllRoutinesFromDBOrStore() {
  return []
}
