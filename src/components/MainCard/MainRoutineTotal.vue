<template>
  <div class="routine_total">
    <div class="total_area">
      <div class="date">
        <span class="y_m">{{ selectedDate.getFullYear() }}.{{ selectedDate.getMonth() + 1 }}</span>
        <p class="today">
          <button class="prev" @click.prevent="onClickPrev"><span>{{ prevLabel }}</span></button>
          <em>{{ selectedDate.getDate() }}</em>
          <button class="next" @click.prevent="onClickNext"><span>{{ nextLabel }}</span></button>
        </p>
      </div>
      <div class="term">
        <button type="button" :class="{ on: periodMode==='T' }" @click="onChangePeriod('T')"><span>D</span></button>
        <button type="button" :class="{ on: periodMode==='W' }" @click="onChangePeriod('W')"><span>W</span></button>
        <button type="button" :class="{ on: periodMode==='M' }" @click="onChangePeriod('M')"><span>M</span></button>
      </div>
      <div class="graph">
        <div class="circle-wrap" @click="resetGraphToToday">
          <svg viewBox="0 0 36 36">
            <path class="bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <template v-for="(seg,i) in graphData" :key="i">
              <path
                :class="['seg', seg.cls]"
                :stroke-dasharray="`${seg.pct} 100`"
                :stroke-dashoffset="`-${seg.offset}`"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </template>
          </svg>
          <div class="center-text">{{ centerText }}<em>{{ percentText }}</em></div>
        </div>
      </div>
      <div class="r_state">
        <a href="#none" class="not_done" :class="{ on: currentFilter==='notdone' }" @click.prevent="selectState('notdone')"><span>체크전 다짐</span> <img :src="getFace('01')"> <em>{{ displayCounts.notdone }}</em></a>
        <a href="#none" class="done" :class="{ on: currentFilter==='done' }" @click.prevent="selectState('done')"><span>달성완료</span> <img :src="getFace('02')"> <em>{{ displayCounts.done }}</em></a>
        <a href="#none" class="fail" :class="{ on: currentFilter==='faildone' }" @click.prevent="selectState('faildone')"><span>달성실패</span> <img :src="getFace('03')"> <em>{{ displayCounts.faildone }}</em></a>
        <a href="#none" class="ignore" :class="{ on: currentFilter==='ignored' }" @click.prevent="selectState('ignored')"><span>흐린눈</span> <img :src="getFace('04')"> <em>{{ displayCounts.ignored }}</em></a>
      </div>
    </div>
  </div>

  <div class="today_tools">
    <div class="today">
      <a href="#none" class="prev" @click.prevent="onClickPrev"><span>{{ prevLabel }}</span></a>
      <span class="term"><img :src="termFaceSrc"> {{ periodModeLabel }}</span> <em>{{ periodTitle }}</em>
      <a href="#none" class="next" @click.prevent="onClickNext"><span>{{ nextLabel }}</span></a>
    </div>
    <div class="tools">
      <a href="#none" class="r_card" :class="{ on: activeTool === 'card' }" @click.prevent="onChangeView('card')"><span>다짐카드보기</span></a>
      <a href="#none" class="r_block" :class="{ on: activeTool === 'block' }" @click.prevent="onChangeView('block')"><span>다짐블록보기</span></a>
      <a href="#none" class="r_list" :class="{ on: activeTool === 'list' }" @click.prevent="onChangeView('list')"><span>다짐목록보기</span></a>
      <a href="#none" :class="[ localDelete ? 'r_del' : 'r_select', { on: activeTool === 'delete' } ]" @click.prevent="toggleDeleteMode"><span>{{ localDelete ? '삭제하기' : '다짐선택' }}</span></a>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['update:modelValue','requestPrev','requestNext','changeView','changePeriod','toggleDeleteMode'])

const props = defineProps({
  isFuture: { type: Boolean, default: false },
  modelValue: { type: [String, null], default: null },
  counts: { type: Object, default: null },
  totalCount: { type: Number, default: null },
  selectedDate: { type: Date, required: true },
  viewMode: { type: String, default: 'card' },
  periodMode: { type: String, default: 'T' },
  deleteMode: { type: Boolean, default: false }
})

const DEFAULT_FILTER = 'notdone'

const localView = ref(props.viewMode || 'card')
const localDelete = ref(!!props.deleteMode)
const currentFilter = ref(props.modelValue || DEFAULT_FILTER)
const graphMode = ref('today')

watch(() => props.viewMode, (v) => { if (!localDelete.value && v) localView.value = v })
watch(() => props.deleteMode, (v) => { localDelete.value = !!v })
watch(() => props.modelValue, (v) => { currentFilter.value = v || DEFAULT_FILTER })

function toggleDeleteMode() {
  const next = !localDelete.value
  localDelete.value = next
  emit('toggleDeleteMode', next)
}
function onChangePeriod(mode){
  resetToDefault()
  graphMode.value = 'today'
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

const onClickPrev = () => { resetToDefault(); graphMode.value = 'today'; emit('requestPrev') }
const onClickNext = () => { resetToDefault(); graphMode.value = 'today'; emit('requestNext') }

const activeTool = computed(() => (localDelete.value ? 'delete' : localView.value))
const displayCounts = computed(() => props.counts ?? { notdone:0, done:0, faildone:0, ignored:0 })
const displayTotal  = computed(() => props.totalCount ?? 0)

function selectState(key){
  if (currentFilter.value !== key) {
    currentFilter.value = key
    emit('update:modelValue', key)
  }
  graphMode.value = 'filter'
}
function resetToDefault(){
  currentFilter.value = DEFAULT_FILTER
  emit('update:modelValue', DEFAULT_FILTER)
}
function resetGraphToToday(){
  graphMode.value = 'today'
}

onMounted(() => {
  currentFilter.value = DEFAULT_FILTER
  emit('update:modelValue', DEFAULT_FILTER)
  graphMode.value = 'today'
})
watch(() => props.selectedDate && props.selectedDate.getTime(), () => { resetToDefault(); graphMode.value = 'today' })
watch(() => props.periodMode, () => { resetToDefault(); graphMode.value = 'today' })

const centerText = computed(() => {
  if (graphMode.value === 'today') return '총 달성 현황'
  if (currentFilter.value === 'notdone') return '달성 체크전'
  if (currentFilter.value === 'done') return '달성완료'
  if (currentFilter.value === 'faildone') return '달성실패'
  if (currentFilter.value === 'ignored') return '흐린눈'
  return ''
})

const prevLabel = computed(() => { if (props.periodMode === 'W') return '이전주'; if (props.periodMode === 'M') return '이전달'; return '전날' })
const nextLabel = computed(() => { if (props.periodMode === 'W') return '다음주'; if (props.periodMode === 'M') return '다음달'; return '다음날' })
const periodTitle = computed(() => {
  if (currentFilter.value === 'notdone') return '달성 체크 전'
  if (currentFilter.value === 'done') return '달성완료 다짐'
  if (currentFilter.value === 'faildone') return '달성실패 다짐'
  if (currentFilter.value === 'ignored') return '흐린눈 다짐'
  if (props.periodMode === 'W') return '주간 다짐'
  if (props.periodMode === 'M') return '월간 다짐'
  return '오늘의 다짐'
})
const periodModeLabel = computed(() => props.periodMode === 'W' ? 'Weekly' : props.periodMode === 'M' ? 'Monthly' : 'Today')

const percentText = computed(() => {
  const total = Math.max(0, Number(displayTotal.value) || 0)
  if (total <= 0) return '0%'
  const c = displayCounts.value || {}
  if (graphMode.value === 'today') {
    const checked = (c.done || 0) + (c.faildone || 0) + (c.ignored || 0)
    const pct = Math.min(100, Math.max(0, Math.round((checked / total) * 100)))
    return `${pct}%`
  }
  const map = {
    notdone: Math.round(((c.notdone || 0) / total) * 100),
    done: Math.round(((c.done || 0) / total) * 100),
    faildone: Math.round(((c.faildone || 0) / total) * 100),
    ignored: Math.round(((c.ignored || 0) / total) * 100),
  }
  const pct = Math.min(100, Math.max(0, map[currentFilter.value] ?? 0))
  return `${pct}%`
})

const graphData = computed(() => {
  const total = Math.max(0, Number(displayTotal.value) || 0)
  if (total <= 0) return []
  const c = displayCounts.value || {}
  const done = Math.max(0, Number(c.done) || 0)
  const fail = Math.max(0, Number(c.faildone) || 0)
  const ign  = Math.max(0, Number(c.ignored) || 0)
  if (graphMode.value === 'today') {
    const pDone = Math.min(100, +((done / total) * 100).toFixed(2))
    const pFail = Math.min(100, +((fail / total) * 100).toFixed(2))
    const pIgn  = Math.min(100, +((ign  / total) * 100).toFixed(2))
    let offset = 0
    const segs = []
    if (pDone > 0) { segs.push({ pct: pDone, offset, cls: 'seg-done' }); offset += pDone }
    if (pFail > 0) { segs.push({ pct: pFail, offset, cls: 'seg-fail' }); offset += pFail }
    if (pIgn  > 0) { segs.push({ pct: pIgn,  offset, cls: 'seg-ign'  }); offset += pIgn  }
    return segs
  }
  if (currentFilter.value === 'notdone') {
    const pct = Math.min(100, +(((c.notdone || 0) / total) * 100).toFixed(2))
    return pct > 0 ? [{ pct, offset: 0, cls: 'seg-not' }] : []
  }
  if (currentFilter.value === 'done') {
    const pct = Math.min(100, +((done / total) * 100).toFixed(2))
    return pct > 0 ? [{ pct, offset: 0, cls: 'seg-done' }] : []
  }
  if (currentFilter.value === 'faildone') {
    const pct = Math.min(100, +((fail / total) * 100).toFixed(2))
    return pct > 0 ? [{ pct, offset: 0, cls: 'seg-fail' }] : []
  }
  if (currentFilter.value === 'ignored') {
    const pct = Math.min(100, +((ign / total) * 100).toFixed(2))
    return pct > 0 ? [{ pct, offset: 0, cls: 'seg-ign' }] : []
  }
  return []
})

const auth = useAuthStore()
const images = import.meta.glob('@/assets/images/ruffy0{1,2,3,4}_face{01,02,03,04}.png', { eager: true, import: 'default' })
const ruffyBase = computed(() => {
  const opt = auth.profile?.selectedRuffy || 'option1'
  const num = opt.replace('option','')
  return `ruffy0${num}`
})
function getFace(n){
  return images[`/src/assets/images/${ruffyBase.value}_face${n}.png`]
}

const termFaceSrc = computed(() => {
  const map = { notdone: '01', done: '02', faildone: '03', ignored: '04' }
  return getFace(map[currentFilter.value] || '01')
})
</script>