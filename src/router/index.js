import { createRouter, createWebHistory } from 'vue-router'
import IntroView from '../views/IntroView.vue'
import SignupView from '../views/SignupView.vue'
import LoginView from '../views/LoginView.vue'
import WelcomeView from '../views/WelcomeView.vue'
import AddCommitmentView from '../views/AddCommitmentView.vue'
import MainView from '../views/MainView.vue'

const routes = [
  { path: '/', name: 'intro', component: IntroView }, // 👈 초기 경로를 IntroView로 설정
  { path: '/signup', name: 'signup', component: SignupView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/welcome', name: 'welcome', component: WelcomeView },
  { path: '/add', name: 'add', component: AddCommitmentView },
  { path: '/main', name: 'main', component: MainView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
