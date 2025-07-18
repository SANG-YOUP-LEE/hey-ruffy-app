<template>
  <div class="container">
    <div class="join_wrap">
      <h2>안녕!<br />다시 만나서 반가워요.</h2>

      <div class="form">
        <input
          type="email"
          placeholder="이메일을 입력해 주세요."
          v-model="email"
          :class="{ error: errorField === 'email' }"
          />
        <input
          type="password"
          placeholder="비밀번호를 입력해 주세요."
          v-model="password"
          :class="{ error: errorField === 'password' }"
          />
      </div>

      <div v-if="error" class="warn-message" v-html="error"></div>
      <div v-if="message" class="info-message" v-html="message"></div>

      <div class="radio">
        <div class="agree">
          혹시 비밀번호를 잊었다면
          <a href="#" @click.prevent="resetPassword">여기</a>를 눌러주세요.
        </div>
      </div>

      <div class="button">
        <a href="#" @click.prevent="login" class="b_green">러피 만나러가기</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseErrorMessage } from '@/utils/firebaseErrorMessage';

const email = ref('');
const password = ref('');
const error = ref('');
const message = ref('');
const errorField = ref('');
const router = useRouter();

const login = async () => {
  error.value = '';
  message.value = '';
  errorField.value = '';

  if (!email.value) {
    error.value = '이메일을 입력해 주세요.';
    errorField.value = 'email';
    return;
  }

  if (!password.value) {
    error.value = '비밀번호를 입력해 주세요.';
    errorField.value = 'password';
    return;
  }

  if (password.value.length < 6) {
    error.value = '비밀번호는 최소 6자리 이상이어야 해요.';
    errorField.value = 'password';
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);

    if (userCredential.user.emailVerified) {
      message.value = '로그인 중이예요...';
      setTimeout(() => {
        router.push('/main');
      }, 1000);
    } else {
      await signOut(auth);
      error.value = '이메일을 확인한 후 인증해주세요.<br />혹시 이메일이 도착하지 않았다면<br />스팸메일함도 확인해주세요.';
    }
  } catch (err) {
    error.value = getFirebaseErrorMessage(err.code);
  }
};

const resetPassword = async () => {
  error.value = '';
  message.value = '';
  errorField.value = '';

  if (!email.value) {
    error.value = "비밀번호를 재설정하려면<br />이메일을 먼저 입력하신 후<br />아래 '여기'를 다시 한번 눌러주세요.";
    errorField.value = 'email';
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email.value);
    message.value = '비밀번호 재설정 링크를 이메일로 보냈어요.<br />혹시 이메일이 도착하지 않았다면<br />스팸메일함을 확인해주세요.';
  } catch (err) {
    error.value = getFirebaseErrorMessage(err.code);
  }
};
</script>

