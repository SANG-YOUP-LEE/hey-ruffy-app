<template>
  <div id="lnb">
    <div class="lnb_header">
      <a href="#none" @click.prevent="$emit('close-lnb')">닫기</a>
    </div>

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

    <nav class="lnb_menu">
      <button
        type="button"
        class="menu_danger"
        @click="openStep1"
        :disabled="!authReady || !currentUser || deleting"
      >
        {{ deleting ? '삭제 중...' : '다짐 모두 삭제하기' }}
      </button>
    </nav>

    <div class="lnb_footer">
      <button
        v-if="authReady && currentUser"
        type="button"
        class="btn_logout"
        :disabled="loggingOut"
        @click="logout"
      >{{ loggingOut ? '로그아웃 중...' : '로그아웃' }}</button>

      <button
        v-if="authReady && !currentUser"
        type="button"
        class="btn_login"
        @click="goLogin"
      >로그인</button>
    </div>

    <div v-if="showStep1" class="modal" @click.self="closeAll">
      <div class="modal_box">
        <h3>정말 삭제하시겠습니까?</h3>
        <p class="sub">현재 계정의 모든 다짐이 삭제됩니다.</p>
        <div class="actions">
          <button class="btn_cancel" @click="closeAll" :disabled="deleting">취소</button>
          <button class="btn_next" @click="openStep2" :disabled="deleting">계속</button>
        </div>
      </div>
    </div>

    <div v-if="showStep2" class="modal" @click.self="closeAll">
      <div class="modal_box">
        <h3>정말로 모두 삭제할까요?</h3>
        <p class="sub t_red">이 작업은 되돌릴 수 없습니다.</p>
        <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
        <div class="actions">
          <button class="btn_cancel" @click="closeAll" :disabled="deleting">취소</button>
          <button class="btn_danger" @click="confirmDelete" :disabled="deleting">
            {{ deleting ? '삭제 중...' : '진짜 삭제' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, collection, query, where, limit, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase'   // alias('@' -> 'src') 쓰는 프로젝트

const router = useRouter()
const loggingOut = ref(false)
const currentUser = ref(null)
const authReady = ref(false)
const selectedRuffy = ref('')

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
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) selectedRuffy.value = snap.data()?.selectedRuffy || ''
      } catch {}
    }
  })
})
onBeforeUnmount(() => { if (unsub) unsub() })

function goLogin() { router.push('/login') }
async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try { await signOut(getAuth()); router.replace('/login') } finally { loggingOut.value = false }
}

const showStep1 = ref(false)
const showStep2 = ref(false)
const deleting = ref(false)
const errorMsg = ref('')

function openStep1() { errorMsg.value = ''; showStep1.value = true; showStep2.value = false }
function openStep2() { showStep1.value = false; showStep2.value = true }
function closeAll() { if (deleting.value) return; showStep1.value = false; showStep2.value = false }

async function confirmDelete() {
  if (!currentUser.value || deleting.value) return
  deleting.value = true
  errorMsg.value = ''

  const uid = currentUser.value.uid

  async function deleteTopLevelRoutines() {
    const candidates = [
      ['uid', '==', uid],
      ['userId', '==', uid],
      ['ownerUid', '==', uid],
    ]
    const pageSize = 50
    for (const [field, op, val] of candidates) {
      while (true) {
        const q = query(collection(db, 'routines'), where(field, op, val), limit(pageSize))
        const snap = await getDocs(q)
        if (snap.empty) break
        const batch = writeBatch(db)
        snap.forEach(d => batch.delete(d.ref))
        await batch.commit()
        if (snap.size < pageSize) break
      }
    }
  }

  async function deleteUserSubcollectionRoutines() {
    const base = collection(db, 'users', uid, 'routines')
    const pageSize = 50
    while (true) {
      const q = query(base, limit(pageSize))
      const snap = await getDocs(q)
      if (snap.empty) break
      const batch = writeBatch(db)
      snap.forEach(d => batch.delete(d.ref))
      await batch.commit()
      if (snap.size < pageSize) break
    }
  }

  try {
    await deleteTopLevelRoutines()
    await deleteUserSubcollectionRoutines()
    closeAll()
    alert('모든 다짐을 삭제했어요.')
    window.location.reload()
  } catch (e) {
    errorMsg.value = '삭제 중 오류가 발생했어요. 다시 시도해 주세요.'
  } finally {
    deleting.value = false
  }
}
</script>
