import { defineStore } from 'pinia'
import { projectInstances } from '@/utils/projection'
import iosBridge from '@/utils/iosNotify'

const { waitBridgeReady, scheduleOnIOS, cancelOnIOS, scheduleWeekly } = iosBridge
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`
const p2 = (n) => String(n).padStart(2, '0')
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
const toEpochSec = (ms) => Math.floor(ms / 1000)

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
  state: () => ({ tz: 'Asia/Seoul' }),

  actions: {
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

        await cancelOnIOS(baseId)
        await sleep(30)

        const type = String(r.repeatType || 'daily').toLowerCase()

        if (type === 'daily' && Number(r.repeatEveryDays) === 0) {
          const today = todayISO()
          let startISO = safeISOFromDateObj(r.startDate) || r.start || today
          if (startISO < today) startISO = today

          const [Y,M,D] = startISO.split('-').map(n=>parseInt(n,10))
          let atMs = new Date(Y, M-1, D, hour, minute).getTime()
          const now = Date.now()
          if (atMs <= now) continue

          await scheduleOnIOS({
            routineId: r.id,
            title,
            repeatMode: 'once',
            fireTimesEpoch: [toEpochSec(atMs)],
            sound: 'ruffysound001.wav'
          })
          await sleep(15)
          continue
        }

        if (type === 'weekly') {
          const intervalW = parseIntervalNum(r.repeatWeeks, 1)
          const days = uniqSorted((r.repeatWeekDays||[]).map(dayTokenToNum).filter(n=>n>=1 && n<=7))
          if (intervalW === 1 && days.length) {
            await scheduleWeekly(baseId, hour, minute, days, title)
            await sleep(15)
            continue
          }
        }

        const projDef = {
          repeatMode: type,
          mode: type,
          hour, minute,
          intervalDays: (type==='daily' && Number(r.repeatEveryDays)>1) ? Number(r.repeatEveryDays) : undefined,
          intervalWeeks: type==='weekly' ? parseIntervalNum(r.repeatWeeks,1) : undefined,
          weekdays: type==='weekly' ? uniqSorted((r.repeatWeekDays||[]).map(dayTokenToNum).filter(n=>n>=1 && n<=7)) : undefined,
          byMonthDay: type==='monthly' ? uniqSorted((r.repeatMonthDays||[]).map(d=>parseInt(d,10)).filter(d=>d>=1 && d<=31)) : undefined,
          startDate: safeISOFromDateObj(r.startDate) || r.start || todayISO(),
          endDate: safeISOFromDateObj(r.endDate) || r.end || undefined,
          alarm: { hour, minute }
        }
        await installFromProjection({ baseId, routineId: r.id, title, tz, projDef })
        await sleep(15)
      }
    },

    async reschedule() {
      const routines = await fetchAllRoutinesFromDBOrStore()
      await this.rehydrateFromRoutines(routines)
    },

    async cancelRoutine(routineId) {
      const baseId = baseOf(routineId)
      await waitBridgeReady()
      await cancelOnIOS(baseId)
    }
  }
})