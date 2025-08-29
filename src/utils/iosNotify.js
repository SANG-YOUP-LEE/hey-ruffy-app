// src/utils/iosNotify.js

// --- 브릿지 존재 체크 ---
function hasNewBridge() {
  return !!window.webkit?.messageHandlers?.scheduleRepeatingLocal;
}
function hasOldBridge() {
  return !!window.webkit?.messageHandlers?.notify;
}

// --- 브릿지 호출 ---
function postNewSchedule(msg) {
  window.webkit.messageHandlers.scheduleRepeatingLocal.postMessage(msg);
}
function postNewCancel(groupId) {
  window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId });
}
function postOld(action, payload) {
  window.webkit.messageHandlers.notify.postMessage({ action, ...payload });
}

// --- 공통 기본값 ---
const DEFAULT_MONTHS_AHEAD = 12;

// ---- 새 브릿지용 통합 스케줄러(직접 쓰고 싶으면 export해서 써도 됨) ----
export function scheduleRoutineAlerts(payload) {
  if (!hasNewBridge()) return;
  postNewSchedule(payload);
}
export function cancelRoutineAlerts(groupId) {
  if (!hasNewBridge()) return;
  // base만 들어오면 daily/weekly 파생 아이디까지 같이 정리
  const bases = new Set([groupId]);
  if (!/__wd\d$/.test(groupId) && !/__daily__wd\d$/.test(groupId)) {
    for (let d = 1; d <= 7; d++) {
      bases.add(`${groupId}__daily__wd${d}`); // daily
      bases.add(`${groupId}__wd${d}`);        // weekly
    }
  }
  bases.forEach((gid) => postNewCancel(gid));
}

// ======================================================================
// 기존 API 유지: scheduleOnIOS / cancelOnIOS / cancelAllOnIOS
// ======================================================================

/**
 * r: {
 *   id, name, repeatMode: 'once' | 'daily' | 'weekly' | 'monthly-date' | 'monthly-nth',
 *   alarm: {
 *     // 공통
 *     hour?: number, minute?: number,
 *     offsets?: number[],        // [0,5,10] (분)
 *     soundName?: string,        // 'alarm.caf'
 *     monthsAhead?: number,      // 미리 예약 개월 수 (기본 12)
 *
 *     // once
 *     onceAt?: number,           // ms 또는 s 타임스탬프
 *
 *     // weekly
 *     weekdays?: number[],       // 1=일 ... 7=토
 *     weeksInterval?: number,    // N주 간격(1=매주, 2=격주, 3/4/5...)
 *
 *     // monthly-date
 *     monthDays?: number[],      // [1,15,30] 등(존재 않으면 자동 skip)
 *
 *     // monthly-nth
 *     nthWeek?: number,          // 1~5, -1(마지막)
 *     weekday?: number           // 1=일 ... 7=토
 *   }
 * }
 */
export function scheduleOnIOS(r) {
  if (!r?.id || !r?.repeatMode || !r?.alarm) return;

  const title = '헤이러피';
  const body = `${r.name || '루틴'} 시간이에요!`;
  const groupBase = `routine-${r.id}`;
  const {
    hour,
    minute,
    weekdays = [],
    weeksInterval = 1,
    offsets = [0],
    soundName = null,
    onceAt,
    monthDays = [],
    nthWeek,
    weekday, // monthly-nth 용
    monthsAhead = DEFAULT_MONTHS_AHEAD,
  } = r.alarm;

  // --- 새 브릿지 우선 ---
  if (hasNewBridge()) {
    switch (r.repeatMode) {
      case 'weekly': {
        if (hour == null || minute == null || !Array.isArray(weekdays) || weekdays.length === 0) return;
        // 요일 여러 개면 각 요일별 개별 groupId
        weekdays.forEach((wd) => {
          const groupId = `${groupBase}__wd${wd}`;
          postNewSchedule({
            groupId, title, body,
            weekday: Number(wd),
            hour: Number(hour), minute: Number(minute),
            weeksInterval: Number(weeksInterval) || 1,
            monthsAhead: Number(monthsAhead) || DEFAULT_MONTHS_AHEAD,
            offsets: (offsets || [0]).map((n) => Number(n)),
            soundName: soundName || null,
          });
        });
        break;
      }
      case 'daily': {
        if (hour == null || minute == null) return;
        // daily는 7요일 모두 예약
        for (let wd = 1; wd <= 7; wd++) {
          const groupId = `${groupBase}__daily__wd${wd}`;
          postNewSchedule({
            groupId, title, body,
            weekday: wd,
            hour: Number(hour), minute: Number(minute),
            weeksInterval: 1,
            monthsAhead: Number(monthsAhead) || DEFAULT_MONTHS_AHEAD,
            offsets: (offsets || [0]).map((n) => Number(n)),
            soundName: soundName || null,
          });
        }
        break;
      }
      case 'monthly-date': {
        if (hour == null || minute == null) return;
        const days = (monthDays || []).map((n) => Number(n)).filter((n) => n >= 1);
        if (days.length === 0) return;
        postNewSchedule({
          groupId: groupBase, title, body,
          monthDays: days,
          hour: Number(hour), minute: Number(minute),
          monthsAhead: Number(monthsAhead) || DEFAULT_MONTHS_AHEAD,
          offsets: (offsets || [0]).map((n) => Number(n)),
          soundName: soundName || null,
        });
        break;
      }
      case 'monthly-nth': {
        if (hour == null || minute == null) return;
        const wd = Number(weekday);
        const nth = Number(nthWeek);
        if (!wd || !Number.isInteger(wd) || !nth || !Number.isInteger(nth)) return;
        postNewSchedule({
          groupId: groupBase, title, body,
          weekday: wd,        // 1=일 ... 7=토
          nthWeek: nth,       // 1~5 or -1(마지막)
          hour: Number(hour), minute: Number(minute),
          monthsAhead: Number(monthsAhead) || DEFAULT_MONTHS_AHEAD,
          offsets: (offsets || [0]).map((n) => Number(n)),
          soundName: soundName || null,
        });
        break;
      }
      case 'once': {
        // 새 브릿지는 반복 스케줄 전용 → once는 구 브릿지로 폴백
        if (hasOldBridge() && Number(onceAt)) {
          const ts = Number(onceAt);
          const seconds = ts > 1_000_000_000_000 ? Math.floor(ts / 1000) : ts; // ms → s 보정
          postOld('scheduleOnce', { id: groupBase, title, body, timestamp: seconds });
        }
        break;
      }
      default:
        break;
    }
    return;
  }

  // --- 구 브릿지 폴백 (monthly 패턴은 미지원) ---
  if (hasOldBridge()) {
    switch (r.repeatMode) {
      case 'once': {
        if (!Number(onceAt)) return;
        const ts = Number(onceAt);
        const seconds = ts > 1_000_000_000_000 ? Math.floor(ts / 1000) : ts;
        postOld('scheduleOnce', { id: groupBase, title, body, timestamp: seconds });
        break;
      }
      case 'daily': {
        if (hour == null || minute == null) return;
        postOld('scheduleDaily', { id: groupBase, title, body, hour: Number(hour), minute: Number(minute) });
        break;
      }
      case 'weekly': {
        if (hour == null || minute == null || !Array.isArray(weekdays) || weekdays.length === 0) return;
        // ❗ 구 브릿지는 N주 간격(3주 등) 지원 X → 그냥 매주 요일 예약만 됨
        postOld('scheduleWeekly', { id: groupBase, title, body, hour: Number(hour), minute: Number(minute), weekdays });
        break;
      }
      default:
        // monthly-* 은 구 브릿지에서 지원 불가 → 무시
        break;
    }
  }
}

export function cancelOnIOS(routineId) {
  if (!routineId) return;
  const groupBase = `routine-${routineId}`;

  if (hasNewBridge()) {
    // base + 파생 ID들 통으로 제거
    const bases = new Set([groupBase]);
    for (let d = 1; d <= 7; d++) {
      bases.add(`${groupBase}__daily__wd${d}`);
      bases.add(`${groupBase}__wd${d}`);
    }
    bases.forEach((gid) => postNewCancel(gid));
  } else if (hasOldBridge()) {
    postOld('cancel', { id: groupBase });
  }
}

export function cancelAllOnIOS() {
  if (hasNewBridge()) {
    // 새 브릿지는 cancelAll 미구현 → 루틴 id 목록을 돌면서 cancelOnIOS 사용 권장
    return;
  } else if (hasOldBridge()) {
    postOld('cancelAll', {});
  }
}
