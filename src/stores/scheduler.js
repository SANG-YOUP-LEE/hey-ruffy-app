// src/stores/scheduler.js
import { defineStore } from 'pinia'

const mh = () => window.webkit?.messageHandlers?.notify
const post = (p) => { try { mh()?.postMessage(p) } catch (_) {} }
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`
const q = new Map() // debounce per base

// ─────────────────────────────────────────────
// 작은 도우미
// ─────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, '0')
const todayYMD = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${y}-${m}-${day}`
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

export const useSchedulerStore = defineStore('scheduler', {
  actions: {
    // ─────────────────────────────────────────
    // Low-level 브리지 래퍼
    // ─────────────────────────────────────────
    purge(base) {
      if (!base) return
      post({ action: 'purgeBase', baseId: base })
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

    // interval(>1)도 지원 가능하게 확장
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

    // ✅ baseId 오탈자 수정 + intervalWeeks 지원
    scheduleWeekly(base, hour, minute, days, title, body = '', intervalWeeks = 1) {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute) || !Array.isArray(days) || !days.length) return
      const weekdays = normalizeWeekDays(days)
      if (!weekdays.length) return

      const payload = {
        action: 'schedule',
        repeatMode: 'weekly',
        id: `${base}-weekly`,
        baseId: base,                // ← fix: base → baseId
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

      if (q.has(base)) clearTimeout(q.get(base))

      // 명시적 재설정일 때만 purge → schedule
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
          const days = Array.isArray(repeat.days) ? repeat.days : []
          const iw = Math.max(1, parseInt(repeat.intervalWeeks ?? 1, 10) || 1)
          this.scheduleWeekly(base, hour, minute, days, title, body, iw)
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
      }, 300)
      q.set(base, t)
    },

    // ─────────────────────────────────────────
    // 파이어스토어에서 불러온 루틴들로 재하이드레이트
    // ✅ ONCE는 건드리지 않음
    // ─────────────────────────────────────────
    rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      list.forEach((r) => {
        if (!r || r.isPaused) return

        const { hour, minute } = resolveAlarmHM(r)
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

        const base = baseOf(r.id)
        const title = r.title || '알림'
        const body = r.comment || r.body || ''
        const rt = String(r.repeatType || 'daily').toLowerCase()

        // 1) daily인데 오늘만(once)이면 건드리지 않음
        if (rt === 'daily') {
          if (Number(r.repeatDaily) === 0 || Number(r.repeatEveryDays) === 0 || r.rule?.freq === 'once') {
            return
          }
          this.purge(base)
          const n = Math.max(1, parseInt(r.repeatEveryDays ?? r.repeatDaily ?? 1, 10) || 1)
          this.scheduleDaily(base, hour, minute, title, body, n)
          return
        }

        // 2) weekly
        if (rt.includes('week')) {
          const days = normalizeWeekDays(
            Array.isArray(r.repeatWeekDays) && r.repeatWeekDays.length
              ? r.repeatWeekDays
              : (Array.isArray(r.repeatDays) ? r.repeatDays : [])
          )
          if (days.length) {
            this.purge(base)
            const iw = parseWeeksInterval(r.repeatWeeks)
            this.scheduleWeekly(base, hour, minute, days, title, body, iw)
          }
          return
        }

        // 3) monthly
        if (rt.includes('month')) {
          const md = Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []
          if (md.length) {
            this.purge(base)
            this.scheduleMonthly(base, hour, minute, md, title, body)
          }
          return
        }

        // 그 외 타입은 스킵 (기본 DAILY 강제설치 없음)
      })
    }
  }
})
