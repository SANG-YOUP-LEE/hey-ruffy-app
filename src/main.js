// src/main.js
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";

import "./assets/css/common.css";
import "./assets/css/join.css";
import "./assets/css/main.css";
import "./assets/css/popup.css";
import "./assets/css/color.css";
import "./assets/css/custom.css";
import "./assets/css/select.css";
import "./assets/css/ar_popup.css";
import "./assets/css/m_routine.css";
import "./assets/css/walk_status_pop.css";

import VueScrollPicker from "vue-scroll-picker";
import "vue-scroll-picker/style.css";

// ✅ 알림 탭 → 메인/달성현황으로 이동시키는 딥링크 리스너
import { installDeepLinkListener } from "@/utils/deeplink";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueScrollPicker);
app.mount("#app");

// 딥링크 리스너 활성화 (heyruffy://main?r=<루틴ID>)
installDeepLinkListener();

// ===== 줌/제스처 방지 =====
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener('wheel', e => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

/* ──────────────────────────────────────────
   루틴 → iOS 알림 재하이드레이트 (콜드 스타트 + 포그라운드)
────────────────────────────────────────── */
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { useAlarmStore } from '@/stores/alarm'

/** ===== 설정값 ===== */
const FOREGROUND_COOLDOWN_MS = 3 * 60 * 1000; // 최근 3분 내면 스킵
const BRIDGE_MAX_TRIES = 20;                  // 0.3s × 20 = ~6s
const BRIDGE_TRY_DELAY_MS = 300;

/** ===== 브릿지 체크/대기 ===== */
function hasIOSBridge(){
  return !!(window.webkit?.messageHandlers?.notify);
}
async function waitBridgeReady(maxTries = BRIDGE_MAX_TRIES, delayMs = BRIDGE_TRY_DELAY_MS){
  if (hasIOSBridge()) return true;
  for (let i=0;i<maxTries;i++){
    await new Promise(r => setTimeout(r, delayMs));
    if (hasIOSBridge()) return true;
  }
  return false;
}

/** ===== 해시 유틸 (안정 JSON + djb2) ===== */
function stableRoutineSnapshot(routines){
  const pick = (r) => ({
    id: r.id ?? r.routineId ?? '',
    title: r.title ?? r.name ?? r.text ?? '',
    repeatType: r.repeatType ?? '',
    repeatEveryDays: r.repeatEveryDays ?? null,
    repeatWeeks: r.repeatWeeks ?? '',
    repeatWeekDays: Array.isArray(r.repeatWeekDays) ? [...r.repeatWeekDays] : [],
    repeatMonthDays: Array.isArray(r.repeatMonthDays) ? [...r.repeatMonthDays] : [],
    startDate: r.startDate ?? null,
    endDate: r.endDate ?? null,
    alarmTime: r.alarmTime ?? null,
    tz: r.tz ?? null,
  });
  const arr = routines
    .map(pick)
    .sort((a,b) => String(a.id).localeCompare(String(b.id)));
  return JSON.stringify(arr);
}
function djb2(str){
  let h = 5381;
  for (let i=0;i<str.length;i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

/** ===== 로컬 상태키 ===== */
const LS_LAST_HASH = 'alarm.lastHash';
const LS_LAST_HYDRATE_MS = 'alarm.lastHydrateAtMs';

/** ===== 실행 가드 ===== */
function shouldSkipByTime(now = Date.now()){
  const last = Number(localStorage.getItem(LS_LAST_HYDRATE_MS) || 0);
  return last && (now - last) < FOREGROUND_COOLDOWN_MS;
}
function saveHydrateTime(ts = Date.now()){
  localStorage.setItem(LS_LAST_HYDRATE_MS, String(ts));
}
function getLastHash(){ return localStorage.getItem(LS_LAST_HASH) || ''; }
function setLastHash(h){ localStorage.setItem(LS_LAST_HASH, h); }

/** ===== 실제 재하이드레이트 ===== */
let isHydrating = false;

async function rehydrateForUser(user, reason = 'auto'){
  if (!user) return;
  if (isHydrating) return;
  const now = Date.now();
  if (shouldSkipByTime(now)) {
    console.log('[alarm rehydrate] skipped by cooldown:', reason);
    return;
  }
  const bridgeReady = await waitBridgeReady();
  if (!bridgeReady) {
    console.warn('[alarm rehydrate] iOS bridge not ready → skip:', reason);
    return;
  }

  isHydrating = true;
  try {
    const snap = await getDocs(collection(db, `users/${user.uid}/routines`));
    const routines = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 해시 비교
    const snapshot = stableRoutineSnapshot(routines);
    const newHash = djb2(snapshot);
    const oldHash = getLastHash();
    if (newHash === oldHash) {
      console.log('[alarm rehydrate] no changes (hash match) → skip:', reason);
      saveHydrateTime(now);
      return;
    }

    // 변경됨 → 재스케줄
    const alarm = useAlarmStore();
    if (typeof alarm.resetDedup === 'function') alarm.resetDedup();
    if (typeof alarm.rehydrateFromRoutines === 'function') {
      await alarm.rehydrateFromRoutines(routines);
    }
    setLastHash(newHash);
    saveHydrateTime(now);
    console.log('[alarm rehydrate] done:', routines.length, 'reason=', reason);
  } catch (e) {
    console.warn('[alarm rehydrate] failed:', e);
  } finally {
    isHydrating = false;
  }
}

/** ===== 트리거: 콜드 스타트 + 인증변경 + 포그라운드 ===== */
const current = getAuth().currentUser;
if (current) {
  rehydrateForUser(current, 'cold-start');
}
onAuthStateChanged(auth, (user) => {
  rehydrateForUser(user, 'auth-state');
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const u = getAuth().currentUser;
    if (u) rehydrateForUser(u, 'foreground');
  }
});
