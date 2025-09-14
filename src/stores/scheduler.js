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

// 루틴 → 후보 인스턴스(루틴별 상한 적용)
function projectRoutineCandidates(r, tz, hour, minute) {
  const type = String(r.repeatType || 'daily').toLowerCase()
  const today = todayISO()

  // 단발성: 과거/지나간 시각이면 예약 안함(요청사항 반영)
  if (type === 'daily' && Number(r.repeatEveryDays) === 0) {
    let startISO = safeISOFromDateObj(r.startDate) || r.start || today
    if (startISO < today) startISO = today
    const [Y,M,D] = startISO.split('-').map(n=>parseInt(n,10))
    const atMs = new Date(Y, M-1, D, hour, minute, 0, 0).getTime()
    if (!Number.isFinite(atMs) || atMs <= Date.now()) return []
    return [{ ms: atMs, routineId: r.id, title: r.title || '알림' }]
  }

  // weekly 최적화는 여기서 처리하지 않음(전역 컷팅과 분리) → 상위에서 scheduleWeekly로 처리
  const projDef = {
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

  const epochsMs = projectInstances(projDef, Date.now(), tz, PROJECTION_DAYS) || []
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
    // 전체 루틴 재설치(전역 컷팅 + weekly 최적화)
    async rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      await waitBridgeReady()

      // 1) 모두 취소
      for (const r of list) {
        if (!r || r.isPaused) continue
        await cancelOnIOS(baseOf(r.id))
        await sleep(5)
      }

      const tz = this.tz || 'Asia/Seoul'
      const allOnceCandidates = []
      const weeklyQueue = [] // { baseId, hour, minute, days, title }

      // 2) 루틴별 후보/최적화 분기
      for (const r of list) {
        if (!r || r.isPaused) continue
        const hm = resolveAlarmHM(r)
        if (!hm) continue

        const title = r.title || '알림'
        const hour = hm.hour
        const minute = hm.minute
        const type = String(r.repeatType || 'daily').toLowerCase()

        // weekly 최적화: interval=1, 종료일 없음, 시작일이 과거/오늘(미래 스타트 아님), 요일 존재
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
            continue // once 후보 생성 안 함
          }
        }

        // 나머지는 once 후보 생성(루틴별 상한 적용)
        const cands = projectRoutineCandidates(r, tz, hour, minute)
        allOnceCandidates.push(...cands)
      }

      // 3) weekly 최적화 먼저 설치(요일 반복, repeats=YES)
      for (const w of weeklyQueue) {
        await scheduleWeekly(w.baseId, w.hour, w.minute, w.days, w.title)
        await sleep(8)
      }

      // 4) once 후보 전역 컷팅 + 설치
      if (allOnceCandidates.length) {
        await scheduleGlobal(allOnceCandidates)
      }
    },

    // 전체 재설치 헬퍼(앱에서 전체 목록을 주입해 쓰는 걸 권장)
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

// ⚠️ 앱/스토어 상황에 맞게 실제 구현으로 교체하세요.
async function fetchAllRoutinesFromDBOrStore() {
  // 예: return useRoutinesStore().items
  // 혹은 Firestore에서 사용자의 모든 루틴을 조회
  return []
}
