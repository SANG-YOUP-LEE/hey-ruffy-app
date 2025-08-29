// src/utils/iosNotify.js

function hasNewBridge() {
  return !!window.webkit?.messageHandlers?.scheduleRepeatingLocal;
}
function hasOldBridge() {
  return !!window.webkit?.messageHandlers?.notify;
}

function postNewSchedule(msg) {
  window.webkit.messageHandlers.scheduleRepeatingLocal.postMessage(msg);
}
function postNewCancel(groupId) {
  window.webkit.messageHandlers.cancelRepeatingLocal.postMessage({ groupId });
}
function postOld(action, payload) {
  window.webkit.messageHandlers.notify.postMessage({ action, ...payload });
}

/**
 * r: {
 *   id, name, repeatMode: 'once' | 'daily' | 'weekly',
 *   alarm: {
 *     onceAt?: number(ms),
 *     hour?: number, minute?: number,
 *     weekdays?: number[],       // 1=일 ... 7=토
 *     weeksInterval?: number,    // 주기 (weekly=1, 격주=2)
 *     offsets?: number[],        // [0,5,10] (분)
 *     soundName?: string         // 'alarm.caf'
 *   }
 * }
 */
export function scheduleOnIOS(r) {
  if (!r?.id || !r?.repeatMode || !r?.alarm) return;

  const title = '헤이러피';
  const body  = `${r.name || '루틴'} 시간이에요!`;
  const groupBase = `routine-${r.id}`;
  const {
    hour, minute, weekdays = [], weeksInterval = 1, offsets = [0], soundName = null, onceAt
  } = r.alarm;

  // 새 브릿지 우선 사용
  if (hasNewBridge()) {
    switch (r.repeatMode) {
      case 'weekly': {
        if (hour == null || minute == null || weekdays.length === 0) return;
        // 요일 여러 개인 경우 → 요일별로 별도 groupId로 각각 예약
        weekdays.forEach((wd) => {
          const groupId = `${groupBase}__wd${wd}`;
          postNewSchedule({
            groupId, title, body,
            weekday: Number(wd),
            hour: Number(hour), minute: Number(minute),
            weeksInterval: Number(weeksInterval) || 1,
            monthsAhead: 12,
            offsets: (offsets || [0]).map(n => Number(n)),
            soundName: soundName || null
          });
        });
        break;
      }
      case 'daily': {
        if (hour == null || minute == null) return;
        // daily는 7개 요일 모두 예약
        [1,2,3,4,5,6,7].forEach((wd) => {
          const groupId = `${groupBase}__daily__wd${wd}`;
          postNewSchedule({
            groupId, title, body,
            weekday: wd,
            hour: Number(hour), minute: Number(minute),
            weeksInterval: 1,
            monthsAhead: 12,
            offsets: (offsets || [0]).map(n => Number(n)),
            soundName: soundName || null
          });
        });
        break;
      }
      case 'once': {
        // 새 브릿지는 '반복' 스케줄러라 1회 알림은 구 브릿지로 폴백하거나,
        // 가장 가까운 요일을 계산해 1건만 예약하는 방식이 필요함.
        // 우선: 구 브릿지가 있으면 그걸 사용
        if (hasOldBridge() && Number(onceAt)) {
          postOld('scheduleOnce', {
            id: groupBase,
            title, body,
            timestamp: Number(onceAt)
          });
        }
        break;
      }
      default: break;
    }
    return;
  }

  // 구 브릿지로 폴백 (기존 코드와 호환)
  if (hasOldBridge()) {
    switch (r.repeatMode) {
      case 'once': {
        if (!Number(onceAt)) return;
        postOld('scheduleOnce', { id: groupBase, title, body, timestamp: Number(onceAt) });
        break;
      }
      case 'daily': {
        if (hour == null || minute == null) return;
        postOld('scheduleDaily', { id: groupBase, title, body, hour: Number(hour), minute: Number(minute) });
        break;
      }
      case 'weekly': {
        if (hour == null || minute == null || weekdays.length === 0) return;
        postOld('scheduleWeekly', { id: groupBase, title, body, hour: Number(hour), minute: Number(minute), weekdays });
        break;
      }
      default: break;
    }
  }
}

export function cancelOnIOS(routineId) {
  if (!routineId) return;
  const groupBase = `routine-${routineId}`;

  if (hasNewBridge()) {
    // 요일별로 만들어둔 그룹들도 함께 제거하려면 패턴을 모두 호출
    // 여기서는 베이스/일간/요일별을 일괄 제거 시도
    [groupBase, `${groupBase}__daily__wd1`, `${groupBase}__daily__wd2`, `${groupBase}__daily__wd3`,
     `${groupBase}__daily__wd4`, `${groupBase}__daily__wd5`, `${groupBase}__daily__wd6`, `${groupBase}__daily__wd7`]
     .forEach(gid => postNewCancel(gid));
  } else if (hasOldBridge()) {
    postOld('cancel', { id: groupBase });
  }
}

export function cancelAllOnIOS() {
  if (hasNewBridge()) {
    // 새 브릿지는 "전체삭제" 액션을 따로 두지 않았으므로 앱단에서 개별 루틴 id를 순회해 cancelOnIOS 호출 권장
    // 필요하면 네이티브에 cancelAll 추가 가능
    return;
  } else if (hasOldBridge()) {
    postOld('cancelAll', {});
  }
}
