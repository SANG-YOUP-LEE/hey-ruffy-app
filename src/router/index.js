import { createRouter, createWebHistory } from "vue-router";
import IntroView from "../views/IntroView.vue";
import SignupView from "../views/SignupView.vue";
import LoginView from "../views/LoginView.vue";
import MainView from "../views/MainView.vue";

const routes = [
  { path: "/", name: "intro", component: IntroView },
  { path: "/signup", name: "signup", component: SignupView },
  { path: "/login", name: "login", component: LoginView },
  { path: "/main", name: "main", component: MainView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
