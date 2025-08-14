// src/router/index.js
import { createRouter, createWebHistory } from "vue-router"
import IntroView from "../views/IntroView.vue"
import SignupView from "../views/SignupView.vue"
import LoginView from "../views/LoginView.vue"
import MainView from "../views/MainView.vue"
import AddRoutineSelector from "../views/AddRoutineSelector.vue"
import { topLoaderStart, topLoaderDone } from "@/lib/topLoader"

const routes = [
  { path: "/", name: "intro", component: IntroView },
  { path: "/signup", name: "signup", component: SignupView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/main", name: "main", component: MainView },
  { path: "/add-routine", name: "addRoutine", component: AddRoutineSelector },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => { topLoaderStart('route'); next() })
router.afterEach(() => { topLoaderDone('route') })
router.onError(() => { topLoaderDone('route') })

export default router
