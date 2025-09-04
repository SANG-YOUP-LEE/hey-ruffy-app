// src/stores/alarm.js
import { defineStore } from 'pinia'

function postIOS(payload){ try{ window.webkit?.messageHandlers?.notify?.postMessage(payload) }catch(_){} }
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
function toIOSWeekdayNums(arr){
  if(!Array.isArray(arr)) return []
  const mapMonFirstToApple = {1:2,2:3,3:4,4:5,5:6,6:7,7:1}
  return arr.map(n=>mapMonFirstToApple[Number(n)]??null).filter(n=>n>=1&&n<=7)
}

function sameYMD(a,b){
  if(!a||!b) return false
  const A=asLocalDate(a), B=asLocalDate(b)
  return A.getFullYear()===B.getFullYear() && A.getMonth()===B.getMonth() && A.getDate()===B.getDate()
}

function nextTimestampForOnce(hour, minute, baseDate){
  const now=new Date()
  const base=baseDate instanceof Date?new Date(baseDate):new Date()
  base.setHours(hour,minute,0,0)
  if(base.getTime()<=now.getTime()){
    base.setDate(base.getDate()+1)
    base.setHours(hour,minute,0,0)
  }
  return base.getTime()
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

export const useAlarmStore = defineStore('alarm', {
  state: () => ({
    permission: 'unknown',
  }),
  actions: {
    setPermission(p){ this.permission=p },

    cancel(id){
      postIOS({ action:'cancel', id })
      scheduledKeys.delete(id)
    },

    // ✅ 여기만 수정: 로컬 캐시에서 baseId로 시작하는 키들을 싹 정리하고, iOS에 한 번만 cancel 보냄
    cancelSeries(baseId){
      // 1) 로컬 중복 방지 캐시 비우기
      for (const k of Array.from(scheduledKeys)) {
        if (k === baseId || String(k).startsWith(`${baseId}-`)) {
          scheduledKeys.delete(k)
        }
      }
      // 2) iOS 쪽은 baseId 하나만 넘기면 해당 베이스의 모든 예약을 purge
      this.cancel(baseId)
    },

    // === unified 'schedule' 프로토콜 ===
    scheduleOnce({ id, title, subtitle, timestamp, link }){
      if(scheduledKeys.has(id)) return
      scheduledKeys.add(id)
      postIOS({ action:'schedule', id, repeatMode:'once', timestamp, title, subtitle, link })
    },

    scheduleDaily({ id, title, subtitle, hour, minute, interval, startDate, link }){
      if(scheduledKeys.has(id)) return
      scheduledKeys.add(id)
      postIOS({
        action:'schedule',
        id,
        repeatMode:'daily',
        hour, minute,
        interval:Number(interval)||1,
        startDate:startDate||null,
        title, subtitle, link
      })
    },

    scheduleWeekly({ id, title, subtitle, hour, minute, weekdays, intervalWeeks, link }){
      if(scheduledKeys.has(id)) return
      scheduledKeys.add(id)
      postIOS({
        action:'schedule',
        id,
        repeatMode:'weekly',
        hour, minute,
        weekdays:Array.isArray(weekdays)?weekdays:[],
        intervalWeeks:Number(intervalWeeks)||1,
        title, subtitle, link
      })
    },

    scheduleMonthly({ id, title, subtitle, day, hour, minute, link }){
      const sid = `${id}-d${pad2(day)}`
      if(scheduledKeys.has(sid)) return
      scheduledKeys.add(sid)
      postIOS({
        action:'schedule',
        id:sid,
        repeatMode:'monthly',
        day:Number(day),
        hour, minute,
        title, subtitle, link
      })
    },

    // ==== Form → 스케줄 ====
    buildFromForm(form){
      const hm=parseAlarmTime(form.alarmTime)
      if(!hm) return null

      const isDaily = form.repeatType==='daily'
      const dailyEvery = isDaily
        ? (Number.isInteger(+form.repeatEveryDays) ? +form.repeatEveryDays
          : (Number.isInteger(+form.repeatDaily) ? +form.repeatDaily : null))
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

      this.cancelSeries(baseId)

      if(isDaily){
        if(isTodayOnly){
          const ts=nextTimestampForOnce(hm.hour, hm.minute, asLocalDate(form.startDate||new Date()))
          this.scheduleOnce({ id: baseId, title, subtitle: subtitleDaily(`${pad2(hm.hour)}:${pad2(hm.minute)}`, 0), timestamp: ts, link })
          return { ok:true, scheduled:true, type:'once', ts }
        }
        const interval = Math.max(1, Number(dailyEvery||1))
        this.scheduleDaily({
          id: baseId, title,
          subtitle: subtitleDaily(`${pad2(hm.hour)}:${pad2(hm.minute)}`, interval),
          hour: hm.hour, minute: hm.minute,
          interval, startDate: form.startDate || null, link
        })
        return { ok:true, scheduled:true, type:'daily', interval }
      }

      if(form.repeatType==='weekly'){
        if(!iosWeekdays.length) return { ok:true, scheduled:false }
        const intervalWeeks = Math.max(1, parseInt(String(form.repeatWeeks).match(/(\d+)/)?.[1] || '1', 10))
        this.scheduleWeekly({
          id: baseId, title,
          subtitle: subtitleWeekly(`${pad2(hm.hour)}:${pad2(hm.minute)}`, iosWeekdays),
          hour: hm.hour, minute: hm.minute,
          weekdays: iosWeekdays,
          intervalWeeks,
          link
        })
        return { ok:true, scheduled:true, type:'weekly', weekdays: iosWeekdays }
      }

      if(form.repeatType==='monthly'){
        const sub = subtitleMonthly(`${pad2(hm.hour)}:${pad2(hm.minute)}`, monthDays)
        for(const d of monthDays){
          const day = Math.max(1, Math.min(31, Number(d)||1))
          this.scheduleMonthly({
            id: baseId, title, subtitle: sub,
            day, hour: hm.hour, minute: hm.minute, link
          })
        }
        return { ok:true, scheduled:true, type:'monthly', days: monthDays }
      }

      const ts=nextTimestampForOnce(hm.hour, hm.minute, asLocalDate(form.startDate||new Date()))
      this.scheduleOnce({ id: baseId, title, subtitle: `${pad2(hm.hour)}:${pad2(hm.minute)}`, timestamp: ts, link })
      return { ok:true, scheduled:true, type:'once', ts }
    }
  }
})
