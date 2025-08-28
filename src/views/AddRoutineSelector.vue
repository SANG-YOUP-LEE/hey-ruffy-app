<template>
  <div class="popup_wrap">
    <div class="popup_tit">
      <h2>{{ isEditMode ? '다짐을 수정할까요?' : '다짐을 만들어 볼까요?' }}</h2>
      <p>
        <template v-if="isEditMode">
          다짐을 변경해보아요.<br />
          러피의 산책을 이어갑니다.
        </template>
        <template v-else>
          다짐을 달성할 때마다<br />
          러피의 산책이 총총총 계속됩니다.
        </template>
      </p>
    </div>

    <div class="popup_inner" ref="popupInner">
      <div ref="titleWrap">
        <div v-if="fieldErrors.title" class="warn-message t_red01">{{ fieldErrors.title }}</div>
        <RoutineTitleInput v-model="form.title" />
      </div>

      <div ref="repeatWrap">
        <div v-if="fieldErrors.repeat" class="warn-message t_red01">{{ fieldErrors.repeat }}</div>
        <RoutineRepeatSelector ref="repeatRef" />
      </div>

      <div ref="dateWrap">
        <div v-if="fieldErrors.date" class="warn-message t_red01">{{ fieldErrors.date }}</div>
        <RoutineDateSelector ref="dateRef" />
      </div>

      <div ref="alarmWrap">
        <div v-if="fieldErrors.alarm" class="warn-message t_red01">{{ fieldErrors.alarm }}</div>
        <RoutineAlarmSelector ref="alarmRef" />
      </div>

      <div ref="priorityWrap">
        <div v-if="fieldErrors.priority" class="warn-message t_red01">{{ fieldErrors.priority }}</div>
        <RoutinePrioritySelector ref="priorityRef" />
      </div>

      <div ref="cardWrap">
        <div v-if="fieldErrors.card" class="warn-message t_red01">{{ fieldErrors.card }}</div>
        <RoutineCardSelector ref="cardRef" v-model="cardSkin" uniqueName="card-skin" />
      </div>

      <div class="off_walk">
        <p>{{ isWalkModeOff ? '산책 없는 다짐은 볶음밥 없는 닭갈비ㅠ' : '이제부터 러피와의 산책을 준비할까요?' }}</p>
        <label class="checkbox-label">
          <input type="checkbox" v-model="isWalkModeOff" />
          <span class="checkmark"></span>
          <span>{{ isWalkModeOff ? '다시 산책하고 싶다면 해제해주세요. ' : '산책 없이 다짐하고 싶어요.' }}</span>
        </label>
      </div>

      <div class="walk_group" v-show="!isWalkModeOff">
        <div ref="ruffyWrap">
          <div v-if="fieldErrors.ruffy" class="warn-message t_red01">{{ fieldErrors.ruffy }}</div>
          <RoutineRuffySelector ref="ruffyRef" />
        </div>
        <div ref="courseWrap">
          <div v-if="fieldErrors.course" class="warn-message t_red01">{{ fieldErrors.course }}</div>
          <RoutineCourseSelector ref="courseRef" />
        </div>
        <div ref="goalWrap">
          <div v-if="fieldErrors.goal" class="warn-message t_red01">{{ fieldErrors.goal }}</div>
          <RoutineGoalCountSelector ref="goalRef" />
        </div>
      </div>

      <div ref="commentWrap">
        <RoutineCommentInput ref="commentRef" />
        <div v-if="fieldErrors.comment" class="warn-message t_red01">{{ fieldErrors.comment }}</div>
      </div>
    </div>

    <div class="popup_btm">
      <button class="b_basic" @click="saveRoutine">다짐 저장하기</button>
    </div>

    <div class="close_btn_wrap">
      <div class="close_btn" @click="closePopup"><span>닫기</span></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount, nextTick } from 'vue'
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useRoutineFormStore } from '@/stores/routineForm'

import RoutineTitleInput from '@/components/routine/RoutineTitleInput.vue'
import RoutineRepeatSelector from '@/components/routine/RoutineRepeatSelector.vue'
import RoutineDateSelector from '@/components/routine/RoutineDateSelector.vue'
import RoutineAlarmSelector from '@/components/routine/RoutineAlarmSelector.vue'
import RoutineRuffySelector from '@/components/routine/RoutineRuffySelector.vue'
import RoutineCourseSelector from '@/components/routine/RoutineCourseSelector.vue'
import RoutineGoalCountSelector from '@/components/routine/RoutineGoalCountSelector.vue'
import RoutinePrioritySelector from '@/components/routine/RoutinePrioritySelector.vue'
import RoutineCardSelector from '@/components/routine/RoutineCardSelector.vue'
import RoutineCommentInput from '@/components/routine/RoutineCommentInput.vue'

const form = useRoutineFormStore()

const KOR_TO_ICS = { 월:'MO', 화:'TU', 수:'WE', 목:'TH', 금:'FR', 토:'SA', 일:'SU' }
const p = n => String(n).padStart(2,'0')
const toISO = d => (d ? `${d.year}-${p(d.month)}-${p(d.day)}` : null)
const weeklyDaysToICS = arr => (arr||[]).map(k=>KOR_TO_ICS[String(k).replace(/['"]/g,'')]).filter(Boolean)
const parseInterval = s => { const m=String(s||'').match(/(\d+)/); return m?+m[1]:1 }
const safeISOFromDateObj = obj => {
  const s = toISO(obj)
  return (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s !== '0000-00-00' && s !== '0-00-00') ? s : null
}
const getBaseId = (id) => String(id || '').split('-')[0]

const props = defineProps({ routineToEdit: { type: Object, default: null } })
const emit = defineEmits(['close','save'])

const isEditMode = computed(() => props.routineToEdit !== null)
const isWalkModeOff = ref(false)

const normalizeSkin = (v) => {
  const m = String(v || '').match(/(\d+)/)
  if (!m) return 'option01'
  const n = m[1].padStart(2, '0')
  return `option${n}`
}
const cardSkin = ref('option01')

const fieldErrors = ref({
  title: '', repeat: '', date: '', alarm: '',
  ruffy: '', course: '', goal: '', priority: '', card: '', comment: ''
})
const errorTimers = {}
const ERROR_MS = 3000
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
function showFieldError(key, msg) {
  fieldErrors.value[key] = msg
  if (errorTimers[key]) clearTimeout(errorTimers[key])
  errorTimers[key] = setTimeout(() => { fieldErrors.value[key] = ''; delete errorTimers[key] }, ERROR_MS)
  const wrapRefMap = { title: titleWrap, repeat: repeatWrap, date: dateWrap, alarm: alarmWrap, ruffy: ruffyWrap, course: courseWrap, goal: goalWrap, priority: priorityWrap, card: cardWrap, comment: commentWrap }
  const el = wrapRefMap[key]?.value; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function clearAllFieldErrors() {
  Object.keys(fieldErrors.value).forEach(k => { fieldErrors.value[k] = ''; if (errorTimers[k]) clearTimeout(errorTimers[k]); delete errorTimers[k] })
}

const repeatRef = ref(); const dateRef = ref(); const alarmRef = ref()
const ruffyRef = ref(); const courseRef = ref(); const goalRef = ref(); const priorityRef = ref(); const cardRef = ref(); const commentRef = ref()
const titleWrap = ref(); const repeatWrap = ref(); const dateWrap = ref(); const alarmWrap = ref()
const ruffyWrap = ref(); const courseWrap = ref(); const goalWrap = ref(); const priorityWrap = ref(); const cardWrap = ref(); const commentWrap = ref()

let scrollY = 0
const preventTouchMove = (e) => { if (!e.target.closest('.popup_wrap')) e.preventDefault() }
const lockScroll = () => {
  scrollY = window.scrollY
  document.documentElement.classList.add('no-scroll')
  document.body.classList.add('no-scroll')
  document.body.style.top = `-${scrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
  document.body.style.position = 'fixed'
  window.addEventListener('touchmove', preventTouchMove, { passive: false })
}
const unlockScroll = () => {
  document.documentElement.classList.remove('no-scroll')
  document.body.classList.remove('no-scroll')
  document.body.style.position = ''
  document.body.style.top=''
  document.body.style.left=''
  document.body.style.right=''
  document.body.style.width=''
  document.body.style.overflow=''
  window.removeEventListener('touchmove', preventTouchMove)
  window.scrollTo(0, scrollY)
}
const closePopup = () => { unlockScroll(); emit('close') }

const notU = v => v !== undefined
const hasWalk = computed(() => {
  if (isWalkModeOff.value) return false
  return !!(ruffyRef.value?.ruffy && courseRef.value?.course && goalRef.value?.goalCount)
})

function syncRepeatFromChild() {
  const r = repeatRef.value
  if (!r) return
  form.setField('repeatType', r.selectedTab ?? 'daily')
  form.setField('repeatDaily', Array.isArray(r.selectedDaily) ? [...r.selectedDaily] : [])
  form.setField('repeatWeeks', r.selectedWeeklyMain ?? '')
  form.setField('repeatWeekDays', Array.isArray(r.selectedWeeklyDays) ? [...r.selectedWeeklyDays] : [])
  form.setField('repeatMonthDays', Array.isArray(r.selectedDates) ? [...r.selectedDates] : [])
}

function buildPayload() {
  syncRepeatFromChild()
  const repeatType = form.repeatType ?? 'daily'

  const base = {
    title: form.title ?? '',
    repeatType,
    repeatDays:  repeatType === 'daily'  ? [...(form.repeatDaily || [])] : [],
    repeatWeeks: repeatType === 'weekly' ? (form.repeatWeeks || '') : '',
    repeatWeekDays: repeatType === 'weekly' ? [...(form.repeatWeekDays || [])] : [],
    repeatMonthDays: repeatType === 'monthly' ? [...(form.repeatMonthDays || [])] : [],
    startDate: dateRef.value?.startDate ?? null,
    endDate:   dateRef.value?.endDate   ?? null,
    alarmTime: alarmRef.value?.selectedAlarm ?? null,
    ruffy:     isWalkModeOff.value ? null : (ruffyRef.value?.ruffy ?? null),
    course:    isWalkModeOff.value ? null : (courseRef.value?.course ?? null),
    goalCount: isWalkModeOff.value ? null : (goalRef.value?.goalCount ?? null),
    colorIndex: Number(priorityRef.value?.selectedColor ?? 0),
    cardSkin: normalizeSkin(cardSkin.value),
    comment: commentRef.value?.comment ?? '',
    hasWalk: hasWalk.value,
    tz: 'Asia/Seoul'
  }

  const hasStart = !!safeISOFromDateObj(base.startDate)
  const hasEnd   = !!safeISOFromDateObj(base.endDate)
  const interval = parseInterval(base.repeatWeeks)
  const anchorISO = hasStart ? safeISOFromDateObj(base.startDate) : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())

  const rule = {
    freq: repeatType,
    interval,
    anchor: anchorISO,
    ...(repeatType === 'weekly'  ? { byWeekday: weeklyDaysToICS(base.repeatWeekDays) } : {}),
    ...(repeatType === 'monthly' ? { byMonthDay: (base.repeatMonthDays || []).map(n => Number(n)) } : {})
  }

  const cleaned = {
    ...base,
    rule,
    start: anchorISO,
    ...(hasEnd ? { end: safeISOFromDateObj(base.endDate) } : {}),
    startDate: hasStart ? base.startDate : null,
    endDate: hasEnd ? base.endDate : null
  }

  const deepClean = (v) => {
    if (Array.isArray(v)) return v.filter(x => x !== undefined).map(deepClean)
    if (v && typeof v === 'object') {
      const r = {}
      Object.entries(v).forEach(([k,val]) => { if (val !== undefined) r[k] = deepClean(val) })
      return r
    }
    return v
  }

  return deepClean(cleaned)
}

const validateRoutine = () => {
  clearAllFieldErrors()
  if (!form.title || String(form.title).trim() === '') { showFieldError('title','다짐 제목을 입력해주세요.'); return false }
  syncRepeatFromChild()
  const t = form.repeatType
  if (!t) { showFieldError('repeat','반복 주기를 선택해주세요.'); return false }
  if (t === 'daily'   && (!form.repeatDaily || form.repeatDaily.length === 0)) { showFieldError('repeat','반복 주기를 선택해주세요.'); return false }
  if (t === 'weekly'  && ((!form.repeatWeeks) || !form.repeatWeekDays || form.repeatWeekDays.length === 0)) { showFieldError('repeat','반복 주기를 선택해주세요.'); return false }
  if (t === 'monthly' && (!form.repeatMonthDays || form.repeatMonthDays.length === 0)) { showFieldError('repeat','반복 주기를 선택해주세요.'); return false }
  if (!isWalkModeOff.value) {
    let invalid = false
    if (!ruffyRef.value?.ruffy)  { showFieldError('ruffy','러피를 선택해주세요.'); invalid = true }
    if (!courseRef.value?.course){ showFieldError('course','코스를 선택해주세요.'); invalid = true }
    if (!goalRef.value?.goalCount){ showFieldError('goal','목표 횟수를 선택해주세요.'); invalid = true }
    if (invalid) return false
  }
  const selectedColor = priorityRef.value?.selectedColor ?? null
  if (selectedColor === null) { showFieldError('priority','다짐 색상을 선택해주세요.'); return false }
  if (!cardSkin.value) { showFieldError('card','카드 디자인을 선택해주세요.'); return false }
  return true
}

const saveRoutine = async () => {
  if (!validateRoutine()) return
  try {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) throw new Error('로그인이 필요합니다.')
    const payload = buildPayload()
    if (isEditMode.value && props.routineToEdit?.id) {
      const rid = getBaseId(props.routineToEdit.id)
      await setDoc(
        doc(db, 'users', user.uid, 'routines', rid),
        { ...payload, updatedAt: serverTimestamp() },
        { merge: true }
      )
      emit('save', { id: rid, ...payload })
    } else {
      const colRef = collection(db, 'users', user.uid, 'routines')
      const docRef = await addDoc(colRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      emit('save', { id: docRef.id, ...payload })
    }
    unlockScroll()
    emit('close')
  } catch (err) {
    alert('저장에 실패했습니다.')
  }
}

onMounted(async () => {
  lockScroll()
  if (props.routineToEdit) {
    form.initFrom(props.routineToEdit)
    repeatRef.value?.setFromRoutine?.(props.routineToEdit)
    const sd = props.routineToEdit?.startDate || null
    const ed = props.routineToEdit?.endDate || null
    const hasStart = !!safeISOFromDateObj(sd)
    const hasEnd   = !!safeISOFromDateObj(ed)
    await nextTick()
    dateRef.value?.setFromRoutine?.({
      startDate: hasStart ? sd : null,
      endDate:   hasEnd   ? ed : null,
      useStart:  hasStart,
      useEnd:    hasEnd
    })
    alarmRef.value?.setFromRoutine?.(props.routineToEdit)
    ruffyRef.value?.setFromRoutine?.(props.routineToEdit)
    courseRef.value?.setFromRoutine?.(props.routineToEdit)
    goalRef.value?.setFromRoutine?.(props.routineToEdit)
    priorityRef.value?.setFromRoutine?.(props.routineToEdit)
    cardRef.value?.setFromRoutine?.(props.routineToEdit)
    commentRef.value?.setFromRoutine?.(props.routineToEdit)
    isWalkModeOff.value = !props.routineToEdit.ruffy
    cardSkin.value = props.routineToEdit.cardSkin || cardSkin.value
  } else {
    form.reset()
  }
})

onBeforeUnmount(() => {
  unlockScroll()
  clearAllFieldErrors()
})
</script>
