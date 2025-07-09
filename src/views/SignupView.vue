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
          :class="{ 'input-error': showWarning && !email }"
          :disabled="signupComplete"
        />
        <input
          v-model="password"
          type="password"
          placeholder="비밀번호를 등록해 주세요."
          class="input password"
          :class="{ 'input-error': showWarning && !password }"
          :disabled="signupComplete"
        />
        <input
          v-model="passwordCheck"
          type="password"
          placeholder="비밀번호를 다시 입력해 주세요."
          class="input password-check"
          :class="{ 'input-error': showWarning && password !== passwordCheck }"
          :disabled="signupComplete"
        />
        <input
          v-model="nickname"
          type="text"
          placeholder="닉네임을 입력해 주세요."
          class="input nickname"
          :class="{ 'input-error': showWarning && !nickname }"
          :disabled="signupComplete"
        />
      </div>

      <div class="warn-message" v-if="!signupComplete && showWarning">
        <p v-if="!email">이메일을 입력해 주세요 🐶</p>
        <p v-else-if="!password">비밀번호를 입력해 주세요 🌙</p>
        <p v-else-if="password !== passwordCheck">비밀번호가 일치하지 않아요 🧩</p>
        <p v-else-if="!nickname">닉네임을 입력해 주세요 💫</p>
        <p v-else-if="!isOver14">14세 이상임을 확인해 주세요 🍑</p>
      </div>

      <div class="join_inner">
        <div class="radio" v-if="!signupComplete">
          <label class="checkbox-label">
            <input type="checkbox" v-model="isOver14" />
            <span><em>[필수]</em> 14세 이상입니다.</span>
          </label>
          <div class="agree">
            러피와 친구를 맺으면 '헤이, 러피'의<br />
            <a href="/terms" target="_blank" rel="noopener noreferrer">이용약관</a>과
            <a href="/privacy" target="_blank" rel="noopener noreferrer">개인정보 정책</a>에 동의하게 됩니다.
          </div>
        </div>
      </div>

      <div class="button">
        <button
          :disabled="loading || signupComplete"
          @click="handleSignup"
          v-if="!signupComplete"
        >
          {{ loading ? "메일 보내는 중..." : "이메일 인증하기" }}
        </button>

        <div v-else>
          <p class="info">
            가입 이메일로 인증 메일을 보냈어요.<br />
            인증 후 아래 버튼을 눌러주세요.
          </p>
          <button class="sub-button" @click="checkVerification">
            인증 확인
          </button>
          <button class="sub-button gray" @click="resendVerification">
            인증 메일 다시 보내기
          </button>
          <button class="sub-button gray" @click="editEmail">
            이메일 주소 수정하기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  reload,
  updateProfile
} from "firebase/auth"
import {
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore"
import { getFirebaseErrorMessage } from "@/utils/firebaseErrorMessage"

const email = ref("")
const password = ref("")
const passwordCheck = ref("")
const nickname = ref("")
const isOver14 = ref(false)
const signupComplete = ref(false)
const loading = ref(false)
const showWarning = ref(false)

const router = useRouter()

const handleSignup = async () => {
  if (
    !email.value ||
    !password.value ||
    !nickname.value.trim() ||
    !isOver14.value ||
    password.value !== passwordCheck.value
  ) {
    showWarning.value = true
    setTimeout(() => {
      showWarning.value = false
    }, 2000)
    return
  }

  loading.value = true

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )
    const user = userCredential.user

    // 닉네임을 Firebase Auth에 저장
    await updateProfile(user, {
      displayName: nickname.value
    })

    // 인증 메일 발송만 → Firestore 저장은 인증 완료 후로 미룸
    await sendEmailVerification(user)

    setTimeout(() => {
      signupComplete.value = true
      loading.value = false
    }, 800)
  } catch (error) {
    const message = getFirebaseErrorMessage(error.code)
    alert("오류: " + message)
    loading.value = false
  }
}

const checkVerification = async () => {
  if (!auth.currentUser) return
  await reload(auth.currentUser)

  if (auth.currentUser.emailVerified) {
    try {
      // 인증된 경우에만 Firestore에 저장
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        email: auth.currentUser.email,
        nickname: auth.currentUser.displayName,
        createdAt: serverTimestamp(),
        verified: true
      })
      alert("인증이 완료되었습니다!")
      router.push("/login")
    } catch (err) {
      alert("인증은 되었지만 사용자 정보 저장 중 오류가 발생했습니다.")
    }
  } else {
    alert("아직 인증되지 않았어요. 메일함을 확인해주세요.")
  }
}

const resendVerification = async () => {
  if (!auth.currentUser) return
  try {
    await sendEmailVerification(auth.currentUser)
    alert("인증 메일을 다시 보냈어요!")
  } catch (err) {
    alert("메일 발송 오류: " + err.message)
  }
}

const editEmail = () => {
  signupComplete.value = false
  email.value = ""
  password.value = ""
  passwordCheck.value = ""
  nickname.value = ""
  isOver14.value = false
}
</script>

<style scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-label input[type="checkbox"] {
  display: inline-block !important;
  width: 1.2rem;
  height: 1.2rem;
  margin: 0;
  appearance: auto !important;
  position: static !important;
  opacity: 1 !important;
}

.warn-message {
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  background-color: #fff3f3;
  border: 1px solid #ffa0a0;
  border-radius: 0.5rem;
  color: #e5484d;
  font-size: 0.95rem;
  line-height: 1.4;
  animation: fadeIn 0.3s ease-in-out;
  text-align: center;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.warn-message p {
  margin: 0.3rem 0;
  font-weight: bold;
}

.input-error {
  border: 1px solid #e5484d;
  background-color: #fff0f0;
  outline: none;
}

/* ✅ 버튼 스타일 전체 정리 */
.sub-button {
  display: block;
  width: 100%;
  padding: 0.8rem 1.2rem;
  border-radius: 2rem;
  font-weight: bold;
  font-size: 1rem;
  margin: 0.5rem 0;
  text-align: center;
  background-color: #0099ff; /* 기본: 파란색 */
  color: #fff;
  border: none;
  cursor: pointer;
}

.sub-button.gray {
  background-color: #eee; /* 회색 버튼 */
  color: #333;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
