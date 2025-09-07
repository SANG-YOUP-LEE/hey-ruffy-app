// File: src/stores/alarm.js
import { defineStore } from 'pinia'
import { scheduleOnIOS, cancelOnIOS } from '@/utils/iosNotify'

const HARD_PURGE_FIRST = false

function postIOS(payload){
  try { window.webkit?.messageHandlers?.notify?.postMessage(payload) } catch (_) {}
  try { window.ReactNativeWebView?.postMessage?.(JSON.stringify(payload)) } catch (_) {}
}

const pad2 = n => String(n).padStart(2,'0')

function parseAlarmTime(v){
  if(!v) return null
  if(typeof v==='string'){
    const m=v.match(/^(\d{1,2}):(\d{2})$/)
    if(!m) return null
    const h=+m[1], mi=+m[2]
    if(h<0||h>23||mi<0||mi>59) return null
    return {hour:h, minute:mi}
  }
  const hh=v.hour!=null?+v.hour:NaN
  const mm=v.minute!=null?+v.minute:NaN
  if(Number.isNaN(hh)||Number.isNaN(mm)||mm<0||mm>59) return null
  const a=String(v.ampm||'').toLowerCase()
  if(a.includes('am')||a.includes('pm')||a.includes('오전')||a.includes('오후')){
    if(hh<1||hh>12) return null
    const isPM=a.includes('pm')||a.includes('오후')
    let h24=hh%12
    if(isPM) h24+=12
    return {hour:h24, minute:mm}
  }
  if(hh<0||hh>23) return null
  return {hour:hh, minute:mm}
}

function asLocalDate(dateLike){
  if(!dateLike) return new Date()
  if(typeof dateLike==='string'){
    if(/^\d{4}-\d{2}-\d{2}$/.test(dateLike)){
      const [y,m,d]=dateLike.split('-').map(Number)
      return new Date(y,m-1,d)
    }
    const t=new Date(dateLike)
    return isNaN(t)?new Date():t
  }
  if(typeof dateLike==='object' && dateLike.year && dateLike.month && dateLike.day){
    return new Date(Number(dateLike.year), Number(dateLike.month)-1, Number(dateLike.day))
  }
  return new Date(dateLike)
}

const WD_LABEL=['일','월','화','수','목','금','토']
const MAP_KOR = { '일':1,'월':2,'화':3,'수':4,'목':5,'금':6,'토':7 }
const MAP_ENG = { su:1,sun:1, mo:2,mon:2, tu:3,tue:3, we:4,wed:4, th:5,thu:5, fr:6,fri:6, sa:7,sat:7 }
const MAP_ICS = { SU:1, MO:2, TU:3, WE:4, TH:5, FR:6, SA:7 }

function toIOSWeekdayNums(arr){
  if(!Array.isArray(arr)) return []
  const mapMonFirstToApple = {1:2,2:3,3:4,4:5,5:6,6:7,7:1}
  const normOne = (x) => {
    if (typeof x === 'number') {
      if (x>=1 && x<=7) return mapMonFirstToApple[x] || x
      if (x>=0 && x<=6) return x===0 ? 1 : x+1
      return null
    }
    const s = String(x).trim()
    if (!s) return null
    const n = Number(s)
    if (Number.isFinite(n)) {
      if (n>=1 && n<=7) return mapMonFirstToApple[n] || n
      if (n>=0 && n<=6) return n===0 ? 1 : n+1
    }
    const head = s.slice(0,1)
    if (MAP_KOR[head]) return MAP_KOR[head]
    if (MAP_ENG[s.toLowerCase()]) return MAP_ENG[s.toLowerCase()]
    if (MAP_ICS[s.toUpperCase()]) return MAP_ICS[s.toUpperCase()]
    return null
  }
  return [...new Set(arr.map(normOne).filter(Boolean))].sort((a,b)=>a-b)
}

function sameYMD(a,b){
  if(!a||!b) return false
  const A=asLocalDate(a), B=asLocalDate(b)
  return A.getFullYear()===B.getFullYear() && A.getMonth()===B.getMonth() && A.getDate()===B.getDate()
}

function nextTimestampForOnce(hour, minute, baseDate){
  const nowMs = Date.now()
  const base=baseDate instanceof Date?new Date(baseDate):new Date()
  base.setHours(hour,minute,0,0)
  let ms = base.getTime()
  if(ms - nowMs < 3000){
    const t = new Date()
    t.setSeconds(t.getSeconds() + 3)
    t.setMilliseconds(0)
    ms = t.getTime()
  }
  return Math.floor(ms/1000)
}

function subtitleDaily(timeStr, n){
  if((n|0)===0) return `오늘만 ${timeStr}`
  if(n===1) return `매일 ${timeStr}`
  return `${n}일마다 ${timeStr}`
}
function subtitleWeekly(timeStr, iosWeekdays){
  const label=(iosWeekdays||[]).map(n=>WD_LABEL[(n-1+7)%7]).join('')
  return `${label||'주간'} ${timeStr}`
}
function subtitleMonthly(timeStr, days){
  const uniq=[...new Set((days||[]).map(d=>+d).filter(d=>d>=1&&d<=31))].sort((a,b)=>a-b)
  const label=uniq.length? uniq.join('·')+'일' : '매월'
  return `${label} ${timeStr}`
}

let scheduledKeys=new Set()

const toEpoch = d => Math.floor(d.getTime()/1000)
const startOfDay = d => { const x=new Date(d); x.setHours(0,0,0,0); return x }
function buildDailyEpochsBetween(startDate, endDate, hour, minute, everyDays=1){
  const out=[]
  const now=new Date()
  const s=startOfDay(asLocalDate(startDate||now))
  const e=startOfDay(asLocalDate(endDate||s))
  const step=Math.max(1, parseInt(everyDays,10)||1)
  for(let d=new Date(s); d.getTime()<=e.getTime(); d.setDate(d.getDate()+step)){
    const fire=new Date(d); fire.setHours(hour,minute,0,0)
    if(fire.getTime()>=now.getTime()) out.push(toEpoch(fire))
  }
  return out
}
function buildWeeklyEpochsBetween(startDate, endDate, iosWeekdays, hour, minute){
  const out=[]; const now=new Date()
  const s=startOfDay(asLocalDate(startDate||now))
  const e=startOfDay(asLocalDate(endDate||s))
  const set=new Set((iosWeekdays||[]).map(n => n % 7)) // 1..7 → 1..6,0(Sun)
  for(let d=new Date(s); d.getTime()<=e.getTime(); d.setDate(d.getDate()+1)){
    if(!set.has(d.getDay())) continue
    const fire=new Date(d); fire.setHours(hour,minute,0,0)
    if(fire.getTime()>=now.getTime()) out.push(toEpoch(fire))
  }
  return out
}
function buildMonthlyEpochsBetween(startDate, endDate, monthDays, hour, minute){
  const out=[]; const now=new Date()
  const s=startOfDay(asLocalDate(startDate||now))
  const e=startOfDay(asLocalDate(endDate||s))
  const set=new Set((monthDays||[]).map(d=>Math.max(1,Math.min(31,parseInt(d,10)||1))))
  for(let d=new Date(s); d.getTime()<=e.getTime(); d.setDate(d.getDate()+1)){
    if(!set.has(d.getDate())) continue
    const fire=new Date(d); fire.setHours(hour,minute,0,0)
    if(fire.getTime()>=now.getTime()) out.push(toEpoch(fire))
  }
  return out
}

function setScheduleForRoutine({ routineId, mode, title, subtitle, fireTimesEpoch, link }){
  postIOS({
    action:'setScheduleForRoutine',
    routineId: String(routineId),
    mode,
    title,
    body: subtitle || '',
    fireTimesEpoch,
    link: link || null
  })
}

export const useAlarmStore = defineStore('alarm', {
  state: () => ({
    permission: 'unknown',
  }),
  actions: {
    setPermission(p){ this.permission=p },

    cancel(id){ cancelOnIOS(id); scheduledKeys.delete(id) },
    cancelSeries(baseId){
      this.cancel(baseId)
      for(let d=1; d<=31; d++) this.cancel(`${baseId}-m${pad2(d)}`)
      for(let w=1; w<=7; w++) this.cancel(`${baseId}-w${w}`)
    },

    scheduleOnce({ id, title, subtitle, timestamp, link, hour, minute, baseDate }){
      let ts = Number(timestamp);
      if (!Number.isFinite(ts) || ts <= 0) {
        if (Number.isFinite(hour) && Number.isFinite(minute)) {
          ts = nextTimestampForOnce(Number(hour), Number(minute), asLocalDate(baseDate || new Date()));
        } else {
          return;
        }
      }
      scheduleOnIOS({
        action: 'schedule',
        id,
        repeatMode: 'once',
        timestamp: ts,
        title,
        subtitle,
        link
      });
    },

    scheduleDaily({ id, title, subtitle, hour, minute, interval, startDate, endDate, link }){
      scheduleOnIOS({
        action: 'schedule',
        id,
        repeatMode: 'daily',
        hour, minute,
        interval: Math.max(1, Number(interval) || 1),
        startDate: startDate || null,
        endDate: endDate || null,
        title,
        subtitle,
        link
      });
    },

    scheduleWeekly({ id, title, subtitle, hour, minute, weekdays, intervalWeeks, startDate, endDate, link }){
      const days = Array.isArray(weekdays) ? weekdays : []
      const iw = Math.max(1, Number(intervalWeeks) || 1)
      if (iw === 1 && days.length === 7) {
        scheduleOnIOS({
          action: 'schedule',
          id,
          repeatMode: 'daily',
          hour, minute,
          interval: 1,
          startDate: startDate || null,
          endDate: endDate || null,
          title,
          subtitle,
          link
        })
        return
      }
      scheduleOnIOS({
        action: 'schedule',
        id,
        repeatMode: 'weekly',
        hour, minute,
        weekdays: days,
        intervalWeeks: iw,
        startDate: startDate || null,
        endDate: endDate || null,
        title,
        subtitle,
        link
      });
    },

    scheduleMonthly({ id, title, subtitle, day, hour, minute, startDate, endDate, link }){
      const sid = `${id}-d${pad2(day)}`;
      scheduleOnIOS({
        action: 'schedule',
        id: sid,
        repeatMode: 'monthly',
        day: Number(day),
        hour, minute,
        startDate: startDate || null,
        endDate: endDate || null,
        title,
        subtitle,
        link
      });
    },

    buildFromForm(form){
      const hm=parseAlarmTime(form.alarmTime)
      if(!hm) return null

      const isDaily = form.repeatType==='daily'
      const dailyEvery = isDaily
        ? (Number.isInteger(+form.repeatEveryDays) ? +form.repeatEveryDays
          : (Number.isInteger(+form.repeatDaily) ? +form.repeatDaily
          : (Number.isInteger(+form.daily) ? +form.daily : null)))
        : null

      const isTodayOnly = isDaily && (
        (dailyEvery===0) ||
        (!!form.startDate && !!form.endDate && sameYMD(form.startDate, form.endDate)) ||
        (form.rule && form.rule.freq==='once')
      )

      const iosWeekdays = toIOSWeekdayNums(form.repeatWeekDays||[])
      const monthDays = Array.isArray(form.repeatMonthDays)&&form.repeatMonthDays.length
        ? form.repeatMonthDays.map(Number)
        : [asLocalDate(form.startDate||new Date()).getDate()]

      const timeStr = `${pad2(hm.hour)}:${pad2(hm.minute)}`
      let subtitle=''
      if(isDaily){
        const n = isTodayOnly ? 0 : (dailyEvery ?? 1)
        subtitle = subtitleDaily(timeStr, n)
      }else if(form.repeatType==='weekly'){
        subtitle = subtitleWeekly(timeStr, iosWeekdays)
      }else if(form.repeatType==='monthly'){
        subtitle = subtitleMonthly(timeStr, monthDays)
      }else{
        const d=asLocalDate(form.startDate||new Date())
        subtitle = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${timeStr}`
      }

      return {
        hm,
        timeStr,
        isDaily,
        isTodayOnly,
        dailyEvery: isTodayOnly ? 0 : (isDaily ? (dailyEvery ?? 1) : null),
        iosWeekdays,
        monthDays
      }
    },

    scheduleFromForm(form, meta){
      if(this.permission==='denied') return { ok:false, reason:'permission_denied' }

      const built=this.buildFromForm(form)
      if(!built) return { ok:true, scheduled:false }

      const { hm, isDaily, isTodayOnly, dailyEvery, iosWeekdays, monthDays }=built
      const routineId=meta.routineId
      const baseId=`rt_${routineId}`
      const title=(meta.title||'').slice(0,20)||'알람'
      const link=`heyruffy://main?r=${encodeURIComponent(routineId)}`
      const startDate = form.startDate || null
      const endDate   = form.endDate   || null

      if (HARD_PURGE_FIRST) this.cancelSeries(baseId)

      if (isDaily && (built.isTodayOnly || built.dailyEvery === 0)) {
        const context = (meta && meta.context) || 'user'
        if (context === 'rehydrate') {
          return { ok:true, scheduled:false, reason:'skip_rehydrate_today_only' }
        }
        const y = new Date()
        const ymd = `${y.getFullYear()}${String(y.getMonth()+1).padStart(2,'0')}${String(y.getDate()).padStart(2,'0')}`
        const onceKey = `once.${baseId}.${ymd}`
        if (localStorage.getItem(onceKey) === '1') {
          return { ok:true, scheduled:false, reason:'already_scheduled_today' }
        }
        const ts = nextTimestampForOnce(hm.hour, hm.minute, asLocalDate(startDate || new Date()))
        this.scheduleOnce({
          id: baseId,
          title,
          subtitle: subtitleDaily(`${pad2(hm.hour)}:${pad2(hm.minute)}`, 0),
          timestamp: ts,
          link
        })
        localStorage.setItem(onceKey, '1')
        return { ok:true, scheduled:true, type:'once', ts }
      }

      const hasRange = !!startDate || !!endDate

      if(isDaily && !built.isTodayOnly){
        if (hasRange){
          const step = Math.max(1, Number(dailyEvery||1))
          const epochs = buildDailyEpochsBetween(startDate, endDate || startDate, hm.hour, hm.minute, step)
          if (epochs.length){
            setScheduleForRoutine({ routineId, mode:'daily', title, subtitle: subtitleDaily(`${pad2(hm.hour)}:${pad2(hm.minute)}`, step), fireTimesEpoch: epochs, link })
            return { ok:true, scheduled:true, type:'daily', count:epochs.length }
          }
          return { ok:true, scheduled:false, type:'daily', count:0 }
        }
        const interval = Math.max(1, Number(dailyEvery||1))
        this.scheduleDaily({
          id: baseId, title,
          subtitle: subtitleDaily(`${pad2(hm.hour)}:${pad2(hm.minute)}`, interval),
          hour: hm.hour, minute: hm.minute,
          interval, startDate, endDate, link
        })
        return { ok:true, scheduled:true, type:'daily', interval }
      }

      if(form.repeatType==='weekly'){
        if(!iosWeekdays.length) return { ok:true, scheduled:false }
        if (hasRange){
          const epochs = buildWeeklyEpochsBetween(startDate, endDate || startDate, iosWeekdays, hm.hour, hm.minute)
          if (epochs.length){
            setScheduleForRoutine({ routineId, mode:'weekly', title, subtitle: subtitleWeekly(`${pad2(hm.hour)}:${pad2(hm.minute)}`, iosWeekdays), fireTimesEpoch: epochs, link })
            return { ok:true, scheduled:true, type:'weekly', count:epochs.length }
          }
          return { ok:true, scheduled:false, type:'weekly', count:0 }
        }
        const intervalWeeks = Math.max(1, parseInt(String(form.repeatWeeks).match(/(\d+)/)?.[1] || '1', 10))
        if (intervalWeeks === 1 && iosWeekdays.length === 7){
          this.scheduleDaily({
            id: baseId, title,
            subtitle: subtitleDaily(`${pad2(hm.hour)}:${pad2(hm.minute)}`, 1),
            hour: hm.hour, minute: hm.minute,
            interval: 1, startDate, endDate, link
          })
          return { ok:true, scheduled:true, type:'daily', interval:1 }
        }
        this.scheduleWeekly({
          id: baseId, title,
          subtitle: subtitleWeekly(`${pad2(hm.hour)}:${pad2(hm.minute)}`, iosWeekdays),
          hour: hm.hour, minute: hm.minute,
          weekdays: iosWeekdays,
          intervalWeeks,
          startDate, endDate,
          link
        })
        return { ok:true, scheduled:true, type:'weekly', weekdays: iosWeekdays }
      }

      if(form.repeatType==='monthly'){
        if (hasRange){
          const epochs = buildMonthlyEpochsBetween(startDate, endDate || startDate, monthDays, hm.hour, hm.minute)
          if (epochs.length){
            setScheduleForRoutine({ routineId, mode:'monthly', title, subtitle: subtitleMonthly(`${pad2(hm.hour)}:${pad2(hm.minute)}`, monthDays), fireTimesEpoch: epochs, link })
            return { ok:true, scheduled:true, type:'monthly', count:epochs.length }
          }
          return { ok:true, scheduled:false, type:'monthly', count:0 }
        }
        const sub = subtitleMonthly(`${pad2(hm.hour)}:${pad2(hm.minute)}`, monthDays)
        for(const d of monthDays){
          const day = Math.max(1, Math.min(31, Number(d)||1))
          this.scheduleMonthly({
            id: baseId, title, subtitle: sub,
            day, hour: hm.hour, minute: hm.minute,
            startDate, endDate, link
          })
        }
        return { ok:true, scheduled:true, type:'monthly', days: monthDays }
      }

      const ts=nextTimestampForOnce(hm.hour, hm.minute, asLocalDate(startDate||new Date()))
      this.scheduleOnce({ id: baseId, title, subtitle: `${pad2(hm.hour)}:${pad2(hm.minute)}`, timestamp: ts, link })
      return { ok:true, scheduled:true, type:'once', ts }
    },

    resetDedup(){ scheduledKeys = new Set() },

    rehydrateFromRoutines(routines){
      if(!Array.isArray(routines) || routines.length===0) return { ok:true, count:0 }
      let count = 0
      for(const r of routines){
        const form = r?.form && typeof r.form === 'object' ? r.form : r
        const routineId = r?.routineId || r?.id
        const title = r?.title || r?.name || r?.text || '알람'
        if(!routineId) continue
        const res = this.scheduleFromForm(form, { routineId, title, context: 'rehydrate' })
        if(res?.scheduled) count++
      }
      return { ok:true, count }
    }
  }
})
