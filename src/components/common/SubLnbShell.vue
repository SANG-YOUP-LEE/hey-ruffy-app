<!-- src/components/common/SubLnbShell.vue -->
<template>
  <div class="lnb sub">
    <div class="lnb_header">
      <a href="#none" @click.prevent="goBack" class="close"><span>닫기</span></a>
    </div>

    <div class="lnb_wrap">
      <div v-if="!section">
        <h2>메인 LNB</h2>
        <p>여기는 서브메뉴 진입 전 기본 안내 화면</p>
      </div>

      <div v-else-if="section === 'account'">
        <h2>계정 관리</h2>
        <p>여기에 계정 관리 UI 들어감</p>
      </div>

      <div v-else-if="section === 'routine'">
        <h2>다짐 현황</h2>
        <p>여기에 다짐 현황 UI 들어감</p>
      </div>

      <div v-else-if="section === 'walk'">
        <h2>산책 현황</h2>
        <p>여기에 산책 현황 UI 들어감</p>
      </div>

      <div v-else-if="section === 'diary'">
        <h2>일기장</h2>
        <p>여기에 일기장 UI 들어감</p>
      </div>

      <div v-else-if="section === 'about'">
        <h2>러피에 대해 더 알고 싶어요</h2>
        <p>여기에 UI 들어감</p>
      </div>

      <div v-else-if="section === 'premier'">
        <h2>유료구매하거라</h2>
        <p>여기에 UI 들어감</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()

const section = computed(() => route.params.section)

function goBack() {
  if (section.value) {
    router.push('/lnb')
  } else {
    router.back()
  }
}
</script>
