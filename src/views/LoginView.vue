<template>
  <div class="no-touch">
    <div class="join_wrap">
      <h2>안녕!<br />다시 만나서 반가워요. </h2>

      <div class="form">
        <input
          type="email"
          placeholder="이메일을 입력해 주세요."
          v-model="email"
          @focus="clearAllMessages"
          :class="{ error: errorField === 'email' }"
        />
        <input
          type="password"
          placeholder="비밀번호를 입력해 주세요."
          v-model="password"
          @focus="clearAllMessages"
          :class="{ error: errorField === 'password' }"
        />
      </div>

      <div v-if="errorText" class="warn-message" v-html="errorText"></div>
      <div v-if="messageText" class="info-message" v-html="messageText"></div>

      <div class="t_box">
        혹시 비밀번호를 잊었다면
        <a href="#" @click.prevent="resetPassword">여기</a>를 눌러주세요.
      </div>

      <a href="#" @click.prevent="login" class="b_green">러피 만나러가기</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { getFirebaseErrorMessage } from '@/utils/firebaseErrorMessage'

const email = ref('')
const password = ref('')
const error = ref('')
const message = ref('')
const errorField = ref('')
const router = useRouter()

const errorText = computed(() =>
  error.value.trim() !== '' ? error.value : ''
)
const messageText = computed(() =>
  message.value.trim() !== '' ? message.value : ''
)

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

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const login = async () => {
  if (!email.value) {
    await showError('이메일을 입력해 주세요.', 'email')
    return
  }

  if (!isValidEmail(email.value)) {
    await showError(getFirebaseErrorMessage('auth/invalid-email'), 'email')
    return
  }

  if (!password.value) {
    await showError('비밀번호를 입력해 주세요.', 'password')
    return
  }

  if (password.value.length < 6) {
     await showError('비밀번호는 6자 이상 입력해 주세요.', 'password')
    return
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )

    if (userCredential.user.emailVerified) {
      await showMessage('로그인 중이예요...')
      setTimeout(() => {
        router.push('/main')
      }, 1000)
    } else {
      await signOut(auth)
      await showError(
        '이메일을 확인하신 후 인증해주세요.<br />이메일이 도착하지 않았다면<br />스팸메일함을 확인해주세요.',
        'email'
      )
    }
  } catch (err) {
    console.log('Firebase error code:', err.code)
    await showError(getFirebaseErrorMessage(err.code))
  }
}

const resetPassword = async () => {
  if (!email.value) {
    await showError(
      "이메일을 입력하신 후<br />아래 '여기'를 다시 한번 눌러주세요.",
      'email'
    )
    return
  }

  try {
    await sendPasswordResetEmail(auth, email.value)
    await showMessage(
      '비밀번호 재설정 링크를 이메일로 보냈어요.<br />이메일이 도착하지 않았다면<br />스팸메일함을 확인해주세요.'
    )
  } catch (err) {
    await showError(getFirebaseErrorMessage(err.code))
  }
}
</script>
