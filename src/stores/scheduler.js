// src/stores/scheduler.js
import { defineStore } from 'pinia'

const mh = () => window.webkit?.messageHandlers?.notify
const post = (p) => { try { mh()?.postMessage(p) } catch (_) {} }
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`
const q = new Map() // debounce per base

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
      post({ action: 'schedule', type: 'once', id, base, at: t, title, body })
    },

    scheduleDaily(base, hour, minute, title, body = '') {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute)) return
      post({ action: 'schedule', type: 'daily', id: `${base}-daily`, base, h: Number(hour), m: Number(minute), title, body })
    },

    scheduleWeekly(base, hour, minute, days, title, body = '') {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute) || !Array.isArray(days) || !days.length) return
      const uniq = Array.from(new Set(days.map(d => parseInt(d, 10)))).filter(d => d >= 1 && d <= 7).sort((a,b)=>a-b)
      uniq.forEach(w => {
        post({ action: 'schedule', type: 'weekly', id: `${base}-wk-${w}`, base, w, h: Number(hour), m: Number(minute), title, body })
      })
    },

    scheduleMonthly(base, hour, minute, monthDays, title, body = '') {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute) || !Array.isArray(monthDays) || !monthDays.length) return
      const uniq = Array.from(new Set(monthDays.map(d => parseInt(d,10)))).filter(d => d >= 1 && d <= 31).sort((a,b)=>a-b)
      uniq.forEach(d => {
        post({ action: 'schedule', type: 'monthly', id: `${base}-m-${d}`, base, d, h: Number(hour), m: Number(minute), title, body })
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
      const hour = Number(routine.hour ?? routine.alarm?.hour)
      const minute = Number(routine.minute ?? routine.alarm?.minute)

      if (q.has(base)) clearTimeout(q.get(base))
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
          post({ action: 'schedule', type: 'daily', id: `${base}-d${n}`, base, h: hour, m: minute, interval: n, title, body })
        }
      }, 300)
      q.set(base, t)
    }
  }
})
