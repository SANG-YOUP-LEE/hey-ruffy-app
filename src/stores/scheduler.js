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

      // 1..7만 허용(일=1 … 토=7), 중복 제거 + 정렬
      const weekdays = Array.from(new Set(days.map(d => parseInt(d, 10))))
        .filter(d => d >= 1 && d <= 7)
        .sort((a,b) => a - b)

      if (!weekdays.length) return

      post({
        action: 'schedule',
        repeatMode: 'weekly',
        id: `${base}-weekly`,

        // ✅ 키 통일: baseId 사용
        baseId: base,

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
            hour: Number(hour),     // ✅ 숫자 캐스팅
            minute: Number(minute), // ✅ 숫자 캐스팅
            title,
            body,
          })
        }
      }, 300)
      q.set(base, t)
    },

    // 파이어스토어에서 불러온 루틴들로 재하이드레이트
    rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      list.forEach((r) => {
        if (!r || r.isPaused) return
        const base = baseOf(r.id)
        const title = r.title || '알림'
        const body = r.comment || r.body || ''
        const { hour, minute } = resolveAlarmHM(r)
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

        this.purge(base)

        const rt = String(r.repeatType || 'daily').toLowerCase()

        if (rt === 'daily') {
          // ✅ 오늘만(once)은 제외
          if (Number(r.repeatDaily) === 0 || r.rule?.freq === 'once') {
            return
          }
          this.scheduleDaily(base, hour, minute, title, body)
          return
        }

        if (rt.includes('week')) {
          const days = Array.isArray(r.repeatWeekDays) && r.repeatWeekDays.length
            ? r.repeatWeekDays
            : (Array.isArray(r.repeatDays) ? r.repeatDays : [])
          if (Array.isArray(days) && days.length) {
            this.scheduleWeekly(base, hour, minute, days, title, body)
            return
          }
        }

        if (rt.includes('month')) {
          const md = Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []
          if (md.length) {
            this.scheduleMonthly(base, hour, minute, md, title, body)
            return
          }
        }

        // ✅ 기본 데일리 강제 등록 제거 (once가 다시 daily로 깔리는 문제 방지)
        return
      })
    }
  }
})
