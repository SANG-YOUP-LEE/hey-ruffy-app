// src/utils/iosNotify.js
function isIosWebView() {
  return !!(window.webkit?.messageHandlers?.notify);
}
export function scheduleOnIOS(r) {
  if (!isIosWebView() || !r?.id || !r?.repeatMode || !r?.alarm) return;
  const id = `routine-${r.id}`; // 고유해야 함(아래에서 path 기반 id 생성)
  const title = '헤이러피';
  const body  = `${r.name || '루틴'} 시간이에요!`;

  switch (r.repeatMode) {
    case 'once': {
      const ts = Number(r.alarm?.onceAt);
      if (!ts) return;
      window.webkit.messageHandlers.notify.postMessage({ action:'scheduleOnce', id, title, body, timestamp: ts });
      break;
    }
    case 'daily': {
      const { hour, minute } = r.alarm || {};
      if (hour == null || minute == null) return;
      window.webkit.messageHandlers.notify.postMessage({ action:'scheduleDaily', id, title, body, hour:Number(hour), minute:Number(minute) });
      break;
    }
    case 'weekly': {
      const { hour, minute, weekdays } = r.alarm || {};
      if (hour == null || minute == null || !Array.isArray(weekdays) || weekdays.length===0) return;
      window.webkit.messageHandlers.notify.postMessage({ action:'scheduleWeekly', id, title, body, hour:Number(hour), minute:Number(minute), weekdays });
      break;
    }
  }
}
export function cancelOnIOS(routineId) {
  if (!isIosWebView() || !routineId) return;
  window.webkit.messageHandlers.notify.postMessage({ action:'cancel', id:`routine-${routineId}` });
}
export function cancelAllOnIOS() {
  if (!isIosWebView()) return;
  window.webkit.messageHandlers.notify.postMessage({ action:'cancelAll' });
}
