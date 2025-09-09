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

// ✅ iOS 알림 브리지 유틸 전역 노출
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

window.scheduleOnIOS = scheduleOnIOS;
window.cancelOnIOS = cancelOnIOS;
window.dumpPendingOnIOS = dumpPendingOnIOS;
window.debugPingOnIOS = debugPingOnIOS;

// ───────────────────────────────────────────
// gesture/zoom 방지  (오타: 'gesturestart ' → 'gesturestart')
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
    rule: r.rule ?? null,
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

// 시간 파서 (HH:MM 문자열 → {hour, minute})
function parseHM(t) {
  if (!t) return null;
  const m = String(t).match(/^\s*(\d{1,2}):(\d{2})\s*$/);
  if (m) {
    const h = Math.max(0, Math.min(23, +m[1]));
    const mm = Math.max(0, Math.min(59, +m[2]));
    return { hour: h, minute: mm };
  }
  return null;
}

// ISO YYYY-MM-DD 생성 (Date-like object {year,month,day})
const p2 = n => String(n).padStart(2, "0");
const toISODate = d => (d ? `${d.year}-${p2(d.month)}-${p2(d.day)}` : null);
const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const safeISOFromDateObj = (obj) => {
  const s = toISODate(obj);
  return (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)) ? s : null;
};

// once용 atISO(+09:00 고정)
const toAtISO = (dateISO, hm) => {
  if (!dateISO || !hm) return null;
  return `${dateISO}T${p2(hm.hour)}:${p2(hm.minute)}:00+09:00`;
};
const atISOToEpochMs = (atISO) => {
  const d = new Date(atISO);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
};

// 루틴 1개를 iOS에 예약
async function scheduleRoutineOnIOS(r) {
  const id = r.id ?? r.routineId;
  if (!id) return;
  const baseId = `routine-${id}`;
  const hm = parseHM(r.alarmTime);
  if (!hm) return;

  // 기존 것 전부 제거 후 재등록 (중복 방지)
  try { await cancelOnIOS(baseId); } catch {}

  const title = r.title || "알림";

  // once 판단: rule.freq === 'once' 이거나 daily간격 0 (오늘만)
  const isOnce =
    (r.rule && r.rule.freq === "once") ||
    (r.repeatType === "daily" && (r.repeatDaily === 0 || r.repeatEveryDays === 0)) ||
    (typeof r.start === "string" && typeof r.end === "string" && r.start === r.end);

  if (isOnce) {
    const anchor = r.start || safeISOFromDateObj(r.startDate) || todayISO();
    const atISO = toAtISO(anchor, hm);
    const ms = atISOToEpochMs(atISO);
    if (ms && ms > Date.now()) {
      const sec = Math.floor(ms / 1000);
      await scheduleOnIOS({
        id: baseId,
        title,
        repeatMode: "once",
        fireTimesEpoch: [sec],
        sound: "ruffysound001.wav",
      });
    }
    return;
  }

  if (r.repeatType === "weekly") {
    const days = Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays : [];
    if (days.length) {
      await scheduleOnIOS({
        id: baseId,
        title,
        repeatMode: "weekly",
        weekdays: days, // [1..7]
        hour: hm.hour,
        minute: hm.minute,
        sound: "ruffysound001.wav",
      });
      return;
    }
  }

  if (r.repeatType === "monthly") {
    const days = Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : [];
    if (days.length) {
      await scheduleOnIOS({
        id: baseId,
        title,
        repeatMode: "monthly",
        monthDays: days, // [1..31]
        hour: hm.hour,
        minute: hm.minute,
        sound: "ruffysound001.wav",
      });
      return;
    }
  }

  // 기본: 매일
  await scheduleOnIOS({
    id: baseId,
    title,
    repeatMode: "daily",
    hour: hm.hour,
    minute: hm.minute,
    sound: "ruffysound001.wav",
  });
}

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

    // 🔁 실제 예약
    for (const r of routines) {
      try {
        await scheduleRoutineOnIOS(r);
      } catch (e) {
        console.warn("[rehydrate] schedule fail for", r?.id, e);
      }
    }

    // 디버깅: 현재 예약 목록 한번 찍기
    try { await dumpPendingOnIOS("rehydrate"); } catch {}
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
  if (uid) rehydrateForUid(uid, "auth-state");
}, { immediate: true });

window.addEventListener("beforeunload", () => {
  // 필요 시 클린업
});

// ==== 강제 리하이드레이트 (Safari 콘솔에서 호출) ====
window.rehydrateNow = async () => {
  try {
    localStorage.removeItem(LS_LAST_HYDRATE_MS); // 쿨다운 무시
    const uid = currentUid || useAuthStore().user?.uid || null;
    console.log("[rehydrateNow] start. uid=", uid);
    await rehydrateForUid(uid, "manual");
    try { await dumpPendingOnIOS("manual"); } catch {}
    console.log("[rehydrateNow] done");
  } catch (e) {
    console.warn("[rehydrateNow] error", e);
  }
};
