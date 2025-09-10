<template>
  <div id="header">
    <div class="left">
      <p class="ruffys">
        <span v-if="profileImage">
          <img :src="profileImage" alt="Ruffy" />
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
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const profileImage = ref(auth.user?.ruffyImage || '')
</script>
