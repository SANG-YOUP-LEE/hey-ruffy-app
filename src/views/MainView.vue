<template>
  <div class="v_container">
    <div class="main_wrap">
      <h2>
        다짐내용
        <div>{{ lastCommitment }}</div> <!-- aaaa → 다짐 내용으로 변경 -->
      </h2>
      <a href="#none" class="add_rout" @click="showPopup = true">+<span>다짐추가</span></a>
    </div>
  </div>

  <!-- 팝업 -->
  <div class="popup_layer" v-if="showPopup">
    <div class="popup_inner_wide">
      <CommitmentForm 
        @submit="handleCommitmentSubmit"
        @close="showPopup = false" 
      />
    </div>
  </div>
  <!-- //팝업 -->
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import CommitmentForm from '@/components/CommitmentForm.vue'

const showPopup = ref(false)
const lastCommitment = ref('')
const handleCommitmentSubmit = (data) => {
  lastCommitment.value = data.title // 다짐 내용을 저장
}

watch(showPopup, async (newVal) => {
  if (newVal) {
    await nextTick()
    // 필요 시 탭 초기화 등 추가 작업 가능
  }
})
</script>
