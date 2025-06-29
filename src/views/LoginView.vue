<template>
  <div class="container">
		<div class="join_wrap">
	    <h2>안녕!<br />다시 만나서 반가워요.</h2>
			<div class="form">
				<input type="email" placeholder="이메일을 입력해 주세요." v-model="email" :class="{ error: errorField === 'email' }">
				<input type="password" placeholder="비밀번호를 입력해 주세요." v-model="password":class="{ error: errorField === 'password' }">
			</div>
			<div class="radio">
				<div class="agree">혹시 비밀번호를 잊었다면 <a href="#" @click.prevent="resetPassword">여기</a>를 눌러주세요.</div>
			</div>
	
			<div class="button">
	     <a href="#" @click.prevent="login" class="login-button">러피 만나러가기</a>
			</div>
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
