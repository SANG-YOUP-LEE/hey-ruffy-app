// File: src/utils/iosNotify.js
// iOS 브릿지 전송을 단일 프로토콜(action: "schedule")로 정규화
// 기존 호출부는 그대로 두고, 여기서 모두 최신 포맷으로 변환 + 레거시 API 별칭까지 export.

const mh = () => window.webkit?.messageHandlers?.notify;

// 안전 전송 + 공통 로그
const safePost = (payload) => {
  try {
    console.log('[iosNotify][TX]', JSON.stringify(payload));
    mh()?.postMessage(payload);
  } catch (e) {
    console.warn('[iosNotify][ERR]', e);
  }
};
const log = (...args) => console.warn('⚡️ ', ...args);

// ───────────────────────────────────────────
// Normalizers
// ───────────────────────────────────────────

const isYMD = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const toInt = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.floor(n);
  }
  return undefined;
};

const KOR_DAY = { '일':1,'월':2,'화':3,'수':4,'목':5,'금':6,'토':7 };
const ENG_DAY = { su:1, sun:1, mo:2, mon:2, tu:3, tue:3, we:4, wed:4, th:5, thu:5, fr:6, fri:6, sa:7, sat:7 };
const ICS_DAY = { SU:1, MO:2, TU:3, WE:4, TH:5, FR:6, SA:7 };

function mapOneDayToken(d) {
  if (d == null) return undefined;
  if (typeof d === 'number') {
    if (d >= 1 && d <= 7) return d;
    if (d >= 0 && d <= 6) return d + 1; // 0=Sun 케이스 방어
    return undefined;
  }
  const s = String(d).trim();
  if (s === '') return undefined;
  // "일요일" → "일"
  const head = s.slice(0, 1);
  if (KOR_DAY[head]) return KOR_DAY[head];
  if (ENG_DAY[s.toLowerCase()]) return ENG_DAY[s.toLowerCase()];
  if (ICS_DAY[s.toUpperCase()]) return ICS_DAY[s.toUpperCase()];
  const n = toInt(s);
  if (n && n >= 1 && n <= 7) return n;
  return undefined;
}

function normalizeWeekdays(raw) {
  if (!raw) return undefined;
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw.map(mapOneDayToken).filter(Boolean);
  } else if (typeof raw === 'object') {
    // 예: { mon:true, tue:false } 또는 { '월':1, '수': true }
    arr = Object.entries(raw)
      .filter(([, v]) => !!v)
      .map(([k]) => mapOneDayToken(k))
      .filter(Boolean);
  } else {
    const one = mapOneDayToken(raw);
    if (one) arr = [one];
  }
  // 유효하지 않으면 undefined 반환 (네이티브에서 기본 1~7 처리)
  if (!arr.length) return undefined;
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

// legacy -> unified 'schedule' payload 로 변환
function normalizeSchedulePayload(msg = {}) {
  // 이미 새 포맷이면 그대로 통과 (단, 타입 보정만)
  if (msg && msg.action === 'schedule') {
    const out = { ...msg };
    if (out.hour != null) out.hour = toInt(out.hour);
    if (out.minute != null) out.minute = toInt(out.minute);
    if (out.interval != null) out.interval = Math.max(1, toInt(out.interval) ?? 1);
    if (out.intervalWeeks != null) out.intervalWeeks = Math.max(1, toInt(out.intervalWeeks) ?? 1);
    if (!out.weekdays) out.weekdays = normalizeWeekdays(out.repeatWeekDays || out.weekday);
    if (out.startDate && !isYMD(out.startDate)) delete out.startDate;
    if (out.endDate && !isYMD(out.endDate)) delete out.endDate;
    return out;
  }

  const out = { action: 'schedule' };

  // id (가능하면 문서 ID 사용 권장)
  out.id = msg.id || msg.baseId || 'inline';

  // 제목/서브타이틀
  out.title = msg.title || msg.name || '알람';
  out.subtitle = msg.subtitle || '';

  // 반복 모드
  let repeatMode = msg.repeatMode || msg.repeatType || 'once';
  if (!['once', 'daily', 'weekly', 'monthly', 'monthly-date', 'monthly-nth'].includes(repeatMode)) {
    repeatMode = 'once';
  }
  out.repeatMode = repeatMode;

  // 시간 정보 (숫자/문자 모두 허용)
  const h1 = toInt(msg.hour);
  const m1 = toInt(msg.minute);
  const h2 = toInt(msg?.alarm?.hour);
  const m2 = toInt(msg?.alarm?.minute);
  if (h1 != null) out.hour = h1;
  if (m1 != null) out.minute = m1;
  if (out.hour == null && h2 != null) out.hour = h2;
  if (out.minute == null && m2 != null) out.minute = m2;

  // 시작/종료일 (문자열 Y-M-D 만 통과; 네이티브가 필요 시 사용)
  if (isYMD(msg.startDate)) out.startDate = msg.startDate;
  if (isYMD(msg.endDate)) out.endDate = msg.endDate;

  // once 전용: timestamp(ms)
  const ts = toInt(msg.timestamp);
  if (repeatMode === 'once' && ts && ts > 0) out.timestamp = ts;

  // daily 전용
  if (repeatMode === 'daily') {
    const interval =
      toInt(msg.interval) ??
      toInt(msg.intervalDays) ??
      toInt(msg.repeatEveryDays) ?? 1;
    out.interval = Math.max(1, interval);
    if (isYMD(msg.startDate)) out.startDate = msg.startDate;
  }

  // weekly 전용
if (repeatMode === 'weekly') {
  const days =
    normalizeWeekdays(msg.weekdays) ||
    normalizeWeekdays(msg.repeatWeekDays) ||
    normalizeWeekdays(msg.weekday);

  const iw =
    toInt(msg.intervalWeeks) ??
    toInt(msg.weeksInterval) ??
    toInt(msg.everyWeeks) ??
    (toInt((String(msg.repeatWeeks || '').match(/(\d+)/) || [])[1])) ??
    1;

  // ★ 축약 로직: 모든 요일(7) + 1주 간격 → daily 변환
  if (iw === 1 && days && days.length === 7) {
    repeatMode = 'daily';
    out.repeatMode = 'daily';
    out.interval = 1;
    delete out.weekdays;
    delete out.intervalWeeks;
  } else {
    out.weekdays = days;
    out.intervalWeeks = Math.max(1, iw);
  }
}

  // monthly 전용
  if (repeatMode.startsWith('monthly')) {
    const d = toInt(msg.day) ?? toInt((String(msg.repeatMonthDays || '').match(/(\d+)/) || [])[1]);
    if (d != null) out.day = Math.max(1, Math.min(31, d));
  }

  // 딥링크 패스
  if (typeof msg.link === 'string') out.link = msg.link;

  return out;
}

// ───────────────────────────────────────────
// Public API
// ───────────────────────────────────────────

export function scheduleOnIOS(msg) {
  if (!mh()) { log('[iosNotify] scheduleOnIOS:NO_BRIDGE'); return; }
  const unified = normalizeSchedulePayload(msg);
  log('[iosNotify] scheduleOnIOS:REQ', unified);
  safePost(unified);
}

export function cancelOnIOS(idOrBase) {
  if (!mh()) { log('[iosNotify] cancelOnIOS:NO_BRIDGE'); return; }
  if (!idOrBase) return;
  const id = String(idOrBase);
  safePost({ action: 'cancel', id });
}

export function debugPingOnIOS(sec = 20, tag = 'rt_ping') {
  if (!mh()) { log('[iosNotify] debugPingOnIOS:NO_BRIDGE'); return; }
  safePost({ action: 'debugPing', baseId: tag, seconds: toInt(sec) ?? 20 });
}

export function dumpPendingOnIOS(tag = 'manual') {
  if (!mh()) { log('[iosNotify] dumpPendingOnIOS:NO_BRIDGE'); return; }
  safePost({ action: 'dumpPending', tag });
}

// (가끔 다른 파일에서 그냥 postIOS만 쓰는 경우가 있어 노출)
export function postIOS(payload) { safePost(payload); }

// ───────────────────────────────────────────
// Legacy Shims (다른 파일 호환용 이름)
// ───────────────────────────────────────────
export function scheduleRoutineAlerts(msg) { scheduleOnIOS(msg); }
export function cancelRoutineAlerts(id)    { cancelOnIOS(id); }

// ───────────────────────────────────────────
export default {
  scheduleOnIOS,
  cancelOnIOS,
  debugPingOnIOS,
  dumpPendingOnIOS,
  postIOS,
  // legacy 별칭
  scheduleRoutineAlerts,
  cancelRoutineAlerts,
};
