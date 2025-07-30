<template>
  <Header />
  <Lnb />

  <!-- 다짐 추가 버튼 -->
  <button class="add_rout" @click="openAddRoutine">
    <img src="https://img.icons8.com/?size=100&id=11255&format=png&color=000000">
    <span>다짐 추가하기</span>
  </button>

  <!-- 다짐 추가 팝업 -->
  <AddRoutineSelector v-if="isAddRoutineOpen" @close="isAddRoutineOpen = false" />

  <Footer />
</template>

<script setup>
import { ref } from 'vue'
import AddRoutineSelector from '@/views/AddRoutineSelector.vue'

const isAddRoutineOpen = ref(false)

function openAddRoutine() {
  isAddRoutineOpen.value = true
}
</script>
