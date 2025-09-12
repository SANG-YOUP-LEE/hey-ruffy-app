<template>
  <div class="page ruffy-pick">
    <header class="page_hd">
      <button class="back" @click="$router.back()"><span>뒤로</span></button>
      <h1>캐릭터 변경</h1>
    </header>
    <main class="page_bd">
      <p>캐릭터를 선택해주세요.</p>
      <div class="ruffy_list">
        <button @click="pick('option1')">러피 01</button>
        <button @click="pick('option2')">러피 02</button>
        <button @click="pick('option3')">러피 03</button>
        <button @click="pick('option4')">러피 04</button>
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
</script>
