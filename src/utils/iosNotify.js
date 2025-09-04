// File: src/utils/iosNotify.js
// iOS 브릿지 전송을 단일 프로토콜(action: "schedule")로 정규화
// 기존 호출부는 그대로 두고, 여기서 모두 최신 포맷으로 변환 + 레거시 API 별칭까지 export.

const mh = () => window.webkit?.messageHandlers?.notify;
const safePost = (payload) => {
  try {
    console.log('[iosNotify][TX]', JSON.stringify(payload));
    mh()?.postMessage(payload);
  } catch (e) {
    console.warn('[iosNotify][ERR]', e);
  }
};

const log = (...args) => console.warn('⚡️ ', ...args);

// legacy -> unified 'schedule' payload 로 변환
function normalizeSchedulePayload(msg = {}) {
  // 이미 새 포맷이면 그대로 통과
  if (msg && msg.action === 'schedule') return msg;

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

  // 시간 정보
  if (typeof msg.hour === 'number') out.hour = msg.hour;
  if (typeof msg.minute === 'number') out.minute = msg.minute;
  if (msg.alarm && typeof msg.alarm === 'object') {
    if (typeof msg.alarm.hour === 'number') out.hour = msg.alarm.hour;
    if (typeof msg.alarm.minute === 'number') out.minute = msg.alarm.minute;
  }

  // once 전용: timestamp(ms)
  if (repeatMode === 'once' && Number.isFinite(msg.timestamp)) {
    out.timestamp = msg.timestamp;
  }

  // daily 전용
  if (repeatMode === 'daily') {
    const interval =
      Number(msg.interval) ||
      Number(msg.intervalDays) ||
      Number(msg.repeatEveryDays) || 1;
    out.interval = Math.max(1, interval);
    if (typeof msg.startDate === 'string') out.startDate = msg.startDate;
  }

  // weekly 전용
  if (repeatMode === 'weekly') {
    if (Array.isArray(msg.weekdays)) out.weekdays = msg.weekdays;
    if (!out.weekdays && Array.isArray(msg.repeatWeekDays)) {
      const mapKor = { '일':1,'월':2,'화':3,'수':4,'목':5,'금':6,'토':7 };
      out.weekdays = msg.repeatWeekDays
        .map(d => mapKor[String(d)] ?? Number(d))
        .filter(n => n>=1 && n<=7);
    }
    const iw =
      Number(msg.intervalWeeks) ||
      Number((String(msg.repeatWeeks||'').match(/(\d+)/) || [])[1]) || 1;
    out.intervalWeeks = Math.max(1, iw);
  }

  // monthly 전용
  if (repeatMode.startsWith('monthly')) {
    if (typeof msg.day === 'number') out.day = Math.max(1, Math.min(31, msg.day));
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
  if (msg && msg.action && msg.action !== 'schedule') {
    log('[iosNotify] scheduleOnIOS:POST_OLD', msg); // 디버그용
  } else {
    log('[iosNotify] scheduleOnIOS:REQ', unified);
  }
  safePost(unified);
}

export function cancelOnIOS(idOrBase) {
  if (!mh()) { log('[iosNotify] cancelOnIOS:NO_BRIDGE'); return; }
  if (!idOrBase) return;
  safePost({ action: 'cancel', id: String(idOrBase) });
}

export function debugPingOnIOS(sec = 20, tag = 'rt_ping') {
  if (!mh()) { log('[iosNotify] debugPingOnIOS:NO_BRIDGE'); return; }
  safePost({ action: 'debugPing', baseId: tag, seconds: Number(sec)||20 });
}

export function dumpPendingOnIOS(tag = 'manual') {
  if (!mh()) { log('[iosNotify] dumpPendingOnIOS:NO_BRIDGE'); return; }
  safePost({ action: 'dumpPending', tag });
}

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
  // legacy 별칭
  scheduleRoutineAlerts,
  cancelRoutineAlerts,
};
