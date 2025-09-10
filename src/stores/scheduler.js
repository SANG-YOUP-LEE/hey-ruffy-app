// src/stores/scheduler.js
import { defineStore } from 'pinia'

const mh = () => window.webkit?.messageHandlers?.notify
const post = (p) => { try { mh()?.postMessage(p) } catch (_) {} }
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`
const q = new Map() // debounce per base

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

    scheduleDaily(base, hour, minute, title, body = '') {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute)) return
      post({
        action: 'schedule',
        id: `${base}-daily`,
        baseId: base,
        repeatMode: 'daily',
        hour: Number(hour),
        minute: Number(minute),
        title,
        body,
      })
    },

    scheduleWeekly(base, hour, minute, days, title, body = '') {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute) || !Array.isArray(days) || !days.length) return
      const weekdays = Array.from(new Set(days.map(d => parseInt(d, 10))))
        .filter(d => d >= 1 && d <= 7)
        .sort((a,b) => a - b)
      if (!weekdays.length) return
      post({
        action: 'schedule',
        repeatMode: 'weekly',
        id: `${base}-weekly`,
        base,
        hour: Number(hour),
        minute: Number(minute),
        weekdays,
        title,
        body,
      })
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

    reschedule(routine, repeat) {
      if (!routine || !repeat) return
      const base = baseOf(routine.id)
      const title = routine.title || '알림'
      const body = routine.body || ''
      const { hour, minute } = resolveAlarmHM(routine)
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

      if (q.has(base)) clearTimeout(q.get(base))

      // 🔧 여기서는 의도적으로 purge → schedule 순서를 유지(명시적 재설정 시)
      this.purge(base)
      const t = setTimeout(() => {
        if (repeat.mode === 'ONCE') {
          this.scheduleOnce(base, repeat.at, title, body)
          return
        }
        if (repeat.mode === 'DAILY' || repeat.mode === 'DAILY_EVERY_1') {
          this.scheduleDaily(base, hour, minute, title, body)
          return
        }
        if (repeat.mode === 'WEEKLY') {
          this.scheduleWeekly(base, hour, minute, repeat.days || [], title, body)
          return
        }
        if (repeat.mode === 'MONTHLY') {
          this.scheduleMonthly(base, hour, minute, repeat.days || [], title, body)
          return
        }
        if (repeat.mode === 'DAILY_EVERY_N') {
          const n = Math.max(2, parseInt(repeat.n ?? 2, 10))
          post({
            action: 'schedule',
            id: `${base}-d${n}`,
            baseId: base,
            repeatMode: 'daily',
            interval: n,
            hour,
            minute,
            title,
            body,
          })
        }
      }, 300)
      q.set(base, t)
    },

    // 파이어스토어에서 불러온 루틴들로 재하이드레이트
    // ✅ ONCE(오늘만)으로 저장된 루틴은 "건드리지 않도록" purge 위치를 변경
    rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      list.forEach((r) => {
        if (!r || r.isPaused) return
        const base = baseOf(r.id)
        const title = r.title || '알림'
        const body = r.comment || r.body || ''
        const { hour, minute } = resolveAlarmHM(r)
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

        const rt = String(r.repeatType || 'daily').toLowerCase()

        // 1) daily인데 오늘만(once)이면 건드리지 않음 (purge 금지)
        if (rt === 'daily') {
          if (Number(r.repeatDaily) === 0 || r.rule?.freq === 'once') {
            return
          }
          // 실제로 daily를 재등록할 때만 purge
          this.purge(base)
          this.scheduleDaily(base, hour, minute, title, body)
          return
        }

        // 2) weekly
        if (rt.includes('week')) {
          const days = Array.isArray(r.repeatWeekDays) && r.repeatWeekDays.length
            ? r.repeatWeekDays
            : (Array.isArray(r.repeatDays) ? r.repeatDays : [])
          if (Array.isArray(days) && days.length) {
            this.purge(base)
            this.scheduleWeekly(base, hour, minute, days, title, body)
            return
          }
        }

        // 3) monthly
        if (rt.includes('month')) {
          const md = Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []
          if (md.length) {
            this.purge(base)
            this.scheduleMonthly(base, hour, minute, md, title, body)
            return
          }
        }

        // 그 외 타입은 조용히 스킵 (기본 DAILY 강제 설치 없음)
      })
    }
  }
})
