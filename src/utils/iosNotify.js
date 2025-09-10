// src/utils/iosNotify.js
const mh = () => window?.webkit?.messageHandlers?.notify;

export function isBridgeAvailable() {
  const handler = mh();
  return !!(handler && typeof handler.postMessage === 'function');
}

export async function waitBridgeReady(maxTries = 25, delayMs = 120) {
  if (isBridgeAvailable()) return true;
  for (let i = 0; i < maxTries; i++) {
    await new Promise(r => setTimeout(r, delayMs));
    if (isBridgeAvailable()) return true;
  }
  return false;
}

const safePost = (payload) => {
  try {
    const handler = mh();
    if (!handler || typeof handler.postMessage !== 'function') {
      console.warn('[iosNotify][NO_BRIDGE]', payload);
      return;
    }
    console.log('[iosNotify][TX]', JSON.stringify(payload));
    handler.postMessage(payload);
  } catch (e) {
    console.warn('[iosNotify][ERR]', e);
  }
};

const log = (...args) => console.debug('[iosNotify]', ...args);

const baseId = (rid) => `routine-${rid}`;
const idDaily = (rid) => `${baseId(rid)}-daily`;
const idOnce  = (rid, tsMs) => `${baseId(rid)}-once-${tsMs}`;

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
  if (!s) return undefined;
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
    arr = Object.entries(raw)
      .filter(([, v]) => !!v)
      .map(([k]) => mapOneDayToken(k))
      .filter(Boolean);
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

const DEFAULT_SOUND = 'ruffysound001.wav';

function stripLinks(obj) {
  if (!obj) return;
  delete obj.link;
  delete obj.url;
  delete obj.deepLink;
}

// ───────────────────────────────────────────
// Payload normalization (★ baseId/title 보존 추가)
// ───────────────────────────────────────────
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
    stripLinks(out);
    out.sound = DEFAULT_SOUND;
    return out;
  }

  const out = { action: 'schedule' };
  out.id = msg.id || msg.baseId || 'inline';
  out.repeatMode = msg.repeatMode || msg.repeatType || 'once';
  out.hour = toInt(msg.hour ?? msg?.alarm?.hour);
  out.minute = toInt(msg.minute ?? msg?.alarm?.minute);

  // ★ 여기 추가: purge 및 제목 유지에 필요
  out.baseId = msg.baseId || (msg.routineId ? baseId(msg.routineId) : undefined);
  out.title  = msg.title || msg.name || out.title;
  out.name   = msg.name  || msg.title || out.name;

  stripLinks(out);
  out.sound = DEFAULT_SOUND;
  return out;
}

// ─────────────── 3줄 알림 강제 포맷 ───────────────
const _pad2 = (n) => String(n ?? 0).padStart(2, '0');

function ensureThreeLine(payload, src) {
  const modeSrc = src?.repeatMode || src?.mode || payload?.repeatMode || 'daily';
  const mode = String(modeSrc).toLowerCase();
  const label = mode.startsWith('weekly') ? 'Weekly'
              : mode.startsWith('monthly') ? 'Monthly'
              : (mode === 'once' || mode === 'today') ? 'Daily'
              : 'Daily';

  const pick = (a,b,c,d) => a ?? b ?? c ?? d;

  let rawH = pick(
    Number(src?.hour), Number(src?.alarm?.hour),
    Number(payload?.hour), Number(payload?.alarm?.hour)
  );
  let rawM = pick(
    Number(src?.minute), Number(src?.alarm?.minute),
    Number(payload?.minute), Number(payload?.alarm?.minute)
  );

  // 문자열 alarmTime까지 파싱
  if (!Number.isFinite(rawH) || !Number.isFinite(rawM)) {
    const str = src?.alarmTime || payload?.alarmTime;
    if (typeof str === 'string') {
      const s0 = str.trim().replace(/[.\u00B7\s]+/g, ':').replace(/:+/g, ':');
      let m = s0.match(/^(?:\s*(오전|오후|AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(오전|오후|AM|PM))?$/i);
      if (m && (m[1] || m[4])) {
        let h = +m[2], mm = +m[3];
        const tag = (m[1] || m[4] || '').toUpperCase();
        if (tag === 'PM' || tag === '오후') { if (h < 12) h += 12; }
        if (tag === 'AM' || tag === '오전') { if (h === 12) h = 0; }
        rawH = h; rawM = mm;
      } else {
        m = s0.match(/^(\d{1,2}):(\d{2})$/);
        if (m) { rawH = +m[1]; rawM = +m[2]; }
      }
    }
  }

  // timestamp(once)에서 추출
  if (!Number.isFinite(rawH) || !Number.isFinite(rawM)) {
    const ts = Number(src?.timestamp ?? payload?.timestamp);
    if (Number.isFinite(ts) && ts > 0) {
      const ms = ts > 1e12 ? ts : ts * 1000;
      const d = new Date(ms);
      rawH = d.getHours();
      rawM = d.getMinutes();
    }
  }

  const hh = Number.isFinite(rawH) ? _pad2(rawH) : '00';
  const mm = Number.isFinite(rawM) ? _pad2(rawM) : '00';

  const routineTitle =
    (src?.title || src?.name || payload?.title || payload?.name || '').trim() || '(제목없음)';

  return {
    ...payload,
    title: 'Hey Ruffy',
    subtitle: routineTitle, // iOS가 가릴 수도 있으니 body에도 1줄 포함
    body: `${routineTitle}\n[${hh}:${mm} · ${label}] 달성현황을 체크해주세요`,
  };
}

// ─────────────── purge race 방지 ───────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function purgeThenSchedule(base, scheduleFn, delayMs = 200) {
  safePost({ action: 'purgeBase', baseId: base });
  await sleep(delayMs);
  await scheduleFn();
}

// ─────────────── Public APIs ───────────────
export async function scheduleOnIOS(msg) {
  if (!(await waitBridgeReady())) { log('[iosNotify] scheduleOnIOS:NO_BRIDGE'); return; }

  const modeRaw = msg?.mode || msg?.repeatMode;
  const mode = typeof modeRaw === 'string' ? modeRaw.toLowerCase() : '';
  const isToday   = mode === 'today';
  const isOnce    = mode === 'once';
  const isDaily   = mode === 'daily';
  const isWeekly  = mode.startsWith('weekly');
  const isMonthly = mode.startsWith('monthly');
  const rid = msg?.routineId || msg?.routineID || msg?.rid;

  if (rid) {
    const hour   = toInt(msg?.hour ?? msg?.alarm?.hour);
    const minute = toInt(msg?.minute ?? msg?.alarm?.minute);
    const b = baseId(rid);

    // ── ONCE / TODAY
    if (isToday || isOnce) {
      let tsMs;
      const epochs = normalizeEpochs(msg?.fireTimesEpoch);
      if (epochs && epochs.length) tsMs = epochs[0];
      if (!tsMs) {
        const t = buildTodayTimestamp(hour, minute);
        if (t) tsMs = t;
      }
      if (!tsMs) return;

      await purgeThenSchedule(b, async () => {
        const payload = {
          action: 'schedule',
          id: idOnce(rid, tsMs),
          repeatMode: 'once',
          timestamp: Math.floor(tsMs / 1000),
          sound: DEFAULT_SOUND,
        };
        const finalOnce = ensureThreeLine(payload, { ...msg, hour, minute, repeatMode: 'once' });
        log('[iosNotify] scheduleOnIOS:REQ(once)', finalOnce);
        safePost(finalOnce);
      });
      return;
    }

    // ── DAILY
    if (isDaily) {
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        log('[iosNotify] scheduleOnIOS:SKIP(daily, no time)');
        return;
      }
      await purgeThenSchedule(b, async () => {
        const payload = {
          action: 'schedule',
          id: idDaily(rid),
          repeatMode: 'daily',
          hour, minute,                   // top-level도 같이
          alarm: { hour, minute },        // 호환용
          sound: DEFAULT_SOUND,
        };
        const finalDaily = ensureThreeLine(payload, { ...msg, hour, minute, repeatMode: 'daily' });
        log('[iosNotify] scheduleOnIOS:REQ(daily)', finalDaily);
        safePost(finalDaily);
      });
      return;
    }

  
// ── WEEKLY
if (isWeekly) {
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    log('[iosNotify] scheduleOnIOS:SKIP(weekly, no time)');
    return;
  }

  // 요일 소스: repeatWeekDays / weekdays / weekday → 숫자 1..7로 정규화
  let weekdays =
    Array.isArray(msg?.repeatWeekDays) ? msg.repeatWeekDays :
    Array.isArray(msg?.weekdays)      ? msg.weekdays      :
    (msg?.repeatWeekDays || msg?.weekday);

  weekdays = normalizeWeekdays(weekdays) || [];
  if (!weekdays.length) {
    log('[iosNotify] scheduleOnIOS:SKIP(weekly, no weekdays)');
    return;
  }

  // 1) 단일 요일만 있을 때: 들어온 id 그대로 사용 (purge 금지)
  if (weekdays.length === 1) {
    const wd = weekdays[0];
    const payload = {
      action: 'schedule',
      id: (msg?.id && String(msg.id).trim().length > 0)
            ? String(msg.id)
            : `${b}-w-${wd}__wd${wd}`,  // 안전망 id
      baseId: b,
      repeatMode: 'weekly',
      hour, minute,
      alarm: { hour, minute },   // 호환용
      weekday: wd,               // 단일 요일
      weekdays: [wd],            // 네이티브 호환
      sound: DEFAULT_SOUND,
      title: msg.title || msg.name,
      name: msg.name || msg.title,
    };
    const finalWeekly1 = ensureThreeLine(payload, { ...msg, hour, minute, repeatMode: 'weekly', weekdays: [wd] });
    log('[iosNotify] scheduleOnIOS:REQ(weekly-1day)', finalWeekly1);
    safePost(finalWeekly1);
    return;
  }

  // 2) 여러 요일: purge 한 번만 하고 요일별 서로 다른 id로 여러 건 등록
  await purgeThenSchedule(b, async () => {
    for (const wd of weekdays) {
      const id = (msg?.id && String(msg.id).includes(`__wd${wd}`))
        ? msg.id
        : `${b}-w-${wd}__wd${wd}`;
      const payload = {
        action: 'schedule',
        id,
        baseId: b,
        repeatMode: 'weekly',
        hour, minute,
        alarm: { hour, minute },
        weekday: wd,
        weekdays: [wd],
        sound: DEFAULT_SOUND,
        title: msg.title || msg.name,
        name: msg.name || msg.title,
      };
      const finalW = ensureThreeLine(payload, { ...msg, hour, minute, repeatMode: 'weekly', weekdays: [wd] });
      log('[iosNotify] scheduleOnIOS:REQ(weekly* per-day)', finalW);
      safePost(finalW);
    }
  });
  return;
}
  }

  // ── Fallback: 정규화 후 그대로 전송 (가능하면 거의 타지 않도록 위에서 분기)
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

  // 시간 미존재 시는 스킵(9:00 강제 주입 금지)
  if ((unified.repeatMode === 'daily' || unified.repeatMode?.startsWith('weekly') || unified.repeatMode?.startsWith('monthly'))
      && (!Number.isFinite(unified.hour) || !Number.isFinite(unified.minute))) {
    log('[iosNotify] scheduleOnIOS:SKIP(fallback, no time)');
    return;
  }

  const finalPayload = ensureThreeLine(unified, unified);
  if (finalPayload.baseId) {
    await purgeThenSchedule(finalPayload.baseId, async () => {
      log('[iosNotify] scheduleOnIOS:REQ(schedule)', finalPayload);
      safePost(finalPayload);
    });
  } else {
    log('[iosNotify] scheduleOnIOS:REQ(schedule)', finalPayload);
    safePost(finalPayload);
  }
}
 

export async function cancelOnIOS(idOrBase) {
  if (!(await waitBridgeReady())) return;
  if (!idOrBase) return;
  const raw = String(idOrBase);
  if (raw.startsWith('routine-')) safePost({ action: 'purgeBase', baseId: raw });
  else safePost({ action: 'cancel', id: raw });
}

export function purgeBase(baseIdStr) {
  if (!baseIdStr) return;
  safePost({ action: 'purgeBase', baseId: baseIdStr });
}

export function purgeBases(baseIds = []) {
  for (const b of baseIds) purgeBase(b);
}

export function purgeRoutineAll(rid) {
  if (!rid) return;
  safePost({ action: 'purgeBase', baseId: baseId(rid) });
}

export function scheduleDaily({ rid, hour, minute, title }) {
  if (!rid) return;
  const h = toInt(hour), m = toInt(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    log('[iosNotify] scheduleDaily:SKIP(no time)', { rid, hour, minute });
    return;
  }
  const payload = {
    action: 'schedule',
    id: idDaily(rid),
    repeatMode: 'daily',
    hour: h,               // ✅ 추가: top-level 시간
    minute: m,             // ✅ 추가: top-level 시간
    alarm: { hour: h, minute: m },
    sound: DEFAULT_SOUND,
  };
  const finalPayload = ensureThreeLine(payload, { title, hour: h, minute: m, repeatMode: 'daily' });
  log('[iosNotify] scheduleDaily', finalPayload);
  safePost(finalPayload);
}

export function scheduleOnce({ rid, atMs, title }) {
  if (!rid || !atMs) return;
  const tsMs = Number(atMs);
  const payload = {
    action: 'schedule',
    id: idOnce(rid, tsMs),
    repeatMode: 'once',
    timestamp: Math.floor(tsMs / 1000),
    sound: DEFAULT_SOUND,
    baseId: baseId(rid),
    title,
  };
  const finalPayload = ensureThreeLine(payload, { title, repeatMode: 'once' });
  log('[iosNotify] scheduleOnce', finalPayload);
  safePost(finalPayload);
}

export async function debugPingOnIOS(sec = 20, tag = 'rt_ping') {
  if (!(await waitBridgeReady())) return;
  safePost({ action: 'debugPing', baseId: tag, seconds: toInt(sec) ?? 20 });
}

export async function dumpPendingOnIOS(tag = 'manual') {
  if (!(await waitBridgeReady())) return;
  safePost({ action: 'dumpPending', tag });
}

export function postIOS(payload) { safePost(payload); }

export const scheduleRoutineAlerts = scheduleOnIOS;
export const cancelRoutineAlerts   = cancelOnIOS;

export default {
  isBridgeAvailable,
  waitBridgeReady,
  scheduleOnIOS,
  cancelOnIOS,
  purgeBase,
  purgeBases,
  purgeRoutineAll,
  scheduleDaily,
  scheduleOnce,
  debugPingOnIOS,
  dumpPendingOnIOS,
  postIOS,
  scheduleRoutineAlerts,
  cancelRoutineAlerts,
};
