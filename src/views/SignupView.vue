사인업뷰 전체 코드 보여줄게.  반영해서 전체 코드 줘.
<template>
  <div class="signup-wrapper">
    <div class="signup-card">
      <h2>러피랑 친구 할래요?</h2>

      <input
        v-model="email"
        type="email"
        placeholder="이메일을 등록해 주세요."
        class="input email"
        :disabled="signupComplete"
      />

      <input
        v-model="password"
        type="password"
        placeholder="비밀번호를 등록해 주세요."
        class="input password"
        :disabled="signupComplete"
      />

      <label class="checkbox-label" v-if="!signupComplete">
        <input type="checkbox" v-model="isOver14" />
        <span>[필수] 14세 이상입니다.</span>
      </label>

      <p class="agreement" v-if="!signupComplete">
        러피와 친구를 맺으면 '헤이, 러피'의
        <a href="/terms" target="_blank">이용약관</a>과
        <a href="/privacy" target="_blank">개인정보 정책</a>에 동의하게 됩니다.
      </p>

      <!-- 친구맺기 버튼 -->
      <button
        class="signup-button"
        :disabled="!canSubmit || loading"
        @click="handleSignup"
        v-if="!signupComplete"
      >
        {{ loading ? '메일 보내는 중...' : '러피랑 친구맺기' }}
      </button>

      <!-- 가입 완료 후 인증 안내 -->
      <div v-if="signupComplete" class="after-signup">
        <p class="info">
          가입 이메일로 인증 메일을 보냈어요.<br />
          인증 후 아래 버튼을 눌러주세요.
        </p>
        <button class="sub-button" @click="checkVerification">인증 확인</button>
        <button class="sub-button gray" @click="resendVerification">인증 메일 다시 보내기</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  reload,
} from 'firebase/auth'

const email = ref('')
const password = ref('')
const isOver14 = ref(false)
const signupComplete = ref(false)
const loading = ref(false)

const router = useRouter()

const canSubmit = computed(() => {
  return email.value && password.value && isOver14.value
})

const handleSignup = async () => {
  if (!canSubmit.value || loading.value) return

  try {
    loading.value = true
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value)
    await sendEmailVerification(userCredential.user)

    // 약간의 지연 후 완료 상태로
    setTimeout(() => {
      signupComplete.value = true
      loading.value = false
    }, 800)
  } catch (error) {
    alert('⚠️ 오류: ' + error.message)
    loading.value = false
  }
}

const checkVerification = async () => {
  if (!auth.currentUser) return
  await reload(auth.currentUser)
  if (auth.currentUser.emailVerified) {
    alert('✅ 인증이 완료되었습니다!')
    router.push('/login')
  } else {
    alert('📩 아직 인증되지 않았어요. 메일함을 확인해주세요.')
  }
}

const resendVerification = async () => {
  if (!auth.currentUser) return
  try {
    await sendEmailVerification(auth.currentUser)
    alert('📬 인증 메일을 다시 보냈어요!')
  } catch (err) {
    alert('메일 발송 오류: ' + err.message)
  }
}
</script>

<style scoped>
.signup-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #fff7f0;
}

.signup-card {
  background: white;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-width: 360px;
  width: 90%;
}

h2 {
  text-align: center;
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

.checkbox-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-bottom: 12px;
}

.checkbox-label input {
  margin-right: 8px;
}

.agreement {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  margin-bottom: 18px;
}

.agreement a {
  color: #4a90e2;
  text-decoration: underline;
  font-weight: 500;
}

.signup-button {
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

.signup-button:disabled {
  background-color: #b0cfee;
  cursor: not-allowed;
}

.after-signup {
  text-align: center;
}

.after-signup .info {
  font-size: 14px;
  margin-bottom: 16px;
  line-height: 1.6;
}

.sub-button {
  display: block;
  width: 100%;
  margin: 8px 0;
  padding: 12px;
  font-size: 15px;
  border-radius: 999px;
  font-weight: bold;
  border: none;
  background-color: #4a90e2;
  color: white;
  cursor: pointer;
}

.sub-button.gray {
  background-color: #ccc;
  color: #333;
}
</style>
