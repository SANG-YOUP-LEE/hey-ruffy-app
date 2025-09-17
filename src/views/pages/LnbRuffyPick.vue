<template>
  <div class="btn_back">
    <a href="#none" @click.prevent="handleClose" class="back"><span>이전으로</span></a>
  </div>
  <div class="page ruffy-pick">
    <header class="page_hd">
      <h2>캐릭터 변경</h2>
    </header>
    <main class="page_bd">
      <p>캐릭터를 선택해주세요.</p>
      <div class="ruffy_list">
        <button @click="pick('option1')">
          <img :src="RUFFY_MAP.option1" alt="러피 01" />
          러피 01
        </button>
        <button @click="pick('option2')">
          <img :src="RUFFY_MAP.option2" alt="러피 02" />
          러피 02
        </button>
        <button @click="pick('option3')">
          <img :src="RUFFY_MAP.option3" alt="러피 03" />
          러피 03
        </button>
        <button @click="pick('option4')">
          <img :src="RUFFY_MAP.option4" alt="러피 04" />
          러피 04
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const a = useAuthStore()
const router = useRouter()

const RUFFY_MAP = {
  option1: new URL('@/assets/images/hey_ruffy_temp01.png', import.meta.url).href,
  option2: new URL('@/assets/images/hey_ruffy_temp02.png', import.meta.url).href,
  option3: new URL('@/assets/images/hey_ruffy_temp03.png', import.meta.url).href,
  option4: new URL('@/assets/images/hey_ruffy_temp04.png', import.meta.url).href,
}

async function pick(opt){
  const uid = a.user?.uid
  if (uid) {
    await setDoc(doc(db, 'users', uid), {
      selectedRuffy: opt,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    await a.refreshProfile()
  }
  router.back()
}

function handleClose() {
  router.back()
}
</script>
