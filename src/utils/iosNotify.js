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
    if (d >= 0 && d <= 6) return d + 1;
    return undefined;
  }
  const s = String(d).trim();
  if (s === '') return undefined;
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
    arr = Object.entries(raw).filter(([, v]) => !!v).map(([k]) => mapOneDayToken(k)).filter(Boolean);
  } else {
    const one = mapOneDayToken(raw);
    if (one) arr = [one];
  }
  if (!arr.length) return undefined;
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

function toICSList(nums) {
  const map = {1:'SU',2:'MO',3:'TU',4:'WE',5:'TH',6:'FR',7:'SA'};
  return Array.isArray(nums) ? nums.map(n => map[n]).filter(Boolean) : undefined;
}

function normalizeEpochs(raw) {
  const list = Array.isArray(raw) ? raw : (raw == null ? [] : [raw]);
  const now = Date.now();
  const toMs = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n >= 1e12 ? Math.floor(n) : Math.floor(n * 1000);
  };
  const uniq = new Set();
  for (const v of list) {
    const ms = toMs(v);
    if (ms && ms > now) uniq.add(ms);
  }
  return Array.from(uniq).sort((a, b) => a - b);
}

function buildTodayTimestamp(hour, minute) {
  const h = toInt(hour), m = toInt(minute);
  if (h == null || m == null) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  const t = d.getTime();
  return t > Date.now() ? t : null;
}

function normalizeSchedulePayload(msg = {}) {
  if (msg && msg.action === 'schedule') {
    const out = { ...msg };
    if (out.hour != null) out.hour = toInt(out.hour);
    if (out.minute != null) out.minute = toInt(out.minute);
    if (out.interval != null) out.interval = Math.max(1, toInt(out.interval) ?? 1);
    if (out.intervalWeeks != null) out.intervalWeeks = Math.max(1, toInt(out.intervalWeeks) ?? 1);
    if (!out.weekdays) out.weekdays = normalizeWeekdays(out.repeatWeekDays || out.weekday);
    if (out.startDate && !isYMD(out.startDate)) delete out.startDate;
    if (out.endDate && !isYMD(out.endDate)) delete out.endDate;
    const linkCandidate = [out.link, out.url, out.deepLink, msg.link, msg.url, msg.deepLink].find(v => typeof v === 'string' && v);
    if (linkCandidate) {
      out.link = linkCandidate;
      if (!out.url) out.url = linkCandidate;
      if (!out.deepLink) out.deepLink = linkCandidate;
    }
    if (out.repeatMode === 'weekly') {
      const days = normalizeWeekdays(out.weekdays) || [];
      const iw = Math.max(1, toInt(out.intervalWeeks) ?? 1);
      if (iw === 1 && days.length === 7) {
        out.repeatMode = 'daily';
        out.interval = 1;
        delete out.weekdays;
        delete out.intervalWeeks;
      } else {
        out.weekdays = days.length ? days : undefined;
        out.intervalWeeks = iw;
        if (out.weekdays && !out.weekdaysICS) out.weekdaysICS = toICSList(out.weekdays);
      }
    }
    return out;
  }

  const out = { action: 'schedule' };
  out.id = msg.id || msg.baseId || 'inline';
  out.title = msg.title || msg.name || '알람';
  out.subtitle = msg.subtitle || '';

  let repeatMode = msg.repeatMode || msg.repeatType || 'once';
  if (!['once', 'daily', 'weekly', 'monthly', 'monthly-date', 'monthly-nth', 'today'].includes(repeatMode)) {
    repeatMode = 'once';
  }
  out.repeatMode = repeatMode;

  const h1 = toInt(msg.hour);
  const m1 = toInt(msg.minute);
  const h2 = toInt(msg?.alarm?.hour);
  const m2 = toInt(msg?.alarm?.minute);
  if (h1 != null) out.hour = h1;
  if (m1 != null) out.minute = m1;
  if (out.hour == null && h2 != null) out.hour = h2;
  if (out.minute == null && m2 != null) out.minute = m2;

  if (isYMD(msg.startDate)) out.startDate = msg.startDate;
  if (isYMD(msg.endDate)) out.endDate = msg.endDate;

  const ts = toInt(msg.timestamp);
  if (repeatMode === 'once' && ts && ts > 0) out.timestamp = ts;

  if (repeatMode === 'daily') {
    const interval = toInt(msg.interval) ?? toInt(msg.intervalDays) ?? toInt(msg.repeatEveryDays) ?? 1;
    out.interval = Math.max(1, interval);
    if (isYMD(msg.startDate)) out.startDate = msg.startDate;
  }

  if (repeatMode === 'weekly') {
    const days = normalizeWeekdays(msg.weekdays) || normalizeWeekdays(msg.repeatWeekDays) || normalizeWeekdays(msg.weekday);
    const iw = toInt(msg.intervalWeeks) ?? toInt(msg.weeksInterval) ?? toInt(msg.everyWeeks) ?? (toInt((String(msg.repeatWeeks || '').match(/(\d+)/) || [])[1])) ?? 1;
    if (iw === 1 && days && days.length === 7) {
      repeatMode = 'daily';
      out.repeatMode = 'daily';
      out.interval = 1;
      delete out.weekdays;
      delete out.intervalWeeks;
    } else {
      out.weekdays = days;
      out.intervalWeeks = Math.max(1, iw);
      if (out.weekdays && !out.weekdaysICS) out.weekdaysICS = toICSList(out.weekdays);
    }
  }

  if (repeatMode.startsWith('monthly')) {
    const d = toInt(msg.day) ?? toInt((String(msg.repeatMonthDays || '').match(/(\d+)/) || [])[1]);
    if (d != null) out.day = Math.max(1, Math.min(31, d));
  }

  if (typeof msg.link === 'string' && msg.link) {
    out.link = msg.link;
    out.url = out.url || msg.link;
    out.deepLink = out.deepLink || msg.link;
  } else if (typeof msg.url === 'string' && msg.url) {
    out.url = msg.url;
    out.link = out.link || msg.url;
    out.deepLink = out.deepLink || msg.url;
  } else if (typeof msg.deepLink === 'string' && msg.deepLink) {
    out.deepLink = msg.deepLink;
    out.link = out.link || msg.deepLink;
    out.url = out.url || msg.deepLink;
  }

  return out;
}

export function scheduleOnIOS(msg) {
  if (!mh()) { log('[iosNotify] scheduleOnIOS:NO_BRIDGE'); return; }
  const modeRaw = msg?.mode || msg?.repeatMode;
  const mode = typeof modeRaw === 'string' ? modeRaw.toLowerCase() : '';
  const isToday = mode === 'today';
  const isOnce = mode === 'once';

  const rid = msg?.routineId || msg?.routineID || msg?.rid;
  if (rid) {
    let epochs = normalizeEpochs(msg?.fireTimesEpoch);
    if ((!epochs || epochs.length === 0) && (isToday || isOnce)) {
      const ts = buildTodayTimestamp(msg?.hour ?? msg?.alarm?.hour, msg?.minute ?? msg?.alarm?.minute);
      if (ts) epochs = [ts];
    }
    if (epochs && epochs.length > 0) {
      const payload = {
        action: 'setScheduleForRoutine',
        routineId: String(rid),
        mode: isToday ? 'once' : (msg.mode || msg.repeatMode || 'once'),
        title: msg.title || msg.name || '알람',
        body: msg.body || '',
        fireTimesEpoch: epochs,
        link: msg.link || msg.url || msg.deepLink || undefined,
      };
      log('[iosNotify] scheduleOnIOS:REQ(setScheduleForRoutine)', payload);
      safePost(payload);
      return;
    }
  }

  const unified = normalizeSchedulePayload(msg);
  if (isToday || unified.repeatMode === 'today') {
    unified.repeatMode = 'once';
    if (!unified.timestamp) {
      const ts = buildTodayTimestamp(unified.hour, unified.minute);
      if (ts) unified.timestamp = Math.floor(ts / 1000);
    }
  }
  if (unified.repeatMode === 'once' && unified.timestamp && unified.timestamp > 1e12) {
    unified.timestamp = Math.floor(unified.timestamp / 1000);
  }

  log('[iosNotify] scheduleOnIOS:REQ(schedule)', unified);
  safePost(unified);
}

export function cancelOnIOS(idOrBase) {
  if (!mh()) { log('[iosNotify] cancelOnIOS:NO_BRIDGE'); return; }
  if (!idOrBase) return;
  const raw = String(idOrBase);
  if (raw.startsWith('routine-')) {
    safePost({ action: 'purgeBase', baseId: raw });
  } else {
    safePost({ action: 'cancel', id: raw });
  }
}

export function debugPingOnIOS(sec = 20, tag = 'rt_ping') {
  if (!mh()) { log('[iosNotify] debugPingOnIOS:NO_BRIDGE'); return; }
  safePost({ action: 'debugPing', baseId: tag, seconds: toInt(sec) ?? 20 });
}

export function dumpPendingOnIOS(tag = 'manual') {
  if (!mh()) { log('[iosNotify] dumpPendingOnIOS:NO_BRIDGE'); return; }
  safePost({ action: 'dumpPending', tag });
}

export function postIOS(payload) { safePost(payload); }

export function scheduleRoutineAlerts(msg) { scheduleOnIOS(msg); }
export function cancelRoutineAlerts(id)    { cancelOnIOS(id); }

export default {
  scheduleOnIOS,
  cancelOnIOS,
  debugPingOnIOS,
  dumpPendingOnIOS,
  postIOS,
  scheduleRoutineAlerts,
  cancelRoutineAlerts,
};
