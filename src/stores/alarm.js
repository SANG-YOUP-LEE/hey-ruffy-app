// File: src/stores/alarm.js
import { defineStore } from 'pinia'

// ▷ 임박 발사 때 기존 예약을 지우지 않으려면 false 유지(권장)
const HARD_PURGE_FIRST = false

// iOS 브릿지 전송 (이 파일 내부 버전만 사용!)
//  ↳ 절대 `import { postIOS } from '@/utils/iosNotify'` 하지 말 것 (중복 선언 에러 방지)
function postIOS(payload){
  try {
    console.log('[postIOS]', JSON.stringify(payload))
    window.webkit?.messageHandlers?.notify?.postMessage(payload)
  } catch (_) {}
}

const pad2 = n => String(n).padStart(2,'0')

// --- 시간 파서 ---
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

// --- 요일 유틸 ---
const WD_LABEL=['일','월','화','수','목','금','토']
const MAP_KOR = { '일':1,'월':2,'화':3,'수':4,'목':5,'금':6,'토':7 }
const MAP_ENG = { su:1,sun:1, mo:2,mon:2, tu:3,tue:3, we:4,wed:4, th:5,thu:5, fr:6,fri:6, sa:7,sat:7 }
const MAP_ICS = { SU:1, MO:2, TU:3, WE:4, TH:5, FR:6, SA:7 }

// form.repeatWeekDays → iOS(일=1..토=7)로 정규화
function toIOSWeekdayNums(arr){
  if(!Array.isArray(arr)) return []
  const mapMonFirstToApple = {1:2,2:3,3:4,4:5,5:6,6:7,7:1}
  const normOne = (x) => {
    if (typeof x === 'number') {
      if (x>=1 && x<=7) return mapMonFirstToApple[x] || x  // (월=1) 가정치 → Apple(일=1)
      if (x>=0 && x<=6) return x===0 ? 1 : x+1             // 0(Sun)..6(Sat) → 1..7
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
  const now=new Date()
  const base=baseDate instanceof Date?new Date(baseDate):new Date()
  base.setHours(hour,minute,0,0)
  if(base.getTime()<=now.getTime()){
    base.setDate(base.getDate()+1)
    base.setHours(hour,minute,0,0)
  }
  return base.getTime()
}

// --- 서브타이틀 생성 ---
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

    cancel(id){ postIOS({ action:'cancel', id }); scheduledKeys.delete(id) },
    cancelSeries(baseId){
      // 베이스만 취소해도 네이티브에서 해당 prefix 전체 purge
      this.cancel(baseId)
      // 아래는 호환 남김(실제론 불필요)
      for(let d=1; d<=31; d++) this.cancel(`${baseId}-m${pad2(d)}`)
      for(let w=1; w<=7; w++) this.cancel(`${baseId}-w${w}`)
    },

    // === 단일 'schedule' 프로토콜 형태로 전송 ===
    scheduleOnce({ id, title, subtitle, timestamp, link, hour, minute, baseDate }){
      // timestamp 보정: 유효하지 않으면 hour/minute로 재계산(있을 때만)
      let ts = Number(timestamp);
      if (!Number.isFinite(ts) || ts <= 0) {
        if (Number.isFinite(hour) && Number.isFinite(minute)) {
          ts = nextTimestampForOnce(Number(hour), Number(minute), asLocalDate(baseDate || new Date()));
        } else {
          console.warn('[alarm] scheduleOnce: invalid timestamp & no hour/minute fallback', timestamp);
          return;
        }
      }

      postIOS({
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
      postIOS({
        action: 'schedule',
        id,
        repeatMode: 'daily',
        hour, minute,
        interval: Number(interval) || 1,
        startDate: startDate || null,
        endDate: endDate || null,   // 전달만(네이티브 확장 대비)
        title,
        subtitle,
        link
      });
    },

    scheduleWeekly({ id, title, subtitle, hour, minute, weekdays, intervalWeeks, startDate, endDate, link }){
      postIOS({
        action: 'schedule',
        id,
        repeatMode: 'weekly',
        hour, minute,
        weekdays: Array.isArray(weekdays) ? weekdays : [],
        intervalWeeks: Number(intervalWeeks) || 1,
        startDate: startDate || null,  // 전달만(네이티브 확장 대비)
        endDate: endDate || null,      // 전달만(네이티브 확장 대비)
        title,
        subtitle,
        link
      });
    },

    scheduleMonthly({ id, title, subtitle, day, hour, minute, startDate, endDate, link }){
      // 여러 날짜를 같은 baseId로 보낼 때 구분용 sid 유지
      const sid = `${id}-d${pad2(day)}`;
      postIOS({
        action: 'schedule',
        id: sid,
        repeatMode: 'monthly',
        day: Number(day),
        hour, minute,
        startDate: startDate || null,  // 전달만(네이티브 확장 대비)
        endDate: endDate || null,      // 전달만(네이티브 확장 대비)
        title,
        subtitle,
        link
      });
    },

    // ---------- 폼 -> 스케줄 준비 ----------
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

    // ---------- 실제 스케줄 ----------
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

      if (HARD_PURGE_FIRST) this.cancelSeries(baseId) // 기본값 false

      if(isDaily){
        if(isTodayOnly){
          const ts=nextTimestampForOnce(hm.hour, hm.minute, asLocalDate(startDate||new Date()))
          this.scheduleOnce({
            id: baseId,
            title,
            subtitle: subtitleDaily(`${pad2(hm.hour)}:${pad2(hm.minute)}`, 0),
            timestamp: ts,
            link
          })
          return { ok:true, scheduled:true, type:'once', ts }
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
        const intervalWeeks = Math.max(1, parseInt(String(form.repeatWeeks).match(/(\d+)/)?.[1] || '1', 10))
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

    // ---------- ★ 추가 1: dedup 키 초기화 ----------
    resetDedup(){
      scheduledKeys = new Set()
    },

    // ---------- ★ 추가 2: 파베 루틴 재하이드레이션 ----------
    // routines: Firestore에서 읽은 루틴 배열
    //  - 각 원소 r 에 대해:
    //      r.id 또는 r.routineId (문서 ID)
    //      r.title / r.name / r.text (표시 제목)
    //      나머지 폼 필드(alarmTime, repeatType, startDate, endDate, repeatWeekDays, repeatWeeks, repeatMonthDays, repeatEveryDays 등)
    //  - 폼 구조가 그대로일 경우 r 자체를 form으로 사용. 일부 서비스는 r.form 안에 있을 수 있어 자동 분기.
    rehydrateFromRoutines(routines){
      if(!Array.isArray(routines) || routines.length===0) return { ok:true, count:0 }
      let count = 0
      for(const r of routines){
        const form = r?.form && typeof r.form === 'object' ? r.form : r
        const routineId = r?.routineId || r?.id
        const title = r?.title || r?.name || r?.text || '알람'
        if(!routineId) continue
        const res = this.scheduleFromForm(form, { routineId, title })
        if(res?.scheduled) count++
      }
      return { ok:true, count }
    }
  }
})
