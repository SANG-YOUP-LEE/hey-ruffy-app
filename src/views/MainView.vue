<template>
  <div id="main_wrap">
    <HeaderView @toggle-lnb="showLnb = !showLnb" />
    <LnbView v-if="showLnb" @close-lnb="showLnb = false" />
  
    <!--main view-->
    <div id="main_body">
      <!--상단 날짜 휠-->
      <div class="date_scroll">
        <div class="date_group">
          <span><i class="on">일</i>1</span>
          <span><i>월</i>2</span>
          <span><i class="on">화</i>3</span>
          <span><i>수</i>4</span>
          <span><i class="on">목</i>5</span>
          <span><i>금</i>6</span>
          <span><i class="on">토</i>7</span>
          <span><i>일</i>8</span>
          <span><i class="on">월</i>9</span>
          <span><i>화</i>10</span>
        </div>
      </div>
      <!--//상단 날짜 휠-->
    </div>
    <!--/main view-->
  
    
  
    <FooterView />
    
    
    <!-- 다짐 추가 버튼 -->
    <button @click="openAddRoutine" class="add"><span>다짐 추가하기</span></button>
    
  </div>

  <!-- 다짐 추가 팝업 -->
  <AddRoutineSelector v-if="isAddRoutineOpen" @close="isAddRoutineOpen = false" />
  
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'

const isAddRoutineOpen = ref(false)
const showLnb = ref(false)

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
