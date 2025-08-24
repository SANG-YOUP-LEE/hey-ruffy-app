import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

// CSS
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
import "./assets/js/ui.js";

// vue-scroll-picker 추가
import VueScrollPicker from "vue-scroll-picker";
import "vue-scroll-picker/style.css";

const app = createApp(App);

// 핀치줌 차단
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });

// 더블탭 확대 차단
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

// 크롬/안드 일부 브라우저 ctrl+휠 확대 차단
document.addEventListener('wheel', e => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });


// 라이브러리 등록
app.use(router);
app.use(VueScrollPicker);

app.mount("#app");

