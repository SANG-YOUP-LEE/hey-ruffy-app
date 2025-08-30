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
  emit('save', r.data)
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
</script>
