// src/stores/alarm.js
import { defineStore } from 'pinia'

function postIOS(payload) {
  try { window.webkit?.messageHandlers?.notify?.postMessage(payload) } catch (_) {}
}
const pad2 = n => String(n).padStart(2, '0')

function parseAlarmTime(v) {
  if (!v) return null
  if (typeof v === 'string') {
    const m = v.match(/^(\d{1,2}):(\d{2})$/)
    if (!m) return null
    const h = +m[1], mi = +m[2]
    if (h < 0 || h > 23 || mi < 0 || mi > 59) return null
    return { hour: h, minute: mi }
  }
  const hh = v.hour != null ? +v.hour : NaN
  const mm = v.minute != null ? +v.minute : NaN
  if (Number.isNaN(hh) || Number.isNaN(mm) || mm < 0 || mm > 59) return null
  const a = String(v.ampm || '').toLowerCase()
  if (a.includes('am') || a.includes('pm') || a.includes('오전') || a.includes('오후')) {
    if (hh < 1 || hh > 12) return null
    const isPM = a.includes('pm') || a.includes('오후')
    let h24 = hh % 12
    if (isPM) h24 += 12
    return { hour: h24, minute: mm }
  }
  if (hh < 0 || hh > 23) return null
  return { hour: hh, minute: mm }
}

function toIOSWeekdayNums(arr) {
  if (!Array.isArray(arr)) return []
  const raw = arr.map(n => +n).filter(n => Number.isInteger(n))
  const hasZero = raw.some(n => n === 0)
  const maxVal = raw.reduce((a, b) => Math.max(a, b), -Infinity)
  return raw.map(n => {
    if (hasZero) return ((n + 1 - 1) % 7) + 1
    if (maxVal <= 7) {
      if (raw.includes(7) && !raw.includes(1)) return (n % 7) + 1
      return (n >= 1 && n <= 7) ? n : ((n % 7) + 1)
    }
    return ((n % 7) + 1)
  })
}

const WD_LABEL = ['일','월','화','수','목','금','토']

function buildSubtitle(repeatType, weekDays, startDate, timeStr, dailyInterval = 0) {
  if (repeatType === 'daily') {
    if ((dailyInterval|0) === 0) return `오늘만 ${timeStr}`
    return `${dailyInterval}일마다 ${timeStr}`
  }
  if (repeatType === 'weekly') {
    const label = (weekDays || []).map(n => WD_LABEL[(n - 1 + 7) % 7]).join('')
    return `${label || '주간'} ${timeStr}`
  }
  const d = startDate ? new Date(startDate) : new Date()
  const [hh, mm] = timeStr.split(':').map(Number)
  d.setHours(hh, mm, 0, 0)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${timeStr}`
}

function nextTimestampForOnce(hour, minute, startDate) {
  const now = new Date()
  const base = startDate ? new Date(startDate) : new Date()
  base.setHours(hour, minute, 0, 0)
  if (base.getTime() <= now.getTime()) {
    base.setDate(base.getDate() + 1)
    base.setHours(hour, minute, 0, 0)
  }
  return base.getTime()
}

export const useAlarmStore = defineStore('alarm', {
  state: () => ({
    permission: 'unknown',
    lastScheduledIds: new Set(),
  }),
  actions: {
    setPermission(p){ this.permission = p },

    cancel(id){ postIOS({ action: 'cancel', id }) },

    scheduleOnce({ id, title, subtitle, timestamp, link }) {
      postIOS({ action: 'scheduleOnce', id, title, subtitle, timestamp, link })
      this.lastScheduledIds.add(id)
    },

    scheduleDaily({ id, title, subtitle, hour, minute, interval, startDate, link }) {
      postIOS({ action: 'scheduleDaily', id, title, subtitle, hour, minute, interval, startDate: startDate || null, link })
      this.lastScheduledIds.add(id)
    },

    scheduleWeekly({ id, title, subtitle, hour, minute, weekdays, link }) {
      postIOS({ action: 'scheduleWeekly', id, title, subtitle, hour, minute, weekdays, link })
      this.lastScheduledIds.add(id)
    },

    buildFromForm(form) {
      const hm = parseAlarmTime(form.alarmTime)
      if (!hm) return null
      const iosWeekdays = toIOSWeekdayNums(form.repeatWeekDays)
      const dailyInterval = (form.repeatType === 'daily')
        ? (Number.isInteger(+form.repeatDaily) ? Math.max(0, +form.repeatDaily) : 0)
        : 0
      const timeStr = `${pad2(hm.hour)}:${pad2(hm.minute)}`
      const subtitle = buildSubtitle(form.repeatType, iosWeekdays, form.startDate, timeStr, dailyInterval)
      return { hm, iosWeekdays, dailyInterval, subtitle, timeStr }
    },

    scheduleFromForm(form, meta) {
      if (this.permission === 'denied') return { ok:false, reason:'permission_denied' }
      const built = this.buildFromForm(form)
      if (!built) return { ok:true, scheduled:false }

      const { hm, iosWeekdays, dailyInterval, subtitle } = built
      const routineId = meta.routineId
      const id = `rt_${routineId}`
      const title = (meta.title || '').slice(0,20) || '알람'
      const link = `heyruffy://main?r=${encodeURIComponent(routineId)}`

      this.cancel(id)

      if (form.repeatType === 'daily' && dailyInterval === 0) {
        const ts = nextTimestampForOnce(hm.hour, hm.minute, form.startDate || null)
        this.scheduleOnce({ id, title, subtitle, timestamp: ts, link })
        return { ok:true, scheduled:true, type:'once', ts }
      }

      if (form.repeatType === 'daily') {
        this.scheduleDaily({
          id, title, subtitle,
          hour: hm.hour, minute: hm.minute,
          interval: Math.max(1, dailyInterval || 1),
          startDate: form.startDate || null,
          link
        })
        return { ok:true, scheduled:true, type:'daily', interval: Math.max(1, dailyInterval || 1) }
      }

      if (form.repeatType === 'weekly') {
        if (!iosWeekdays?.length) return { ok:true, scheduled:false }
        this.scheduleWeekly({
          id, title, subtitle,
          hour: hm.hour, minute: hm.minute,
          weekdays: iosWeekdays,
          link
        })
        return { ok:true, scheduled:true, type:'weekly', weekdays: iosWeekdays }
      }

      const ts = nextTimestampForOnce(hm.hour, hm.minute, form.startDate || null)
      this.scheduleOnce({ id, title, subtitle, timestamp: ts, link })
      return { ok:true, scheduled:true, type:'once', ts }
    }
  }
})
