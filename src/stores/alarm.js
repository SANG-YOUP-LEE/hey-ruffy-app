// src/stores/alarm.js
import { defineStore } from 'pinia'

function postIOS(payload) {
  try { window.webkit?.messageHandlers?.notify?.postMessage(payload) } catch (_) {}
}

function pad2(n){ return String(n).padStart(2,'0') }

function parseAlarmTime(v) {
  if (!v) return null
  if (typeof v === 'string') {
    const m = v.match(/^(\d{1,2}):(\d{2})$/)
    if (!m) return null
    const h = Number(m[1]), mi = Number(m[2])
    if (Number.isNaN(h) || Number.isNaN(mi)) return null
    if (h < 0 || h > 23 || mi < 0 || mi > 59) return null
    return { hour: h, minute: mi }
  }
  const a = String(v.ampm || '').toLowerCase()
  const hh = v.hour != null ? String(v.hour).padStart(2,'0') : ''
  const mm = v.minute != null ? String(v.minute).padStart(2,'0') : ''
  if (!/^\d{2}$/.test(hh) || !/^\d{2}$/.test(mm)) return null
  let h12 = Number(hh), m = Number(mm)
  if (h12 < 1 || h12 > 12 || m < 0 || m > 59) return null
  const isPM = a.includes('pm') || a.includes('오후')
  const isAM = a.includes('am') || a.includes('오전')
  if (!isAM && !isPM) return null
  let h24 = h12 % 12
  if (isPM) h24 += 12
  return { hour: h24, minute: m }
}

function toIOSWeekdayNums(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map(n => (n >= 1 && n <= 7) ? n : ((n % 7) + 1))
}

const WD_LABEL = ['일','월','화','수','목','금','토']
function buildSubtitle(repeatType, weekDays, startDate, timeStr, dailyInterval = 0) {
  if (repeatType === 'daily') {
    if (dailyInterval === 0) return `오늘만 ${timeStr}`
    return `${dailyInterval}일마다 ${timeStr}`
  }
  if (repeatType === 'weekly') {
    const label = (weekDays || []).map(n => WD_LABEL[(n >= 1 && n <= 7) ? n-1 : n%7]).join('')
    return `${label || '주간'} ${timeStr}`
  }
  const d = startDate ? new Date(startDate) : new Date()
  const [hh, mm] = timeStr.split(':').map(Number)
  d.setHours(hh); d.setMinutes(mm); d.setSeconds(0); d.setMilliseconds(0)
  const y = d.getFullYear(), m = pad2(d.getMonth()+1), day = pad2(d.getDate())
  return `${y}-${m}-${day} ${timeStr}`
}

export const useAlarmStore = defineStore('alarm', {
  state: () => ({
    permission: 'unknown', // 'unknown' | 'granted' | 'denied'
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
        ? (Number.isInteger(form.repeatDaily) ? form.repeatDaily : 0)
        : 0

      const timeStr = `${pad2(hm.hour)}:${pad2(hm.minute)}`
      const subtitle = buildSubtitle(
        form.repeatType,
        iosWeekdays,
        form.startDate,
        timeStr,
        dailyInterval
      )

      return { hm, iosWeekdays, dailyInterval, subtitle }
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
        const base = form.startDate ? new Date(form.startDate) : new Date()
        base.setHours(hm.hour); base.setMinutes(hm.minute); base.setSeconds(0); base.setMilliseconds(0)
        this.scheduleOnce({ id, title, subtitle, timestamp: base.getTime(), link })
        return { ok:true, scheduled:true, type:'once' }
      }

      if (form.repeatType === 'daily') {
        this.scheduleDaily({
          id, title, subtitle,
          hour: hm.hour, minute: hm.minute,
          interval: dailyInterval || 1,
          startDate: form.startDate || null,
          link
        })
        return { ok:true, scheduled:true, type:'daily', interval: dailyInterval || 1 }
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

      const base = form.startDate ? new Date(form.startDate) : new Date()
      base.setHours(hm.hour); base.setMinutes(hm.minute); base.setSeconds(0); base.setMilliseconds(0)
      this.scheduleOnce({ id, title, subtitle, timestamp: base.getTime(), link })
      return { ok:true, scheduled:true, type:'once' }
    }
  }
})