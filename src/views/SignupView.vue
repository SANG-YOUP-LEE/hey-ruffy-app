<template>
  <div class="yscroll">
    <div class="join_wrap">
      <h2>러피랑 친구 할래요?</h2>

      <div class="form">
        <input
          v-model="email"
          type="email"
          placeholder="이메일을 등록해 주세요."
          :disabled="signupComplete"

        />
        <input
          v-model="password"
          type="password"
          placeholder="비밀번호를 등록해 주세요."
          :disabled="signupComplete"
          
        />
        <input
          v-model="nickname"
          type="text"
          placeholder="닉네임을 입력해 주세요."
          :disabled="signupComplete"
          
        />

        <RuffySelectorSignup v-model="selectedOption" />

        <div class="select_skin">
          <div class="info_text light">산책을 부르는 행운의 색을 골라주세요.</div>
          <div class="list">
            <a
              href="#none"
              class="color blue"
              :class="{ on: selectedColor === 'blue' }"
              @click.prevent="selectColor('blue')"
            >
              <span></span>
            </a>
            <a
              href="#none"
              class="color red"
              :class="{ on: selectedColor === 'red' }"
              @click.prevent="selectColor('red')"
            >
              <span></span> 
            </a>
            <a
              href="#none"
              class="color green"
              :class="{ on: selectedColor === 'green' }"
              @click.prevent="selectColor('green')"
            >
              <span></span> 
            </a>
            <a
              href="#none"
              class="color bw"
              :class="{ on: selectedColor === 'bw' }"
              @click.prevent="selectColor('bw')"
            >
              <span></span>
            </a>
          </div>
        </div>

        <!-- 유효성 경고 -->
        <div class="warn-message" v-if="!signupComplete && showWarning && warningText">
          <p>{{ warningText }}</p>
        </div>

        <!-- 안내 메시지 -->
        <div class="warn-message" v-if="infoMessage" v-html="infoMessage"></div>

        <div class="t_box" v-if="!signupComplete">
          <label class="checkbox-label">
            <input type="checkbox" v-model="isOver14" @change="clearMessages" />
            <span class="checkmark"></span>
            <span><em class="t_red01">[필수]</em> 14세 이상입니다.</span>
          </label>
          <div class="agree">
            러피와 친구를 맺으면 '헤이, 러피'의<br />
            <a href="/terms" target="_blank" rel="noopener noreferrer" @click="clearMessages">이용약관</a>과
            <a href="/privacy" target="_blank" rel="noopener noreferrer" @click="clearMessages">개인정보 정책</a>에 동의하게 됩니다.
          </div>
        </div>

        <!-- 버튼 -->
        <div :class="['button', { mt1: resendClicked }]">
          <button
            class="b_basic"
            :disabled="loading || signupComplete"
            @click="handleSignup"
            v-if="!signupComplete"
          >
            {{
              loading
                ? "메일을 보내고 있어요..."
                : canStartSignup
                  ? "이메일 인증하기"
                  : "러피랑 친구하기"
            }}
          </button>

          <div class="button" v-else>
            <button class="b_basic" @click="checkVerification">인증 확인</button>
            <button class="b_basic_white" @click="resendVerification" :disabled="resendCooldown > 0">
              {{
                resendCooldown > 0
                  ? `인증 메일 재전송 (${resendCooldown}초)`
                  : "인증 메일 다시 보내기"
              }}
            </button>
            <button class="b_basic_white" @click="editEmail">이메일 주소 수정하기</button>
          </div>

          <div class="error-box" v-if="errorMessage" v-html="errorMessage"></div>
        </div>
      </div>
    </div>
  </div>
</template>


<!-- temp commit for redeploy -->

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  reload
} from "firebase/auth"
import {
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore"
import { getFirebaseErrorMessage } from "@/utils/firebaseErrorMessage"
import RuffySelectorSignup from '@/components/common/RuffySelectorSignup.vue'
// 폼 관련
const email = ref("")
const password = ref("")
const nickname = ref("")
const isOver14 = ref(false)
const signupComplete = ref(false)
const loading = ref(false)
const showWarning = ref(false)
const errorMessage = ref("")
const infoMessage = ref("")
const resendCooldown = ref(0)
let resendTimer = null
const resendClicked = ref(false)
const router = useRouter()

// 러피 선택 관련
const selectedOption = ref("")


// 이메일 유효성
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const warningText = computed(() => {
  if (!email.value) return "이메일을 입력해 주세요."
  if (!isValidEmail(email.value)) return "이메일 형식이 바르지 않습니다."
  if (!password.value) return "비밀번호를 입력해 주세요."
  if (password.value.length < 6) return "비밀번호는 6자 이상 입력해 주세요."
  if (!nickname.value.trim()) return "닉네임을 입력해 주세요."
  if (!selectedOption.value) return "러피를 선택해 주세요."
  if (!isOver14.value) return "14세 이상임을 확인해 주세요."
  return ""
})

const showWarningMessage = async () => {
  showWarning.value = false
  await nextTick()
  showWarning.value = true
}

const showError = async (msg) => {
  errorMessage.value = ""
  await nextTick()
  errorMessage.value = msg
}

const showInfo = async (msg) => {
  infoMessage.value = ""
  await nextTick()
  infoMessage.value = msg
}

const handleSignup = async () => {
  clearMessages()
  if (
    !email.value ||
    !isValidEmail(email.value) ||
    !password.value ||
    password.value.length < 6 ||
    !nickname.value.trim() ||
    !isOver14.value
  ) {
    await showWarningMessage()
    return
  }

  loading.value = true

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value)
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
  clearMessages()
  if (!auth.currentUser) return
  await reload(auth.currentUser)

  if (auth.currentUser.emailVerified) {
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        email: auth.currentUser.email,
        nickname: nickname.value,
        selectedRuffy: selectedOption.value, // ✅ 러피 저장 추가
        createdAt: serverTimestamp(),
        verified: true
        })
      await showInfo("인증이 완료되었습니다!")
      router.push({ path: "/login", query: { from: "signup" } })
    } catch (err) {
      await showError("인증은 되었지만<br />사용자 정보 저장 중 오류가 발생했습니다.")
    }
  } else {
    await showInfo("아직 인증되지 않았어요. <br />메일함을 확인해주세요.")
  }
}

const resendVerification = async () => {
  clearMessages()
  resendClicked.value = true

  if (!auth.currentUser) {
    await showError("현재 로그인된 사용자가 없어요.")
    return
  }

  if (resendCooldown.value > 0) {
    await showInfo(`${resendCooldown.value}초 후에 다시 시도해 주세요.`)
    return
  }

  try {
    await reload(auth.currentUser)

    await sendEmailVerification(auth.currentUser)

    await showInfo("인증 메일을 다시 보냈어요!")
    startResendCooldown()
  } catch (err) {
    if (err.code === "auth/too-many-requests") {
      await showError(`
         인증 메일 요청이 너무 많아요.<br />
         이 이메일 계정이 잠시 차단되었을 수 있어요.<br />
        <strong>1~3분 후 다시 시도</strong>해 주세요.
      `)
    } else {
      const message = getFirebaseErrorMessage(err.code)
      await showError(message)
    }
  }
}

const startResendCooldown = () => {
  resendCooldown.value = 60
  resendTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

const editEmail = () => {
  clearMessages()
  signupComplete.value = false
  email.value = ""
  password.value = ""
  nickname.value = ""
  isOver14.value = false
}

const canStartSignup = computed(() => {
  return (
    email.value &&
    isValidEmail(email.value) &&
    password.value &&
    password.value.length >= 6 &&
    nickname.value.trim() &&
    isOver14.value
  )
})

const clearMessages = () => {
  showWarning.value = false
  infoMessage.value = ""
  errorMessage.value = ""
}

const selectedColor = ref("blue")

onMounted(() => {
  document.body.classList.add("blue")
})

const selectColor = (colorName) => {
  const body = document.body
  body.classList.remove("blue", "red", "green", "bw")
  body.classList.add(colorName)
  selectedColor.value = colorName
}
</script>
