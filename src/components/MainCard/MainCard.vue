<template>
  <div class="done_group">
    <!-- 달성 전 -->
    <div v-if="selected === 'notdone'" class="not_done">
      <div :class="['routine_card', { rt_off: isPaused }]">
        <!--다짐 설정 팝업-->
        <button class="setting" @click="togglePopup">
          <span>다짐설정</span>
        </button>

        <div v-if="showPopup" class="setting_popup">
          <button class="close_spop" @click="closePopup"><span>설정팝업닫기</span></button>
          <ul>
            <li><button class="modify">다짐 수정하기</button></li>
            <li>
              <button class="lock" @click="openPauseRestartConfirm">
                {{ isPaused ? '다짐 다시 시작하기' : '다짐 잠시 멈추기' }}
              </button>
            </li>
            <li><button class="share">다짐 공유하기</button></li>
            <li><button class="del" @click="openDeleteConfirm">다짐 삭제하기</button></li>
          </ul>
        </div>
        <!--//다짐 설정 팝업-->
        
        <div class="rc_inner">
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
    <div v-else-if="selected === 'done'" class="done">달성 완료</div>

    <!-- 흐린눈 -->
    <div v-else-if="selected === 'ignored'" class="dimmed">흐린눈</div>

    <!-- 주간 다짐 -->
    <div v-else-if="selected === 'weekly'" class="weekly">주간 다짐</div>

    <!-- 삭제 확인 팝업 -->
    <teleport to="body">
      <div v-if="showDeleteConfirmPopup" class="com_popup_wrap">
        <div class="popup_inner alert">
          <div class="popup_tit"><h2>정말 다짐을 삭제할까요?</h2></div>
          <div class="popup_body">삭제된 다짐은 되돌릴 수 없어요.</div>
          <div class="popup_btm">
            <button @click="confirmDelete" class="p_basic">삭제</button>
            <button @click="closeDeleteConfirm" class="p_white">취소</button>
          </div>
          <button class="close_btn" @click="closeDeleteConfirm"><span>닫기</span></button>
        </div>
      </div>
    </teleport>

    <!-- 잠시 멈추기 / 다시 시작하기 팝업 -->
    <teleport to="body">
      <div v-if="showPauseRestartPopup" class="com_popup_wrap">
        <div class="popup_inner alert">
          <div class="popup_tit">
            <h2>{{ isPaused ? '다짐 다시 시작하기' : '다짐 잠시 멈추기' }}</h2>
          </div>
          <div class="popup_body">
            <template v-if="isPaused">
              다짐을 다시 시작할까요? <br />
              지칠땐 언제든 다시 멈출 수 있어요.
            </template>
            <template v-else>
              정말 다짐을 잠시 멈추실 건가요? <br />
              멈춘 다짐은 언제든 다시 시작할 수 있어요.
            </template>
          </div>
          <div class="popup_btm">
            <button @click="confirmPauseRestart" class="p_basic">
              {{ isPaused ? '다짐 다시 시작하기' : '다짐 멈추기' }}
            </button>
            <button @click="closePauseRestartPopup" class="p_white">취소</button>
          </div>
          <button class="close_btn" @click="closePauseRestartPopup"><span>닫기</span></button>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  selected: String
})

const showPopup = ref(false)
const showDeleteConfirmPopup = ref(false)
const showPauseRestartPopup = ref(false)
const isPaused = ref(false)

function togglePopup() {
  showPopup.value = !showPopup.value
}

function closePopup() {
  showPopup.value = false
}

function handleGlobalCloseEvents() {
  if (showPopup.value) closePopup()
}

function openDeleteConfirm() {
  closePopup()
  showDeleteConfirmPopup.value = true
  document.body.classList.add('no-scroll')
}

function closeDeleteConfirm() {
  showDeleteConfirmPopup.value = false
  document.body.classList.remove('no-scroll')
}

function confirmDelete() {
  closeDeleteConfirm()
  alert('삭제되었습니다') // 실제 삭제 로직
}

// 잠시 멈추기 / 다시 시작하기
function openPauseRestartConfirm() {
  closePopup()
  showPauseRestartPopup.value = true
  document.body.classList.add('no-scroll')
}

function closePauseRestartPopup() {
  showPauseRestartPopup.value = false
  document.body.classList.remove('no-scroll')
}

function confirmPauseRestart() {
  isPaused.value = !isPaused.value
  closePauseRestartPopup()
}

onMounted(() => {
  window.addEventListener('close-other-popups', handleGlobalCloseEvents)
  window.addEventListener('popstate', handleGlobalCloseEvents)
})

onBeforeUnmount(() => {
  window.removeEventListener('close-other-popups', handleGlobalCloseEvents)
  window.removeEventListener('popstate', handleGlobalCloseEvents)
  document.body.classList.remove('no-scroll')
})
</script>
