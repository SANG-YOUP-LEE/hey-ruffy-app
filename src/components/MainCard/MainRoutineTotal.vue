<template>
  <div class="routine_total">
    <p>
      <span>
        <strong>{{ isFuture ? '이날의 다짐' : '오늘의 다짐' }}</strong>
        총<em class="t_on">{{ displayTotal }}</em>건
      </span>
      <span>
        <template v-if="isFuture">
          미래에도 다짐 부자시네요!
        </template>
        <template v-else>
          <a
            href="#none"
            class="not_done"
            :class="{ on: selectedRadio === 'notdone' }"
            @click.prevent="selectedRadio = 'notdone'"
          >
            <strong>미달성</strong> <em class="t_on">{{ displayCounts.notdone }}</em>
          </a>
          <a
            href="#none"
            class="done"
            :class="{ on: selectedRadio === 'done' }"
            @click.prevent="selectedRadio = 'done'"
          >
            <strong>달성완료</strong> <em class="t_on">{{ displayCounts.done }}</em>
          </a>
          <a
            href="#none"
            class="fail_done"
            :class="{ on: selectedRadio === 'faildone' }"
            @click.prevent="selectedRadio = 'faildone'"
          >
            <strong>달성실패</strong> <em class="t_on">{{ displayCounts.faildone }}</em>
          </a>
          <a
            href="#none"
            class="ignored"
            :class="{ on: selectedRadio === 'ignored' }"
            @click.prevent="selectedRadio = 'ignored'"
          >
            <strong>흐린눈</strong> <em class="t_on">{{ displayCounts.ignored }}</em>
          </a>
        </template>
      </span>
    </p>

    <p class="filter_row">
      <span class="filter_buttons">
        <button type="button" :class="{ on: selectedRadio === 'notdone' }" @click="selectedRadio = 'notdone'">달성 전</button>
        <button type="button" :class="{ on: selectedRadio === 'done' }" @click="selectedRadio = 'done'">달성 완료</button>
        <button type="button" :class="{ on: selectedRadio === 'faildone' }" @click="selectedRadio = 'faildone'">달성 실패</button>
        <button type="button" :class="{ on: selectedRadio === 'ignored' }" @click="selectedRadio = 'ignored'">흐린 눈</button>
        <!--button type="button" :class="{ on: selectedRadio === null }" @click="handleWeeklyClick">주간보기</button-->
      </span>
    </p>
  </div>
  <div class="today_tools">
    <div class="today">
      <p>
        <a v-if="!isToday" href="#none" class="prev" @click.prevent="goPrev"><span>전날</span></a>
        {{ formattedDate }}
        <a href="#none" class="next" @click.prevent="goNext"><span>다음날</span></a>
      </p>
    </div>
    <div class="tools">
      <!--a href="#none" class="weekly"><span>주간보기</span></a-->
      <a href="#none" class="move"><span>다짐이동</span></a>
    </div>
  </div>

</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['update:modelValue', 'changeFilter', 'showWeekly'])
const props = defineProps({
  isFuture: { type: Boolean, default: false },
  // 주의: 주간보기(null)까지 허용
  modelValue: { type: [String, null], default: 'notdone' },

  // 상위에서 내려줄 카운트(없으면 기본값으로 현재 화면처럼 보이게)
  counts: {
    type: Object,
    default: null, // { notdone, done, faildone, ignored }
  },
  // 총합을 따로 내려줄 수도 있음(없으면 기본값 사용)
  totalCount: {
    type: Number,
    default: null,
  },
})

// 상위에서 안 내려줘도 UI 틀어지지 않게 안전한 기본값
const displayCounts = computed(() => {
  return props.counts ?? { notdone: 5, done: 8, faildone: 8, ignored: 2 }
})
const displayTotal = computed(() => {
  // 총합 props가 있으면 사용, 없으면 기본 15 유지
  return props.totalCount ?? 15
})

const selectedRadio = computed({
  get: () => props.modelValue,
  set: (v) => {
    emit('update:modelValue', v)
    emit('changeFilter', v)
  }
})

function handleWeeklyClick() {
  emit('update:modelValue', null)
  emit('changeFilter', null)
  emit('showWeekly')
}

// 날짜 상태
const currentDate = ref(startOfDay(new Date()))
const todayDate = startOfDay(new Date())

const isToday = computed(() => currentDate.value.getTime() === todayDate.getTime())

const formattedDate = computed(() => {
  const d = currentDate.value
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] // 필요에 맞게 변경
  const dayName = dayNames[d.getDay()]
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} (${dayName})`
})

function goPrev() {
  currentDate.value = addDays(currentDate.value, -1)
}

function goNext() {
  currentDate.value = addDays(currentDate.value, 1)
}

// 유틸
function startOfDay(d) {
  const nd = new Date(d)
  nd.setHours(0, 0, 0, 0)
  return nd
}
function addDays(d, days) {
  const nd = new Date(d)
  nd.setDate(nd.getDate() + days)
  nd.setHours(0, 0, 0, 0)
  return nd
}
</script>
