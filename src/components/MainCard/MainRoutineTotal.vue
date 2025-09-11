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
      <div class="graph"></div>
      <div class="r_state">
        <a href="#none" v-for="s in states" :key="s.key">
          <span><img :src="getImgPath(s.face)" /></span>
          <em>{{ s.count }}</em>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

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

watch(() => props.viewMode, (v) => { if (!localDelete.value && v) localView.value = v })
watch(() => props.deleteMode, (v) => { localDelete.value = !!v })

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
  if (props.periodMode === 'W') { const info = weekLabelFor(props.selectedDate); return `${info.month+1}월 ${weekKorean(info.idx)}` }
  if (props.periodMode === 'M') { const d = props.selectedDate; return `${d.getMonth()+1}월` }
  return formattedDate.value
})
const prevLabel = computed(() => { if (props.periodMode === 'W') return '이전주'; if (props.periodMode === 'M') return '이전달'; return '전날' })
const nextLabel = computed(() => { if (props.periodMode === 'W') return '다음주'; if (props.periodMode === 'M') return '다음달'; return '다음날' })

const auth = useAuthStore()
const userCharacter = computed(() => (auth.profile?.character || 'ruffy01').toLowerCase())

const images = import.meta.glob('../../assets/images/*.png', { eager: true, import: 'default' })
function getImgPath(face) {
  const key = `../../assets/images/${userCharacter.value}_${face}.png`
  return images[key] || images['../../assets/images/ruffy01_face01.png']
}

const states = computed(() => [
  { key: 'notdone', face: 'face01', count: displayCounts.value.notdone },
  { key: 'done', face: 'face02', count: displayCounts.value.done },
  { key: 'faildone', face: 'face03', count: displayCounts.value.faildone },
  { key: 'ignored', face: 'face04', count: displayCounts.value.ignored }
])
</script>
