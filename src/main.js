// src/main.js
import { createApp, watch } from "vue";
import { createPinia, setActivePinia } from "pinia";
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

import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuthStore } from "@/stores/auth";
import { App as CapApp } from "@capacitor/app";
import { initIOSRoutineScheduler } from "@/utils/iosRoutineScheduler";

// ✅ iOS 알림 브리지 유틸 전역 노출 (콘솔/임시 버튼에서 바로 호출 가능)
import {
  scheduleOnIOS,
  cancelOnIOS,
  dumpPendingOnIOS,
  debugPingOnIOS,
} from "@/utils/iosNotify";

// --- boot error hooks ---
window.addEventListener("error", e => {
  console.error("[BOOT][window.onerror]", e.message, e.filename, e.lineno, e.colno, e.error);
});
window.addEventListener("unhandledrejection", e => {
  console.error("[BOOT][unhandledrejection]", e.reason);
});
console.log("[BOOT] main.js start");

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
setActivePinia(pinia);
app.use(router);
app.use(VueScrollPicker);
app.mount("#app");

// ───────────────────────────────────────────
// iOS 브리지 헬퍼
// ───────────────────────────────────────────
const hasIOSBridge = () => !!(window.webkit?.messageHandlers?.notify);

//
// 개발 편의: 전역 바인딩 (Safari 콘솔에서 직접 호출 가능)
//   - scheduleOnIOS({...})
//   - cancelOnIOS("id")
//   - dumpPendingOnIOS("tag")
//   - debugPingOnIOS(5)
//
window.scheduleOnIOS = scheduleOnIOS;
window.cancelOnIOS = cancelOnIOS;
window.dumpPendingOnIOS = dumpPendingOnIOS;
window.debugPingOnIOS = debugPingOnIOS;

// (옵션) 개발 중 자동 1회 테스트 알림: WebView가 준비되어 있고 브리지 있으면 5초 뒤 울림
if (import.meta.env.DEV) {
  // 콘솔에서 중복 호출해도 무해
  if (hasIOSBridge()) {
    try {
      debugPingOnIOS(5, "boot");
      console.log("[DEV] scheduled debugPing(5s)");
    } catch (e) {
      console.warn("[DEV] auto debugPing failed:", e);
    }
  } else {
    // 브리지 붙기 전에 로드되면 살짝 늦춰서 재시도
    setTimeout(() => {
      if (hasIOSBridge()) {
        try {
          debugPingOnIOS(5, "boot-late");
          console.log("[DEV] scheduled debugPing(5s, late)");
        } catch {}
      }
    }, 800);
  }
}

// ───────────────────────────────────────────
// gesture/zoom 방지
// ───────────────────────────────────────────
document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });
document.addEventListener("gesturechange", e => e.preventDefault(), { passive: false });
document.addEventListener("gestureend", e => e.preventDefault(), { passive: false });

let lastTouchEnd = 0;
document.addEventListener("touchend", e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener("wheel", e => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

// ───────────────────────────────────────────
// 알림 리하이드레이트(쿨다운/해시 가드)
// ───────────────────────────────────────────
const FOREGROUND_COOLDOWN_MS = 3 * 60 * 1000;
const BRIDGE_MAX_TRIES = 20;
const BRIDGE_TRY_DELAY_MS = 300;
const LS_LAST_HYDRATE_MS = "rfy_last_hydrate_ms";
const LS_LAST_HASH = "rfy_last_routines_hash";

async function waitBridgeReady(maxTries = BRIDGE_MAX_TRIES, delayMs = BRIDGE_TRY_DELAY_MS) {
  if (hasIOSBridge()) return true;
  for (let i = 0; i < maxTries; i++) {
    await new Promise(r => setTimeout(r, delayMs));
    if (hasIOSBridge()) return true;
  }
  return false;
}

function stableRoutineSnapshot(routines) {
  const pick = (r) => ({
    id: r.id ?? r.routineId ?? "",
    title: r.title ?? r.name ?? r.text ?? "",
    repeatType: r.repeatType ?? "",
    repeatEveryDays: r.repeatEveryDays ?? null,
    repeatWeeks: r.repeatWeeks ?? "",
    repeatWeekDays: Array.isArray(r.repeatWeekDays) ? [...r.repeatWeekDays] : [],
    repeatMonthDays: Array.isArray(r.repeatMonthDays) ? [...r.repeatMonthDays] : [],
    startDate: r.startDate ?? null,
    endDate: r.endDate ?? null,
    alarmTime: r.alarmTime ?? null,
    tz: r.tz ?? null,
  });
  const arr = routines.map(pick).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return JSON.stringify(arr);
}

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function shouldSkipByTime(now = Date.now()) {
  const last = Number(localStorage.getItem(LS_LAST_HYDRATE_MS) || 0);
  return last && (now - last) < FOREGROUND_COOLDOWN_MS;
}
function saveHydrateTime(ts = Date.now()) {
  localStorage.setItem(LS_LAST_HYDRATE_MS, String(ts));
}
function getLastHash() { return localStorage.getItem(LS_LAST_HASH) || ""; }
function setLastHash(h) { localStorage.setItem(LS_LAST_HASH, h); }

let isHydrating = false;
async function rehydrateForUid(uid, reason = "auto") {
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
    setLastHash(newHash);
    saveHydrateTime(now);

    // (필요하면 여기서 routine별 scheduleOnIOS 호출 가능)
    // 예: routines.forEach(r => scheduleOnIOS({...}))
  } catch (e) {
    console.warn("[alarm rehydrate] failed:", e);
  } finally {
    isHydrating = false;
  }
}

// ───────────────────────────────────────────
/** Auth & iOS 예약 싱크 */
// ───────────────────────────────────────────
const auth = useAuthStore();
auth.initOnce();

let currentUid = null;
let stopIOS = null;

const onVis = () => {
  if (document.visibilityState === "visible" && currentUid) {
    rehydrateForUid(currentUid, "foreground");
  }
};
document.addEventListener("visibilitychange", onVis);

CapApp.addListener("appStateChange", ({ isActive }) => {
  if (isActive && currentUid) rehydrateForUid(currentUid, "appState");
});

watch(() => auth.user?.uid || null, (uid) => {
  currentUid = uid;
  if (stopIOS) { try { stopIOS(); } catch {} stopIOS = null; }
  if (uid) { stopIOS = initIOSRoutineScheduler(uid); }
  rehydrateForUid(uid, "auth-state");
}, { immediate: true });

window.addEventListener("beforeunload", () => {
  if (stopIOS) { try { stopIOS(); } catch {} }
});
