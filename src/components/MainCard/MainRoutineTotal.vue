<template>
  <div class="routine_total">
    <div class="total_area">
      <div class="date">
        <p class="today">
          <button class="prev" @click.prevent="onClickPrev"><span>{{ prevLabel }}</span></button>
          <span class="y_m">{{ selectedDate.getFullYear() }}.{{ selectedDate.getMonth() + 1 }}.</span>
          <em>{{ selectedDate.getDate() }}</em>
          <button class="next" @click.prevent="onClickNext"><span>{{ nextLabel }}</span></button>
        </p>
      </div>

      <div class="term">
        <button type="button" :class="{ on: periodMode==='T' }" @click="onChangePeriod('T')"><span>Today</span></button>
        <button type="button" :class="{ on: periodMode==='W' }" @click="onChangePeriod('W')"><span>Weekly</span></button>
        <button type="button" :class="{ on: periodMode==='M' }" @click="onChangePeriod('M')"><span>Monthly</span></button>
      </div>

      <div class="r_state">
        <a href="#none" class="not_done" :class="{ on: !totalOn && currentFilter==='notdone' }" @click.prevent="selectState('notdone')"><span>체크전 다짐</span> <img :src="getFace('01')"> <em>{{ displayCounts.notdone }}</em></a>
        <a href="#none" class="done"     :class="{ on: !totalOn && currentFilter==='done' }"    @click.prevent="selectState('done')"><span>달성완료</span> <img :src="getFace('02')"> <em>{{ displayCounts.done }}</em></a>
        <a href="#none" class="fail"     :class="{ on: !totalOn && currentFilter==='faildone' }" @click.prevent="selectState('faildone')"><span>달성실패</span> <img :src="getFace('03')"> <em>{{ displayCounts.faildone }}</em></a>
        <a href="#none" class="ignore"   :class="{ on: !totalOn && currentFilter==='ignored' }"  @click.prevent="selectState('ignored')"><span>흐린눈</span> <img :src="getFace('04')"> <em>{{ displayCounts.ignored }}</em></a>
      </div>

      <div class="total_toggle">
        <ToggleSwitch v-model="totalOn"/> <span>Total</span>
      </div>

      <div class="center-text">{{ centerText }}<em>{{ percentText }}</em></div>

      <div class="graph" @click="resetGraphToToday">
        <div class="bar_wrap" v-if="barPct.mode==='stack'">
          <div class="bar_stack">
            <span class="seg seg-done" :style="{ width: barPct.done+'%'}"></span>
            <span class="seg seg-fail" :style="{ width: barPct.fail+'%'}"></span>
            <span class="seg seg-ign"  :style="{ width: barPct.ign+'%'}"></span>
          </div>
        </div>
        <div class="bar_wrap" v-else>
          <div class="bar_single">
            <span :class="['seg', barPct.cls]" :style="{ width: barPct.single+'%'}"></span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'

const emit = defineEmits(['update:modelValue','requestPrev','requestNext','changePeriod'])

const props = defineProps({
  isFuture: { type: Boolean, default: false },
  modelValue: { type: [String, null], default: null },
  counts: { type: Object, default: null },
  totalCount: { type: Number, default: null },
  selectedDate: { type: Date, required: true },
  periodMode: { type: String, default: 'T' }
})

const DEFAULT_FILTER = 'notdone'

const currentFilter = ref(props.modelValue || DEFAULT_FILTER)
const graphMode = ref('today')
const totalOn = ref(true)
const lastClickedState = ref(null)

watch(() => props.modelValue, (v) => { currentFilter.value = v || DEFAULT_FILTER })

watch(totalOn, (v) => {
  if (v) {
    graphMode.value = 'today'
  } else {
    const next = lastClickedState.value || DEFAULT_FILTER
    if (currentFilter.value !== next) {
      currentFilter.value = next
      emit('update:modelValue', next)
    }
    graphMode.value = 'filter'
  }
})

function onChangePeriod(mode){
  resetToDefault()
  graphMode.value = 'today'
  totalOn.value = true
  emit('changePeriod', mode)
}

const onClickPrev = () => { resetToDefault(); graphMode.value = 'today'; totalOn.value = true; emit('requestPrev') }
const onClickNext = () => { resetToDefault(); graphMode.value = 'today'; totalOn.value = true; emit('requestNext') }

const displayCounts = computed(() => props.counts ?? { notdone:0, done:0, faildone:0, ignored:0 })
const displayTotal  = computed(() => props.totalCount ?? 0)

function selectState(key){
  lastClickedState.value = key
  if (currentFilter.value !== key) {
    currentFilter.value = key
    emit('update:modelValue', key)
  }
  totalOn.value = false
  graphMode.value = 'filter'
}
function resetToDefault(){
  lastClickedState.value = null
  currentFilter.value = DEFAULT_FILTER
  emit('update:modelValue', DEFAULT_FILTER)
}
function resetGraphToToday(){
  graphMode.value = 'today'
  totalOn.value = true
}

onMounted(() => {
  currentFilter.value = DEFAULT_FILTER
  emit('update:modelValue', DEFAULT_FILTER)
  graphMode.value = 'today'
  totalOn.value = true
  lastClickedState.value = null
})
watch(() => props.selectedDate && props.selectedDate.getTime(), () => { resetToDefault(); graphMode.value = 'today'; totalOn.value = true })
watch(() => props.periodMode, () => { resetToDefault(); graphMode.value = 'today'; totalOn.value = true })

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

const barPct = computed(() => {
  const total = Math.max(0, Number(displayTotal.value) || 0)
  const c = displayCounts.value || {}
  if (total <= 0) return { mode: 'stack', done: 0, fail: 0, ign: 0, single: 0, cls: '' }
  if (graphMode.value === 'today') {
    const done = Math.round(((c.done || 0) / total) * 100)
    const fail = Math.round(((c.faildone || 0) / total) * 100)
    const ign  = Math.round(((c.ignored || 0) / total) * 100)
    return { mode: 'stack', done, fail, ign, single: 0, cls: '' }
  } else {
    const map = {
      notdone: Math.round(((c.notdone || 0) / total) * 100),
      done: Math.round(((c.done || 0) / total) * 100),
      faildone: Math.round(((c.faildone || 0) / total) * 100),
      ignored: Math.round(((c.ignored || 0) / total) * 100),
    }
    const clsMap = { notdone: 'seg-not', done: 'seg-done', faildone: 'seg-fail', ignored: 'seg-ign' }
    const key = currentFilter.value
    return { mode: 'single', single: Math.min(100, Math.max(0, map[key] || 0)), cls: clsMap[key] || 'seg-not', done: 0, fail: 0, ign: 0 }
  }
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
</script>
