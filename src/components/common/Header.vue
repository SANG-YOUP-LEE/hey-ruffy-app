<template>
  <div id="header">
    <div class="left">
      <p class="ruffys">
        <span>
          <img :src="ruffySrc" alt="Ruffy" />
        </span>
      </p>
      <div class="title">
        <h1>hey,Ruffy!</h1>
        <p>하지말랑 하지말고 그냥 말랑말랑해~</p>
      </div>
    </div>
    <div class="right">
      <button class="lnb" @click.prevent="$emit('toggle-lnb')"><span>메뉴열기</span></button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

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
</script>
