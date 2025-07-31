<template>
  <div class="popup_wrap">
    <div class="popup_tit">
      <h2>새로운 다짐을<br />만들어 볼까요?</h2>
      <p>다짐을 달성할때마다<br />러피의 산책이 총총총 계속됩니다.</p>
    </div>
    <div class="popup_inner">
      <!-- 다짐명 입력-->
      <RoutineTitleInput />
      <!-- 다짐 주기 설정 -->
      <RoutineRepeatSelector />
    </div>
    <div class="popup_btm">
      <button class="b_basic" @click="handleSave">다짐 저장하기</button>
    </div>
    <div class="close_btn" @click="$emit('close')"><span>닫기</span></div>
  </div>
</template>

<script setup>
import RoutineTitleInput from '@/components/routine/RoutineTitleInput.vue'
import RoutineRepeatSelector from '@/components/routine/RoutineRepeatSelector.vue'
</script>
