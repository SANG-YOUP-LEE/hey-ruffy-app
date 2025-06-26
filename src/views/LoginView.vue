<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h2>Hi! 다시 만나서 반가워</h2>

      <input
        v-model="email"
        type="email"
        placeholder="이메일을 입력해 주세요."
        class="input email"
        :class="{ error: errorField === 'email' }"
      />

      <input
        v-model="password"
        type="password"
        placeholder="비밀번호를 입력해 주세요."
        class="input password"
        :class="{ error: errorField === 'password' }"
      />

      <p class="reset-text">
        혹시 비밀번호를 잊었다면 이메일 입력 후
        <span @click="resetPassword" class="link">여기</span>를 눌러주세요.
      </p>

      <button class="login-button" @click="login">러피 만나러가기</button>

      <p v-if="message" class="message">✅ {{ message }}</p>
      <p v-if="error" class="error">❌ {{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const message = ref('')
const errorField = ref('')
const router = useRouter()

const login = async () => {
  error.value = ''
  message.value = ''
  errorField.value = ''

  if (!email.value) {
    error.value = '이메일을 입력해 주세요.'
    errorField.value = 'email'
    return
  }
  if (!password.value) {
    error.value = '비밀번호를 입력해 주세요.'
    errorField.value = 'password'
    return
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value)

    if (userCredential.user.emailVerified) {
      message.value = '로그인 성공! 잠시만 기다려 주세요...'
      setTimeout(() => {
        router.push('/welcome')
      }, 1000)
    } else {
      await signOut(auth)
      error.value = '이메일 인증이 필요합니다. 메일함을 확인해 주세요.'
    }
  } catch (err) {
    error.value = '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
}

const resetPassword = async () => {
  error.value = ''
  message.value = ''
  errorField.value = ''

  if (!email.value) {
    error.value = '비밀번호를 재설정하려면 이메일을 먼저 입력해 주세요.'
    errorField.value = 'email'
    return
  }

  try {
    await sendPasswordResetEmail(auth, email.value)
    message.value = '비밀번호 재설정 링크를 이메일로 보냈어요!'
  } catch (err) {
    error.value = '재설정 이메일 발송에 실패했어요.'
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #fff7f0;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-width: 360px;
  width: 90%;
  text-align: center;
}

h2 {
  font-size: 24px;
  font-weight: bold;
  color: #4a90e2;
  margin-bottom: 24px;
}

.input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: 15px;
  border-radius: 8px;
  border: 1.5px solid #ccc;
  margin-bottom: 14px;
}

.email {
  border-color: #a75a2d;
}

.password {
  border-color: #ccc;
}

.input.error {
  border-color: #e74c3c;
}

.reset-text {
  font-size: 13px;
  color: #444;
  margin-bottom: 18px;
}

.link {
  color: #4a90e2;
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
}

.login-button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  border-radius: 999px;
  background-color: #4a90e2;
  color: white;
  border: none;
  cursor: pointer;
  font-weight: bold;
}

.message {
  color: green;
  font-size: 14px;
  margin-top: 12px;
}

.error {
  color: red;
  font-size: 14px;
  margin-top: 12px;
}
</style>
