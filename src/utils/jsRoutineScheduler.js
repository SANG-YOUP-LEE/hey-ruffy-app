// src/utils/jsRoutineScheduler.js
// 공통 유틸 + 네이티브 브릿지 (iOS/Android 공용)

// ── 시간 유틸 ──────────────────────────────────────────────
const toEpoch = (d) => Math.floor(d.getTime() / 1000);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const clampInt = (n, lo, hi) => Math.max(lo, Math.min(hi, parseInt(n, 10) || 0));

// 요일: 0=일..6=토 로 정규화
const normW = (n) => ((n % 7) + 7) % 7;

// ── 발생 생성기(시작/종료 범위 보장, 초=0 보장, 오늘 포함 규칙: >= now) ──
export function buildOnceEpoch(baseDate, hour, minute) {
  const now = Date.now();
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setHours(hour, minute, 0, 0);               // 초=0
  let ms = d.getTime();
  if (ms - now < 3000) ms = now + 3000;         // 최소 리드타임 3초
  return Math.floor(ms / 1000);
}

export function buildDailyEpochsBetween(startDate, endDate, hour, minute, everyDays = 1) {
  const out = [];
  const now = new Date();
  const start = startOfDay(new Date(startDate || now));
  const end   = startOfDay(new Date(endDate   || now));
  const step  = Math.max(1, parseInt(everyDays, 10) || 1);

  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + step)) {
    const fire = new Date(d);
    fire.setHours(hour, minute, 0, 0);          // 초=0
    if (fire.getTime() >= now.getTime()) out.push(toEpoch(fire));
  }
  return out;
}

export function buildWeeklyEpochsBetween(startDate, endDate, weekdays0to6, hour, minute) {
  const out = [];
  if (!Array.isArray(weekdays0to6) || weekdays0to6.length === 0) return out;
  const set = new Set(weekdays0to6.map(normW));

  const now   = new Date();
  const start = startOfDay(new Date(startDate || now));
  const end   = startOfDay(new Date(endDate   || now));

  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
    if (!set.has(d.getDay())) continue;
    const fire = new Date(d);
    fire.setHours(hour, minute, 0, 0);          // 초=0
    if (fire.getTime() >= now.getTime()) out.push(toEpoch(fire));
  }
  return out;
}

export function buildMonthlyEpochsBetween(startDate, endDate, monthDays, hour, minute) {
  const out = [];
  const now   = new Date();
  const start = startOfDay(new Date(startDate || now));
  const end   = startOfDay(new Date(endDate   || now));
  const mdSet = new Set((monthDays || []).map(n => clampInt(n, 1, 31)));

  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
    if (!mdSet.has(d.getDate())) continue;
    const fire = new Date(d);
    fire.setHours(hour, minute, 0, 0);          // 초=0
    if (fire.getTime() >= now.getTime()) out.push(toEpoch(fire));
  }
  return out;
}

// ── 네이티브 브릿지 (공통 포맷: setScheduleForRoutine / clearScheduleForRoutine) ──
export function setScheduleForRoutine({ routineId, mode, title, body, fireTimesEpoch }) {
  const payload = { action:'setScheduleForRoutine', routineId, mode, title, body, fireTimesEpoch };
  // iOS (WKWebView)
  try { window.webkit?.messageHandlers?.notify?.postMessage(payload) } catch (_) {}
  // Android (ReactNativeWebView 등)
  try { window.ReactNativeWebView?.postMessage?.(JSON.stringify(payload)) } catch (_) {}
}

export function clearScheduleForRoutine(routineId) {
  const payload = { action:'clearScheduleForRoutine', routineId };
  try { window.webkit?.messageHandlers?.notify?.postMessage(payload) } catch (_) {}
  try { window.ReactNativeWebView?.postMessage?.(JSON.stringify(payload)) } catch (_) {}
}

// ── 유틸: 64개 제한 대비 배치 전송 ──
export function chunk(arr, n=60) {
  const out=[]; for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out;
}
