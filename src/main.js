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

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueScrollPicker);
app.mount("#app");

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
   로그인 후 1회만 파이어베이스 → iOS 알림 복구
   (요청한 부분만 추가)
────────────────────────────────────────── */
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { useAlarmStore } from '@/stores/alarm'

let didHydrate = false

onAuthStateChanged(auth, async (user) => {
  if (!user) return
  if (didHydrate) return
  if (!window.webkit?.messageHandlers?.notify) return // iOS 브릿지 없으면 스킵
  didHydrate = true

  try {
    const snap = await getDocs(collection(db, `users/${user.uid}/routines`))
    const routines = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    const alarm = useAlarmStore()
    // 스토어에 메서드가 있으면 실행 (안전 가드)
    if (typeof alarm.resetDedup === 'function') alarm.resetDedup()
    if (typeof alarm.rehydrateFromRoutines === 'function') {
      await alarm.rehydrateFromRoutines(routines)
    }
  } catch (e) {
    console.warn('[alarm rehydrate] failed:', e)
  }
})
