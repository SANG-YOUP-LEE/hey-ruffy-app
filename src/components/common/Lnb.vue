<template>
  <div id="lnb">
    <div class="lnb_header">
      <a href="#none" @click.prevent="$emit('close-lnb')">닫기</a>
    </div>

    <!-- 로그인 사용자 정보 -->
    <div class="lnb_user" v-if="authReady && currentUser">
      <div class="user_row">
        <div class="avatar">
          <img :src="ruffySrc" alt="Ruffy" />
        </div>
        <div class="meta">
          <span class="email">{{ currentUser.email }}</span>
        </div>
      </div>
    </div>

    <!-- 메뉴 -->
    <nav class="lnb_menu"></nav>

    <!-- 하단 액션 -->
    <div class="lnb_footer">
      <button
        v-if="authReady && !currentUser"
        type="button"
        class="btn_login"
        @click="goLogin"
      >로그인</button>

      <button
        v-if="authReady && currentUser"
        type="button"
        class="btn_logout"
        :disabled="loggingOut"
        @click="logout"
      >{{ loggingOut ? '로그아웃 중...' : '로그아웃' }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const router = useRouter()
const loggingOut = ref(false)
const currentUser = ref(null)
const authReady = ref(false)
const selectedRuffy = ref('') // option1 | option2 | option3 | option4

// 러피셀렉터뷰와 동일한 에셋 사용
const RUFFY_MAP = {
  option1: new URL('@/assets/images/hey_ruffy_temp01.png', import.meta.url).href,
  option2: new URL('@/assets/images/hey_ruffy_temp02.png', import.meta.url).href,
  option3: new URL('@/assets/images/hey_ruffy_temp03.png', import.meta.url).href,
  option4: new URL('@/assets/images/hey_ruffy_temp04.png', import.meta.url).href,
}
const DEFAULT_RUFFY = RUFFY_MAP.option1
const ruffySrc = computed(() => RUFFY_MAP[selectedRuffy.value] || DEFAULT_RUFFY)

let unsub = null
onMounted(() => {
  const auth = getAuth()
  unsub = onAuthStateChanged(auth, async (u) => {
    currentUser.value = u
    authReady.value = true
    selectedRuffy.value = ''

    if (u) {
      try {
        const db = getFirestore()
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) {
          selectedRuffy.value = snap.data()?.selectedRuffy || ''
        }
      } catch (e) {
        console.warn('fetch user doc failed:', e)
      }
    }
  })
})
onBeforeUnmount(() => { if (unsub) unsub() })

function goLogin() {
  router.push('/login')
}

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await signOut(getAuth())
    router.replace('/login')
  } catch (e) {
    console.error('logout failed:', e)
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
#lnb { display: flex; flex-direction: column; height: 100%; }
.lnb_header { padding: 1rem; border-bottom: 1px solid #eee; }

.lnb_user { padding: 1rem; border-bottom: 1px solid #f2f2f2; }
.user_row { display: flex; align-items: center; gap: 0.75rem; }
.avatar { width: 2.5rem; height: 2.5rem; border-radius: 50%; overflow: hidden; background: #f1f1f1; }
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.meta .email { font-size: 0.85rem; color: #666; }

.lnb_menu { flex: 1; overflow-y: auto; }

.lnb_footer { padding: 1rem; border-top: 1px solid #eee; display: grid; gap: 0.5rem; }
.btn_login, .btn_logout { width: 100%; padding: 0.9rem 1rem; border: 1px solid #ddd; background: #fff; }
.btn_logout:disabled { opacity: 0.6; cursor: default; }
</style>
