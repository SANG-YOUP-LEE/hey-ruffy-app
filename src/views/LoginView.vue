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
  
        <!-- ✅ 수정 후 -->
        <div class="t_box" v-if="!isResetMode">
          혹시 비밀번호를 잊었다면
          <a :href="`/login?from=reset`">여기</a>를 눌러주세요.
        </div>
  
        <!-- 버튼 영역 -->
        <div class="button">
          <!-- 비밀번호 재설정 모드: 아직 메세지 없음 -->
          <button
            v-if="isResetMode && !messageText"
            class="b_basic"
            @click="handlePasswordReset"
            :disabled="!email"
          >
            비밀번호 재설정 메일 보내기
          </button>

          <!-- 비밀번호 재설정 모드: 메일 전송 완료됨 -->
          <button
            v-else-if="isResetMode && messageText"
            class="b_basic"
            @click="router.push('/login')"
          >
            로그인 페이지로 돌아가기
          </button>


          <!-- 일반 로그인 모드 -->
          <!-- 일반 로그인 모드 -->
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
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { getFirebaseErrorMessage } from '@/utils/firebaseErrorMessage'

// 하나로 정리
const handlePasswordReset = async () => {
  clearAllMessages()
  if (!email.value) {
    await showError("이메일을 입력해 주세요.", "email")
    return
  }

  try {
    await sendPasswordResetEmail(auth, email.value)
    await showMessage("비밀번호 재설정 링크를 이메일로 보냈어요.<br />이메일이 도착하지 않았다면<br />스팸메일함을 확인해주세요.")
  } catch (err) {
    await showError(getFirebaseErrorMessage(err.code))
  }
}
const email = ref('')
const password = ref('')
const error = ref('')
const message = ref('')
const errorField = ref('')
const router = useRouter()

const errorText = computed(() =>
  error.value.trim() !== '' ? error.value : ''
)

const route = useRoute()

const welcomeMessage = computed(() => {
  if (route.query.from === 'signup') {
    return '친구가 된다니 기분 최고!'
  } else if (route.query.from === 'intro') {
    return '다시 만나서 반가워요!'
  } else {
    return '다시 만나서 반가워요!'
  }
})

const messageText = computed(() =>
  message.value.trim() !== '' ? message.value : ''
)

const isResetMode = computed(() => route.query.from === 'reset')

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
  console.log('✅ 로그인 함수 호출됨!', email.value, password.value)

  clearAllMessages()

  // ✅ 이메일 먼저 검사 (비밀번호 없어도 오류 띄우게)
  if (!email.value) {
    await showError('이메일을 입력해 주세요.', 'email')
    return
  }

  if (!isValidEmail(email.value)) {
    await showError(getFirebaseErrorMessage('auth/invalid-email'), 'email')
    return
  }

  // ✅ 그다음 비밀번호 검사
  if (!password.value) {
    await showError('비밀번호를 입력해 주세요.', 'password')
    return
  }

  if (password.value.length < 6) {
    await showError('비밀번호는 6자 이상 입력해 주세요.', 'password')
    return
  }

  // 🔐 로그인 시도
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
</script>
