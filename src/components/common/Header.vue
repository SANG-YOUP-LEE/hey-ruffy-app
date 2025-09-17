<template>
  <div id="header">
    <div class="left">
      <button class="lnb" @click.prevent="$emit('toggle-lnb')"><span>메뉴열기</span></button>
    </div>
    <div class="center">
      <div class="title">
        <span><img :src="ruffySrc" alt="Ruffy" /></span>
        <h1>hey,Ruffy!</h1>
      </div>
      <p>{{ captionLine }}</p>
    </div>
    <div class="right">
      <button class="calendar"><span>달력보기</span></button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { todayKey } from '@/utils/date'

const a = useAuthStore()
const profile = computed(() => a.profile)

const RUFFY_MAP = {
  option1: new URL('@/assets/images/hey_ruffy_temp01.png', import.meta.url).href,
  option2: new URL('@/assets/images/hey_ruffy_temp02.png', import.meta.url).href,
  option3: new URL('@/assets/images/hey_ruffy_temp03.png', import.meta.url).href,
  option4: new URL('@/assets/images/hey_ruffy_temp04.png', import.meta.url).href,
}
const DEFAULT_RUFFY = new URL('@/assets/images/ico_user_gray.png', import.meta.url).href

const ruffySrc = computed(() =>
  profile.value?.selectedRuffy ? RUFFY_MAP[profile.value.selectedRuffy] : DEFAULT_RUFFY
)

const captionLine = ref('')

onMounted(async () => {
  const snap = await getDoc(doc(db, 'dailyCaptions', todayKey()))
  captionLine.value = snap.exists() ? (snap.data()?.lines?.[0] || '') : ''
})
</script>
