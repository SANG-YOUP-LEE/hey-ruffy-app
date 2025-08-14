// src/router/index.js
import { createRouter, createWebHistory } from "vue-router"

import IntroView from "../views/IntroView.vue"
import SignupView from "../views/SignupView.vue"
import LoginView from "../views/LoginView.vue"
import MainView from "../views/MainView.vue"
import AddRoutineSelector from "../views/AddRoutineSelector.vue" // 필요 시 라우트로 접근 가능

const routes = [
  { path: "/", name: "intro", component: IntroView },
  { path: "/signup", name: "signup", component: SignupView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/main", name: "main", component: MainView },
  { path: "/add-routine", name: "addRoutine", component: AddRoutineSelector }, // 옵션
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
