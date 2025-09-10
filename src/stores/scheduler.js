// src/stores/scheduler.js
import { defineStore } from 'pinia'

// ─────────────────────────────────────────────
// iOS bridge helpers
// ─────────────────────────────────────────────
const mh = () => window.webkit?.messageHandlers?.notify
const post = (p) => { try { mh()?.postMessage(p) } catch (_) {} }
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`

// ─────────────────────────────────────────────
// 내부 상태: 중복 초기화/디바운스 가드
// ─────────────────────────────────────────────
let __installed = false                     // HMR/중복 import 방지
const q = new Map()                         // debounce per base (타이머)
const lastPurgeAt = new Map()               // base별 마지막 purge 시각
const COOLDOWN_MS = 1200                    // purge→schedule 과도한 연쇄 방지 (1.2s)

// ─────────────────────────────────────────────
// 작은 도우미
// ─────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, '0')
const todayYMD = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
const toAtISO = (dateISO, { hour, minute }) => {
  if (!dateISO || !Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return `${dateISO}T${pad2(hour)}:${pad2(minute)}:00+09:00`
}
const parseWeeksInterval = (s) => {
  const m = String(s || '').match(/(\d+)/)
  const n = m ? parseInt(m[1], 10) : 1
  return Math.max(1, Number.isFinite(n) ? n : 1)
}
const normalizeWeekDays = (days) => {
  const arr = Array.isArray(days) ? days : []
  return Array.from(new Set(arr.map(d => parseInt(d, 10))))
    .filter(d => d >= 1 && d <= 7)
    .sort((a, b) => a - b)
}

// 12시간제(오전/오후) → 24시간제
function resolveAlarmHM(r) {
  const a = r?.alarmTime
  if (a && a.hour != null && a.minute != null) {
    const h12 = parseInt(String(a.hour), 10)
    const m = parseInt(String(a.minute), 10)
    if (Number.isFinite(h12) && Number.isFinite(m)) {
      let h = h12 % 12
      const ampm = String(a.ampm || '').toUpperCase()
      if (ampm === '오후' || ampm === 'PM') h += 12
      if ((ampm === '오전' || ampm === 'AM') && h12 === 12) h = 0
      if ((ampm === '오후' || ampm === 'PM') && h12 === 12) h = 12
      return { hour: h, minute: m }
    }
  }
  const h = Number(r?.hour ?? r?.alarm?.hour)
  const m = Number(r?.minute ?? r?.alarm?.minute)
  return { hour: h, minute: m }
}

// ─────────────────────────────────────────────
// Pinia Store
// ─────────────────────────────────────────────
export const useSchedulerStore = defineStore('scheduler', {
  state: () => ({
    ready: false,     // initOnce 완료 여부
  }),

  actions: {
    // 앱 부팅 때 단 한 번만 호출 (main.js 등)
    initOnce() {
      if (__installed) return
      __installed = true
      this.ready = true
      // 필요한 사전 작업이 있으면 여기서만 수행
      // console.debug('🍍 "scheduler" store installed 🆕')
    },

    // ─────────────────────────────────────────
    // Low-level 브리지 래퍼
    // ─────────────────────────────────────────
    purge(base) {
      if (!base) return
      post({ action: 'purgeBase', baseId: base })
      lastPurgeAt.set(base, Date.now())
    },

    scheduleOnce(base, atISO, title, body = '') {
      if (!base || !atISO) return
      const t = Date.parse(atISO)
      if (!Number.isFinite(t) || t <= Date.now()) return
      const id = `${base}-once-${t}`
      post({
        action: 'schedule',
        id,
        baseId: base,
        repeatMode: 'once',
        timestamp: Math.floor(t / 1000),
        title,
        body,
      })
    },

    // intervalDays 지원(기본 1)
    scheduleDaily(base, hour, minute, title, body = '', interval = 1) {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute)) return
      const payload = {
        action: 'schedule',
        id: `${base}-daily`,
        baseId: base,
        repeatMode: 'daily',
        hour: Number(hour),
        minute: Number(minute),
        title,
        body,
      }
      if (Number(interval) > 1) payload.interval = Math.max(2, parseInt(interval, 10))
      post(payload)
    },

    // intervalWeeks 지원(기본 1)
    scheduleWeekly(base, hour, minute, days, title, body = '', intervalWeeks = 1) {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute) || !Array.isArray(days) || !days.length) return
      const weekdays = normalizeWeekDays(days)
      if (!weekdays.length) return

      const payload = {
        action: 'schedule',
        repeatMode: 'weekly',
        id: `${base}-weekly`,
        baseId: base,
        hour: Number(hour),
        minute: Number(minute),
        weekdays,
        title,
        body,
      }
      const iw = Math.max(1, parseInt(intervalWeeks, 10) || 1)
      if (iw > 1) payload.intervalWeeks = iw
      post(payload)
    },

    scheduleMonthly(base, hour, minute, monthDays, title, body = '') {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute) || !Array.isArray(monthDays) || !monthDays.length) return
      const uniq = Array.from(new Set(monthDays.map(d => parseInt(d,10)))).filter(d => d >= 1 && d <= 31).sort((a,b)=>a-b)
      uniq.forEach(d => {
        post({
          action: 'schedule',
          id: `${base}-m-${d}`,
          baseId: base,
          repeatMode: 'monthly-date',
          day: d,
          hour: Number(hour),
          minute: Number(minute),
          title,
          body,
        })
      })
    },

    cancel(base) {
      if (!base) return
      post({ action: 'purgeBase', baseId: base })
      lastPurgeAt.set(base, Date.now())
    },

    // ─────────────────────────────────────────
    // 기존 호출 호환 (UI에서 직접 쓰는 경우)
    // ─────────────────────────────────────────
    reschedule(routine, repeat) {
      if (!routine || !repeat) return
      const base = baseOf(routine.id)
      const title = routine.title || '알림'
      const body = routine.body || ''
      const { hour, minute } = resolveAlarmHM(routine)
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

      // 같은 베이스 연쇄 purge→schedule 스파이크 방지
      const now = Date.now()
      const last = lastPurgeAt.get(base) || 0
      const delay = Math.max(300, COOLDOWN_MS - (now - last))

      if (q.has(base)) clearTimeout(q.get(base))
      this.purge(base)

      const t = setTimeout(() => {
        if (repeat.mode === 'ONCE') {
          this.scheduleOnce(base, repeat.at, title, body)
          return
        }
        if (repeat.mode === 'DAILY' || repeat.mode === 'DAILY_EVERY_1') {
          this.scheduleDaily(base, hour, minute, title, body, 1)
          return
        }
        if (repeat.mode === 'WEEKLY') {
          this.scheduleWeekly(base, hour, minute, repeat.days || [], title, body, 1)
          return
        }
        if (repeat.mode === 'MONTHLY') {
          this.scheduleMonthly(base, hour, minute, repeat.days || [], title, body)
          return
        }
        if (repeat.mode === 'DAILY_EVERY_N') {
          const n = Math.max(2, parseInt(repeat.n ?? 2, 10))
          this.scheduleDaily(base, hour, minute, title, body, n)
        }
      }, delay)
      q.set(base, t)
    },

    // ─────────────────────────────────────────
    // ✅ 단일 진입점: Firestore 문서로 스케줄 설치
    //    - routineForm.save() 이후 여기만 호출
    // ─────────────────────────────────────────
    applyScheduleFromDoc(r = {}) {
      if (!r || !r.id) return
      const base = baseOf(r.id)
      const title = r.title || '알림'
      const body = r.comment || r.body || ''
      const { hour, minute } = resolveAlarmHM(r)
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

      const rt = String(r.repeatType || 'daily').toLowerCase()

      // 1) 오늘만(once)
      const isOnce =
        (rt === 'daily' && (Number(r.repeatDaily) === 0 || Number(r.repeatEveryDays) === 0)) ||
        (r.rule?.freq === 'once')

      if (isOnce) {
        const dateISO = r.start || todayYMD()
        const atISO = toAtISO(dateISO, { hour, minute }) || toAtISO(todayYMD(), { hour, minute })
        this.purge(base)
        this.scheduleOnce(base, atISO, title, body)
        return
      }

      // 2) 일간 (N일마다 포함)
      if (rt === 'daily') {
        const n = Math.max(1, parseInt(r.repeatEveryDays ?? r.repeatDaily ?? 1, 10) || 1)
        this.purge(base)
        this.scheduleDaily(base, hour, minute, title, body, n)
        return
      }

      // 3) 주간 (N주마다 지원)
      if (rt.includes('week')) {
        const days = normalizeWeekDays(
          Array.isArray(r.repeatWeekDays) && r.repeatWeekDays.length
            ? r.repeatWeekDays
            : (Array.isArray(r.repeatDays) ? r.repeatDays : [])
        )
        if (days.length) {
          const iw = parseWeeksInterval(r.repeatWeeks)
          // 매주 + 7요일 전부 → daily로 축약(안정성)
          this.purge(base)
          if (iw === 1 && days.length === 7) {
            this.scheduleDaily(base, hour, minute, title, body, 1)
          } else {
            this.scheduleWeekly(base, hour, minute, days, title, body, iw)
          }
        }
        return
      }

      // 4) 월간
      if (rt.includes('month')) {
        const md = Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []
        if (md.length) {
          this.purge(base)
          this.scheduleMonthly(base, hour, minute, md, title, body)
        }
        return
      }

      // 그 외 타입은 스킵
    },

    // ─────────────────────────────────────────
    // 파이어스토어 재하이드레이트
    //  - 기본 DAILY 강제 설치 없음
    //  - ONCE는 건드리지 않음
    // ─────────────────────────────────────────
    rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      list.forEach((r) => {
        if (!r || r.isPaused) return

        const { hour, minute } = resolveAlarmHM(r)
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

        const rt = String(r.repeatType || 'daily').toLowerCase()

        // daily인데 오늘만(once)인 것은 건드리지 않음
        if (rt === 'daily') {
          if (Number(r.repeatDaily) === 0 || Number(r.repeatEveryDays) === 0 || r.rule?.freq === 'once') {
            return
          }
          const base = baseOf(r.id)
          this.purge(base)
          const n = Math.max(1, parseInt(r.repeatEveryDays ?? r.repeatDaily ?? 1, 10) || 1)
          this.scheduleDaily(base, hour, minute, r.title || '알림', r.comment || r.body || '', n)
          return
        }

        // weekly
        if (rt.includes('week')) {
          const days = normalizeWeekDays(
            Array.isArray(r.repeatWeekDays) && r.repeatWeekDays.length
              ? r.repeatWeekDays
              : (Array.isArray(r.repeatDays) ? r.repeatDays : [])
          )
          if (days.length) {
            const base = baseOf(r.id)
            const iw = parseWeeksInterval(r.repeatWeeks)
            this.purge(base)
            if (iw === 1 && days.length === 7) {
              this.scheduleDaily(base, hour, minute, r.title || '알림', r.comment || r.body || '', 1)
            } else {
              this.scheduleWeekly(base, hour, minute, days, r.title || '알림', r.comment || r.body || '', iw)
            }
          }
          return
        }

        // monthly
        if (rt.includes('month')) {
          const md = Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []
          if (md.length) {
            const base = baseOf(r.id)
            this.purge(base)
            this.scheduleMonthly(base, hour, minute, md, r.title || '알림', r.comment || r.body || '')
          }
          return
        }

        // 그 외 타입은 스킵
      })
    }
  }
})
