// src/utils/projection.js
const DAY_MS = 24 * 60 * 60 * 1000;

const toInt = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
};

const KOR_DAY = { '일':0,'월':1,'화':2,'수':3,'목':4,'금':5,'토':6 };
const ENG_DAY = { su:0,sun:0, mo:1,mon:1, tu:2,tue:2, we:3,wed:3, th:4,thu:4, fr:5,fri:5, sa:6,sat:6 };
const ICS_DAY = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };

function mapOneDOWToken(d) {
  if (d == null) return undefined;
  if (typeof d === 'number') {
    if (d >= 0 && d <= 6) return d;
    if (d >= 1 && d <= 7) return d - 1;
    return undefined;
  }
  const s = String(d).trim();
  if (!s) return undefined;
  const head = s.slice(0, 1);
  if (KOR_DAY[head] != null) return KOR_DAY[head];
  if (ENG_DAY[s.toLowerCase()] != null) return ENG_DAY[s.toLowerCase()];
  if (ICS_DAY[s.toUpperCase()] != null) return ICS_DAY[s.toUpperCase()];
  const n = toInt(s);
  if (n != null) {
    if (n >= 0 && n <= 6) return n;
    if (n >= 1 && n <= 7) return n - 1;
  }
  return undefined;
}

function normalizeWeekdays(raw) {
  if (!raw) return [];
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw.map(mapOneDOWToken).filter((v) => v != null);
  } else if (typeof raw === 'object') {
    arr = Object.entries(raw)
      .filter(([, v]) => !!v)
      .map(([k]) => mapOneDOWToken(k))
      .filter((v) => v != null);
  } else {
    const one = mapOneDOWToken(raw);
    if (one != null) arr = [one];
  }
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

const fmtCache = new Map();
function getFormatter(tz) {
  const key = tz || 'local';
  if (!fmtCache.has(key)) {
    fmtCache.set(
      key,
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  }
  return fmtCache.get(key);
}

function getPartsInTZ(utcDate, tz) {
  const s = getFormatter(tz).format(utcDate);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, MM, DD, YYYY, hh, mm, ss] = m;
  return { y: +YYYY, m: +MM, d: +DD, H: +hh, M: +mm, S: +ss };
}

function tzOffsetAt(utcDate, tz) {
  const p = getPartsInTZ(utcDate, tz);
  if (!p) return 0;
  const asUTC = Date.UTC(p.y, p.m - 1, p.d, p.H, p.M, p.S);
  return asUTC - utcDate.getTime();
}

function wallTimeToUtcMs(y, m, d, H, M, tz) {
  const guess = Date.UTC(y, m - 1, d, H, M, 0);
  const offset1 = tzOffsetAt(new Date(guess), tz);
  const ms1 = guess - offset1;
  const offset2 = tzOffsetAt(new Date(ms1), tz);
  if (offset1 !== offset2) return guess - offset2;
  return ms1;
}

function ymdOf(ms, tz) {
  const p = getPartsInTZ(new Date(ms), tz);
  return { y: p.y, m: p.m, d: p.d };
}

function startOfDayMs(ms, tz) {
  const { y, m, d } = ymdOf(ms, tz);
  return wallTimeToUtcMs(y, m, d, 0, 0, tz);
}

function addDays(ms, days, tz) {
  const { y, m, d } = ymdOf(ms, tz);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const p = getPartsInTZ(date, tz);
  return wallTimeToUtcMs(p.y, p.m, p.d, 0, 0, tz);
}

function dayOfWeek(ms, tz) {
  const p = getPartsInTZ(new Date(ms), tz);
  const asLocal = new Date(p.y, p.m - 1, p.d);
  return asLocal.getDay();
}

function parseYMD(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

function clampByDateRange(ms, def, tz) {
  const a = parseYMD(def?.startDate);
  const z = parseYMD(def?.endDate);
  if (a) {
    const min = wallTimeToUtcMs(a.y, a.m, a.d, 0, 0, tz);
    if (ms < min) return false;
  }
  if (z) {
    const max = wallTimeToUtcMs(z.y, z.m, z.d, 23, 59, tz);
    if (ms > max) return false;
  }
  return true;
}

function buildDaily(def, nowMs, untilMs, tz) {
  const hour = toInt(def?.hour ?? def?.alarm?.hour);
  const minute = toInt(def?.minute ?? def?.alarm?.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return [];
  const stepDays = Math.max(
    1,
    toInt(def?.intervalDays ?? def?.repeatEveryDays ?? def?.interval) ?? 1
  );
  let cursor = startOfDayMs(nowMs, tz);
  const end = untilMs;
  const out = [];
  while (cursor <= end) {
    const cand = wallTimeToUtcMs(...Object.values(ymdOf(cursor, tz)), hour, minute, tz);
    if (cand >= nowMs && cand <= end && clampByDateRange(cand, def, tz)) out.push(cand);
    cursor = addDays(cursor, stepDays, tz);
  }
  return out;
}

function buildWeekly(def, nowMs, untilMs, tz) {
  const hour = toInt(def?.hour ?? def?.alarm?.hour);
  const minute = toInt(def?.minute ?? def?.alarm?.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return [];
  const days = normalizeWeekdays(def?.repeatWeekDays ?? def?.weekdays ?? def?.weekday);
  if (!days.length) return [];
  const intervalW = Math.max(1, toInt(def?.intervalWeeks) ?? 1);

  let cursor = startOfDayMs(nowMs, tz);
  const end = untilMs;

  let anchor = def?.anchorDate || def?.startDate;
  let anchorYMD = parseYMD(anchor);
  if (!anchorYMD) {
    const { y, m, d } = ymdOf(nowMs, tz);
    anchorYMD = { y, m, d };
  }
  const anchorMs = wallTimeToUtcMs(anchorYMD.y, anchorYMD.m, anchorYMD.d, 0, 0, tz);

  const weekStart = (ms) => {
    const dow = dayOfWeek(ms, tz);
    return addDays(startOfDayMs(ms, tz), -dow, tz);
  };
  const weeksBetween = (a, b) => Math.round((weekStart(b) - weekStart(a)) / DAY_MS / 7);

  const out = [];
  while (cursor <= end) {
    const dow = dayOfWeek(cursor, tz);
    if (days.includes(dow)) {
      const wdiff = weeksBetween(anchorMs, cursor);
      if (wdiff % intervalW === 0) {
        const cand = wallTimeToUtcMs(...Object.values(ymdOf(cursor, tz)), hour, minute, tz);
        if (cand >= nowMs && cand <= end && clampByDateRange(cand, def, tz)) out.push(cand);
      }
    }
    cursor = addDays(cursor, 1, tz);
  }
  return out.sort((a, b) => a - b);
}

function buildMonthly(def, nowMs, untilMs, tz) {
  const hour = toInt(def?.hour ?? def?.alarm?.hour);
  const minute = toInt(def?.minute ?? def?.alarm?.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return [];

  const rawDays =
    def?.daysOfMonth ?? def?.monthDays ?? def?.monthlyDays ?? def?.dom ?? def?.byMonthDay;
  let days = Array.isArray(rawDays) ? rawDays.slice() : (rawDays != null ? [rawDays] : []);
  days = days
    .map(toInt)
    .filter((d) => Number.isFinite(d) && d >= 1 && d <= 31)
    .sort((a, b) => a - b);
  if (!days.length) return [];

  const start = startOfDayMs(nowMs, tz);
  const end = untilMs;

  const startPart = ymdOf(start, tz);
  const endPart = ymdOf(end, tz);

  const months = [];
  let y = startPart.y;
  let m = startPart.m;
  while (y < endPart.y || (y === endPart.y && m <= endPart.m)) {
    months.push({ y, m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  const inMonthMaxDay = (Y, M) => new Date(Date.UTC(Y, M, 0)).getUTCDate();

  const out = [];
  for (const { y: Y, m: M } of months) {
    const maxDay = inMonthMaxDay(Y, M);
    for (const d of days) {
      if (d > maxDay) continue;
      const cand = wallTimeToUtcMs(Y, M, d, hour, minute, tz);
      if (cand >= start && cand <= end && cand >= nowMs && clampByDateRange(cand, def, tz)) {
        out.push(cand);
      }
    }
  }
  return out.sort((a, b) => a - b);
}

export function projectInstances(def, now = Date.now(), tz = 'Asia/Seoul', horizonDays = 14) {
  const modeRaw = def?.repeatMode || def?.mode || '';
  const mode = String(modeRaw).toLowerCase();
  const until = startOfDayMs(now, tz) + horizonDays * DAY_MS - 1;

  if (mode === 'daily') return buildDaily(def, now, until, tz);
  if (mode.startsWith('weekly')) return buildWeekly(def, now, until, tz);
  if (mode.startsWith('monthly')) return buildMonthly(def, now, until, tz);

  const onceTs =
    def?.atMs ??
    def?.timestamp ??
    (def?.fireTimesEpoch && Array.isArray(def.fireTimesEpoch) && def.fireTimesEpoch[0]);
  if (onceTs != null) {
    const n = Number(onceTs);
    const ms = n >= 1e12 ? Math.trunc(n) : Math.trunc(n * 1000);
    return ms >= now && ms <= until && clampByDateRange(ms, def, tz) ? [ms] : [];
  }

  const hour = toInt(def?.hour ?? def?.alarm?.hour);
  const minute = toInt(def?.minute ?? def?.alarm?.minute);
  if (Number.isFinite(hour) && Number.isFinite(minute)) {
    const today = startOfDayMs(now, tz);
    const ms = wallTimeToUtcMs(...Object.values(ymdOf(today, tz)), hour, minute, tz);
    return ms >= now && ms <= until && clampByDateRange(ms, def, tz) ? [ms] : [];
  }

  return [];
}

export default { projectInstances };
