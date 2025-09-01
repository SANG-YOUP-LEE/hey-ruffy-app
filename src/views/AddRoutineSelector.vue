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
        <transition name="slot-slide">
          <div class="warn-slot" v-if="!!form.fieldErrors.title">
            <div class="warn-message t_red01">{{ form.fieldErrors.title }}</div>
          </div>
        </transition>
        <RoutineTitleInput v-model="form.title" />
      </div>

      <div ref="repeatWrap">
        <transition name="slot-slide">
          <div class="warn-slot" v-if="!!form.fieldErrors.repeat">
            <div class="warn-message t_red01">{{ form.fieldErrors.repeat }}</div>
          </div>
        </transition>
        <RoutineRepeatSelector
          v-model:repeatType="form.repeatType"
          v-model:daily="form.repeatDaily"
          v-model:weeks="form.repeatWeeks"
          v-model:weekDays="form.repeatWeekDays"
          v-model:monthDays="form.repeatMonthDays"
        />
      </div>

      <div ref="dateWrap">
        <transition name="slot-slide">
          <div class="warn-slot" v-if="!!form.fieldErrors.date">
            <div class="warn-message t_red01">{{ form.fieldErrors.date }}</div>
          </div>
        </transition>
        <RoutineDateSelector
          v-model:startDate="form.startDate"
          v-model:endDate="form.endDate"
        />
      </div>

      <div ref="alarmWrap">
        <transition name="slot-slide">
          <div class="warn-slot" v-if="!!form.fieldErrors.alarm">
            <div class="warn-message t_red01">{{ form.fieldErrors.alarm }}</div>
          </div>
        </transition>
        <RoutineAlarmSelector v-model="form.alarmTime" />
      </div>

      <div ref="priorityWrap">
        <transition name="slot-slide">
          <div class="warn-slot" v-if="!!form.fieldErrors.priority">
            <div class="warn-message t_red01">{{ form.fieldErrors.priority }}</div>
          </div>
        </transition>
        <RoutinePrioritySelector v-model="form.colorIndex" />
      </div>

      <div ref="cardWrap">
        <transition name="slot-slide">
          <div class="warn-slot" v-if="!!form.fieldErrors.card">
            <div class="warn-message t_red01">{{ form.fieldErrors.card }}</div>
          </div>
        </transition>
        <RoutineCardSelector v-model="form.cardSkin" uniqueName="card-skin" />
      </div>

      <div class="off_walk">
        <p>{{ form.isWalkModeOff ? '산책 없는 다짐은 볶음밥 없는 닭갈비ㅠ' : '이제부터 러피와의 산책을 준비할까요?' }}</p>
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.isWalkModeOff" @change="form.toggleWalk($event.target.checked)" />
          <span class="checkmark"></span>
          <span>{{ form.isWalkModeOff ? '다시 산책하고 싶다면 해제해주세요. ' : '산책 없이 다짐하고 싶어요.' }}</span>
        </label>
      </div>

      <div class="walk_group" v-show="!form.isWalkModeOff">
        <div ref="ruffyWrap">
          <transition name="slot-slide">
            <div class="warn-slot" v-if="!!form.fieldErrors.ruffy">
              <div class="warn-message t_red01">{{ form.fieldErrors.ruffy }}</div>
            </div>
          </transition>
          <RoutineRuffySelector v-model="form.ruffy" />
        </div>
        <div ref="courseWrap">
          <transition name="slot-slide">
            <div class="warn-slot" v-if="!!form.fieldErrors.course">
              <div class="warn-message t_red01">{{ form.fieldErrors.course }}</div>
            </div>
          </transition>
          <RoutineCourseSelector v-model="form.course" unique-name="routine-course" />
        </div>
        <div ref="goalWrap">
          <transition name="slot-slide">
            <div class="warn-slot" v-if="!!form.fieldErrors.goal">
              <div class="warn-message t_red01">{{ form.fieldErrors.goal }}</div>
            </div>
          </transition>
          <RoutineGoalCountSelector v-model="form.goalCount" />
        </div>
      </div>

      <div ref="commentWrap">
        <RoutineCommentInput v-model="form.comment" />
        <transition name="slot-slide">
          <div class="warn-slot" v-if="!!form.fieldErrors.comment">
            <div class="warn-message t_red01">{{ form.fieldErrors.comment }}</div>
          </div>
        </transition>
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
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRoutineFormStore } from '@/stores/routineForm'
import { usePopupUX } from '@/composables/usePopupUX'
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

const props = defineProps({ routineToEdit: { type: Object, default: null } })
const emit = defineEmits(['close','save'])
const isEditMode = computed(() => props.routineToEdit !== null)

const titleWrap = ref(); const repeatWrap = ref(); const dateWrap = ref(); const alarmWrap = ref()
const ruffyWrap = ref(); const courseWrap = ref(); const goalWrap = ref(); const priorityWrap = ref(); const cardWrap = ref(); const commentWrap = ref()

const { lockScroll, unlockScroll, closePopup } = usePopupUX(emit)

const errTimers = {}
const wrapRefMap = {
  title: titleWrap, repeat: repeatWrap, date: dateWrap, alarm: alarmWrap,
  ruffy: ruffyWrap, course: courseWrap, goal: goalWrap,
  priority: priorityWrap, card: cardWrap, comment: commentWrap
}

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
  const pre = form.validate()
  if (!pre) {
    const firstKey = Object.keys(form.fieldErrors || {})[0]
    const el = firstKey ? wrapRefMap[firstKey]?.value : null
    autoHideErrors()
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  const r = await form.save()
  if (!r.ok) {
    autoHideErrors()
    const firstKey = Object.keys(form.fieldErrors || {})[0]
    const el = firstKey ? wrapRefMap[firstKey]?.value : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  // === ✅ iOS 로컬알림 예약 (저장 성공 직후) ===
  try {
    const data = r.data || {}
    const routineId = data.id || data.routineId || data.docId || Date.now().toString()
    const id = `rt_${routineId}`

    let title = (form.title || '').trim()
    if (!title) throw new Error('title empty')
    const MAX_LEN = 20
    if (title.length > MAX_LEN) title = title.slice(0, MAX_LEN) + '…'

    // 알람 파싱
    const hm = parseAlarmTime(form.alarmTime)
    if (!hm) {
      gotoFinish(r.data)
      return
    }

    const iosWeekdays = toIOSWeekdayNums(form.repeatWeekDays)
    const subtitle = buildSubtitle(form.repeatType, iosWeekdays, form.startDate, `${String(hm.hour).padStart(2,'0')}:${String(hm.minute).padStart(2,'0')}`)
    const link = `heyruffy://main?r=${encodeURIComponent(routineId)}`

    postIOS({ action: 'cancel', id })

    if (form.repeatType === 'daily') {
      postIOS({ action: 'scheduleDaily', id, title, subtitle, hour: hm.hour, minute: hm.minute, link })
    } else if (form.repeatType === 'weekly') {
      if (!iosWeekdays?.length) { gotoFinish(r.data); return }
      postIOS({ action: 'scheduleWeekly', id, title, subtitle, hour: hm.hour, minute: hm.minute, weekdays: iosWeekdays, link })
    } else {
      const base = form.startDate ? new Date(form.startDate) : new Date()
      base.setHours(hm.hour); base.setMinutes(hm.minute); base.setSeconds(0); base.setMilliseconds(0)
      postIOS({ action: 'scheduleOnce', id, title, subtitle, timestamp: base.getTime(), link })
    }
  } catch (e) {
    console.warn('notify post skipped:', e)
  }

  gotoFinish(r.data)
}

function gotoFinish(data) {
  emit('save', data)
  unlockScroll()
  emit('close')
}

onMounted(() => {
  lockScroll()
  if (props.routineToEdit) {
    form.initFrom(props.routineToEdit)
  } else {
    form.reset()
  }
})

onBeforeUnmount(() => {
  Object.values(errTimers).forEach(t => t && clearTimeout(t))
  unlockScroll()
  form.clearErrors()
})

/* ===== iOS 브릿지 유틸 ===== */
function postIOS(payload) {
  try { window.webkit?.messageHandlers?.notify?.postMessage(payload) } catch (_) {}
}

// ✅ 새로 정의: 기본값(9:00) 강제 제거
function parseAlarmTime(v) {
  if (!v) return null
  if (typeof v === 'string') {
    const m = v.match(/^(\d{1,2}):(\d{2})$/)
    if (!m) return null
    const h = Number(m[1]), mi = Number(m[2])
    if (Number.isNaN(h) || Number.isNaN(mi)) return null
    if (h < 0 || h > 23 || mi < 0 || mi > 59) return null
    return { hour: h, minute: mi }
  }
  const a = String(v.ampm || '').toLowerCase()
  const hh = v.hour != null ? String(v.hour).padStart(2, '0') : ''
  const mm = v.minute != null ? String(v.minute).padStart(2, '0') : ''
  if (!/^\d{2}$/.test(hh) || !/^\d{2}$/.test(mm)) return null
  let h12 = Number(hh), m = Number(mm)
  if (h12 < 1 || h12 > 12 || m < 0 || m > 59) return null
  const isPM = a.includes('pm') || a.includes('오후')
  const isAM = a.includes('am') || a.includes('오전')
  if (!isAM && !isPM) return null
  let h24 = h12 % 12
  if (isPM) h24 += 12
  return { hour: h24, minute: m }
}

function toIOSWeekdayNums(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map(n => (n >= 1 && n <= 7) ? n : ((n % 7) + 1))
}

const WD_LABEL = ['일','월','화','수','목','금','토']
function buildSubtitle(repeatType, weekDays, startDate, timeStr) {
  if (repeatType === 'daily') return `매일 ${timeStr}`
  if (repeatType === 'weekly') {
    const label = (weekDays || []).map(n => WD_LABEL[(n >= 1 && n <= 7) ? n-1 : n%7]).join('')
    return `${label || '주간'} ${timeStr}`
  }
  const d = startDate ? new Date(startDate) : new Date()
  const [hh, mm] = timeStr.split(':').map(Number)
  d.setHours(hh); d.setMinutes(mm); d.setSeconds(0); d.setMilliseconds(0)
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day} ${timeStr}`
}
</script>

