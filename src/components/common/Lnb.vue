<template>
  <div class="lnb">
    <div class="lnb_header">
      <a href="#none" @click.prevent="$emit('close')" class="close"><span>닫기</span></a>
    </div>

    <div class="lnb_wrap">
      <div class="lnb_user">
        <div class="avatar">
          <img :src="currentUser ? ruffySrc : DEFAULT_RUFFY" alt="Ruffy">
          <button class="edit_p"><span>사진 바꾸기</span></button>
        </div>
        <div class="nick">
          <span v-if="authReady && currentUser">{{ nickname }}</span>
          <a v-else href="#none" @click.prevent="goLogin">로그인 해주세요.</a>
        </div>
      </div>

      <div class="lnb_menu">
        <a href="#none" class="login" v-show="authReady && currentUser">계정 관리</a>
        <a href="#none" class="login" v-show="authReady && currentUser">다짐 현황보기</a>
        <a href="#none" class="login" v-show="authReady && currentUser">산책 현황보기</a>
        <a href="#none" class="login" v-show="authReady && currentUser">일기장 엿보기</a>
        <a href="#none">러피에 대해 더 알고 싶어요.</a>
        <a href="#none">러피와 두 발 더 가까워지기</a>
      </div>

      <div class="lnb_footer">
        <a
          v-if="authReady && currentUser"
          href="#none"
          @click.prevent="logout"
        >로그아웃</a>
        <span class="ver">ver 0.0</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'

const router = useRouter()
const currentUser = ref(null)
const authReady = ref(false)
const selectedRuffy = ref('')
const nickname = ref('')
const loggingOut = ref(false)

const RUFFY_MAP = {
  option1: new URL('@/assets/images/hey_ruffy_temp01.png', import.meta.url).href,
  option2: new URL('@/assets/images/hey_ruffy_temp02.png', import.meta.url).href,
  option3: new URL('@/assets/images/hey_ruffy_temp03.png', import.meta.url).href,
  option4: new URL('@/assets/images/hey_ruffy_temp04.png', import.meta.url).href,
}
const DEFAULT_RUFFY = new URL('@/assets/images/ico_user_gray.png', import.meta.url).href
const ruffySrc = computed(() => selectedRuffy.value ? RUFFY_MAP[selectedRuffy.value] : DEFAULT_RUFFY)

let unsub = null
onMounted(() => {
  const auth = getAuth()
  unsub = onAuthStateChanged(auth, async (u) => {
    currentUser.value = u
    authReady.value = true
    selectedRuffy.value = ''
    nickname.value = ''
    if (u) {
      try {
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) {
          const data = snap.data()
          selectedRuffy.value = data?.selectedRuffy || ''
          nickname.value = data?.nickname || ''
        }
      } catch {}
    }
  })
})
onBeforeUnmount(() => { if (unsub) unsub() })

function goLogin() { router.push('/login') }
async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await signOut(getAuth())
    router.replace('/login')
  } finally {
    loggingOut.value = false
  }
}
</script>
