<template>
  <div class="no-touch">
    <div class="container">
      <div class="join_wrap">
        <h2>러피랑 친구 할래요?</h2>

        <div class="form">
          <input
            v-model="email"
            type="email"
            placeholder="이메일을 등록해 주세요."
            :disabled="signupComplete"
            @focus="clearMessages"
          />
          <input
            v-model="password"
            type="password"
            placeholder="비밀번호를 등록해 주세요."
            :disabled="signupComplete"
            @focus="clearMessages"
          />
          <input
            v-model="nickname"
            type="text"
            placeholder="닉네임을 입력해 주세요."
            :disabled="signupComplete"
            @focus="clearMessages"
          />

          <!-- 러피 선택 -->
          <div class="select_ruffy">
            <div class="info_text">
              친구가 되고 싶은 러피를 선택해주세요.
            </div>
            <div class="ruffys" ref="ruffysRef">
              <a href="#none" :class="{ on: selectedOption === 'option1' }" @click.prevent="selectRuffy('option1')">
                <span class="img"><img src="/src/assets/images/hey_ruffy_temp01.png" alt="퓨리 러피"></span>
                <label class="custom-radio">
                  <input type="radio" name="choice" value="option1" v-model="selectedOption" />
                  <span class="circle"></span>
                </label>
                <span class="name">퓨리 러피</span>
              </a>
              <a href="#none" :class="{ on: selectedOption === 'option2' }" @click.prevent="selectRuffy('option2')">
                <span class="img"><img src="/src/assets/images/hey_ruffy_temp02.png" alt="빌리 러피"></span>
                <label class="custom-radio">
                  <input type="radio" name="choice" value="option2" v-model="selectedOption" />
                  <span class="circle"></span>
                </label>
                <span class="name">빌리 러피</span>
              </a>
              <a href="#none" :class="{ on: selectedOption === 'option3' }" @click.prevent="selectRuffy('option3')">
                <span class="img"><img src="/src/assets/images/hey_ruffy_temp03.png" alt="마리 러피"></span>
                <label class="custom-radio">
                  <input type="radio" name="choice" value="option3" v-model="selectedOption" />
                  <span class="circle"></span>
                </label>
                <span class="name">마리 러피</span>
              </a>
              <a href="#none" :class="{ on: selectedOption === 'option4' }" @click.prevent="selectRuffy('option4')">
                <span class="img"><img src="/src/assets/images/hey_ruffy_temp04.png" alt="도리 러피"></span>
                <label class="custom-radio">
                  <input type="radio" name="choice" value="option4" v-model="selectedOption" />
                  <span class="circle"></span>
                </label>
                <span class="name">도리 러피</span>
              </a>

              <!-- 팝업 -->
              <div class="speech-bubble-wrapper" v-if="showRuffyPopup">
                <div class="speech-bubble">
                  <button class="close-btn" @click="closeRuffyPopup">
                    <img src="/src/assets/images/ico_close02.png" alt="닫기" />
                  </button>
                  <div class="tail" :class="selectedOption"></div>
                  <div v-if="selectedOption === 'option1'" class="r_detail01"> 
                    <p><span>러피 이미지</span><span>Furry Ruffy</span></p>
                    귀여운 잠보 퓨리예요. 움직이기 싫어해서 산책 한번 나가기 힘들지만 막상 나가면 날라날라~ 6개월째 생일날 받은 노란색 안대는 최애템!
                  </div>
                  <div v-else-if="selectedOption === 'option2'" class="r_detail02">
                    <p><span>러피 이미지</span><span>Billy Ruffy</span></p>
                    언제나 씩씩한 빌리의 비밀은 할머니가 준 파란색 담요! 이것만 두르면 용기 백배지만 요거 없으면 무서워서 잠도 잘 못자는건 안 비밀~
                  </div>
                  <div v-else-if="selectedOption === 'option3'" class="r_detail03">
                    <p><span>러피 이미지</span><span>Mari Ruffy</span></p>
                    새침 숙녀 마리예요. 수족냉증이 있어서 사계절 내내 수면양말 네짝은 필수랍니다. 그중 요키 이모가 짜준 핑크 하트 수면 양말이 최고!
                  </div>
                  <div v-else-if="selectedOption === 'option4'" class="r_detail04">
                    <p><span>러피 이미지</span><span>Dory Ruffy</span></p>
                    세상 순둥순둥하고 착한 도리예요. 두달쯤 되던 달 번개소리에 놀라 잠을 깬 이후로 귀마개가 없으면 잠들지 못하는 짠한 겁보랍니다.
                  </div>
                </div>
              </div>
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
              <span><em>[필수]</em> 14세 이상입니다.</span>
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
              class="b_blue"
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
              <button class="b_blue" @click="checkVerification">인증 확인</button>
              <button class="b_white_br_blue" @click="resendVerification" :disabled="resendCooldown > 0">
                {{
                  resendCooldown > 0
                    ? `인증 메일 재전송 (${resendCooldown}초)`
                    : "인증 메일 다시 보내기"
                }}
              </button>
              <button class="b_white_br_blue" @click="editEmail">이메일 주소 수정하기</button>
            </div>

            <div class="error-box" v-if="errorMessage" v-html="errorMessage"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

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
const showRuffyPopup = ref(false)
const ruffysRef = ref(null)

const selectRuffy = (option) => {
  selectedOption.value = option
  showRuffyPopup.value = true
}

const closeRuffyPopup = () => {
  showRuffyPopup.value = false
}

// 팝업 외부 클릭 시 닫기
const handleClickOutside = (e) => {
  if (ruffysRef.value && ruffysRef.value.contains(e.target)) return
  const speechBubbleEl = document.querySelector('.speech-bubble-wrapper')
  if (speechBubbleEl && speechBubbleEl.contains(e.target)) return
  showRuffyPopup.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 이메일 유효성
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const warningText = computed(() => {
  if (!email.value) return "이메일을 입력해 주세요."
  if (!isValidEmail(email.value)) return "이메일 형식이 바르지 않습니다."
  if (!password.value) return "비밀번호를 입력해 주세요."
  if (password.value.length < 6) return "비밀번호는 6자 이상 입력해 주세요."
  if (!nickname.value.trim()) return "닉네임을 입력해 주세요."
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
        createdAt: serverTimestamp(),
        verified: true
      })
      await showInfo("인증이 완료되었습니다!")
      router.push("/login")
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
      await showError("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.")
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
</script>
