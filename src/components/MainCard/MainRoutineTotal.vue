<template>
  <div class="routine_total">
    <p>
      <span>
        <strong>{{ isFuture ? '이날의 다짐' : headerTitle }}</strong>
        <em class="t_on">{{ displayTotal }}</em>
      </span>
      <span>
        <template v-if="isFuture">
          미래에도 다짐 부자시네요!
        </template>
        <template v-else>
          <a
            href="#none"
            class="not_done"
            :class="{ uline: selectedRadio === 'notdone' }"
            @click.prevent="selectedRadio = 'notdone'"
          >
            <strong>미달성</strong> <em class="t_on">{{ displayCounts.notdone }}</em>
          </a>
          <a
            href="#none"
            class="done"
            :class="{ uline: selectedRadio === 'done' }"
            @click.prevent="selectedRadio = 'done'"
          >
            <strong>달성완료</strong> <em class="t_on">{{ displayCounts.done }}</em>
          </a>
          <a
            href="#none"
            class="fail_done"
            :class="{ uline: selectedRadio === 'faildone' }"
            @click.prevent="selectedRadio = 'faildone'"
          >
            <strong>달성실패</strong> <em class="t_on">{{ displayCounts.faildone }}</em>
          </a>
          <a
            href="#none"
            class="ignored"
            :class="{ uline: selectedRadio === 'ignored' }"
            @click.prevent="selectedRadio = 'ignored'"
          >
            <strong>흐린눈</strong> <em class="t_on">{{ displayCounts.ignored }}</em>
          </a>
        </template>
      </span>
    </p>
  </div>

  <div class="today_tools">
    <div class="today">
      <p>
        <a
          href="#none"
          class="prev"
          :class="{ hidden: periodMode==='T' && isToday }"
          @click.prevent="$emit('requestPrev')"
        ><span>{{ prevLabel }}</span></a>
        <a href="#none" class="basic">{{ centerTitle }}</a>
        {{ centerText }}
        <a
          href="#none"
          class="next"
          @click.prevent="$emit('requestNext')"
        ><span>{{ nextLabel }}</span></a>
      </p>
    </div>

    <div class="term">
      <a
        v-if="periodMode!=='T'"
        href="#none"
        class="on_w light"
        @click.prevent="$emit('changePeriod','T')"
      >T</a>
      <a
        v-if="periodMode!=='W'"
        href="#none"
        class="on_w light"
        @click.prevent="$emit('changePeriod','W')"
      >W</a>
      <a
        v-if="periodMode!=='M'"
        href="#none"
        class="on_w light"
        @click.prevent="$emit('changePeriod','M')"
      >M</a>
    </div>

    <div class="tools">
      <a
        href="#none"
        class="r_card"
        :class="{ on: viewMode==='card' }"
        @click.prevent="$emit('changeView','card')"
      ><span>다짐카드보기</span></a>

      <a
        href="#none"
        class="r_block"
        :class="{ on: viewMode==='block' }"
        @click.prevent="$emit('changeView','block')"
      ><span>다짐블록보기</span></a>

      <a
        href="#none"
        class="r_list"
        :class="{ on: viewMode==='list' }"
        @click.prevent="$emit('changeView','list')"
      ><span>다짐목록보기</span></a>

      <a href="#none" class="r_select"><span>다짐선택</span></a>
      <a href="#none" class="r_move"><span>다짐이동</span></a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const emit = defineEmits(['update:modelValue','changeFilter','requestPrev','requestNext','changeView','changePeriod'])
const props = defineProps({
  isFuture: { type: Boolean, default: false },
  modelValue: { type: [String, null], default: 'notdone' },
  counts: { type: Object, default: null },
  totalCount: { type: Number, default: null },
  selectedDate: { type: Date, required: true },
  viewMode: { type: String, default: 'card' },
  periodMode: { type: String, default: 'T' }
})

const displayCounts = computed(() => props.counts ?? { notdone:5, done:8, faildone:8, ignored:2 })
const displayTotal = computed(() => props.totalCount ?? 15)

const selectedRadio = computed({
  get: () => props.modelValue,
  set: (v) => { emit('update:modelValue', v); emit('changeFilter', v) }
})

const isToday = computed(() => {
  const a = new Date(props.selectedDate); a.setHours(0,0,0,0)
  const b = new Date(); b.setHours(0,0,0,0)
  return a.getTime() === b.getTime()
})

const headerTitle = computed(() => {
  if (props.periodMode === 'W') return '이번 주 다짐'
  if (props.periodMode === 'M') return '이번 달 다짐'
  return '오늘의 다짐'
})

const formattedDate = computed(() => {
  const d = props.selectedDate
  const dayNames = ['일','월','화','수','목','금','토']
  return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}.${dayNames[d.getDay()]}`
})

function getWeekOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  const firstDay = d.getDay()
  const offsetDate = date.getDate() + firstDay
  return Math.ceil(offsetDate / 7)
}
function weekKorean(n){
  return ['첫째주','둘째주','셋째주','넷째주','다섯째주'][Math.max(0,Math.min(4,(n-1)))]
}

const centerTitle = computed(() => {
  if (props.periodMode === 'W') return 'Weekly'
  if (props.periodMode === 'M') return 'Monthly'
  return 'Today'
})

const centerText = computed(() => {
  if (props.periodMode === 'W') {
    const d = props.selectedDate
    const wk = weekKorean(getWeekOfMonth(d))
    return `${d.getMonth()+1}월 ${wk}`
  }
  if (props.periodMode === 'M') {
    const d = props.selectedDate
    return `${d.getMonth()+1}월`
  }
  return formattedDate.value
})

const prevLabel = computed(() => {
  if (props.periodMode === 'W') return '이전주'
  if (props.periodMode === 'M') return '이전달'
  return '전날'
})
const nextLabel = computed(() => {
  if (props.periodMode === 'W') return '다음주'
  if (props.periodMode === 'M') return '다음달'
  return '다음날'
})
</script>
