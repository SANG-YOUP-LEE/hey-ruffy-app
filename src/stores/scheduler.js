// src/stores/scheduler.js
import { defineStore } from 'pinia'
import { projectInstances } from '@/utils/projection'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'

import {
  waitBridgeReady,
  scheduleOnIOS,
  cancelOnIOS,
  scheduleWeekly,
  purgeAll,
  purgeAllForBase,
} from '@/utils/iosNotify'

const PROJECTION_DAYS   = 30
const PER_ROUTINE_LIMIT = 10
const GLOBAL_LIMIT      = 60

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const scopedRoutineId = (uid, rid) => `u-${String(uid)}__${String(rid)}`
const baseOf = (uid, rid) => `routine-u-${uid}__${rid}`

const p2 = (n) => String(n).padStart(2, '0')
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
const toEpochSec = (ms) => Math.floor(ms / 1000)

export async function deleteRoutine(uid, rid) {
  const base = `routine-u-${uid}__${rid}`
  await purgeAllForBase(base)
}

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

function projectRoutineCandidates(r, tz, hour, minute) {
  const type = String(r.repeatType || 'daily').toLowerCase()
  const todayISOstr = todayISO()

  if (type === 'once') {
    const onceISO = safeISOFromDateObj(r.onceDate)
    if (!onceISO) return []
    if (onceISO < todayISOstr) return []
    const [Y,M,D] = onceISO.split('-').map(n=>parseInt(n,10))
    const atMs = new Date(Y, M-1, D, hour, minute, 0, 0).getTime()
    if (!Number.isFinite(atMs) || atMs <= Date.now()) return []
    return [{ ms: atMs, routineId: r.id, title: r.title || '알림' }]
  }

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
      routineId: scopedRoutineId(uid, routineId),
      title,
      repeatMode: 'once',
      fireTimesEpoch,
      sound: 'ruffysound001.wav'
    })
    await sleep(50)
  }
}

export const useSchedulerStore = defineStore('scheduler', {
  state: () => ({ tz: 'Asia/Seoul' }),

  actions: {
    async rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      await waitBridgeReady()
      const uid = useAuthStore().user?.uid
      if (!uid) return

      for (const r of list) {
        if (!r || r.isPaused) continue
        await cancelOnIOS(baseOf(uid, r.id))
        await sleep(50)
      }

      const tz = this.tz || 'Asia/Seoul'
      const allOnceCandidates = []
      const weeklyQueue = []
      const dailyQueue  = []

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

        const cands = projectRoutineCandidates(r, tz, hour, minute)
        allOnceCandidates.push(...cands)
      }

      for (const d of dailyQueue) {
        await scheduleOnIOS({
          routineId: scopedRoutineId(uid, d.routineId),
          title: d.title,
          repeatMode: 'daily',
          hour: d.hour,
          minute: d.minute,
          sound: 'ruffysound001.wav'
        })
        await sleep(50)
      }

      for (const w of weeklyQueue) {
        await scheduleWeekly(w.baseId, w.hour, w.minute, w.days, w.title)
        await sleep(50)
      }

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
      await purgeAllForBase(baseOf(uid, routineId))
    },

    async clearAndReloadAll() {
      const uid = useAuthStore().user?.uid
      if (!uid) return
      await purgeAll()
      await sleep(50)
      const routines = await fetchAllRoutinesForUid(uid)
      await this.rehydrateFromRoutines(routines)
    }
  }
})

async function fetchAllRoutinesForUid(uid) {
  if (!uid) return []
  const snap = await getDocs(collection(db, 'users', uid, 'routines'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
