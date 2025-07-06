import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./assets/css/common.css";
import "./assets/css/main.css";
import "./assets/css/popup.css";
import "./assets/js/common.js";

const app = createApp(App);
app.use(router);
app.mount("#app");
