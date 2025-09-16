// src/stores/scheduler.js
import { defineStore } from 'pinia'
import { projectInstances } from '@/utils/projection'
import iosBridge from '@/utils/iosNotify'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'

const { waitBridgeReady, scheduleOnIOS, cancelOnIOS, scheduleWeekly, purgeAll } = iosBridge

// ── 안정 구성(지피 추천) ─────────────────────────────────────
const PROJECTION_DAYS   = 30  // 앞으로 N일치 인스턴스 뽑기
const PER_ROUTINE_LIMIT = 10  // 루틴당 최대 예약
const GLOBAL_LIMIT      = 60  // 앱 전체 예약 상한

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
// ▼▼ uid 스코프 적용 (변경점)
const scopedRoutineId = (uid, rid) => `u-${String(uid)}__${String(rid)}`
const baseOf = (uid, rid) => `routine-${scopedRoutineId(uid, rid)}`

const p2 = (n) => String(n).padStart(2, '0')
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
const toEpochSec = (ms) => Math.floor(ms / 1000)

/* ----------------------------------------------------------------
   HH:mm 또는 다양한 형태({hour, minute, ampm}, 다른 키들) 파싱 (보강판)
------------------------------------------------------------------ */
function resolveAlarmHM(r) {
  const candidates = []
  if (r?.alarmTime != null) candidates.push(r.alarmTime)
  if (r?.alarm != null)     candidates.push(r.alarm)
  if (r?.time != null)      candidates.push(r.time)
  if (r?.hour != null || r?.minute != null || r?.ampm != null) {
    candidates.push({ hour: r.hour, minute: r.minute, ampm: r.ampm })
  }
  if (typeof r?.alarm_time === 'string') candidates.push(r.alarm_time)
  if (typeof r?.startTime === 'string')  candidates.push(r.startTime)
  if (typeof r === 'string') candidates.push(r)

  const parseString = (str) => {
    const s0 = String(str || '').trim()
      .replace(/[.\u00B7\s]+/g, ':')
      .replace(/:+/g, ':')
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
    const get = (o, ...keys) => { for (const k of keys) { if (o[k] != null) return o[k] } }
    let h = get(obj, 'hour', 'h', 'HH', 'Hour')
    let m = get(obj, 'minute', 'min', 'mm', 'Minute')
    let a = get(obj, 'ampm', 'AMPM', 'period')

    h = Number(h); m = Number(m)
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
      const v = parseString(c); if (v) return v
    } else if (c && typeof c === 'object') {
      const direct = parseObject(c); if (direct) return direct
      for (const v of Object.values(c)) {
        if (typeof v === 'string') {
          const s = parseString(v); if (s) return s
        } else if (v && typeof v === 'object') {
          const o = parseObject(v); if (o) return o
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
// 루틴 → 후보 인스턴스(루틴별 상한 적용)
// 루틴 → 후보 인스턴스(루틴별 상한 적용)
function projectRoutineCandidates(r, tz, hour, minute) {
    const type = String(r.repeatType || 'daily').toLowerCase()
    const todayISOstr = todayISO()

    // 단발성: 과거/지나간 시각이면 예약 안함
    if (type === 'daily' && Number(r.repeatEveryDays) === 0) {
      let startISO = safeISOFromDateObj(r.startDate) || r.start || todayISOstr
      if (startISO < todayISOstr) startISO = todayISOstr
      const [Y,M,D] = startISO.split('-').map(n=>parseInt(n,10))
      const atMs = new Date(Y, M-1, D, hour, minute, 0, 0).getTime()
      if (!Number.isFinite(atMs) || atMs <= Date.now()) return []
      return [{ ms: atMs, routineId: r.id, title: r.title || '알림' }]
    }

    const intervalW = (type==='weekly') ? parseIntervalNum(r.repeatWeeks, 1) : undefined
    const weekdays = (type==='weekly')
      ? uniqSorted((Array.isArray(r.repeatWeekDays)? r.repeatWeekDays:[])
          .map(dayTokenToNum).filter(n=>n>=1 && n<=7))
      : undefined

    // ▶▶ weekly & interval>1 은 앵커 기반 계산으로 직접 처리
    if (type === 'weekly' && intervalW && intervalW > 1 && weekdays && weekdays.length) {
      // 1) 앵커 결정: anchorDate → startDate → createdAtMs → today
      let anchorISO =
        (typeof r.anchorDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.anchorDate)) ? r.anchorDate
        : safeISOFromDateObj(r.startDate) || r.start
        || (Number.isFinite(+r.createdAtMs)
              ? new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date(+r.createdAtMs))
              : todayISOstr)

      const now = new Date()
      const nowMinutes = now.getHours()*60 + now.getMinutes()
      const alarmMinutes = hour*60 + minute

      // 2) 앵커를 "첫 발생일 >= anchorISO (시간 포함)"로 보정
      //    (오늘이 선택 요일이고 시간이 지났다면, 다음 주기 쪽으로 밀어냄)
      {
        const base = new Date(anchorISO) // 로컬 자정
        const baseW = base.getDay() === 0 ? 7 : base.getDay() // 1=Mon..7=Sun
        let best = null
        let bestDelta = Infinity
        for (const d of weekdays) {
          let delta = (d - baseW + 7) % 7

          // 후보 날짜(자정)에 알람 시각을 적용해 실제 발생 시각으로 비교
          const candidate = new Date(base)
          candidate.setDate(base.getDate() + delta)
          const candidateMs = new Date(
            candidate.getFullYear(), candidate.getMonth(), candidate.getDate(),
            hour, minute, 0, 0
          ).getTime()

          if (delta === 0) {
            // 같은 날이라면 "현재 시각 >= 알람 시각"인 경우만 skip
            if (candidateMs <= Date.now()) {
              delta += 7 * intervalW
            }
          }

          if (delta < bestDelta) {
            bestDelta = delta
            best = new Date(base); best.setDate(base.getDate() + delta)
          }
        }
        anchorISO = toISODate(best || base)
      }

      // 3) 주차 앵커: 그 주의 월요일
      const anchorDate = new Date(anchorISO)
      const js = anchorDate.getDay() // 0=Sun..6=Sat
      const toMonDelta = (js + 6) % 7
      const anchorWeekStart = new Date(anchorDate); anchorWeekStart.setDate(anchorWeekStart.getDate() - toMonDelta)

      // 4) PROJECTION_DAYS 윈도우 안에서 인스턴스 생성
      const out = []
      const stepDays = 7 * intervalW
      const endWindow = addDays(new Date(), PROJECTION_DAYS)

      for (let k=0; k<100; k++) {
        const base = addDays(anchorWeekStart, stepDays * k)
        for (const d of weekdays) {
          const occur = addDays(base, d-1) // 월=1 → +0
          // occur의 날짜에 알람 시각을 반영
          const occurMs = new Date(
            occur.getFullYear(), occur.getMonth(), occur.getDate(),
            hour, minute, 0, 0
          ).getTime()
          if (occurMs <= Date.now()) continue
          if (occur > endWindow) break
          out.push(occurMs)
        }
        if (addDays(anchorWeekStart, stepDays * k) > endWindow) break
        if (out.length >= PER_ROUTINE_LIMIT) break
      }

      return out
        .filter(ms => Number.isFinite(ms) && ms > Date.now())
        .sort((a,b)=>a-b)
        .slice(0, PER_ROUTINE_LIMIT)
        .map(ms => ({ ms, routineId: r.id, title: r.title || '알림' }))
    }

    // ▶▶ 나머지 케이스는 기존 projectInstances 그대로
    const projDef = {
      repeatMode: type,
      mode: type,
      hour, minute,
      intervalDays: (type==='daily' && Number(r.repeatEveryDays)>1) ? Number(r.repeatEveryDays) : undefined,
      intervalWeeks: (type==='weekly') ? intervalW : undefined,
      weekdays: (type==='weekly') ? weekdays : undefined,
      byMonthDay: (type==='monthly')
        ? uniqSorted((Array.isArray(r.repeatMonthDays)? r.repeatMonthDays:[])
            .map(d=>parseInt(d,10)).filter(d=>d>=1 && d<=31))
        : undefined,
      startDate: safeISOFromDateObj(r.startDate) || r.start || todayISOstr,
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

// 전역 컷팅 후 예약(once들만)  ▼▼ uid 전달받도록 변경
async function scheduleGlobal(candidates, uid) {
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
      routineId: scopedRoutineId(uid, routineId), // ← uid 스코프
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

      // 현재 사용자 uid 필수
      const uid = useAuthStore().user?.uid
      if (!uid) return

      // 1) 모두 취소 (uid 스코프)
      for (const r of list) {
        if (!r || r.isPaused) continue
        await cancelOnIOS(baseOf(uid, r.id))
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

          if (intervalW === 1 && days.length === 7 && !endISO && !startInFuture) {
            dailyQueue.push({ routineId: r.id, hour, minute, title })
            continue
          }

          if (intervalW === 1 && days.length && !endISO && !startInFuture) {
            weeklyQueue.push({ baseId: baseOf(uid, r.id), hour, minute, days, title })
            continue
          }
        }

        // 나머지는 once 후보 생성(루틴별 상한 적용)
        const cands = projectRoutineCandidates(r, tz, hour, minute)
        allOnceCandidates.push(...cands)
      }

      // 3) daily 1개 반복 먼저 설치 (uid 스코프)
      for (const d of dailyQueue) {
        await scheduleOnIOS({
          routineId: scopedRoutineId(uid, d.routineId),
          title: d.title,
          repeatMode: 'daily',
          hour: d.hour,
          minute: d.minute,
          sound: 'ruffysound001.wav'
        })
        await sleep(8)
      }

      // 4) weekly 최적화 설치(요일 반복, repeats=YES) (uid 스코프 baseId 사용됨)
      for (const w of weeklyQueue) {
        await scheduleWeekly(w.baseId, w.hour, w.minute, w.days, w.title)
        await sleep(8)
      }

      // 5) once 후보 전역 컷팅 + 설치 (uid 전달)
      if (allOnceCandidates.length) {
        await scheduleGlobal(allOnceCandidates, uid)
      }
    },

    async reschedule() {
      const uid = useAuthStore().user?.uid
      if (!uid) return
      const routines = await fetchAllRoutinesForUid(uid)
      await this.rehydrateFromRoutines(routines)
    },

    async cancelRoutine(routineId) {
      await waitBridgeReady()
      const uid = useAuthStore().user?.uid
      if (!uid) return
      await cancelOnIOS(baseOf(uid, routineId))
    },

    // ▼▼ 알람 전체 삭제 후, 현재 다짐으로 재설정 (파이어스토어에서 다시 읽음)
    async clearAndReloadAll() {
      const uid = useAuthStore().user?.uid
      if (!uid) return
      await purgeAll()
      await sleep(50) // 브리지 반영 여유 (짧게)
      const routines = await fetchAllRoutinesForUid(uid)
      await this.rehydrateFromRoutines(routines)
    }
  }
})

// 현재 로그인 사용자의 루틴 전부 가져오기 (파이어스토어)
async function fetchAllRoutinesForUid(uid) {
  if (!uid) return []
  const snap = await getDocs(collection(db, 'users', uid, 'routines'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
