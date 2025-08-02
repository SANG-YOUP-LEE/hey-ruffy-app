import { createApp } from "vue";
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
import "./assets/js/ui.js";

const app = createApp(App);
app.use(router);
app.mount("#app");
