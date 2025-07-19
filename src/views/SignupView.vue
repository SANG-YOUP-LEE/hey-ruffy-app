<template>
  <div class="container">
    <div class="join_wrap">
      <h2>러피랑 친구 할래요?</h2>

      <div class="form">
        <input
          v-model="email"
          type="email"
          placeholder="이메일을 등록해 주세요."
          class="input"
          :disabled="signupComplete"
        />
        <input
          v-model="password"
          type="password"
          placeholder="비밀번호를 등록해 주세요."
          class="input"
          :disabled="signupComplete"
        />
        <input
          v-model="passwordCheck"
          type="password"
          placeholder="비밀번호를 다시 입력해 주세요."
          class="input"
          :disabled="signupComplete"
        />
      </div>

      <!-- 유효성 검사 경고 -->
      <div class="warn-message" v-if="!signupComplete && showWarning && warningText">
        <p>{{ warningText }}</p>
      </div>

      <!-- 안내 메시지 -->
      <div class="warn-message" v-if="infoMessage">
        <p>{{ infoMessage }}</p>
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
          class="b_green"
          :disabled="loading || signupComplete"
          @click="handleSignup"
          v-if="!signupComplete"
        >
          {{ loading ? "메일을 보내고 있어요..." : "이메일 인증하기" }}
        </button>
        <div v-else>
          <button class="b_green" @click="checkVerification">
            인증 확인
          </button>
          <button class="b_white_br_green" @click="resendVerification">
            인증 메일 다시 보내기
          </button>
          <button class="b_white_br_green" @click="editEmail">
            이메일 주소 수정하기
          </button>
        </div>

        <!-- 에러 메시지 -->
        <div class="error-box" v-if="errorMessage"  v-html="errorMessage"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  reload,
  fetchSignInMethodsForEmail
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
const isOver14 = ref(false)
const signupComplete = ref(false)
const loading = ref(false)
const showWarning = ref(false)
const errorMessage = ref("")
const infoMessage = ref("")
const router = useRouter()

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const warningText = computed(() => {
  if (!email.value) return "이메일을 입력해 주세요."
  if (!isValidEmail(email.value)) return "이메일 형식이 바르지 않습니다."
  if (!password.value) return "비밀번호를 입력해 주세요."
  if (password.value.length < 6) return "비밀번호는 6자 이상 입력해 주세요."
  if (!passwordCheck.value) return "비밀번호를 다시 한번 입력해 주세요."
  if (password.value !== passwordCheck.value) return "비밀번호가 일치하지 않아요."
  if (!isOver14.value) return "14세 이상임을 확인해 주세요."
  return ""
})

const showError = async (msg) => {
  errorMessage.value = ""
  await nextTick()
  errorMessage.value = msg
  setTimeout(() => {
    errorMessage.value = ""
  }, 2500)
}

const showInfo = async (msg) => {
  infoMessage.value = ""
  await nextTick()
  infoMessage.value = msg
  setTimeout(() => {
    infoMessage.value = ""
  }, 3000)
}

const handleSignup = async () => {
  if (
    !email.value ||
    !isValidEmail(email.value) ||
    !password.value ||
    password.value.length < 6 ||
    !isOver14.value ||
    password.value !== passwordCheck.value
  ) {
    showWarning.value = true
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
    await sendEmailVerification(user)
    signupComplete.value = true
    await showInfo("가입 이메일로 인증 메일을 보냈어요.")
  } catch (error) {
    const message = getFirebaseErrorMessage(error.code)
    await showError(message)
  } finally {
    loading.value = false
  }
}


const checkVerification = async () => {
  if (!auth.currentUser) return
  await reload(auth.currentUser)

  if (auth.currentUser.emailVerified) {
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        email: auth.currentUser.email,
        createdAt: serverTimestamp(),
        verified: true
      })
      await showInfo("인증이 완료되었습니다!")
      router.push("/login")
    } catch (err) {
      await showError("인증은 되었지만 사용자 정보 저장 중 오류가 발생했습니다.")
    }
  } else {
    await showInfo("아직 인증되지 않았어요. 메일함을 확인해주세요.")
  }
}

const resendVerification = async () => {
  if (!auth.currentUser) return
  try {
    await sendEmailVerification(auth.currentUser)
    await showInfo("인증 메일을 다시 보냈어요!")
  } catch (err) {
    const message = getFirebaseErrorMessage(err.code)
    await showError(message)
  }
}


const editEmail = () => {
  signupComplete.value = false
  email.value = ""
  password.value = ""
  passwordCheck.value = ""
  isOver14.value = false
}
</script>

