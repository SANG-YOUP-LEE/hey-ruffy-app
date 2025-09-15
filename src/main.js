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


import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuthStore } from "@/stores/auth";
import { App as CapApp } from "@capacitor/app";

import { dumpPending as dumpPendingOnIOS } from "@/utils/iosNotify";

// --- 부팅 에러 훅(필수 아님, 안정성 위해 최소만 유지) ---
window.addEventListener("error", e => {
  console.error("[BOOT][window.onerror]", e.message, e.filename, e.lineno, e.colno);
});
window.addEventListener("unhandledrejection", e => {
  console.error("[BOOT][unhandledrejection]", e.reason);
});
console.log("[BOOT] main.js start");

// ───────────────────────────────────────────
// Vue 부팅
// ───────────────────────────────────────────
const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
setActivePinia(pinia);
app.use(router);
app.mount("#app");

// ───────────────────────────────────────────
// 제스처/줌 방지 (오타 수정 완료)
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
// iOS 브리지 유틸 전역 바인딩(개발/운영 공용: 점검용)
// ───────────────────────────────────────────
const hasIOSBridge = () => !!(window.webkit?.messageHandlers?.notify);
// window.scheduleOnIOS = scheduleOnIOS;   // 제거
// window.cancelOnIOS = cancelOnIOS;       // 제거
window.dumpPendingOnIOS = dumpPendingOnIOS;

// ───────────────────────────────────────────
// 리하이드레이트(재등록) 안정 로직
//  - 쿨다운(기본 3분)
//  - 해시가드(루틴 변화 없으면 스킵)
//  - 예약 전 purge(cancelOnIOS)로 중복 제거  ← 이제 scheduler가 전담
// ───────────────────────────────────────────

// 저장 키
const LS_LAST_HYDRATE_MS = "rfy_last_hydrate_ms";
const LS_LAST_HASH = "rfy_last_routines_hash";

// 쿨다운
const COOLDOWN_MS = 20 * 1000;
const shouldCooldown = () => {
  const last = Number(localStorage.getItem(LS_LAST_HYDRATE_MS) || 0);
  return last && (Date.now() - last) < COOLDOWN_MS;
};
const markHydrated = () => localStorage.setItem(LS_LAST_HYDRATE_MS, String(Date.now()));

// 해시
const stableRoutineSnapshot = (rs) => {
  const pick = r => ({
    id: r.id ?? r.routineId ?? "",
    title: r.title ?? "",
    repeatType: r.repeatType ?? "",
    repeatEveryDays: r.repeatEveryDays ?? null,
    repeatWeekDays: Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays : [],
    repeatMonthDays: Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : [],
    startDate: r.startDate ?? null,
    endDate: r.endDate ?? null,
    start: r.start ?? null,
    end: r.end ?? null,
    alarmTime: r.alarmTime ?? null,
    rule: r.rule ?? null,
  });
  return JSON.stringify(rs.map(pick).sort((a,b)=>String(a.id).localeCompare(String(b.id))));
};
const djb2 = (s) => { let h=5381; for (let i=0;i<s.length;i++) h=((h<<5)+h)+s.charCodeAt(i); return (h>>>0).toString(16); };
const getHash = () => localStorage.getItem(LS_LAST_HASH) || "";
const setHash = (h) => localStorage.setItem(LS_LAST_HASH, h);

// 브리지 대기
const waitBridgeReady = async (tries = 20, delay = 300) => {
  if (hasIOSBridge()) return true;
  for (let i = 0; i < tries; i++) {
    await new Promise(r => setTimeout(r, delay));
    if (hasIOSBridge()) return true;
  }
  return false;
};

// 시간/날짜 헬퍼
const p2 = n => String(n).padStart(2,"0");
const parseHM = t => {
  const m = String(t || "").match(/^\s*(\d{1,2}):(\d{2})\s*$/);
  if (!m) return null;
  const hour = Math.min(23, Math.max(0, +m[1]));
  const minute = Math.min(59, Math.max(0, +m[2]));
  return { hour, minute };
};
const toISODate = d => (d?.year && d?.month && d?.day) ? `${d.year}-${p2(d.month)}-${p2(d.day)}` : null;
const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const toAtISO = (dateISO, hm) => (dateISO && hm) ? `${dateISO}T${p2(hm.hour)}:${p2(hm.minute)}:00+09:00` : null;

// 한 개 루틴 예약 (중복 방지 위해 먼저 purge) ← 이제 실예약은 scheduler가 담당
async function scheduleOne(r) {
  const rid = r.id ?? r.routineId; if (!rid) return;
  const baseId = `routine-${rid}`;
  const hm = parseHM(r.alarmTime); if (!hm) return;

  // 과거: cancelOnIOS(baseId)로 purge → scheduleOnIOS(...) 호출
  // 현재: 예약은 routines/scheduler가 처리하므로 여기서는 아무 것도 하지 않음.
  // (남겨둔 이유: 해시/쿨다운 로직의 형태를 유지하기 위해)
  void baseId; void hm; // linter quiet
}

// 전체 리하이드레이트
let isHydrating = false;
async function rehydrateForUid(uid, reason = "auto", { force = false } = {}) {
  if (!uid) return;
  if (isHydrating) return;
  if (!force && shouldCooldown()) return;
  if (!(await waitBridgeReady())) return;

  isHydrating = true;
  try {
    const snap = await getDocs(collection(db, `users/${uid}/routines`));
    const routines = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const newHash = djb2(stableRoutineSnapshot(routines));
    const oldHash = getHash();
    if (!force && newHash === oldHash) {
      markHydrated();
      return;
    }
    setHash(newHash);
    markHydrated();

    // 과거: 여기서 scheduleOne(r)로 직접 예약했음 → 중복 원인
    // 현재: 예약은 routines.js(bind) → scheduler.js(rehydrateFromRoutines) 경로가 수행
    //       이 파일에서는 디버그 덤프만 남김
    try { await dumpPendingOnIOS(reason || "rehydrate"); } catch {}
  } catch (e) {
    console.warn("[rehydrate] failed:", e);
  } finally {
    isHydrating = false;
  }
}

// ───────────────────────────────────────────
// Auth & 상태 변화에 맞춘 재등록 트리거
// ───────────────────────────────────────────
const auth = useAuthStore();
auth.initOnce();

let currentUid = null;

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && currentUid) {
    rehydrateForUid(currentUid, "foreground");
  }
});

CapApp.addListener("appStateChange", ({ isActive }) => {
  if (isActive && currentUid) {
    rehydrateForUid(currentUid, "appState");
  }
});

watch(() => auth.user?.uid || null, (uid) => {
  currentUid = uid;
  if (uid) rehydrateForUid(uid, "auth-state", { force: true }); // 최초엔 force 1회
}, { immediate: true });

window.addEventListener("beforeunload", () => {
  // 필요시 클린업
});

// ───────────────────────────────────────────
// 수동 강제 재등록 (콘솔에서 호출)
// ───────────────────────────────────────────
window.rehydrateNow = async (force = true) => {
  const uid = currentUid || useAuthStore().user?.uid || null;
  console.log("[rehydrateNow] start uid=", uid, "force=", force);
  await rehydrateForUid(uid, "manual", { force });
  try { await dumpPendingOnIOS("manual"); } catch {}
  console.log("[rehydrateNow] done");
};
