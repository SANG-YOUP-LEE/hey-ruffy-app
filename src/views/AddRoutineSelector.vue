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
        <transition name="fade-msg"><div v-if="form.fieldErrors.title" class="warn-message t_red01">{{ form.fieldErrors.title }}</div></transition>
        <RoutineTitleInput v-model="form.title" />
      </div>

      <div ref="repeatWrap">
        <transition name="fade-msg"><div v-if="form.fieldErrors.repeat" class="warn-message t_red01">{{ form.fieldErrors.repeat }}</div></transition>
        <RoutineRepeatSelector ref="repeatRef" />
      </div>

      <div ref="dateWrap">
        <transition name="fade-msg"><div v-if="form.fieldErrors.date" class="warn-message t_red01">{{ form.fieldErrors.date }}</div></transition>
        <RoutineDateSelector ref="dateRef" />
      </div>

      <div ref="alarmWrap">
        <transition name="fade-msg"><div v-if="form.fieldErrors.alarm" class="warn-message t_red01">{{ form.fieldErrors.alarm }}</div></transition>
        <RoutineAlarmSelector v-model="form.alarmTime" />
      </div>

      <div ref="priorityWrap">
        <transition name="fade-msg"><div v-if="form.fieldErrors.priority" class="warn-message t_red01">{{ form.fieldErrors.priority }}</div></transition>
        <RoutinePrioritySelector v-model="form.colorIndex" />
      </div>

      <div ref="cardWrap">
        <transition name="fade-msg"><div v-if="form.fieldErrors.card" class="warn-message t_red01">{{ form.fieldErrors.card }}</div></transition>
        <RoutineCardSelector v-model="form.cardSkin" uniqueName="card-skin" />
      </div>

      <div class="off_walk">
        <p>{{ form.isWalkModeOff ? '산책 없는 다짐은 볶음밥 없는 닭갈비ㅠ' : '이제부터 러피와의 산책을 준비할까요?' }}</p>
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.isWalkModeOff" />
          <span class="checkmark"></span>
          <span>{{ form.isWalkModeOff ? '다시 산책하고 싶다면 해제해주세요. ' : '산책 없이 다짐하고 싶어요.' }}</span>
        </label>
      </div>

      <div class="walk_group" v-show="!form.isWalkModeOff">
        <div ref="ruffyWrap">
          <transition name="fade-msg"><div v-if="form.fieldErrors.ruffy" class="warn-message t_red01">{{ form.fieldErrors.ruffy }}</div></transition>
          <RoutineRuffySelector ref="ruffyRef" />
        </div>
        <div ref="courseWrap">
          <transition name="fade-msg"><div v-if="form.fieldErrors.course" class="warn-message t_red01">{{ form.fieldErrors.course }}</div></transition>
          <RoutineCourseSelector ref="courseRef" />
        </div>
        <div ref="goalWrap">
          <transition name="fade-msg"><div v-if="form.fieldErrors.goal" class="warn-message t_red01">{{ form.fieldErrors.goal }}</div></transition>
          <RoutineGoalCountSelector ref="goalRef" />
        </div>
      </div>

      <div ref="commentWrap">
        <RoutineCommentInput ref="commentRef" />
        <transition name="fade-msg"><div v-if="form.fieldErrors.comment" class="warn-message t_red01">{{ form.fieldErrors.comment }}</div></transition>
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
const repeatRef = ref()
const dateRef = ref()

const p = n => String(n).padStart(2,'0')
const toISO = d => (d ? `${d.year}-${p(d.month)}-${p(d.day)}` : null)
const safeISOFromDateObj = obj => {
  const s = toISO(obj)
  return (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s !== '0000-00-00' && s !== '0-00-00') ? s : null
}

const props = defineProps({ routineToEdit: { type: Object, default: null } })
const emit = defineEmits(['close','save'])

const isEditMode = computed(() => props.routineToEdit !== null)

const ruffyRef = ref(); const courseRef = ref(); const goalRef = ref(); const commentRef = ref()
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

function syncFromChildren() {
  const r = repeatRef.value
  if (r) {
    form.setField('repeatType', r.selectedTab ?? 'daily')
    form.setField('repeatDaily', Array.isArray(r.selectedDaily) ? [...r.selectedDaily] : [])
    form.setField('repeatWeeks', r.selectedWeeklyMain ?? '')
    form.setField('repeatWeekDays', Array.isArray(r.selectedWeeklyDays) ? [...r.selectedWeeklyDays] : [])
    form.setField('repeatMonthDays', Array.isArray(r.selectedDates) ? [...r.selectedDates] : [])
  }
  form.setField('startDate', dateRef.value?.startDate ?? null)
  form.setField('endDate',   dateRef.value?.endDate ?? null)
  if (!form.isWalkModeOff) {
    form.setField('ruffy',     ruffyRef.value?.ruffy ?? null)
    form.setField('course',    courseRef.value?.course ?? null)
    form.setField('goalCount', goalRef.value?.goalCount ?? null)
  } else {
    form.setField('ruffy', null)
    form.setField('course', null)
    form.setField('goalCount', null)
  }
  form.setField('comment',    commentRef.value?.comment ?? '')
}

const errTimers = {}
function autoHideErrors() {
  const keys = Object.keys(form.fieldErrors || {})
  keys.forEach(k => {
    if (errTimers[k]) { clearTimeout(errTimers[k]); errTimers[k] = null }
    errTimers[k] = setTimeout(() => {
      const fe = { ...form.fieldErrors }; delete fe[k]; form.fieldErrors = fe
    }, 2500)
  })
}

async function saveRoutine() {
  syncFromChildren()
  const pre = form.validate()
  if (!pre) {
    const wrapRefMap = { title: titleWrap, repeat: repeatWrap, date: dateWrap, alarm: alarmWrap, ruffy: ruffyWrap, course: courseWrap, goal: goalWrap, priority: priorityWrap, card: cardWrap, comment: commentWrap }
    const firstKey = Object.keys(form.fieldErrors || {})[0]
    const el = firstKey ? wrapRefMap[firstKey]?.value : null
    autoHideErrors()
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  const r = await form.save()
  if (!r.ok) {
    autoHideErrors()
    const wrapRefMap = { title: titleWrap, repeat: repeatWrap, date: dateWrap, alarm: alarmWrap, ruffy: ruffyWrap, course: courseWrap, goal: goalWrap, priority: priorityWrap, card: cardWrap, comment: commentWrap }
    const firstKey = Object.keys(form.fieldErrors || {})[0]
    const el = firstKey ? wrapRefMap[firstKey]?.value : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  emit('save', r.data)
  unlockScroll()
  emit('close')
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
    ruffyRef.value?.setFromRoutine?.(props.routineToEdit)
    courseRef.value?.setFromRoutine?.(props.routineToEdit)
    goalRef.value?.setFromRoutine?.(props.routineToEdit)
    commentRef.value?.setFromRoutine?.(props.routineToEdit)
  } else {
    form.reset()
  }
})

onBeforeUnmount(() => {
  Object.values(errTimers).forEach(t => t && clearTimeout(t))
  unlockScroll()
  form.clearErrors()
})
</script>

<style scoped>
.fade-msg-enter-active,
.fade-msg-leave-active { transition: opacity .25s ease, transform .25s ease; }
.fade-msg-enter-from,
.fade-msg-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
