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
      a<br />a<br />a<br />
      a<br />a<br />a<br />
    </div>
    <!--/main view-->
  
    
  
    <FooterView />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'

const isAddRoutineOpen = ref(false)

function openAddRoutine() {
  isAddRoutineOpen.value = true
}
</script>
