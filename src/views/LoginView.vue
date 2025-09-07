<template>
  <div class="no-touch">
    <div class="container">
      <div class="join_wrap">
        <h2 v-if="isResetMode">비밀번호를 잊으셨나요?</h2>
        <h2 v-else v-html="welcomeMessage"></h2>

        <div class="form">
          <input
            type="email"
            placeholder="이메일을 입력해 주세요."
            v-model="email"
            @focus="clearAllMessages"
            :class="{ error: errorField === 'email' }"
          />
          <input
            v-if="!isResetMode"
            type="password"
            placeholder="비밀번호를 입력해 주세요."
            v-model="password"
            @focus="clearAllMessages"
            :class="{ error: errorField === 'password' }"
          />
        </div>

        <div v-if="errorText" class="warn-message" v-html="errorText"></div>
        <div v-if="messageText" class="info-message" v-html="messageText"></div>

        <div class="t_box" v-if="!isResetMode">
          혹시 비밀번호를 잊었다면
          <a :href="`/login?from=reset`">여기</a>를 눌러주세요.
        </div>

        <div class="button">
          <button
            v-if="isResetMode && !messageText"
            class="b_basic"
            @click="handlePasswordReset"
            :disabled="!email"
          >
            비밀번호 재설정 메일 보내기
          </button>

          <button
            v-else-if="isResetMode && messageText"
            class="b_basic"
            @click="router.push('/login')"
          >
            로그인 페이지로 돌아가기
          </button>

          <button
            v-else
            class="b_basic"
            @click="login"
            :disabled="!email"
          >
            러피 만나러가기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { getFirebaseErrorMessage } from '@/utils/firebaseErrorMessage'
import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const message = ref('')
const errorField = ref('')
const router = useRouter()
const route = useRoute()
const a = useAuthStore()

const errorText = computed(() => (error.value.trim() !== '' ? error.value : ''))
const messageText = computed(() => (message.value.trim() !== '' ? message.value : ''))
const isResetMode = computed(() => route.query.from === 'reset')

const welcomeMessage = computed(() => {
  if (route.query.from === 'signup') return '친구가 된다니 기분 최고!'
  if (route.query.from === 'intro') return '다시 만나서 반가워요!'
  return '다시 만나서 반가워요!'
})

const showError = async (msg, field = '') => {
  error.value = ''
  message.value = ''
  errorField.value = ''
  await nextTick()
  error.value = msg
  errorField.value = field
}

const showMessage = async (msg) => {
  error.value = ''
  errorField.value = ''
  message.value = ''
  await nextTick()
  message.value = msg
}

const clearAllMessages = () => {
  error.value = ''
  message.value = ''
  errorField.value = ''
}

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

const handlePasswordReset = async () => {
  clearAllMessages()
  if (!email.value) {
    await showError('이메일을 입력해 주세요.', 'email')
    return
  }
  try {
    await sendPasswordResetEmail(auth, email.value)
    await showMessage('비밀번호 재설정 링크를 이메일로 보냈어요.<br />이메일이 도착하지 않았다면<br />스팸메일함을 확인해주세요.')
  } catch (err) {
    await showError(getFirebaseErrorMessage(err.code))
  }
}

const login = async () => {
  clearAllMessages()
  if (!email.value) { await showError('이메일을 입력해 주세요.', 'email'); return }
  if (!isValidEmail(email.value)) { await showError(getFirebaseErrorMessage('auth/invalid-email'), 'email'); return }
  if (!password.value) { await showError('비밀번호를 입력해 주세요.', 'password'); return }
  if (password.value.length < 6) { await showError('비밀번호는 6자 이상 입력해 주세요.', 'password'); return }

  try {
    const cred = await signInWithEmailAndPassword(auth, email.value, password.value)
    if (cred.user.emailVerified) {
      await showMessage('로그인 중이예요...')
      setTimeout(() => { router.push('/main') }, 1000)
    } else {
      await a.dispose()
      await showError('이메일을 확인하신 후 인증해주세요.<br />이메일이 도착하지 않았다면<br />스팸메일함을 확인해주세요.', 'email')
    }
  } catch (err) {
    await showError(getFirebaseErrorMessage(err.code))
  }
}
</script>