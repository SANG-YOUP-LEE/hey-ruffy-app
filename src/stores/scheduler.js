// src/stores/scheduler.js
import { defineStore } from 'pinia'

const mh = () => window.webkit?.messageHandlers?.notify
const post = (p) => { try { mh()?.postMessage(p) } catch (e) {} }
const baseOf = (routineId) => `routine-${String(routineId || '').split('-')[0]}`

export const useSchedulerStore = defineStore('scheduler', {
  actions: {
    purge(base) {
      if (!base) return
      post({ action: 'purgeAllForBase', base })
    },
    once(base, atISO, title) {
      if (!base || !atISO) return
      const t = Date.parse(atISO)
      if (!Number.isFinite(t) || t <= Date.now()) return
      post({ action: 'schedule', base, id: `${base}-once`, type: 'once', at: atISO, title })
    },
    dailyN(base, hour, minute, n, title) {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(n)) return
      const interval = Math.max(2, parseInt(n, 10))
      post({ action: 'schedule', base, id: `${base}-d${interval}`, type: 'daily', hour, minute, interval, title })
    },
    weekly(base, hour, minute, days, title) {
      if (!base || !Number.isFinite(hour) || !Number.isFinite(minute) || !Array.isArray(days) || days.length === 0) return
      const uniq = Array.from(new Set(days.map(d => parseInt(d, 10)))).filter(d => d >= 1 && d <= 7).sort((a,b)=>a-b)
      if (!uniq.length) return
      post({ action: 'schedule', base, id: `${base}-w`, type: 'weekly', hour, minute, days: uniq, title })
    },
    reschedule(routine, repeat) {
      if (!routine || !repeat) return
      const base = baseOf(routine.id)
      this.purge(base)
      const title = routine.title || '알림'
      const hour = Number(routine.hour)
      const minute = Number(routine.minute)

      if (repeat.mode === 'ONCE') {
        this.once(base, repeat.at, title)
        return
      }
      if (repeat.mode === 'DAILY_EVERY_N') {
        if (Number.isFinite(hour) && Number.isFinite(minute)) {
          this.dailyN(base, hour, minute, Number(repeat.n || 2), title)
        }
        return
      }
      if (repeat.mode === 'WEEKLY') {
        if (Number.isFinite(hour) && Number.isFinite(minute)) {
          this.weekly(base, hour, minute, repeat.days || [], title)
        }
      }
    }
  }
})
