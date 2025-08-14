<template>
  <div class="done_group">
    <div v-if="selected === 'weekly'" class="weekly">주간 다짐</div>
    <div v-else :class="wrapperClass">
      <div :class="['routine_card', cardSkinClass, { rt_off: isPaused, walk_mode: hasWalkResolved }]">
        <button class="setting" @click.stop="togglePopup">
          <span>다짐설정</span>
        </button>
        <div v-if="showPopup" class="setting_popup">
          <button class="close_spop" @click="closePopup"><span>설정팝업닫기</span></button>
          <ul>
            <li :class="{ disabled: isPaused }">
              <button class="modify" :disabled="isPaused" @click="emitEdit">다짐 수정하기</button>
            </li>
            <li>
              <button class="lock" @click="emitTogglePause">{{ isPaused ? '다짐 다시 시작하기' : '다짐 잠시 멈추기' }}</button>
            </li>
            <li>
              <button class="delete" @click="emitDelete">다짐 삭제하기</button>
            </li>
          </ul>
        </div>

        <div class="routine_info">
          <div class="routine_tit">{{ routine.title }}</div>
          <div v-if="routine.hasWalk" class="walk_info">
            <span>산책 {{ routine.walkDoneCount || 0 }} / {{ routine.goalCount || 0 }}</span>
          </div>
        </div>

        <div v-if="isToday" class="status_buttons">
          <button v-if="selected === 'notdone'" class="btn well" @click="openStatusPopup('well_done')">성공</button>
          <button v-if="selected === 'notdone'" class="btn fail" @click="openStatusPopup('fail_done')">실패</button>
          <button v-if="selected === 'notdone'" class="btn ign" @click="openStatusPopup('ign_done')">흐린눈</button>
        </div>

        <div v-if="showStatusPopup" class="status_popup">
          <button class="close_spop" @click="closeStatusPopup"><span>상태팝업닫기</span></button>
          <div class="status_msg">
            <span v-if="selectedState === 'well_done'">오늘은 성공!</span>
            <span v-if="selectedState === 'fail_done'">오늘은 실패...</span>
            <span v-if="selectedState === 'ign_done'">오늘은 넘어갈게요</span>
          </div>
          <div class="popup_actions">
            <button class="btn confirm" @click="confirmStatusCheck">완료</button>
            <button class="btn cancel" @click="closeStatusPopup">취소</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  selected: String,
  routine: Object,
  isToday: Boolean
})
const emit = defineEmits(['changeStatus', 'delete', 'edit', 'togglePause'])

const showPopup = ref(false)
const showStatusPopup = ref(false)
const selectedState = ref(null)

const isPaused = computed(() => !!props.routine?.isPaused)
const hasWalkResolved = computed(() => !!props.routine?.hasWalk && props.routine?.walkDoneCount >= props.routine?.goalCount)
const wrapperClass = computed(() => ({ 'card_wrap': true }))
const cardSkinClass = computed(() => props.routine?.skinClass || '')

function togglePopup() {
  showPopup.value = !showPopup.value
}
function closePopup() {
  showPopup.value = false
}
function emitDelete() {
  emit('delete', props.routine?.id)
  closePopup()
}
function emitEdit() {
  emit('edit', props.routine)
  closePopup()
}
function emitTogglePause() {
  emit('togglePause', { id: props.routine?.id, isPaused: !isPaused.value })
  closePopup()
}
function openStatusPopup(state) {
  selectedState.value = state
  showStatusPopup.value = true
  window.dispatchEvent(new Event('close-other-popups'))
}
function closeStatusPopup() {
  showStatusPopup.value = false
}
function confirmStatusCheck() {
  const id = props.routine?.id
  let next = null
  if (selectedState.value === 'well_done') next = 'done'
  else if (selectedState.value === 'fail_done') next = 'faildone'
  else if (selectedState.value === 'ign_done') next = 'ignored'
  closeStatusPopup()
  if (id && next) emit('changeStatus', { id, status: next })
}
</script>
