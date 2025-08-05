<template>
  <div id="main_wrap">
    <HeaderView @toggle-lnb="showLnb = !showLnb" />
    <LnbView v-if="showLnb" @close-lnb="showLnb = false" />

    <!--main view-->
    <div id="main_body">
      <!--상단 날짜 휠-->
      <div class="date_scroll">
        <div class="date_group">
          <span
            v-for="(date, index) in dateList"
            :key="index"
            :class="{ on: selectedIndex === index }"
            @click="selectDate(index)"
          >
            <i>{{ getDayLabel(date) }}</i>{{ date.getDate() }}
          </span>
        </div>
      </div>
      <!--//상단 날짜 휠-->
    </div>

    <FooterView />

    <!-- 다짐 추가 버튼 -->
    <button @click="openAddRoutine" class="add">
      <span>다짐 추가하기</span>
    </button>

    <!-- 다짐 추가 팝업 -->
    <AddRoutineSelector
      v-if="isAddRoutineOpen"
      @close="isAddRoutineOpen = false"
    />
  </div>
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

const selectedIndex = ref(null)

const selectDate = (index) => {
  selectedIndex.value = index
}

const today = new Date()

const dateList = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(today.getDate() + i)
  return d
})

const getDayLabel = (date) => {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[date.getDay()]
}
</script>
