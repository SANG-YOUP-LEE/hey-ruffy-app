// src/main.js
import { createApp, watch } from "vue";
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

import { installDeepLinkListener } from "@/utils/deeplink";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueScrollPicker);
app.mount("#app");

router.isReady().then(() => installDeepLinkListener());

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

import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAlarmStore } from '@/stores/alarm'
import { useAuthStore } from '@/stores/auth'

const FOREGROUND_COOLDOWN_MS = 3 * 60 * 1000;
const BRIDGE_MAX_TRIES = 20;
const BRIDGE_TRY_DELAY_MS = 300;

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

const LS_LAST_HASH = 'alarm.lastHash';
const LS_LAST_HYDRATE_MS = 'alarm.lastHydrateAtMs';

function shouldSkipByTime(now = Date.now()){
  const last = Number(localStorage.getItem(LS_LAST_HYDRATE_MS) || 0);
  return last && (now - last) < FOREGROUND_COOLDOWN_MS;
}
function saveHydrateTime(ts = Date.now()){
  localStorage.setItem(LS_LAST_HYDRATE_MS, String(ts));
}
function getLastHash(){ return localStorage.getItem(LS_LAST_HASH) || ''; }
function setLastHash(h){ localStorage.setItem(LS_LAST_HASH, h); }

let isHydrating = false;

async function rehydrateForUid(uid, reason = 'auto'){
  if (!uid) return;
  if (isHydrating) return;
  const now = Date.now();
  if (shouldSkipByTime(now)) return;
  const bridgeReady = await waitBridgeReady();
  if (!bridgeReady) return;

  isHydrating = true;
  try {
    const snap = await getDocs(collection(db, `users/${uid}/routines`));
    const routines = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const snapshot = stableRoutineSnapshot(routines);
    const newHash = djb2(snapshot);
    const oldHash = getLastHash();
    if (newHash === oldHash) {
      saveHydrateTime(now);
      return;
    }
    const alarm = useAlarmStore();
    if (typeof alarm.resetDedup === 'function') alarm.resetDedup();
    if (typeof alarm.rehydrateFromRoutines === 'function') {
      await alarm.rehydrateFromRoutines(routines);
    }
    setLastHash(newHash);
    saveHydrateTime(now);
  } catch (e) {
    console.warn('[alarm rehydrate] failed:', e);
  } finally {
    isHydrating = false;
  }
}

const auth = useAuthStore();
auth.initOnce();

let currentUid = null;
const onVis = () => {
  if (document.visibilityState === 'visible' && currentUid) {
    rehydrateForUid(currentUid, 'foreground');
  }
};
document.addEventListener('visibilitychange', onVis);

watch(() => auth.user?.uid || null, (uid) => {
  currentUid = uid;
  rehydrateForUid(uid, 'auth-state');
}, { immediate: true });