<template>
  <div class="done_group">
    <div v-if="selected === 'notdone'" class="not_done">
      <div :class="['routine_card', { rt_off: isPaused }]">
        <button class="setting" @click="togglePopup">
          <span>다짐설정</span>
        </button>

        <div v-if="showPopup" class="setting_popup">
          <button class="close_spop" @click="closePopup"><span>설정팝업닫기</span></button>
          <ul>
            <li :class="{ disabled: isPaused }">
              <button class="modify" :disabled="isPaused">다짐 수정하기</button>
            </li>
            <li>
              <button class="lock" @click="openPauseRestartConfirm">
                {{ isPaused ? '다짐 다시 시작하기' : '다짐 잠시 멈추기' }}
              </button>
            </li>
            <li :class="{ disabled: isPaused }">
              <button class="share" @click="openShareConfirm" :disabled="isPaused">다짐 공유하기</button>
            </li>
            <li :class="{ disabled: isPaused }">
              <button class="del" @click="openDeleteConfirm" :disabled="isPaused">다짐 삭제하기</button>
            </li>
          </ul>
        </div>

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
          <div class="done_set">
            <button class="p_white" @click="openStatusPopup">달성현황 체크하기</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="selected === 'done'" class="done">달성 완료</div>
    <div v-else-if="selected === 'ignored'" class="dimmed">흐린눈</div>
    <div v-else-if="selected === 'weekly'" class="weekly">주간 다짐</div>

    <!-- 다짐 삭제하기 팝업 -->
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
    <!-- //다짐 삭제하기 팝업 -->

    <!-- 다짐 잠시 멈추기,시작하기 팝업 -->
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
    <!-- //다짐 잠시 멈추기,시작하기 팝업 -->

    <!-- 다짐 공유하기 팝업 -->
    <teleport to="body">
      <div v-if="showShareConfirmPopup" class="com_popup_wrap">
        <div class="popup_inner alert">
          <div class="popup_tit"><h2>다짐을 공유할까요?</h2></div>
          <div class="popup_body">누군가에게 동기부여가 될 수 있어요. <br /> 지금 다짐을 공유할까요?</div>
          <div class="popup_btm">
            <button @click="confirmShare" class="p_basic">공유하기</button>
            <button @click="closeShareConfirm" class="p_white">취소</button>
          </div>
          <button class="close_btn" @click="closeShareConfirm"><span>닫기</span></button>
        </div>
      </div>
    </teleport>
    <!-- //다짐 공유하기 팝업 -->

    <!-- 다짐 현황체크하기 팝업 -->
    <teleport to="body">
      <div v-if="showStatusPopup" class="com_popup_wrap">
        <div class="popup_inner alert">
          <div class="popup_tit">
            <h2>오늘의 다짐은 어땠나요?</h2>
            <p class="noti" v-show="!selectedState">아래 세가지 중에서 선택해주세요.</p>
          </div>
          <div class="popup_body">
            <div class="done_check_wrap">
              <div class="state_group">
                <span
                  class="well_done"
                  :class="{ right: selectedState==='well_done' }"
                  @click="onSelect('well_done')"
                  v-show="!selectedState || selectedState==='well_done'"
                >{{ selectedState==='well_done' ? '나 잘했지? 오늘도 다짐 성공이야!' : '다짐 달성 성공!' }}</span>
                <span
                  class="fail_done"
                  :class="{ right: selectedState==='fail_done' }"
                  @click="onSelect('fail_done')"
                  v-show="!selectedState || selectedState==='fail_done'"
                >{{ selectedState==='fail_done' ? '오늘은 결국 실패야ㅠㅠ' : '다짐 달성 실패ㅠ' }}</span>
                <span
                  class="ign_done"
                  :class="{ right: selectedState==='ign_done' }"
                  @click="onSelect('ign_done')"
                  v-show="!selectedState || selectedState==='ign_done'"
                >{{ selectedState==='ign_done' ? '오늘은 진짜 어쩔 수 없었다고ㅜ' : '흐린눈-_-' }}</span>
              </div>

              <div class="chat_group" v-if="selectedState">
                <span class="well_done" v-show="selectedState==='well_done'">넌 역시 최고야. 대체 언제까지 멋있을래?</span>
                <span class="fail_done" v-show="selectedState==='fail_done'">괜찮아! 너무 완벽하면 재미없는거 알지?</span>
                <span class="ign_done" v-show="selectedState==='ign_done'">알아. 오늘은 특별한 날이었단거. 대신 다짐 현황에는 기록하지 않을게.</span>
              </div>
            </div>
          </div>
          <div class="popup_btm">
            <button v-if="selectedState" @click="confirmStatusCheck" class="p_basic">달성 현황 완료</button>
            <button v-if="selectedState" @click="resetSelection" class="p_white">달성 현황 재선택</button>
            <button @click="closeStatusPopup" class="p_white">취소</button>
          </div>
          <button class="close_btn" @click="closeStatusPopup"><span>닫기</span></button>
        </div>
      </div>
    </teleport>
    <!-- //다짐 현황체크하기 팝업 -->
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
const showShareConfirmPopup = ref(false)
const showStatusPopup = ref(false)
const isPaused = ref(false)
const selectedStatus = ref('')
const selectedState = ref('')

function onSelect(type) {
  selectedState.value = selectedState.value === type ? '' : type
}

function resetSelection() {
  selectedState.value = ''
}

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
  alert('삭제되었습니다')
}

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

function openShareConfirm() {
  closePopup()
  showShareConfirmPopup.value = true
  document.body.classList.add('no-scroll')
}

function closeShareConfirm() {
  showShareConfirmPopup.value = false
  document.body.classList.remove('no-scroll')
}

function confirmShare() {
  closeShareConfirm()
  alert('공유되었습니다')
}

function openStatusPopup() {
  showStatusPopup.value = true
  document.body.classList.add('no-scroll')
}

function closeStatusPopup() {
  showStatusPopup.value = false
  document.body.classList.remove('no-scroll')
  resetSelection()
}

function confirmStatusCheck() {
  closeStatusPopup()
  alert('달성현황 확인 완료!')
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