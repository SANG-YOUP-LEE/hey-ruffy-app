<template>
  <div id="header">
    <div class="left">
      <p class="ruffys">
        <span>
          <img :src="imgSrc" alt="Ruffy" />
        </span>
      </p>
      <div class="title">
        <h1>hey, Ruffy!</h1>
        <p>하지 말랑 하지말고 그냥 말랑말랑해~</p>
      </div>
    </div>
    <div class="right">
      <button class="lnb" @click.prevent="$emit('toggle-lnb')"><span>메뉴열기</span></button>
      <button class="calendar"><span>달력열기</span></button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'

// assets 폴더에서 직접 import
import ruffy01 from '@/assets/images/ruffy01.png'
import ruffy02 from '@/assets/images/ruffy02.png'
import ruffy03 from '@/assets/images/ruffy03.png'
import ruffy04 from '@/assets/images/ruffy04.png'

const imgSrc = ref('')
const auth = useAuthStore()

onMounted(async () => {
  await auth.ensureReady?.()
  const uid = auth.user?.uid
  if (!uid) return
  const snap = await getDoc(doc(db, 'users', uid))
  const id = snap.exists() ? snap.data().selectedRuffy : ''
  const map = { ruffy01, ruffy02, ruffy03, ruffy04 }
  imgSrc.value = map[id] || ruffy01
})
</script>
