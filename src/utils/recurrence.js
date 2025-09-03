// src/utils/recurrence.js

export const KOR_TO_ICS = { 월: "MO", 화: "TU", 수: "WE", 목: "TH", 금: "FR", 토: "SA", 일: "SU" }
const ICS_LIST = ["SU","MO","TU","WE","TH","FR","SA"]

export function toISODate(obj) {
  if (!obj) return null
  const y = Number(obj.year), m = Number(obj.month), d = Number(obj.day)
  const p = n => String(n).padStart(2,"0")
  return `${y}-${p(m)}-${p(d)}`
}

export function parseAlarm(ampm, hour, minute) {
  if (hour == null || minute == null) return null
  let h = Number(hour)
  const mm = String(minute).padStart(2,"0")
  if (String(ampm).toUpperCase()==="PM" && h<12) h+=12
  if (String(ampm).toUpperCase()==="AM" && h===12) h=0
  return `${String(h).padStart(2,"0")}:${mm}`
}

function isISODate(s){ return typeof s==="string" && /^\d{4}-\d{2}-\d{2}$/.test(s) }
function cleanISO(s){ if(!isISODate(s)) return null; if(s==="0000-00-00"||s==="0-0-0"||s.includes("NaN")) return null; return s }
function fromTimestampOrNull(ts){ try{ if(ts&&typeof ts.toDate==="function"){ const d=ts.toDate(); const p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}` } }catch{} return null }
function numToICS(n){ const v=Number(n); if(Number.isNaN(v)) return null; if(v>=0&&v<=6) return ICS_LIST[v]; if(v>=1&&v<=7){ const monFirst=["MO","TU","WE","TH","FR","SA","SU"]; return monFirst[v-1] } return null }

export function normalize(doc){
  const startCand=[ cleanISO(doc.start), toISODate(doc.startDate), fromTimestampOrNull(doc.createdAt) ].filter(Boolean)
  const endCand=[ cleanISO(doc.end), toISODate(doc.endDate) ].filter(Boolean)
  const start=startCand[0]||null
  let end=endCand[0]||null
  if(start&&end&&end<start) end=null

  const tz=doc.tz??"Asia/Seoul"
  const alarmTime=doc.alarmTime??parseAlarm(doc.ampm,doc.hour,doc.minute)

  let freq="daily"
  let interval=1
  let byWeekday, byMonthDay

  if (doc.repeatType === "daily") {
    const n = Number(doc.repeatEveryDays)
    if (Number.isInteger(n)) {
      if (n === 0 || (start && end && start === end)) { freq = "once"; interval = 1 }
      else { freq = "daily"; interval = Math.max(1, Math.min(6, n)) }
    } else {
      freq = "daily"; interval = 1
    }
  } else if (doc.repeatType === "weekly") {
    freq = "weekly"
    const m = String(doc.repeatWeeks ?? "").match(/(\d+)/)
    interval = m ? Number(m[1]) : 1
    if (Array.isArray(doc.repeatWeekDays) && doc.repeatWeekDays.length) {
      byWeekday = doc.repeatWeekDays.map(v=>{
        if (typeof v === "number") return numToICS(v)
        const t = String(v).replace(/['"]/g,"")
        return KOR_TO_ICS[t] || numToICS(t)
      }).filter(Boolean)
    }
  } else if (doc.repeatType === "monthly") {
    freq = "monthly"
    interval = 1
    if (Array.isArray(doc.repeatMonthDays) && doc.repeatMonthDays.length) {
      byMonthDay = doc.repeatMonthDays.map(n=>Number(n)).filter(n=>Number.isInteger(n)&&n>=1&&n<=31)
    }
  }

  const fallbackToday=(()=>{ const d=new Date(); const p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}` })()
  const createdISO=fromTimestampOrNull(doc.createdAt)
  const anchor=cleanISO(doc?.rule?.anchor)||start||createdISO||fallbackToday

  const rule={ freq, interval, anchor }
  if (Array.isArray(byWeekday) && byWeekday.length) rule.byWeekday=byWeekday
  if (Array.isArray(byMonthDay) && byMonthDay.length) rule.byMonthDay=byMonthDay

  return { ...doc, tz, start, end, alarmTime, rule }
}

function dateFromISO(iso){ const [y,m,d]=iso.split("-").map(Number); return new Date(y,m-1,d) }
function isoKey(date){ const p=n=>String(n).padStart(2,"0"); return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}` }
function diffDays(aISO,bISO){ const A=dateFromISO(aISO), B=dateFromISO(bISO); return Math.floor((B-A)/86400000) }
function diffMonths(aISO,bISO){ const [ay,am]=aISO.split("-").map(Number); const [by,bm]=bISO.split("-").map(Number); return (by-ay)*12+(bm-am) }
function weekdayISO(iso){ const d=dateFromISO(iso).getDay(); return ICS_LIST[d] }

export function isActive(dateISO,startISO,endISO){
  if (!startISO) return true
  if (diffDays(startISO, dateISO) < 0) return false
  if (endISO && diffDays(dateISO, endISO) < 0) return false
  return true
}

export function isDue(dateISO,rule,anchorISO){
  if(!rule||!anchorISO) return false
  const interval=rule.interval??1
  if(rule.freq==="once"){ return dateISO===anchorISO }
  if(rule.freq==="daily"){ const d=diffDays(anchorISO,dateISO); return d>=0&&d%interval===0 }
  if(rule.freq==="weekly"){
    if(!Array.isArray(rule.byWeekday)||rule.byWeekday.length===0) return false
    const dow=weekdayISO(dateISO); if(!rule.byWeekday.includes(dow)) return false
    const weeks=Math.floor(diffDays(anchorISO,dateISO)/7); return weeks>=0&&weeks%interval===0
  }
  if(rule.freq==="monthly"){
    if(!Array.isArray(rule.byMonthDay)||rule.byMonthDay.length===0) return false
    const day=Number(dateISO.slice(8,10)); if(!rule.byMonthDay.includes(day)) return false
    const months=diffMonths(anchorISO,dateISO); return months>=0&&months%interval===0
  }
  return false
}

export function nextOccurrence(rule,fromISO,anchorISO,untilISO=null){
  let cursor=dateFromISO(fromISO)
  for(let i=0;i<730;i++){
    const iso=isoKey(cursor)
    if(isDue(iso,rule,anchorISO)) return iso
    cursor.setDate(cursor.getDate()+1)
    if(untilISO && isoKey(cursor)>untilISO) break
  }
  return null
}
