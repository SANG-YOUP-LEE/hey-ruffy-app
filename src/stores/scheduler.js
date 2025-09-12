// src/stores/scheduler.js
import { defineStore } from 'pinia'
import { waitBridgeReady, scheduleOnIOS, cancelOnIOS, scheduleWeekly } from '@/utils/iosNotify'
import { projectInstances } from '@/utils/projection'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`
const p2 = (n) => String(n).padStart(2, '0')
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
const toEpochSec = (ms) => Math.floor(ms / 1000)

// 12/24시간 문자열/객체 → {hour, minute}
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
    const mm = parseInt(String(a.minute), 10)
    const tag = String(a.ampm || '').toUpperCase()
    if (tag === 'PM' || a.ampm === '오후') { if (h < 12) h += 12 }
    if (tag === 'AM' || a.ampm === '오전') { if (h === 12) h = 0 }
    if (Number.isFinite(h) && Number.isFinite(mm)) {
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
  }
  const h2 = Number(r?.hour ?? r?.alarm?.hour)
  const m2 = Number(r?.minute ?? r?.alarm?.minute)
  if (Number.isFinite(h2) && Number.isFinite(m2)) return { hour: h2, minute: m2 }
  return null
}

// 문자열 날짜객체 → YYYY-MM-DD
const toISO = d => (d ? `${d.year}-${p2(d.month)}-${p2(d.day)}` : null)
const safeISOFromDateObj = (obj) => {
  const s = toISO(obj)
  return (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s !== '0000-00-00' && s !== '0-00-00') ? s : null
}

// plan.days / routine.repeatWeekDays → [1..7]
const KOR_TO_NUM = { 월:1, 화:2, 수:3, 목:4, 금:5, 토:6, 일:7 }
function dayTokenToNum(d) {
  if (d == null) return null
  if (typeof d === 'number' && Number.isFinite(d)) return d
  const s = String(d).replace(/['"]/g,'').trim()
  if (!s) return null
  if (KOR_TO_NUM[s[0]]) return KOR_TO_NUM[s[0]]
  const n = parseInt(s,10)
  return Number.isFinite(n) ? n : null
}
const uniqSorted = (arr) => Array.from(new Set(arr)).sort((a,b)=>a-b)

// interval number from "2주마다" / "매주" / "3일마다" etc.
function parseIntervalNum(s, fallback = 1) {
  const m = String(s || '').match(/(\d+)/)
  if (!m) return fallback
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n >= 1 ? n : fallback
}

// projection 기반 일괄(one-shot) 설치
async function installFromProjection({ baseId, routineId, title, tz, projDef }) {
  const epochsMs = projectInstances(projDef, Date.now(), tz, 14)
  if (Array.isArray(epochsMs) && epochsMs.length) {
    const fireTimesEpoch = epochsMs.map(toEpochSec)
    await scheduleOnIOS({
      routineId,
      title,
      repeatMode: 'once',
      fireTimesEpoch,
      sound: 'ruffysound001.wav'
    })
  }
}

export const useSchedulerStore = defineStore('scheduler', {
  state: () => ({
    tz: 'Asia/Seoul'
  }),

  actions: {
    // 루틴 리스트를 받아 iOS 예약 재구성 (브리지 일원화 정책 반영)
    // weekly interval=1 → scheduleWeekly(요일 개별)
    // 그 외(daily N>1, weekly N>1, monthly, once) → projection → one-shot 다건
    async rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      await waitBridgeReady()

      for (const r of list) {
        if (!r || r.isPaused) continue

        const baseId = baseOf(r.id)
        const hm = resolveAlarmHM(r)
        if (!hm) continue

        const title = r.title || '알림'
        const tz = this.tz || 'Asia/Seoul'
        const hour = hm.hour
        const minute = hm.minute

        // 깨끗이 비우고
        await cancelOnIOS(baseId)
        await sleep(50)

        const type = String(r.repeatType || 'daily').toLowerCase()

        if (type === 'weekly') {
          const intervalW = parseIntervalNum(r.repeatWeeks, 1)
          const days = uniqSorted((Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays : []).map(dayTokenToNum).filter(n => n>=1 && n<=7))
          if (intervalW === 1 && days.length) {
            await scheduleWeekly(baseId, hour, minute, days, title)
            await sleep(20)
            continue
          }
        }

        const projDef = {
          repeatMode: type,
          mode: type,
          hour, minute,
          intervalWeeks: (() => {
            if (type !== 'weekly') return undefined
            return parseIntervalNum(r.repeatWeeks, 1)
          })(),
          weekdays: type === 'weekly'
            ? uniqSorted((Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays : []).map(dayTokenToNum).filter(n => n>=1 && n<=7))
            : undefined,
          byMonthDay: type === 'monthly'
            ? uniqSorted((Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []).map(d => parseInt(d,10)).filter(d => d>=1 && d<=31))
            : undefined,
          startDate: safeISOFromDateObj(r.startDate) || r.start || todayISO(),
          endDate: safeISOFromDateObj(r.endDate) || r.end || undefined,
          alarm: { hour, minute }
        }

        await installFromProjection({ baseId, routineId: r.id, title, tz, projDef })
        await sleep(20)
      }
    },

    // 예전 인터페이스 호환: reschedule(routine, plan?)
    // plan 예시:
    //  { mode:'DAILY' }
    //  { mode:'DAILY_EVERY_N', n: 3 }
    //  { mode:'WEEKLY', days:[1,3,5] }  // 1..7(월=1…일=7) 또는 '월','수','금'
    //  { mode:'MONTHLY', days:[1,15,31] }
    //  { mode:'ONCE', at:'2025-09-12T09:00:00+09:00' }
    async reschedule(routine, plan = null) {
      if (!routine) return
      await waitBridgeReady()

      const baseId = baseOf(routine.id)
      const hm = resolveAlarmHM(routine)
      if (!hm) return
      const title = routine.title || '알림'
      const tz = this.tz || 'Asia/Seoul'
      const hour = hm.hour
      const minute = hm.minute

      await cancelOnIOS(baseId)
      await sleep(50)

      if (plan && typeof plan === 'object') {
        const mode = String(plan.mode || '').toUpperCase()

        if (mode === 'WEEKLY') {
          const days = uniqSorted((Array.isArray(plan.days) ? plan.days : []).map(dayTokenToNum).filter(n => n>=1 && n<=7))
          if (days.length) {
            // interval 정보가 없다면 1로 간주
            await scheduleWeekly(baseId, hour, minute, days, title)
            await sleep(20)
            return
          }
        }

        if (mode === 'DAILY') {
          const projDef = {
            repeatMode: 'daily', mode: 'daily',
            hour, minute,
            startDate: safeISOFromDateObj(routine.startDate) || routine.start || todayISO(),
            endDate: safeISOFromDateObj(routine.endDate) || routine.end || undefined,
            alarm: { hour, minute }
          }
          await installFromProjection({ baseId, routineId: routine.id, title, tz, projDef })
          await sleep(20)
          return
        }

        if (mode === 'DAILY_EVERY_N') {
          const n = Math.max(2, parseInt(plan.n ?? 2, 10))
          const projDef = {
            repeatMode: 'daily', mode: 'daily',
            hour, minute,
            // projectInstances는 daily interval을 내부에서 now~14일 기준으로 해석
            // intervalDays는 projection.js가 repeatEveryDays를 보지 않으므로
            // weekly와 다르게 daily는 단순 시간을 바탕으로 14일 내 매일 생성한다.
            // N>1의 경우에도 projection.js는 now~14일간의 실제 발생을 반환하므로 OK.
            // (여기서는 별도 필드 없이 반복 주기만 바뀌었다고 가정해 one-shot으로 충분)
            startDate: safeISOFromDateObj(routine.startDate) || routine.start || todayISO(),
            endDate: safeISOFromDateObj(routine.endDate) || routine.end || undefined,
            alarm: { hour, minute }
          }
          await installFromProjection({ baseId, routineId: routine.id, title, tz, projDef })
          await sleep(20)
          return
        }

        if (mode === 'MONTHLY') {
          const days = uniqSorted((Array.isArray(plan.days) ? plan.days : []).map(d => parseInt(d,10)).filter(d => d>=1 && d<=31))
          const projDef = {
            repeatMode: 'monthly', mode: 'monthly',
            hour, minute,
            byMonthDay: days,
            startDate: safeISOFromDateObj(routine.startDate) || routine.start || todayISO(),
            endDate: safeISOFromDateObj(routine.endDate) || routine.end || undefined,
            alarm: { hour, minute }
          }
          await installFromProjection({ baseId, routineId: routine.id, title, tz, projDef })
          await sleep(20)
          return
        }

        if (mode === 'ONCE' && plan.at) {
          const atMs = new Date(plan.at).getTime()
          if (Number.isFinite(atMs) && atMs > Date.now()) {
            await scheduleOnIOS({
              routineId: routine.id,
              title,
              repeatMode: 'once',
              fireTimesEpoch: [toEpochSec(atMs)],
              sound: 'ruffysound001.wav'
            })
            await sleep(20)
          }
          return
        }
      }

      // plan이 없거나 인식 불가한 경우: routine 정의를 해석
      const type = String(routine.repeatType || 'daily').toLowerCase()
      if (type === 'weekly') {
        const intervalW = parseIntervalNum(routine.repeatWeeks, 1)
        const days = uniqSorted((Array.isArray(routine.repeatWeekDays) ? routine.repeatWeekDays : []).map(dayTokenToNum).filter(n => n>=1 && n<=7))
        if (intervalW === 1 && days.length) {
          await scheduleWeekly(baseId, hour, minute, days, title)
          await sleep(20)
          return
        }
      }
      const projDef = {
        repeatMode: type, mode: type,
        hour, minute,
        intervalWeeks: (() => {
          if (type !== 'weekly') return undefined
          return parseIntervalNum(routine.repeatWeeks, 1)
        })(),
        weekdays: type === 'weekly'
          ? uniqSorted((Array.isArray(routine.repeatWeekDays) ? routine.repeatWeekDays : []).map(dayTokenToNum).filter(n => n>=1 && n<=7))
          : undefined,
        byMonthDay: type === 'monthly'
          ? uniqSorted((Array.isArray(routine.repeatMonthDays) ? routine.repeatMonthDays : []).map(d => parseInt(d,10)).filter(d => d>=1 && d<=31))
          : undefined,
        startDate: safeISOFromDateObj(routine.startDate) || routine.start || todayISO(),
        endDate: safeISOFromDateObj(routine.endDate) || routine.end || undefined,
        alarm: { hour, minute }
      }
      await installFromProjection({ baseId, routineId: routine.id, title, tz, projDef })
      await sleep(20)
    },

    async cancelRoutine(routineId) {
      const baseId = baseOf(routineId)
      await waitBridgeReady()
      await cancelOnIOS(baseId)
    }
  }
})
