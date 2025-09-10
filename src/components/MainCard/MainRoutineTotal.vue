<template>
  <div class="routine_total">
    <div class="total_area">
      <div class="date">
        <span class="y_m">{{ selectedDate.getFullYear() }}.{{ selectedDate.getMonth() + 1 }}</span>
        <p class="today">
          <button class="prev" @click.prevent="$emit('requestPrev')"><span>{{ prevLabel }}</span></button>
          <em>{{ selectedDate.getDate() }}</em>
          <button class="next" @click.prevent="$emit('requestNext')"><span>{{ nextLabel }}</span></button>
        </p>
      </div>
      <div class="term">
        <button type="button" :class="{ on: periodMode==='T' }" @click="onChangePeriod('T')"><span>Today</span></button>
        <button type="button" :class="{ on: periodMode==='W' }" @click="onChangePeriod('W')"><span>Weekly</span></button>
        <button type="button" :class="{ on: periodMode==='M' }" @click="onChangePeriod('M')"><span>Monthly</span></button>
      </div>
      <div class="graph">
        
      </div>
      <div class="r_state">
        
      </div>
    </div>
    <!--p>
      <span>
        <strong>{{ headerTitle }}</strong>
        <em class="t_on">{{ displayTotal }}</em>
      </span>
      <span>
        <template v-if="isFuture">
          미래에도 다짐 부자시네요!
        </template>
        <template v-else>
          <a href="#none" class="not_done" :class="{ uline: selectedRadio === 'notdone' }" @click.prevent="selectedRadio = 'notdone'">
            <strong>미달성</strong> <em class="t_on">{{ displayCounts.notdone }}</em>
          </a>
          <a href="#none" class="done" :class="{ uline: selectedRadio === 'done' }" @click.prevent="selectedRadio = 'done'">
            <strong>달성완료</strong> <em class="t_on">{{ displayCounts.done }}</em>
          </a>
          <a href="#none" class="fail_done" :class="{ uline: selectedRadio === 'faildone' }" @click.prevent="selectedRadio = 'faildone'">
            <strong>달성실패</strong> <em class="t_on">{{ displayCounts.faildone }}</em>
          </a>
          <a href="#none" class="ignored" :class="{ uline: selectedRadio === 'ignored' }" @click.prevent="selectedRadio = 'ignored'">
            <strong>흐린눈</strong> <em class="t_on">{{ displayCounts.ignored }}</em>
          </a>
        </template>
      </span>
    </p-->
  </div>

  <!--div class="today_tools">
    <div class="tools">
      <span class="tools_wrap">
        <a href="#none" class="r_card"  :class="{ on: activeTool==='card' }"  @click.prevent="onChangeView('card')"><span>다짐카드보기</span></a>
        <a href="#none" class="r_block" :class="{ on: activeTool==='block' }" @click.prevent="onChangeView('block')"><span>다짐블록보기</span></a>
        <a href="#none" class="r_list"  :class="{ on: activeTool==='list' }"  @click.prevent="onChangeView('list')"><span>다짐목록보기</span></a>
        <a
          href="#none"
          :class="[ localDelete ? 'r_del' : 'r_select', { on: activeTool==='delete' } ]"
          @click.prevent="toggleDeleteMode"
        ><span>{{ localDelete ? '삭제하기' : '다짐선택' }}</span></a>
      </span>
    </div>
  </div-->
</template>


<script setup>
import { computed, ref, watch } from 'vue'

const emit = defineEmits([
  'update:modelValue','changeFilter','requestPrev','requestNext',
  'changeView','changePeriod','toggleDeleteMode'
])

const props = defineProps({
  isFuture: { type: Boolean, default: false },
  modelValue: { type: [String, null], default: 'notdone' },
  counts: { type: Object, default: null },
  totalCount: { type: Number, default: null },
  selectedDate: { type: Date, required: true },
  viewMode: { type: String, default: 'card' },
  periodMode: { type: String, default: 'T' },
  deleteMode: { type: Boolean, default: false }
})

const localView   = ref(props.viewMode || 'card')
const localDelete = ref(!!props.deleteMode)

watch(() => props.viewMode, (v) => {
  if (!localDelete.value && v) localView.value = v
})
watch(() => props.deleteMode, (v) => {
  localDelete.value = !!v
})

function toggleDeleteMode() {
  const next = !localDelete.value
  localDelete.value = next
  emit('toggleDeleteMode', next)
}

function onChangePeriod(mode){
  if (localDelete.value) {
    localDelete.value = false
    emit('toggleDeleteMode', false)
    if (localView.value !== 'card') {
      localView.value = 'card'
      emit('changeView', 'card')
    }
  }
  emit('changePeriod', mode)
}

function onChangeView(view){
  if (localView.value !== view) {
    localView.value = view
    emit('changeView', view)
  }
  if (localDelete.value) {
    localDelete.value = false
    emit('toggleDeleteMode', false)
  }
}

const activeTool = computed(() => (localDelete.value ? 'delete' : localView.value))

const displayCounts = computed(() => props.counts ?? { notdone:5, done:8, faildone:8, ignored:2 })
const displayTotal  = computed(() => props.totalCount ?? 15)

const selectedRadio = computed({
  get: () => props.modelValue,
  set: (v) => { emit('update:modelValue', v); emit('changeFilter', v) }
})

const isToday = computed(() => {
  const a = new Date(props.selectedDate); a.setHours(0,0,0,0)
  const b = new Date();                    b.setHours(0,0,0,0)
  return a.getTime() === b.getTime()
})

const headerTitle = computed(() => {
  if (props.periodMode === 'W') return '이번 주 다짐'
  if (props.periodMode === 'M') return '이번 달 다짐'
  return isToday.value ? '오늘의 다짐' : '이날의 다짐'
})

const formattedDate = computed(() => {
  const d = props.selectedDate
  const dayNames = ['일','월','화','수','목','금','토']
  return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}.${dayNames[d.getDay()]}`
})

function startOfWeekSun(d){ const nd=new Date(d); nd.setHours(0,0,0,0); nd.setDate(nd.getDate()-nd.getDay()); return nd }
function endOfWeekSun(d){ const s=startOfWeekSun(d); const nd=new Date(s); nd.setDate(s.getDate()+6); nd.setHours(23,59,59,999); return nd }
function dateInRange(target, s, e){ return target.getTime()>=s.getTime() && target.getTime()<=e.getTime() }
function firstOfMonth(y, m){ const d=new Date(y,m,1); d.setHours(0,0,0,0); return d }
function getWeekIndexForMonth(weekStart, monthDate){
  const mFirst = firstOfMonth(monthDate.getFullYear(), monthDate.getMonth())
  const w1 = startOfWeekSun(mFirst)
  const diffWeeks = Math.round((weekStart.getTime() - w1.getTime()) / (7*24*60*60*1000))
  return diffWeeks + 1
}
function weekLabelFor(date){
  const ws = startOfWeekSun(date)
  const we = endOfWeekSun(date)
  const curY = ws.getFullYear(), curM = ws.getMonth()
  const nextM = (curM+1)%12, nextY = curM===11 ? curY+1 : curY
  const curFirst = firstOfMonth(curY, curM)
  const nextFirst = firstOfMonth(nextY, nextM)
  if (dateInRange(curFirst, ws, we)) return { month: curFirst.getMonth(), year: curFirst.getFullYear(), idx: 1 }
  if (dateInRange(nextFirst, ws, we)) return { month: nextFirst.getMonth(), year: nextFirst.getFullYear(), idx: 1 }
  let displayMonth = date.getMonth()
  let displayYear = date.getFullYear()
  let daysInDisplayMonth = 0
  for (let i=0;i<7;i++){
    const d=new Date(ws); d.setDate(ws.getDate()+i); d.setHours(0,0,0,0)
    if (d.getMonth()===date.getMonth()) daysInDisplayMonth++
  }
  if (daysInDisplayMonth<4){
    for (let i=0;i<7;i++){
      const d=new Date(ws); d.setDate(ws.getDate()+i); d.setHours(0,0,0,0)
      if (d.getMonth()!==date.getMonth()){ displayMonth=d.getMonth(); displayYear=d.getFullYear(); break }
    }
  }
  const idx = getWeekIndexForMonth(ws, new Date(displayYear, displayMonth, 1))
  return { month: displayMonth, year: displayYear, idx }
}
function weekKorean(n){ return ['첫째주','둘째주','셋째주','넷째주','다섯째주'][Math.max(0,Math.min(4,n-1))] }

const centerText = computed(() => {
  if (props.periodMode === 'W') {
    const info = weekLabelFor(props.selectedDate)
    return `${info.month+1}월 ${weekKorean(info.idx)}`
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
