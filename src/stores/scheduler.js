// src/stores/scheduler.js
import { defineStore } from 'pinia'
import { projectInstances } from '@/utils/projection'
import iosBridge from '@/utils/iosNotify'

const { waitBridgeReady, scheduleOnIOS, cancelOnIOS, scheduleWeekly, purgeAll } = iosBridge

// ── 안정 구성(지피 추천) ─────────────────────────────────────
const PROJECTION_DAYS   = 30  // 앞으로 N일치 인스턴스 뽑기
const PER_ROUTINE_LIMIT = 10  // 루틴당 최대 예약
const GLOBAL_LIMIT      = 60  // 앱 전체 예약 상한

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`
const p2 = (n) => String(n).padStart(2, '0')
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
const toEpochSec = (ms) => Math.floor(ms / 1000)

/* ----------------------------------------------------------------
   HH:mm 또는 다양한 형태({hour, minute, ampm}, 다른 키들) 파싱 (보강판)
   - alarmTime: "오전 10:30", "10:30", "10·30", "10 30" 등
   - alarm / time: { hour, minute, ampm } 또는 중첩 객체
   - 최상위: hour/minute/ampm 로 들어온 경우
------------------------------------------------------------------ */
function resolveAlarmHM(r) {
  const candidates = []

  // 가장 흔한 키들
  if (r?.alarmTime != null) candidates.push(r.alarmTime)
  if (r?.alarm != null)     candidates.push(r.alarm)
  if (r?.time != null)      candidates.push(r.time)

  // 최상위로 흩어진 케이스
  if (r?.hour != null || r?.minute != null || r?.ampm != null) {
    candidates.push({ hour: r.hour, minute: r.minute, ampm: r.ampm })
  }

  // 문자열 변종 키들(안전망)
  if (typeof r?.alarm_time === 'string') candidates.push(r.alarm_time)
  if (typeof r?.startTime === 'string')  candidates.push(r.startTime)

  // 혹시 전체가 문자열이면
  if (typeof r === 'string') candidates.push(r)

  const parseString = (str) => {
    const s0 = String(str || '').trim()
      .replace(/[.\u00B7\s]+/g, ':')  // 점/·/스페이스 → 콜론
      .replace(/:+/g, ':')            // 콜론 중복 정리
    // “오전/오후/AM/PM 10:30” 또는 “10:30 오전/오후”
    let m = s0.match(/^(?:\s*(오전|오후|AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(오전|오후|AM|PM))?$/i)
    if (m) {
      let h = +m[2], mm = +m[3]
      const tag = (m[1] || m[4] || '').toUpperCase()
      if (tag === 'PM' || tag === '오후') { if (h < 12) h += 12 }
      if (tag === 'AM' || tag === '오전') { if (h === 12) h = 0 }
      h = Math.max(0, Math.min(23, h))
      mm = Math.max(0, Math.min(59, mm))
      return { hour: h, minute: mm }
    }
    // “10:30”
    m = s0.match(/^(\d{1,2}):(\d{2})$/)
    if (m) {
      let h = +m[1], mm = +m[2]
      h = Math.max(0, Math.min(23, h))
      mm = Math.max(0, Math.min(59, mm))
      return { hour: h, minute: mm }
    }
    return null
  }

  const parseObject = (obj) => {
    if (!obj || typeof obj !== 'object') return null
    const get = (o, ...keys) => {
      for (const k of keys) {
        if (o[k] != null) return o[k]
      }
      return undefined
    }
    let h = get(obj, 'hour', 'h', 'HH', 'Hour')
    let m = get(obj, 'minute', 'min', 'mm', 'Minute')
    let a = get(obj, 'ampm', 'AMPM', 'period')

    h = Number(h)
    m = Number(m)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null

    const tag = String(a ?? '').toUpperCase()
    if (tag === 'PM' || a === '오후') { if (h < 12) h += 12 }
    if (tag === 'AM' || a === '오전') { if (h === 12) h = 0 }

    h = Math.max(0, Math.min(23, h))
    m = Math.max(0, Math.min(59, m))
    return { hour: h, minute: m }
  }

  for (const c of candidates) {
    if (typeof c === 'string') {
      const v = parseString(c)
      if (v) return v
    } else if (c && typeof c === 'object') {
      const direct = parseObject(c)
      if (direct) return direct
      // 중첩 케이스: { alarm:{hour,minute} } 같이 한 번 더 들여다보기
      for (const v of Object.values(c)) {
        if (typeof v === 'string') {
          const s = parseString(v)
          if (s) return s
        } else if (v && typeof v === 'object') {
          const o = parseObject(v)
          if (o) return o
        }
      }
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

// ── 앵커(가장 가까운 요일) 계산 유틸 ───────────────────────────
function jsWeekdayTo1to7(date) {
  const w = date.getDay() // 0=Sun..6=Sat
  return w === 0 ? 7 : w // 1=Mon..7=Sun
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

  // 단발성: 과거/지나간 시각이면 예약 안함
  if (type === 'daily' && Number(r.repeatEveryDays) === 0) {
    let startISO = safeISOFromDateObj(r.startDate) || r.start || today
    if (startISO < today) startISO = today
    const [Y,M,D] = startISO.split('-').map(n=>parseInt(n,10))
    const atMs = new Date(Y, M-1, D, hour, minute, 0, 0).getTime()
    if (!Number.isFinite(atMs) || atMs <= Date.now()) return []
    return [{ ms: atMs, routineId: r.id, title: r.title || '알림' }]
  }

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

  // 매 N주: 시작일 없거나 과거면 가장 가까운 선택 요일을 앵커로
  if (
    type === 'weekly' &&
    projDef.intervalWeeks && projDef.intervalWeeks > 1 &&
    Array.isArray(projDef.weekdays) && projDef.weekdays.length > 0
  ) {
    const now = new Date()
    const todayIsoStr = todayISO()
    const futureStart =
      (r.startDate || r.start) &&
      (safeISOFromDateObj(r.startDate) || r.start) > todayIsoStr

    if (!futureStart) {
      const todayW = jsWeekdayTo1to7(now)
      let minDelta = 999
      for (const wd of projDef.weekdays) {
        const delta = (wd - todayW + 7) % 7
        if (delta < minDelta) minDelta = delta
      }
      const anchor = addDays(now, minDelta)
      projDef.startDate = toISODate(anchor)
    } else {
      projDef.startDate = safeISOFromDateObj(r.startDate) || r.start
    }
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
    // 전체 루틴 재설치(전역 컷팅 + weekly 최적화 + daily 1개 반복)
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
      const dailyQueue  = [] // { routineId, hour, minute, title }

      // 2) 루틴별 후보/최적화 분기
      for (const r of list) {
        if (!r || r.isPaused) continue
        const hm = resolveAlarmHM(r)
        if (!hm) {
          // 디버깅이 필요하면 아래 주석을 잠깐 해제하세요.
          // console.warn('[sched] skip(no HM)', r?.id, r?.title, 'raw=', r?.alarmTime ?? r?.alarm ?? r?.time ?? { hour:r?.hour, minute:r?.minute, ampm:r?.ampm })
          continue
        }

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

          // ✅ “매주 + 7요일 전부 + 종료일 없음 + 시작일이 과거/오늘” → iOS 네이티브 'daily' 1개 반복으로
          if (intervalW === 1 && days.length === 7 && !endISO && !startInFuture) {
            dailyQueue.push({ routineId: r.id, hour, minute, title })
            continue
          }

          // ✅ “매주 + 일부 요일 + 종료일 없음 + 시작일 과거/오늘” → 요일 반복 네이티브로
          if (intervalW === 1 && days.length && !endISO && !startInFuture) {
            weeklyQueue.push({ baseId: baseOf(r.id), hour, minute, days, title })
            continue
          }
        }

        // 나머지는 once 후보 생성(루틴별 상한 적용)
        const cands = projectRoutineCandidates(r, tz, hour, minute)
        allOnceCandidates.push(...cands)
      }

      // 3) daily 1개 반복 먼저 설치
      for (const d of dailyQueue) {
        await scheduleOnIOS({
          routineId: d.routineId,
          title: d.title,
          repeatMode: 'daily', // ← 네이티브에서 hour/minute 반복 지원해야 함
          hour: d.hour,
          minute: d.minute,
          sound: 'ruffysound001.wav'
        })
        await sleep(8)
      }

      // 4) weekly 최적화 설치(요일 반복, repeats=YES)
      for (const w of weeklyQueue) {
        await scheduleWeekly(w.baseId, w.hour, w.minute, w.days, w.title)
        await sleep(8)
      }

      // 5) once 후보 전역 컷팅 + 설치
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
    },
    
    async clearAndReloadAll() {
      await purgeAll()
      const routines = await fetchAllRoutinesFromDBOrStore()
      await this.rehydrateFromRoutines(routines)
    }
  }
})

// go go
// ⚠️ 앱/스토어 상황에 맞게 실제 구현으로 교체하세요.
async function fetchAllRoutinesFromDBOrStore() {
  return []
}
