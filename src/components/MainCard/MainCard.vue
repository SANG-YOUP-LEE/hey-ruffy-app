<template>
  <div class="done_group">
    <div v-if="selected === 'weekly'" class="weekly">주간 다짐</div>
    <div v-else :class="wrapperClass">
      <div :class="['routine_card', cardSkinClass, courseClass, { rt_off: isPaused, walk_mode: hasWalkResolved }]">
        <button class="setting" @click.stop="togglePopup">
          <span>다짐설정</span>
        </button>
        <div v-if="showPopup" class="setting_popup">
          <button class="close_spop" @click="closePopup"><span>설정팝업닫기</span></button>
          <ul>
            <li :class="{ disabled: isPaused }">
              <button class="modify" :disabled="isPaused" @click="onEdit">다짐 수정하기</button>
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
              <span :class="colorClass"></span>
              {{ titleText }}
            </p>
            <p class="term"><i>{{ repeatLabel }}</i> {{ repeatDetail }}</p>
            <p class="se_date">{{ periodText }}</p>
            <p class="alaram">{{ alarmText }}</p>
            <p class="comment" v-if="commentText">{{ commentText }}</p>

            <div class="walk_info" v-if="hasWalkResolved">
              <span class="walk_ruffy">{{ ruffyMeta?.name }}</span>
              <span class="walk_course">{{ courseMeta?.name }}</span>
              <span class="walk_goal">목표 {{ props.routine?.goalCount }}회</span>
            </div>
          </div>
          <div class="right"></div>
          <div class="done_set" v-if="canShowStatusButton">
            <button class="p_white" @click="handleStatusButtonClick">
              달성현황 체크하기
            </button>
          </div>
          <div class="walk_check" v-if="hasWalkResolved">
            <button class="p_white" @click="openWalkPopup">산책 현황 보기</button>
          </div>
        </div>
      </div>
    </div>

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
              다짐은 언제든 다시 시작할 수 있어요.
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
                <span class="well_done" :class="{ right: selectedState==='well_done' }" @click="onSelect('well_done')" v-show="!selectedState || selectedState==='well_done'">
                  {{ selectedState==='well_done' ? '나 잘했지? 오늘도 다짐 성공이야!' : '다짐 달성 성공!' }}
                </span>
                <span class="fail_done" :class="{ right: selectedState==='fail_done' }" @click="onSelect('fail_done')" v-show="!selectedState || selectedState==='fail_done'">
                  {{ selectedState==='fail_done' ? '오늘은 결국 실패야ㅠㅠ' : '다짐 달성 실패ㅠ' }}
                </span>
                <span class="ign_done" :class="{ right: selectedState==='ign_done' }" @click="onSelect('ign_done')" v-show="!selectedState || selectedState==='ign_done'">
                  {{ selectedState==='ign_done' ? '오늘은 진짜 어쩔 수 없었다고ㅜ' : '흐린눈-_-' }}
                </span>
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

    <teleport to="body">
      <div v-if="showWalkPopup" class="com_popup_wrap walk_status">
        <div class="popup_inner alert">
          <div class="popup_tit"><h2>산책 현황</h2></div>
          <div class="popup_body">
            <WalkStatusPanel :routine="props.routine" />
          </div>
          <div class="popup_btm">
            <button @click="closeWalkPopup" class="p_white">닫기</button>
          </div>
          <button class="close_btn" @click="closeWalkPopup"><span>닫기</span></button>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import WalkStatusPanel from '@/components/MainCard/MainWalkStatus.vue'
import { RUFFY_OPTIONS } from '@/components/common/RuffySelector.vue'
import { COURSE_OPTIONS } from '@/components/common/CourseSelector.vue'

const props = defineProps({
  selected: String,
  routine: { type: Object, default: () => ({}) },
  isToday: { type: Boolean, default: false }
})

const emit = defineEmits(['delete','changeStatus','edit','togglePause'])

const showPopup = ref(false)
const showDeleteConfirmPopup = ref(false)
const showPauseRestartPopup = ref(false)
const showShareConfirmPopup = ref(false)
const showStatusPopup = ref(false)
const showWalkPopup = ref(false)

const isPaused = ref(!!props.routine?.isPaused)
watch(() => props.routine?.isPaused, v => { isPaused.value = !!v }, { immediate: true })

const selectedState = ref('')

const titleText = computed(() => props.routine?.title || '')
const commentText = computed(() => props.routine?.comment || '')

const colorClass = computed(() => {
  const idx = Number(props.routine?.colorIndex ?? 0)
  const n = isNaN(idx) ? 0 : idx
  return `color_picker${String(n + 1).padStart(2, '0')}`
})

const normalizeSkin = (v) => {
  const m = String(v || '').match(/(\d+)/)
  if (!m) return ''
  const n = m[1].padStart(2, '0')
  return `option${n}`
}

const toCourseClass = (v) => {
  const m = String(v || '').match(/(\d+)/)
  if (!m) return ''
  const n = m[1].padStart(2, '0')
  return `course${n}`
}

const cardSkinClass = computed(() => {
  const v = normalizeSkin(props.routine?.cardSkin)
  return v ? `card_${v}` : ''
})

const courseClass = computed(() => {
  const v = toCourseClass(props.routine?.course)
  return v || ''
})
  
const repeatLabel = computed(() => {
  const t = props.routine?.repeatType
  if (t === 'weekly') return 'Weekly'
  if (t === 'monthly') return 'Monthly'
  return 'Daily'
})

const repeatDetail = computed(() => {
  const r = props.routine || {}
  if (r.repeatType === 'daily') {
    if (Array.isArray(r.repeatDays) && r.repeatDays.length) {
      return r.repeatDays.includes('매일') ? '매일' : r.repeatDays.join(',')
    }
    return ''
  }
  if (r.repeatType === 'weekly') {
    const main = r.repeatWeeks || '매주'
    const days = Array.isArray(r.repeatWeekDays) && r.repeatWeekDays.length ? r.repeatWeekDays.join(',') : ''
    return days ? `${main} ${days}` : main
  }
  if (r.repeatType === 'monthly') {
    const days = Array.isArray(r.repeatMonthDays) && r.repeatMonthDays.length ? r.repeatMonthDays.join(', ') : ''
    return days ? `${days}일` : ''
  }
  return ''
})

const periodText = computed(() => {
  const s = props.routine?.startDate || {}
  const e = props.routine?.endDate || {}
  const hasS = s.year && s.month && s.day
  const hasE = e.year && e.month && e.day
  if (!hasS && !hasE) return ''
  const sTxt = hasS ? `${s.year}.${pad(s.month)}.${pad(s.day)}` : ''
  const eTxt = hasE ? `${e.year}.${pad(e.month)}.${pad(e.day)}` : ''
  return hasE ? `${sTxt} ~ ${eTxt}` : sTxt
})

const alarmText = computed(() => {
  const a = props.routine?.alarmTime || {}
  if (!a.hour) return ''
  return `${a.ampm} ${pad(a.hour)}:${pad(a.minute)}`
})

const canShowStatusButton = computed(() => props.isToday && props.selected === 'notdone')

const wrapperClass = computed(() => {
  if (props.selected === 'done') return 'done'
  if (props.selected === 'faildone') return 'fail_done'
  if (props.selected === 'ignored') return 'dimmed'
  return 'not_done'
})

const hasWalkResolved = computed(() => {
  const r = props.routine || {}
  if (typeof r.hasWalk === 'boolean') return r.hasWalk
  return !!r.ruffy && !!r.course && !!r.goalCount
})

const ruffyMeta = computed(() => {
  return RUFFY_OPTIONS.find(r => r.value === props.routine?.ruffy) || null
})

const courseMeta = computed(() => {
  return COURSE_OPTIONS.find(c => c.value === props.routine?.course) || null
})

function pad(v) {
  const n = String(v || '')
  return n.length === 1 ? `0${n}` : n
}

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

function onEdit() {
  closePopup()
  let rt = {}
  try {
    rt = JSON.parse(JSON.stringify(props.routine || {}))
  } catch {
    rt = { ...(props.routine || {}) }
  }
  emit('edit', rt)
}

function openDeleteConfirm() {
  window.dispatchEvent(new Event('close-other-popups'))
  closePopup()
  showDeleteConfirmPopup.value = true
  document.body.classList.add('no-scroll')
}

function closeDeleteConfirm() {
  showDeleteConfirmPopup.value = false
  document.body.classList.remove('no-scroll')
}

function confirmDelete() {
  const id = props.routine?.id
  closeDeleteConfirm()
  if (id) emit('delete', id)
}

function openPauseRestartConfirm() {
  window.dispatchEvent(new Event('close-other-popups'))
  closePopup()
  showPauseRestartPopup.value = true
  document.body.classList.add('no-scroll')
}

function closePauseRestartPopup() {
  showPauseRestartPopup.value = false
  document.body.classList.remove('no-scroll')
}

function confirmPauseRestart() {
  const id = props.routine?.id
  const next = !isPaused.value
  closePauseRestartPopup()
  if (id) emit('togglePause', { id, isPaused: next })
  isPaused.value = next
}

function openShareConfirm() {
  window.dispatchEvent(new Event('close-other-popups'))
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
  window.dispatchEvent(new Event('close-other-popups'))
  if (showPopup.value) closePopup()
  showStatusPopup.value = true
  document.body.classList.add('no-scroll')
}

function handleStatusButtonClick() {
  openStatusPopup()
}

function closeStatusPopup() {
  showStatusPopup.value = false
  document.body.classList.remove('no-scroll')
  resetSelection()
}

function openWalkPopup() {
  window.dispatchEvent(new Event('close-other-popups'))
  if (showPopup.value) closePopup()
  showWalkPopup.value = true
  document.body.classList.add('no-scroll')
}

function closeWalkPopup() {
  showWalkPopup.value = false
  document.body.classList.remove('no-scroll')
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
