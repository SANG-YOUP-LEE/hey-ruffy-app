<template>
  <div id="main_wrap">
    <HeaderView />
    <LnbView />
  
    <!--main view-->
    <div id="main_body">
      <!-- 다짐 추가 버튼 -->
      <button @click="openAddRoutine">다짐 추가하기</button>
  
      <!-- 다짐 추가 팝업 -->
      <AddRoutineSelector v-if="isAddRoutineOpen" @close="isAddRoutineOpen = false" />
      bbb<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />a<br />
      a<br />a<br />ccc<br />
    </div>
    <!--/main view-->
  
    
  
    <FooterView />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'


const isAddRoutineOpen = ref(false)

function openAddRoutine() {
  isAddRoutineOpen.value = true
}

function setVh() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

onMounted(() => {
  setVh()
  window.addEventListener('resize', setVh)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setVh)
})
</script>
