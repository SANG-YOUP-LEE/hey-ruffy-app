<template>
  <div class="done_group">
    <div v-if="selected === 'weekly'" class="weekly">주간 다짐</div>
    <div v-else :class="wrapperClass">
      <ViewCardSet
        :key="cardKey"
        :variant="layoutVariant"
        :cls="['routine_card', cardSkinClass, courseClass, { rt_off: isPaused, walk_mode: hasWalkResolved }]"
        :ui="{
          titleText,
          repeatLabel,
          repeatDetail,
          periodText,
          alarmText,
          commentText,
          colorClass,
          ruffyName: ruffyMeta?.name || '',
          courseName: courseMeta?.name || '',
          goalCount: props.routine?.goalCount ?? null,
          dateText
        }"
        :flags="{
          isPaused,
          hasWalkResolved,
          canShowStatusButton: periodMode === 'T' && canShowStatusButton,
          hasTwoButtons
        }"
        :period-mode="periodMode"
        :is-select-mode="deleteMode"
        :is-selected="isSelected"
        :card-id="cardId"
        :opened-card-id="openedCardId"
        @toggle-open="handleToggleOpen"
        @delete="handleChildDelete"
        @edit="handleChildEdit"
        @pause-restart="handleChildPauseRestart"
        @share="handleChildShare"
        @status="handleChildStatus"
        @walk="handleChildWalk"
        @select="handleChildSelect"
      />
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
            <button @click="confirmPauseRestart" class="p_basic">{{ isPaused ? '다짐 다시 시작하기' : '다짐 멈추기' }}</button>
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
                <span class="well_done" :class="{ right: selectedState==='well_done' }" @click="onSelect('well_done')" v-show="!selectedState || selectedState==='well_done'">{{ selectedState==='well_done' ? '나 잘했지? 오늘도 다짐 성공이야!' : '다짐 달성 성공!' }}</span>
                <span class="fail_done" :class="{ right: selectedState==='fail_done' }" @click="onSelect('fail_done')" v-show="!selectedState || selectedState==='fail_done'">{{ selectedState==='fail_done' ? '오늘은 결국 실패야ㅠㅠ' : '다짐 달성 실패ㅠ' }}</span>
                <span class="ign_done" :class="{ right: selectedState==='ign_done' }" @click="onSelect('ign_done')" v-show="!selectedState || selectedState==='ign_done'">{{ selectedState==='ign_done' ? '오늘은 진짜 어쩔 수 없었다고ㅜ' : '흐린눈-_-' }}</span>
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
            <WalkStatusPanel :routine="props.routine" :play-seq="walkPlaySeq" :done-override="walkDoneOverride" />
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
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import WalkStatusPanel from '@/components/MainCard/MainWalkStatus.vue'
import { RUFFY_OPTIONS } from '@/components/common/RuffySelector.vue'
import { COURSE_OPTIONS } from '@/components/common/CourseSelector.vue'
import ViewCardSet from '@/components/MainCard/viewCardSet.vue'

const props = defineProps({
  selected: String,
  routine: { type: Object, default: () => ({}) },
  isToday: { type: Boolean, default: false },
  layout: { type: [Object, Function], required: true },
  layoutVariant: { type: String, default: 'basic' },
  assignedDate: { type: [String, Date, Number], default: null },
  periodMode: { type: String, default: 'T' },
  deleteTargets: { type: [Array, String], default: null },
  deleteMode: { type: Boolean, default: false }
})
const emit = defineEmits(['delete','changeStatus','edit','togglePause','toggleSelect'])

const openedCardId = ref(null)

const showDeleteConfirmPopup = ref(false)
const showPauseRestartPopup = ref(false)
const showShareConfirmPopup = ref(false)
const showStatusPopup = ref(false)
const showWalkPopup = ref(false)

const isPaused = ref(!!props.routine?.isPaused)
watch(() => props.routine?.isPaused, v => { isPaused.value = !!v }, { immediate: true })

const selectedState = ref('')
const pendingStatus = ref(null)
const walkPlaySeq = ref(0)
const walkDoneOverride = ref(null)

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

const ymd = (d) => {
  if (!d) return null
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? { year:+m[1], month:+m[2], day:+m[3] } : null
  }
  if (typeof d === 'object' && d.year && d.month && d.day) {
    return { year:+d.year, month:+d.month, day:+d.day }
  }
  return null
}
const eqYMD = (a,b) => !!a && !!b && a.year===b.year && a.month===b.month && a.day===b.day

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
    const n = Number(r.repeatEveryDays)
    const hasEvery = Number.isInteger(n) && n > 0
    const s = ymd(r.startDate) || ymd(r.start)
    const e = ymd(r.endDate) || ymd(r.end)
    const todayOnly = (Number(r.repeatEveryDays) === 0) || (s && e && eqYMD(s,e))
    if (todayOnly) return '오늘만'
    if (hasEvery) return `${n}일마다`
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
  const sObj = props.routine?.startDate || props.routine?.start || {}
  const eObj = props.routine?.endDate || props.routine?.end || {}
  const s = ymd(sObj)
  const e = ymd(eObj)
  if (!s && !e) return ''
  const sTxt = s ? `${s.year}.${pad(s.month)}.${pad(s.day)}` : ''
  const eTxt = e ? `${e.year}.${pad(e.month)}.${pad(e.day)}` : ''
  return e ? `${sTxt} ~ ${eTxt}` : sTxt
})

const alarmText = computed(() => {
  const a = props.routine?.alarmTime || {}
  if (!a.hour) return ''
  return `${a.ampm} ${pad(a.hour)}:${pad(a.minute)}`
})

const canShowStatusButton = computed(() => {
  return props.periodMode === 'T' && props.isToday && props.selected === 'notdone'
})

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

const ruffyMeta = computed(() => RUFFY_OPTIONS.find(r => r.value === props.routine?.ruffy) || null)
const courseMeta = computed(() => COURSE_OPTIONS.find(c => c.value === props.routine?.course) || null)

const hasTwoButtons = computed(() => {
  let count = 0
  if (canShowStatusButton.value) count++
  if (hasWalkResolved.value) count++
  return count === 2
})

function pad(v) {
  const n = String(v || '')
  return n.length === 1 ? `0${n}` : n
}

const dateText = computed(() => {
  if (props.periodMode !== 'T') return ''
  const v = props.assignedDate
  if (v === null || v === undefined) return ''
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
})

const cardId = computed(() => String(props.routine?.id || ''))
const cardKey = computed(() => `${cardId.value}:${props.routine?.updatedAt?.seconds ?? props.routine?.updatedAt ?? ''}`)
const baseId = computed(() => String(props.routine?.id || '').split('-')[0])
const isSelected = computed(() => Array.isArray(props.deleteTargets) && props.deleteTargets.includes(baseId.value))

function handleChildSelect(checked) {
  const id = baseId.value
  if (id) emit('toggleSelect', { id, checked })
}

function onSelect(type) { selectedState.value = selectedState.value === type ? '' : type }
function resetSelection() { selectedState.value = '' }

function handleToggleOpen(id) {
  window.dispatchEvent(new Event('close-other-popups'))
  openedCardId.value = openedCardId.value === id ? null : id
}

function handleChildEdit() {
  let rt = {}
  try { rt = JSON.parse(JSON.stringify(props.routine || {})) }
  catch { rt = { ...(props.routine || {}) } }
  openedCardId.value = null
  emit('edit', rt)
}

function handleChildDelete() {
  window.dispatchEvent(new Event('close-other-popups'))
  openedCardId.value = null
  showDeleteConfirmPopup.value = true
  document.body.classList.add('no-scroll')
}
function closeDeleteConfirm() {
  showDeleteConfirmPopup.value = false
  document.body.classList.remove('no-scroll')
}
function confirmDelete() {
  const ids =
    Array.isArray(props.deleteTargets) && props.deleteTargets.length > 0
      ? props.deleteTargets
      : [String(props.routine?.id)];
  closeDeleteConfirm();
  if (ids[0]) emit('delete', ids);
}

function handleChildPauseRestart() {
  window.dispatchEvent(new Event('close-other-popups'))
  openedCardId.value = null
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

function handleChildShare() {
  window.dispatchEvent(new Event('close-other-popups'))
  openedCardId.value = null
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

function handleChildStatus() {
  window.dispatchEvent(new Event('close-other-popups'))
  openedCardId.value = null
  showStatusPopup.value = true
  document.body.classList.add('no-scroll')
}
function handleChildWalk() {
  window.dispatchEvent(new Event('close-other-popups'))
  openedCardId.value = null
  if (pendingStatus.value === 'done' && hasWalkResolved.value) {
    const base = Number(props.routine?.walkDoneCount || 0)
    walkDoneOverride.value = base + 1
  } else {
    walkDoneOverride.value = null
  }
  showWalkPopup.value = true
  document.body.classList.add('no-scroll')
  nextTick(() => { walkPlaySeq.value++ })
}

function closeStatusPopup() {
  showStatusPopup.value = false
  document.body.classList.remove('no-scroll')
  resetSelection()
}

function closeWalkPopup() {
  showWalkPopup.value = false
  document.body.classList.remove('no-scroll')
  walkDoneOverride.value = null
  if (pendingStatus.value) {
    const id = props.routine?.id
    const next = pendingStatus.value
    pendingStatus.value = null
    if (id && next) emit('changeStatus', { id, status: next })
  }
}

function confirmStatusCheck() {
  const id = props.routine?.id
  let next = null
  if (selectedState.value === 'well_done') next = 'done'
  else if (selectedState.value === 'fail_done') next = 'faildone'
  else if (selectedState.value === 'ign_done') next = 'ignored'
  const shouldOpenWalk = next === 'done' && hasWalkResolved.value
  if (shouldOpenWalk) {
    pendingStatus.value = next
    closeStatusPopup()
    handleChildWalk()
    return
  }
  closeStatusPopup()
  if (id && next) emit('changeStatus', { id, status: next })
}

function closeAllLocalPopups() {
  openedCardId.value = null
  showDeleteConfirmPopup.value = false
  showPauseRestartPopup.value = false
  showShareConfirmPopup.value = false
  showStatusPopup.value = false
  showWalkPopup.value = false
  selectedState.value = ''
  pendingStatus.value = null
  walkDoneOverride.value = null
  document.body.classList.remove('no-scroll')
}

watch(
  [() => props.layoutVariant, () => props.periodMode, () => props.selected],
  () => {
    closeAllLocalPopups()
    window.dispatchEvent(new Event('close-other-popups'))
  }
)

function handleGlobalCloseEvents() {
  if (openedCardId.value !== null) openedCardId.value = null
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
