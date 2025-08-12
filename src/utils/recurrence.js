// src/utils/recurrence.js

// 한글 요일 → ICS
export const KOR_TO_ICS = { 월: "MO", 화: "TU", 수: "WE", 목: "TH", 금: "FR", 토: "SA", 일: "SU" };
const ICS_LIST = ["SU","MO","TU","WE","TH","FR","SA"];

// 기본 포맷: "YYYY-MM-DD"
export function toISODate(obj) {
  if (!obj) return null;
  const y = Number(obj.year), m = Number(obj.month), d = Number(obj.day);
  const p = n => String(n).padStart(2, "0");
  return `${y}-${p(m)}-${p(d)}`;
}

export function parseAlarm(ampm, hour, minute) {
  if (hour == null || minute == null) return null;
  let h = Number(hour);
  const mm = String(minute).padStart(2, "0");
  if (String(ampm).toUpperCase() === "PM" && h < 12) h += 12;
  if (String(ampm).toUpperCase() === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${mm}`; // "HH:mm"
}

// ✅ 추가 유틸
function isISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function cleanISO(s) {
  if (!isISODate(s)) return null;
  if (s === "0000-00-00" || s === "0-0-0" || s.includes("NaN")) return null;
  return s;
}
function fromTimestampOrNull(ts) {
  try {
    if (ts && typeof ts.toDate === "function") {
      const d = ts.toDate();
      const p = n => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    }
  } catch {}
  return null;
}

// ✅ 교체: normalize()
export function normalize(doc) {
  // 1) start/end 후보 모으기 (우선순위: 새필드 > 구필드 > createdAt)
  const startCand = [
    cleanISO(doc.start),
    toISODate(doc.startDate),
    fromTimestampOrNull(doc.createdAt),
  ].filter(Boolean);
  const endCand = [
    cleanISO(doc.end),
    toISODate(doc.endDate),
  ].filter(Boolean);

  const start = startCand[0] || null;
  let end = endCand[0] || null;

  // 종료가 시작보다 빠르면 무시
  if (start && end && end < start) end = null;

  const tz = doc.tz ?? "Asia/Seoul";
  const alarmTime = doc.alarmTime ?? parseAlarm(doc.ampm, doc.hour, doc.minute);

  // 2) 반복 규칙
  const freq = doc.repeatType === "monthly" ? "monthly"
             : doc.repeatType === "weekly" ? "weekly"
             : "daily";

  const interval = (() => {
    const s = String(doc.repeatWeeks ?? "").trim(); // "2주마다", "매주" 등
    const m = s.match(/(\d+)/);
    return m ? Number(m[1]) : 1;
  })();

  const byWeekday = Array.isArray(doc.repeatWeekDays) && doc.repeatWeekDays.length
    ? doc.repeatWeekDays.map(s => KOR_TO_ICS[String(s).replace(/['"]/g,"")]).filter(Boolean)
    : undefined;

  const byMonthDay = Array.isArray(doc.repeatMonthDays) && doc.repeatMonthDays.length
    ? doc.repeatMonthDays.map(n => Number(n)).filter(n => Number.isInteger(n) && n >= 1 && n <= 31)
    : undefined;

  // anchor는 반드시 유효한 ISO로 (없으면 start를 anchor로, start도 없으면 createdAt 또는 오늘)
  const fallbackToday = (() => {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  })();
  const createdISO = fromTimestampOrNull(doc.createdAt);
  const anchor = cleanISO(doc?.rule?.anchor) || start || createdISO || fallbackToday;

  const rule = { freq, interval, anchor };
  if (byWeekday) rule.byWeekday = byWeekday;
  if (byMonthDay) rule.byMonthDay = byMonthDay;

  return {
    ...doc,
    tz,
    start,
    end,
    alarmTime,
    rule,
  };
}


// 로컬 날짜 객체 (기기 TZ 사용)
// 한국에서 사용한다고 가정. 해외 사용 시 dayjs-tz 권장.
function dateFromISO(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d); // 00:00 local
}

function isoKey(date) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`;
}

function diffDays(aISO, bISO) { // b - a (days)
  const A = dateFromISO(aISO), B = dateFromISO(bISO);
  const ms = B - A;
  return Math.floor(ms / 86400000);
}

function diffMonths(aISO, bISO) { // b - a (months)
  const [ay, am] = aISO.split("-").map(Number);
  const [by, bm] = bISO.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

function weekdayISO(iso) { // "SU".."SA"
  const d = dateFromISO(iso).getDay(); // 0:Sun
  return ICS_LIST[d];
}

// 날짜가 start~end 사이인지(종료 미지정이면 무한)
export function isActive(dateISO, startISO, endISO) {
  if (!startISO) return true;
  if (diffDays(startISO, dateISO) < 0) return false;   // before start
  if (endISO && diffDays(dateISO, endISO) < 0) return false; // after end
  return true;
}

// 해당 날짜가 규칙에 해당하는지
export function isDue(dateISO, rule, anchorISO) {
  if (!rule || !anchorISO) return false;
  const interval = rule.interval ?? 1;

  if (rule.freq === "daily") {
    const d = diffDays(anchorISO, dateISO);
    return d >= 0 && d % interval === 0;
  }

  if (rule.freq === "weekly") {
    const dow = weekdayISO(dateISO);
    if (rule.byWeekday && !rule.byWeekday.includes(dow)) return false;
    const weeks = Math.floor(diffDays(anchorISO, dateISO) / 7);
    return weeks >= 0 && weeks % interval === 0;
  }

  if (rule.freq === "monthly") {
    const day = Number(dateISO.slice(8,10));
    if (rule.byMonthDay && !rule.byMonthDay.includes(day)) return false;
    const months = diffMonths(anchorISO, dateISO);
    return months >= 0 && months % interval === 0;
  }

  return false;
}

// 선택: 다음 발생일 찾기(간단 스캔)
export function nextOccurrence(rule, fromISO, anchorISO, untilISO=null) {
  let cursor = dateFromISO(fromISO);
  for (let i = 0; i < 730; i++) { // 최대 2년 탐색
    const iso = isoKey(cursor);
    if (isDue(iso, rule, anchorISO)) return iso;
    cursor.setDate(cursor.getDate() + 1);
    if (untilISO && isoKey(cursor) > untilISO) break;
  }
  return null;
}

