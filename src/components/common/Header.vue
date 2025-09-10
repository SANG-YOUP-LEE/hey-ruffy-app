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

const imgSrc = ref('/images/ruffy-default.png')
const auth = useAuthStore()

onMounted(async () => {
  await auth.ensureReady?.()
  const uid = auth.user?.uid
  if (!uid) return
  const snap = await getDoc(doc(db, 'users', uid))
  const id = snap.exists() ? (snap.data().selectedRuffy || '') : ''
  imgSrc.value = id ? `/images/${id}.png` : '/images/ruffy-default.png'
})
</script>
