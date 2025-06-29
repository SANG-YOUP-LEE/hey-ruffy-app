<template>
  <div class="container">
    <div class="join_wrap">
      <h2>러피랑 친구 할래요?</h2>
      <div class="form">
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
      </div>
      <div class="join_inner">
        <div class="radio">
          <label class="checkbox-label" v-if="!signupComplete">
            <input type="checkbox" v-model="isOver14" />
            <span><em>[필수]</em> 14세 이상입니다.</span>
          </label>
          <div class="agree" v-if="!signupComplete">
            러피와 친구를 맺으면 '헤이, 러피'의<br /><a href="/terms" target="_blank">이용약관</a>과 <a href="/privacy" target="_blank">개인정보 정책</a>에 동의하게 됩니다.
          </div>
        </div>
      </div>

      <div class="button">
        <button        
          :disabled="!canSubmit || loading"
          @click="handleSignup"
          v-if="!signupComplete"
        >
          {{ loading ? '메일 보내는 중...' : '이메일 인증하기' }}
        </button>

        <div v-if="signupComplete">
          <p class="info">
            가입 이메일로 인증 메일을 보냈어요.<br />
            인증 후 아래 버튼을 눌러주세요.
          </p>
          <button class="sub-button" @click="checkVerification">인증 확인</button>
          <button class="sub-button gray" @click="resendVerification">인증 메일 다시 보내기</button>
        </div>
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

    setTimeout(() => {
      signupComplete.value = true
      loading.value = false
    }, 800)
  } catch (error) {
    let message = '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.'

    switch (error.code) {
      case 'auth/email-already-in-use':
        message = '이미 가입된 이메일이에요. 로그인해 주세요.'
        break
      case 'auth/invalid-email':
        message = '이메일 형식이 올바르지 않아요.'
        break
      case 'auth/weak-password':
        message = '비밀번호는 6자 이상으로 설정해 주세요.'
        break
      case 'auth/operation-not-allowed':
        message = '이메일 가입이 현재 허용되지 않아요. 관리자에게 문의해 주세요.'
        break
      default:
        message = error.message
    }

    alert('오류: ' + message)
    loading.value = false
  }
}

const checkVerification = async () => {
  if (!auth.currentUser) return
  await reload(auth.currentUser)
  if (auth.currentUser.emailVerified) {
    alert('인증이 완료되었습니다!')
    router.push('/login')
  } else {
    alert('아직 인증되지 않았어요. 메일함을 확인해주세요.')
  }
}

const resendVerification = async () => {
  if (!auth.currentUser) return
  try {
    await sendEmailVerification(auth.currentUser)
    alert('인증 메일을 다시 보냈어요!')
  } catch (err) {
    alert('메일 발송 오류: ' + err.message)
  }
}
</script>