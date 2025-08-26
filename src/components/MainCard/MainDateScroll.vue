<template>
  <div class="date_scroll">
    <div class="date_fixed_today">
      <span class="on" @click="selectToday">
        <i>{{ getDayLabel(today) }}</i>{{ today.getDate() }}
      </span>
    </div>

    <div class="date_group" ref="scroller">
      <!-- 과거: 어제 → 한달전 (내림차순) -->
      <span
        v-for="(date, i) in pastDates"
        :key="'p'+i"
        ref="pastEnd" v-if="i===pastDates.length-1"
        :class="{ on: active.kind==='past' && active.index===i }"
        @click="selectFromScroll(date, 'past', i)"
      >
        <i>{{ getDayLabel(date) }}</i>{{ date.getDate() }}
      </span>
      <span
        v-else
        :class="{ on: active.kind==='past' && active.index===i }"
        @click="selectFromScroll(date, 'past', i)"
        v-for="(date, i) in pastDates" :key="'pp'+i"
      >
        <i>{{ getDayLabel(date) }}</i>{{ date.getDate() }}
      </span>

      <!-- 미래: 내일 → 한달후 (오름차순) -->
      <span
        v-for="(date, i) in futureDates"
        :key="'f'+i"
        :class="{ on: active.kind==='future' && active.index===i }"
        @click="selectFromScroll(date, 'future', i)"
      >
        <i>{{ getDayLabel(date) }}</i>{{ date.getDate() }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'

const emit = defineEmits(['selectDate'])
defineProps({ selectedDate: { type: Date, required: true } })

const pastDays = 30, futureDays = 30
const today = new Date(); today.setHours(0,0,0,0)

const isSameDay = (a,b)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
const getDayLabel = (d)=> ['일','월','화','수','목','금','토'][d.getDay()]
const addDays = (base, n)=> { const d=new Date(base); d.setDate(base.getDate()+n); d.setHours(0,0,0,0); return d }

// 과거: 어제→한달전 (내림차순)
const pastDates = computed(() =>
  Array.from({length: pastDays}, (_,i)=> addDays(today, -(i+1)))
)
// 미래: 내일→한달후 (오름차순)
const futureDates = computed(() =>
  Array.from({length: futureDays}, (_,i)=> addDays(today, i+1))
)

const active = ref({ kind: null, index: null }) // 스크롤 내 클릭시에만 on

const emitSelection = (date) => {
  const isToday = isSameDay(date, today)
  emit('selectDate', date, date > today && !isToday, isToday)
}
const selectToday = () => { active.value = {kind:null,index:null}; emitSelection(today) }
const selectFromScroll = (date, kind, index) => { active.value = {kind, index}; emitSelection(date) }

// 처음에 과거 구간 너비만큼 스크롤 이동 → 화면엔 미래만 보이게
const scroller = ref(null)
onMounted(async () => {
  await nextTick()
  if (!scroller.value) return
  // past 영역 전체 너비 계산
  let pastWidth = 0
  const nodes = scroller.value.children
  for (let i = 0; i < pastDates.value.length && i < nodes.length; i++) {
    pastWidth += nodes[i].offsetWidth
  }
  scroller.value.scrollLeft = pastWidth
})
</script>
