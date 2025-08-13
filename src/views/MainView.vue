<template>
  <div id="main_wrap">
    <HeaderView @toggle-lnb="showLnb = !showLnb" />
    <LnbView v-if="showLnb" @close-lnb="showLnb = false" />

    <div id="main_body">
      <div class="main_fixed">
        <MainDateScroll
          :selectedDate="selectedDate"
          @selectDate="handleSelectDate"
        />
        <MainRoutineTotal
          :isFuture="isFutureDate"
          :selectedDate="selectedDate"
          v-model:modelValue="selectedFilter"
          :counts="countsForDate"
          :totalCount="totalCountForDate"
          @changeFilter="handleFilterChange"
          @showWeekly="showWeekly = true"
          @requestPrev="handlePrev"
          @requestNext="handleNext"
        />
      </div>

      <div class="main_scroll">
        <div v-if="isLoading && !showWeekly" class="skeleton-wrap">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>

        <div
          v-else-if="!showWeekly && hasFetched && displayedRoutines.length === 0"
          class="no_data"
        >
          <span v-if="rawRoutines.length === 0">
            아직 지켜야할 다짐이 없어요.<br />오른쪽 하단 +버튼을 눌러 다짐을 추가해 볼까요?
          </span>
          <span v-else>
            해당 조건에 맞는 다짐이 없어요.
          </span>
        </div>

        <MainCard v-if="showWeekly" :selected="'weekly'" :routine="{}" />
        <template v-else>
          <MainCard
            v-for="rt in displayedRoutines"
            :key="rt.id"
            :selected="getStatus(rt)"
            :routine="rt"
            :isToday="isTodayDate"
            @changeStatus="onChangeStatus"
            @delete="onDelete"
            @edit="openEditRoutine"
            @togglePause="onTogglePause"
          />
        </template>
      </div>
    </div>

    <FooterView @refresh-main="refreshMain" />

    <button @click="openAddRoutine" class="add">
      <span>다짐 추가하기</span>
    </button>

    <AddRoutineSelector
      v-if="isAddRoutineOpen"
      @close="isAddRoutineOpen = false; editingRoutine = null"
      @save="onSaved"
      :routineToEdit="editingRoutine"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { db } from '@/firebase'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'
import MainDateScroll from '@/components/MainCard/MainDateScroll.vue'
import MainRoutineTotal from '@/components/MainCard/MainRoutineTotal.vue'
import MainCard from '@/components/MainCard/MainCard.vue'
import { normalize, isActive as isActiveRule, isDue } from '@/utils/recurrence'

const isLoading = ref(true)
const hasFetched = ref(false)
const isAddRoutineOpen = ref(false)
const showLnb = ref(false)
const MAX_ROUTINES = 100

const selectedDate = ref(new Date())
const isFutureDate = ref(false)
const selectedFilter = ref('notdone')
const showWeekly = ref(false)

const rawRoutines = ref([])
const routines = ref([])
const isTodayDate = computed(() => dateKey(selectedDate.value) === dateKey(new Date()))
let currentUid = null
let editingRoutine = ref(null)

function dateKey(date, tz = 'Asia/Seoul') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date)
}
function getYMDFromAny(v) {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  if (v instanceof Date) return dateKey(v)
  if (typeof v.toDate === 'function') return dateKey(v.toDate())
  return null
}
function inDateRange(r, date) {
  const ymd = dateKey(date)
  const startISO = r.start || getYMDFromAny(r.startDate || r.period?.start)
  const endISO   = r.end   || getYMDFromAny(r.endDate   || r.period?.end)
  const rule     = r.rule || { freq: 'daily', interval: 1, anchor: startISO }
  const anchor   = rule.anchor || startISO
  return isActiveRule(ymd, startISO, endISO) && isDue(ymd, rule, anchor)
}
function mapStatus(list, date) {
  const key = dateKey(date)
  return list.map(r => {
    const st = r?.progress?.[key] ?? 'notdone'
    return { ...r, status: st }
  })
}
function getStatus(r) {
  return r?.status || 'notdone'
}

const inRangeRoutinesForDate = computed(() =>
  rawRoutines.value.filter(r => inDateRange(r, selectedDate.value))
)
const pausedRoutinesForDate = computed(() =>
  inRangeRoutinesForDate.value.filter(r => !!r.isPaused)
)
const activeNonPausedForDate = computed(() =>
  inRangeRoutinesForDate.value.filter(r => !r.isPaused)
)
const activeWithStatus = computed(() =>
  mapStatus(activeNonPausedForDate.value, selectedDate.value)
)
const pausedWithStatus = computed(() =>
  mapStatus(pausedRoutinesForDate.value, selectedDate.value)
)

watch([selectedDate, rawRoutines], () => {
  routines.value = [...activeWithStatus.value, ...pausedWithStatus.value]
}, { immediate: true })

const countsForDate = computed(() => {
  const c = { notdone: 0, done: 0, faildone: 0, ignored: 0 }
  for (const r of activeWithStatus.value) {
    const s = getStatus(r)
    if (s === 'done') c.done++
    else if (s === 'faildone' || s === 'fail') c.faildone++
    else if (s === 'ignored' || s === 'skip') c.ignored++
    else c.notdone++
  }
  return c
})
const totalCountForDate = computed(() => activeWithStatus.value.length)

const displayedRoutines = computed(() => {
  if (showWeekly.value) return routines.value
  const activeFiltered = activeWithStatus.value.filter(r => getStatus(r) === selectedFilter.value)
  return [...activeFiltered, ...pausedWithStatus.value]
})

const handleSelectDate = (date, isFuture) => {
  selectedDate.value = date
  isFutureDate.value = isFuture
  selectedFilter.value = 'notdone'
  showWeekly.value = false
}
const handleFilterChange = () => {
  showWeekly.value = false
}

function onSaved(rt) {
  const norm = normalize(rt)
  const idx = rawRoutines.value.findIndex(r => r.id === rt.id)
  if (idx === -1) {
    rawRoutines.value = [{ ...norm }, ...rawRoutines.value]
  } else {
    rawRoutines.value.splice(idx, 1, { ...rawRoutines.value[idx], ...norm })
  }
  isAddRoutineOpen.value = false
  editingRoutine.value = null
  selectedFilter.value = 'notdone'
  showWeekly.value = false
}

async function onChangeStatus({ id, status }) {
  const key = dateKey(selectedDate.value)
  if (!currentUid) return
  try {
    await updateDoc(doc(db, 'users', currentUid, 'routines', id), {
      [`progress.${key}`]: status,
      updatedAt: serverTimestamp(),
    })
  } catch (e) {}
  const j = rawRoutines.value.findIndex(r => r.id === id)
  if (j !== -1) {
    const next = { ...rawRoutines.value[j] }
    next.progress = { ...(next.progress || {}), [key]: status }
    rawRoutines.value.splice(j, 1, next)
  }
  selectedFilter.value = status
  showWeekly.value = false
}

async function onTogglePause({ id, isPaused }) {
  if (!currentUid || !id) return
  try {
    await updateDoc(doc(db, 'users', currentUid, 'routines', id), {
      isPaused: !!isPaused,
      updatedAt: serverTimestamp(),
    })
  } catch (e) { return }
  const j = rawRoutines.value.findIndex(r => r.id === id)
  if (j !== -1) {
    const next = { ...rawRoutines.value[j], isPaused: !!isPaused }
    rawRoutines.value.splice(j, 1, next)
  }
}

async function onDelete(payload) {
  const id = typeof payload === 'string' ? payload : payload?.id
  if (!currentUid || !id) {
    alert('삭제 실패: 잘못된 ID입니다.')
    return
  }
  try {
    await deleteDoc(doc(db, 'users', currentUid, 'routines', id))
    rawRoutines.value = rawRoutines.value.filter(r => r.id !== id)
  } catch (e) {
    alert('파이어베이스 삭제에 실패했습니다. 콘솔 로그를 확인해주세요.')
  }
}

function openAddRoutine() {
  window.dispatchEvent(new Event('close-other-popups'))
  editingRoutine.value = null
  if (rawRoutines.value.length >= MAX_ROUTINES) {
    alert(`다짐은 최대 ${MAX_ROUTINES}개까지 만들 수 있어요.`)
    return
  }
  isAddRoutineOpen.value = true
}
function openEditRoutine(rt) {
  window.dispatchEvent(new Event('close-other-popups'))
  editingRoutine.value = rt
  isAddRoutineOpen.value = true
}

function setVh() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}
function refreshMain() {
  window.location.reload()
}

let stopAuth = null
let stopRoutines = null

const bindRoutines = (uid) => {
  if (stopRoutines) {
    stopRoutines()
    stopRoutines = null
  }
  isLoading.value = true
  hasFetched.value = false
  const q = query(
    collection(db, 'users', uid, 'routines'),
    orderBy('createdAt', 'desc')
  )
  stopRoutines = onSnapshot(
    q,
    (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...normalize(d.data()) }))
      rawRoutines.value = list
      isLoading.value = false
      hasFetched.value = true
    },
    () => {
      rawRoutines.value = []
      isLoading.value = false
      hasFetched.value = true
    }
  )
}

onMounted(() => {
  setVh()
  window.addEventListener('resize', setVh)
  const auth = getAuth()
  stopAuth = onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== currentUid) {
      currentUid = user.uid
      bindRoutines(currentUid)
    } else if (!user) {
      currentUid = null
      rawRoutines.value = []
      if (stopRoutines) { stopRoutines(); stopRoutines = null }
      isLoading.value = false
      hasFetched.value = true
    }
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', setVh)
  if (stopAuth) stopAuth()
  if (stopRoutines) stopRoutines()
})

function startOfDay(d){ const nd=new Date(d); nd.setHours(0,0,0,0); return nd }
function addDays(d, days){ const nd=new Date(d); nd.setDate(nd.getDate()+days); nd.setHours(0,0,0,0); return nd }
function isTodayDateFn(d){ return startOfDay(d).getTime()===startOfDay(new Date()).getTime() }

function handlePrev() {
  const d = addDays(selectedDate.value, -1)
  const future = d > new Date() && !isTodayDateFn(d)
  handleSelectDate(d, future)
}
function handleNext() {
  const d = addDays(selectedDate.value, 1)
  const future = d > new Date() && !isTodayDateFn(d)
  handleSelectDate(d, future)
}
</script>

<style scoped>
#main_wrap{min-height:calc(var(--vh,1vh)*100);display:flex;flex-direction:column}
#main_body{flex:1;display:flex;flex-direction:column;overflow:hidden}
.main_fixed{flex-shrink:0}
.main_scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:var(--footer-h,64px)}
.no_data{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:1.4rem;line-height:1.7rem;background-image:url('../images/ico_crying.png');background-repeat:no-repeat;background-size:5rem 5rem;background-position:top center;padding-top:5rem}
.no_data span{display:block;color:#666;font-size:1rem;margin-top:0.5rem}
</style>
