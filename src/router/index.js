// src/router/index.js
import { createRouter, createWebHistory, createWebHashHistory } from "vue-router"
import { Capacitor } from "@capacitor/core"

import IntroView from "../views/IntroView.vue"
import SignupView from "../views/SignupView.vue"
import LoginView from "../views/LoginView.vue"
import MainView from "../views/MainView.vue"
import AddRoutineSelector from "../views/AddRoutineSelector.vue"
import Lnb from "../components/common/Lnb.vue"
import AdminCaptions from "../views/admin/AdminCaptions.vue"

const routes = [
  { path: "/", name: "intro", component: IntroView },
  { path: "/signup", name: "signup", component: SignupView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/main", name: "main", component: MainView },
  { path: "/add-routine", name: "addRoutine", component: AddRoutineSelector },
  { path: "/lnb", name: "lnbMain", component: Lnb },
  { path: "/pages/ruffy-pick", name: "LnbRuffyPick", component: () => import("@/views/pages/LnbRuffyPick.vue") },
  { path: "/admin/captions", name: "adminCaptions", component: AdminCaptions }
]

const isNative = Capacitor?.isNativePlatform?.() || !!window.Capacitor

const router = createRouter({
  history: isNative ? createWebHashHistory() : createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() { return { top: 0 } },
})

export default router
