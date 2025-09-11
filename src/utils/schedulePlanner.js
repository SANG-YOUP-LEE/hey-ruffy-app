// src/utils/schedulePlanner.js
// 전체 지우고 통으로 붙여넣기
//
// ──────────────────────────────────────────────────────────────
// 기간(시작/종료)을 존중해서 알림을 "윈도우 안"에서만 생성해 주는 플래너.
// daily / weekly / monthly 모두 지원. 필요 시 once-epochs 로 전환.
// 과거(now) 시점 이전 알람은 생성 자체를 안 함 (최적화 반영).
// 네이티브 반복(DAILY/WEEKLY/MONTHLY) 사용 안 함 — 항상 ONCE(epochs)만 생성.
// ──────────────────────────────────────────────────────────────

const MAX_OCC = 30;        // 한 번에 등록할 최대 알림 개수 (iOS 64 제한 고려)
const ROLLING_DAYS = 60;   // 앞으로 몇 일치만 미리 채울지 (윈도우 없을 때도 사용)
const KST = '+09:00';

const p = (n) => String(n).padStart(2, '0');

export function toAtISO(dateISO, hm) {
  if (!dateISO || !hm) return null;
  return `${dateISO}T${p(hm.hour)}:${p(hm.minute)}:00${KST}`;
}
export function atISOToEpochSec(atISO) {
  if (!atISO) return null;
  const ms = new Date(atISO).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

function toDate0(iso) { return new Date(`${iso}T00:00:00${KST}`); }
function toDateEnd(iso){ return new Date(`${iso}T23:59:59${KST}`); }

function clampWindow(startISO, endISO) {
  const today = new Date(); today.setHours(0,0,0,0);

  const hardStart = startISO ? toDate0(startISO) : today;
  const start = hardStart > today ? hardStart : today;

  const hardEnd = endISO ? toDateEnd(endISO) : null;
  const rollingLimit = new Date(today); rollingLimit.setDate(today.getDate() + ROLLING_DAYS);

  const end = hardEnd ? new Date(Math.min(hardEnd.getTime(), rollingLimit.getTime()))
                      : rollingLimit;

  const pastAll = !!endISO && hardEnd < today;
  return { start, end, pastAll };
}

// ── generators ────────────────────────────────────────────────
function* dailyGen(startDate, stepDays) {
  const d = new Date(startDate);
  while (true) { yield new Date(d); d.setDate(d.getDate() + Math.max(1, stepDays)); }
}
function* weeklyGen(startDate, intervalWeeks, weekdays, hour, minute) {
  const base = new Date(startDate);
  const step = Math.max(1, intervalWeeks);
  while (true) {
    for (const w of weekdays) {
      const jsW = (w % 7); // 월=1..일=7 → JS(일=0)
      const dt = new Date(base);
      const diff = (jsW - dt.getDay() + 7) % 7;
      dt.setDate(dt.getDate() + diff);
      dt.setHours(hour, minute, 0, 0);
      yield dt;
    }
    base.setDate(base.getDate() + step * 7);
  }
}
function* monthlyGen(startDate, monthDays, hour, minute) {
  const cur = new Date(startDate);
  while (true) {
    const y = cur.getFullYear(), m = cur.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    // monthDays는 정렬된 상태라고 가정
    for (const d of monthDays) {
      if (d >= 1 && d <= last) {
        const dt = new Date(`${y}-${p(m)}-${p(d)}T00:00:00${KST}`);
        dt.setHours(hour, minute, 0, 0);
        yield dt;
      }
    }
    cur.setMonth(cur.getMonth() + 1);
    cur.setDate(1);
  }
}

// ── 핵심: 기간 고려해 epochs 생성 ──────────────────────────────
// 반환 형태:
// - { kind: 'once', atISO } : 하루짜리(시작=종료)
// - { kind: 'epochs', epochs: number[] } : 초 단위 epoch 배열
// - { kind: 'none' } : 생성할 게 없음 (요일/월일 미선택 등)
// - { kind: 'pastAll' } : 종료일이 과거 — 모두 정리
export function planSchedule(payload, hm) {
  const type = String(payload?.repeatType || 'daily');
  const startISO = payload?.start || null;
  const endISO   = payload?.end || null;
  const hasWindow = !!startISO || !!endISO;

  // 시작=종료 같은 하루짜리면 ONCE 처리
  if (startISO && endISO && startISO === endISO) {
    return { kind: 'once', atISO: toAtISO(startISO, hm) };
  }

  // 기간이 완전히 지났으면 purge 지시
  if (endISO) {
    const hardEnd = toDateEnd(endISO);
    const today0  = new Date(); today0.setHours(0,0,0,0);
    if (hardEnd < today0) return { kind: 'pastAll' };
  }

  // 기간이 있으면 모두 epochs로 전환
  if (hasWindow) {
    const { start, end } = clampWindow(startISO, endISO);
    const now = Date.now();
    const epochs = [];

    if (type === 'daily') {
      const step = Math.max(1, Number(payload?.repeatEveryDays || 1));
      const g = dailyGen(start, step);
      while (epochs.length < MAX_OCC) {
        const dt = g.next().value;
        if (dt > end) break;
        if (dt.getTime() <= now) continue; // 현재 시각 이전 제외
        dt.setHours(hm.hour, hm.minute, 0, 0);
        epochs.push(atISOToEpochSec(dt.toISOString()));
      }
    } else if (type === 'weekly') {
      const m = String(payload?.repeatWeeks || '').match(/(\d+)/);
      const intervalW = Math.max(1, m ? parseInt(m[1], 10) : 1);
      const days = (payload?.repeatWeekDays || []).slice().sort((a,b)=>a-b);
      if (!days.length) return { kind: 'none' };
      const g = weeklyGen(start, intervalW, days, hm.hour, hm.minute);
      while (epochs.length < MAX_OCC) {
        const dt = g.next().value;
        if (dt > end) break;
        if (dt.getTime() <= now) continue;
        epochs.push(atISOToEpochSec(dt.toISOString()));
      }
    } else if (type === 'monthly') {
      const days = (payload?.repeatMonthDays || []).slice().sort((a,b)=>a-b);
      if (!days.length) return { kind: 'none' };
      const g = monthlyGen(start, days, hm.hour, hm.minute);
      while (epochs.length < MAX_OCC) {
        const dt = g.next().value;
        if (dt > end) break;
        if (dt.getTime() <= now) continue;
        epochs.push(atISOToEpochSec(dt.toISOString()));
      }
    } else {
      // 안전망: daily(매일)
      const g = dailyGen(start, 1);
      while (epochs.length < MAX_OCC) {
        const dt = g.next().value;
        if (dt > end) break;
        if (dt.getTime() <= now) continue;
        dt.setHours(hm.hour, hm.minute, 0, 0);
        epochs.push(atISOToEpochSec(dt.toISOString()));
      }
    }

    const cleaned = Array.from(new Set(epochs)).filter(Boolean).sort((a,b)=>a-b);
    return cleaned.length ? { kind: 'epochs', epochs: cleaned } : { kind: 'none' };
  }

  // 기간이 없더라도, 네이티브 반복은 더 이상 쓰지 않는다.
  // → 항상 롤링 윈도우(앞으로 60일) 기준으로 epochs를 만들어 반환.
  const { start, end } = clampWindow(null, null);
  const now = Date.now();
  const epochs = [];

  if (type === 'daily') {
    const everyN = Math.max(1, Number(payload?.repeatEveryDays || 1));
    const g = dailyGen(start, everyN);
    while (epochs.length < MAX_OCC) {
      const dt = g.next().value;
      if (dt > end) break;
      if (dt.getTime() <= now) continue;
      dt.setHours(hm.hour, hm.minute, 0, 0);
      epochs.push(atISOToEpochSec(dt.toISOString()));
    }
  } else if (type === 'weekly') {
    const m = String(payload?.repeatWeeks || '').match(/(\d+)/);
    const w = Math.max(1, m ? parseInt(m[1], 10) : 1);
    const days = (payload?.repeatWeekDays || []).slice().sort((a,b)=>a-b);
    if (!days.length) return { kind: 'none' };
    const g = weeklyGen(start, w, days, hm.hour, hm.minute);
    while (epochs.length < MAX_OCC) {
      const dt = g.next().value;
      if (dt > end) break;
      if (dt.getTime() <= now) continue;
      epochs.push(atISOToEpochSec(dt.toISOString()));
    }
  } else if (type === 'monthly') {
    const days = (payload?.repeatMonthDays || []).slice().sort((a,b)=>a-b);
    if (!days.length) return { kind: 'none' };
    const g = monthlyGen(start, days, hm.hour, hm.minute);
    while (epochs.length < MAX_OCC) {
      const dt = g.next().value;
      if (dt > end) break;
      if (dt.getTime() <= now) continue;
      epochs.push(atISOToEpochSec(dt.toISOString()));
    }
  } else {
    const g = dailyGen(start, 1);
    while (epochs.length < MAX_OCC) {
      const dt = g.next().value;
      if (dt > end) break;
      if (dt.getTime() <= now) continue;
      dt.setHours(hm.hour, hm.minute, 0, 0);
      epochs.push(atISOToEpochSec(dt.toISOString()));
    }
  }

  const cleaned = Array.from(new Set(epochs)).filter(Boolean).sort((a,b)=>a-b);
  return cleaned.length ? { kind: 'epochs', epochs: cleaned } : { kind: 'none' };
}
