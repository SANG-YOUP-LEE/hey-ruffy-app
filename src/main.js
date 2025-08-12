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

// 라이브러리 등록
app.use(router);
app.use(VueScrollPicker);

app.mount("#app");
