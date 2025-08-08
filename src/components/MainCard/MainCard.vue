<template>
  <div class="done_group">
    <!-- 달성 전 -->
    <div v-if="selected === 'notdone'" class="not_done">
      <div class="routine_card">
        <div class="rc_inner">
          <button class="setting" @click="togglePopup">
            <span>다짐설정</span>
          </button>

          <div v-if="showPopup" class="setting_popup">
            <button class="close_spop" @click="closePopup">
              <span>설정팝업닫기</span>
            </button>
            <ul>
              <li><button class="modify">다짐 수정하기</button></li>
              <li><button class="lock">다짐 잠시 멈추기</button></li>
              <li><button class="share">다짐 공유하기</button></li>
              <li><button class="del">다짐 삭제하기</button></li>
            </ul>
          </div>

          <div class="left">
            <p class="title">
              <span class="color_picker01"></span>
              외로워도 슬퍼도 나는 안울어
            </p>
            <p class="term"><i>Daily</i> 월,화,수,목,금</p>
            <p class="se_date">2025.03.17 ~ 2025.04.18</p>
            <p class="alaram">am 07:00</p>
            <p class="comment">건강검진 극락가자!</p>
          </div>

          <div class="right"></div>
        </div>
      </div>
    </div>

    <!-- 달성 완료 -->
    <div v-else-if="selected === 'done'" class="done">
      달성 완료
    </div>

    <!-- 흐린눈 -->
    <div v-else-if="selected === 'ignored'" class="dimmed">
      흐린눈
    </div>

    <!-- 주간 다짐 -->
    <div v-else-if="selected === 'weekly'" class="weekly">
      주간 다짐
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  selected: String
})

const showPopup = ref(false)

function togglePopup() {
  showPopup.value = !showPopup.value
}

function closePopup() {
  showPopup.value = false
}
</script>
