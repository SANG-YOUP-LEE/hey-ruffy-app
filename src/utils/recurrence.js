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
  // 1) start/end
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
  if (start && end && end < start) end = null;

  const tz = doc.tz ?? "Asia/Seoul";
  const alarmTime = doc.alarmTime ?? parseAlarm(doc.ampm, doc.hour, doc.minute);

  // 2) 반복 규칙 정규화
  // - 일간 탭에서 '매일'이면 daily
  // - 일간 탭에서 요일(월/화/…)을 골랐다면 weekly(byWeekday)로 변환
  // - 주간 탭은 weekly + interval(N주마다)
  // - 월간 탭은 monthly + byMonthDay
  const dailyDays = Array.isArray(doc.repeatDays) ? doc.repeatDays.map(String) : [];
  const selectedEveryday = dailyDays.some(s => s.includes("매")); // '매일' 포함 여부

  let freq = "daily";
  let interval = 1;
  let byWeekday = undefined;
  let byMonthDay = undefined;

  if (doc.repeatType === "weekly") {
    freq = "weekly";
    const m = String(doc.repeatWeeks ?? "").match(/(\d+)/);
    interval = m ? Number(m[1]) : 1;
    if (Array.isArray(doc.repeatWeekDays) && doc.repeatWeekDays.length) {
      byWeekday = doc.repeatWeekDays
        .map(s => KOR_TO_ICS[String(s).replace(/['"]/g,"")])
        .filter(Boolean);
    }
  } else if (doc.repeatType === "monthly") {
    freq = "monthly";
    interval = 1;
    if (Array.isArray(doc.repeatMonthDays) && doc.repeatMonthDays.length) {
      byMonthDay = doc.repeatMonthDays
        .map(n => Number(n))
        .filter(n => Number.isInteger(n) && n >= 1 && n <= 31);
    }
  } else {
    // daily 탭
    if (selectedEveryday || dailyDays.length === 0) {
      freq = "daily";
      interval = 1;
    } else {
      // '월', '화' … 선택 → 주간 규칙으로 변환
      freq = "weekly";
      interval = 1;
      byWeekday = dailyDays
        .map(s => KOR_TO_ICS[String(s).replace(/['"]/g,"")])
        .filter(Boolean);
    }
  }

  // anchor
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

// 로컬 날짜 객체
function dateFromISO(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isoKey(date) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`;
}

function diffDays(aISO, bISO) {
  const A = dateFromISO(aISO), B = dateFromISO(bISO);
  return Math.floor((B - A) / 86400000);
}

function diffMonths(aISO, bISO) {
  const [ay, am] = aISO.split("-").map(Number);
  const [by, bm] = bISO.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

function weekdayISO(iso) {
  const d = dateFromISO(iso).getDay(); // 0:Sun
  return ICS_LIST[d];
}

// start~end 범위 체크
export function isActive(dateISO, startISO, endISO) {
  if (!startISO) return true;
  if (diffDays(startISO, dateISO) < 0) return false;        // before start
  if (endISO && diffDays(dateISO, endISO) < 0) return false; // after end
  return true;
}

// 규칙 매칭 여부
export function isDue(dateISO, rule, anchorISO) {
  if (!rule || !anchorISO) return false;
  const interval = rule.interval ?? 1;

  if (rule.freq === "daily") {
    const d = diffDays(anchorISO, dateISO);
    return d >= 0 && d % interval === 0;
  }

  if (rule.freq === "weekly") {
    if (!Array.isArray(rule.byWeekday) || rule.byWeekday.length === 0) return false; // ✅ 요일 없으면 매칭 금지
    const dow = weekdayISO(dateISO);
    if (!rule.byWeekday.includes(dow)) return false;
    const weeks = Math.floor(diffDays(anchorISO, dateISO) / 7);
    return weeks >= 0 && weeks % interval === 0;
  }

  if (rule.freq === "monthly") {
    if (!Array.isArray(rule.byMonthDay) || rule.byMonthDay.length === 0) return false; // ✅ 날짜 없으면 매칭 금지
    const day = Number(dateISO.slice(8,10));
    if (!rule.byMonthDay.includes(day)) return false;
    const months = diffMonths(anchorISO, dateISO);
    return months >= 0 && months % interval === 0;
  }

  return false;
}

// 다음 발생일
export function nextOccurrence(rule, fromISO, anchorISO, untilISO=null) {
  let cursor = dateFromISO(fromISO);
  for (let i = 0; i < 730; i++) {
    const iso = isoKey(cursor);
    if (isDue(iso, rule, anchorISO)) return iso;
    cursor.setDate(cursor.getDate() + 1);
    if (untilISO && isoKey(cursor) > untilISO) break;
  }
  return null;
}
