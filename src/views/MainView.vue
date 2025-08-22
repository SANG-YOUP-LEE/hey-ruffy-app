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
          :counts="headerCounts"
          :totalCount="headerTotal"
          :viewMode="selectedView"
          :periodMode="selectedPeriod"
          @changeFilter="handleFilterChange"
          @requestPrev="handlePrev"
          @requestNext="handleNext"
          @changeView="v => selectedView = v"
          @changePeriod="handleChangePeriod"
        />
      </div>

      <div class="main_scroll">
        <div v-if="isLoading" class="skeleton-wrap">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>

        <div
          v-else-if="hasFetched && displayedRoutines.length === 0"
          class="no_data"
        >
          <span v-if="rawRoutines.length === 0">
            아직 지켜야할 다짐이 없어요.<br />오른쪽 하단 +버튼을 눌러 다짐을 추가해 볼까요?
          </span>
          <span v-else>
            해당 조건에 맞는 다짐이 없어요.
          </span>
        </div>

        <template v-else>
          <MainCard
            v-for="rt in displayedRoutines"
            :key="rt.id"
            :selected="getStatus(rt)"
            :routine="rt"
            :isToday="isTodayDate"
            :layout="currentLayout"
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
import { db, auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore'
import { authReadyPromise } from '@/lib/authReady'

import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'
import MainDateScroll from '@/components/MainCard/MainDateScroll.vue'
import MainRoutineTotal from '@/components/MainCard/MainRoutineTotal.vue'
import MainCard from '@/components/MainCard/MainCard.vue'

import viewBasicCard from '@/components/MainCard/viewBasicCard.vue'
import viewBlockCard from '@/components/MainCard/viewBlockCard.vue'
import viewListCard from '@/components/MainCard/viewListCard.vue'

import { normalize, isActive as isActiveRule, isDue } from '@/utils/recurrence'

const isLoading = ref(true)
const hasFetched = ref(false)
const isAddRoutineOpen = ref(false)
const showLnb = ref(false)
const MAX_ROUTINES = 100

const selectedDate = ref(new Date())
const isFutureDate = ref(false)
const selectedFilter = ref('notdone')

const selectedPeriod = ref('T')
const selectedView = ref('card')
const currentLayout = computed(() => {
  if (selectedView.value === 'block') return viewBlockCard
  if (selectedView.value === 'list')  return viewListCard
  return viewBasicCard
})

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

function startOfDay(d){ const nd=new Date(d); nd.setHours(0,0,0,0); return nd }
function endOfDay(d){ const nd=new Date(d); nd.setHours(23,59,59,999); return nd }
function startOfWeekSun(d){ const nd=startOfDay(d); nd.setDate(nd.getDate()-nd.getDay()); return nd }
function endOfWeekSun(d){ const s=startOfWeekSun(d); const nd=new Date(s); nd.setDate(s.getDate()+6); nd.setHours(23,59,59,999); return nd }
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d){ return endOfDay(new Date(d.getFullYear(), d.getMonth()+1, 0)) }
function addDays(d, days){ const nd=new Date(d); nd.setDate(nd.getDate()+days); nd.setHours(0,0,0,0); return nd }
function addMonths(d, months){ const nd=new Date(d); nd.setMonth(nd.getMonth()+months); nd.setHours(0,0,0,0); return nd }
function isTodayDateFn(d){ return startOfDay(d).getTime()===startOfDay(new Date()).getTime() }

const periodStart = computed(() => {
  if (selectedPeriod.value==='W') return startOfWeekSun(selectedDate.value)
  if (selectedPeriod.value==='M') return startOfMonth(selectedDate.value)
  return startOfDay(selectedDate.value)
})
const periodEnd = computed(() => {
  if (selectedPeriod.value==='W') return endOfWeekSun(selectedDate.value)
  if (selectedPeriod.value==='M') return endOfMonth(selectedDate.value)
  return endOfDay(selectedDate.value)
})

function isActiveOnAnyDay(r, s, e){
  const cur = new Date(s)
  const last = new Date(e)
  while (cur <= last) {
    if (inDateRange(r, cur)) return true
    cur.setDate(cur.getDate()+1)
  }
  return false
}
function latestStatusInRange(r, s, e){
  const cur = new Date(e)
  while (cur >= s) {
    if (inDateRange(r, cur)) {
      const k = dateKey(cur)
      return r?.progress?.[k] ?? 'notdone'
    }
    cur.setDate(cur.getDate()-1)
  }
  return 'notdone'
}

const inRangeRoutinesForDate = computed(() =>
  rawRoutines.value.filter(r => inDateRange(r, selectedDate.value))
)
const inRangeRoutinesForPeriod = computed(() =>
  rawRoutines.value.filter(r => isActiveOnAnyDay(r, periodStart.value, periodEnd.value))
)

const pausedRoutinesForDate = computed(() =>
  inRangeRoutinesForDate.value.filter(r => !!r.isPaused)
)
const pausedRoutinesForPeriod = computed(() =>
  inRangeRoutinesForPeriod.value.filter(r => !!r.isPaused)
)

const activeNonPausedForDate = computed(() =>
  inRangeRoutinesForDate.value.filter(r => !r.isPaused)
)
const activeNonPausedForPeriod = computed(() =>
  inRangeRoutinesForPeriod.value.filter(r => !r.isPaused)
)

const activeWithStatusDay = computed(() =>
  mapStatus(activeNonPausedForDate.value, selectedDate.value)
)
const pausedWithStatusDay = computed(() =>
  mapStatus(pausedRoutinesForDate.value, selectedDate.value)
)

const activeWithStatusPeriod = computed(() =>
  activeNonPausedForPeriod.value.map(r => ({ ...r, status: latestStatusInRange(r, periodStart.value, periodEnd.value) }))
)
const pausedWithStatusPeriod = computed(() =>
  pausedRoutinesForPeriod.value.map(r => ({ ...r, status: latestStatusInRange(r, periodStart.value, periodEnd.value) }))
)

watch([selectedDate, rawRoutines, selectedPeriod], () => {
  if (selectedPeriod.value === 'T') {
    routines.value = [...activeWithStatusDay.value, ...pausedWithStatusDay.value]
  } else {
    routines.value = [...activeWithStatusPeriod.value, ...pausedWithStatusPeriod.value]
  }
}, { immediate: true })

const headerCounts = computed(() => {
  const src = selectedPeriod.value === 'T' ? activeWithStatusDay.value : activeWithStatusPeriod.value
  const c = { notdone: 0, done: 0, faildone: 0, ignored: 0 }
  for (const r of src) {
    const s = getStatus(r)
    if (s === 'done') c.done++
    else if (s === 'faildone' || s === 'fail') c.faildone++
    else if (s === 'ignored' || s === 'skip') c.ignored++
    else c.notdone++
  }
  return c
})
const headerTotal = computed(() => (selectedPeriod.value === 'T' ? activeWithStatusDay.value.length : activeWithStatusPeriod.value.length))

const displayedRoutines = computed(() => {
  const src = selectedPeriod.value === 'T' ? activeWithStatusDay.value : activeWithStatusPeriod.value
  const activeFiltered = src.filter(r => getStatus(r) === selectedFilter.value)
  const paused = selectedPeriod.value === 'T' ? pausedWithStatusDay.value : pausedWithStatusPeriod.value
  return [...activeFiltered, ...paused]
})

function handleSelectDate(date, isFuture) {
  selectedDate.value = date
  isFutureDate.value = isFuture
  selectedFilter.value = 'notdone'
  selectedPeriod.value = 'T'
  selectedView.value = 'card'
}
const handleFilterChange = () => {}

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
}

async function onChangeStatus({ id, status }) {
  const key = dateKey(selectedDate.value)
  if (!currentUid) return
  const j = rawRoutines.value.findIndex(r => r.id === id)
  const prev = j !== -1 ? rawRoutines.value[j]?.progress?.[key] : undefined
  const r = j !== -1 ? rawRoutines.value[j] : null
  const hasWalk = !!(r && (typeof r.hasWalk === 'boolean' ? r.hasWalk : (r.ruffy && r.course && r.goalCount)))
  let delta = 0
  if (hasWalk) {
    if (prev !== 'done' && status === 'done') delta = 1
    else if (prev === 'done' && status !== 'done') delta = -1
  }
  try {
    const payload = {
      [`progress.${key}`]: status,
      updatedAt: serverTimestamp(),
      ...(delta !== 0 ? { walkDoneCount: increment(delta) } : {})
    }
    await updateDoc(doc(db, 'users', currentUid, 'routines', id), payload)
  } catch (e) {}
  if (j !== -1) {
    const next = { ...rawRoutines.value[j] }
    next.progress = { ...(next.progress || {}), [key]: status }
    if (delta !== 0) {
      const cur = Number(next.walkDoneCount || 0)
      next.walkDoneCount = Math.max(0, cur + delta)
    }
    rawRoutines.value.splice(j, 1, next)
  }
  selectedFilter.value = status
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

onMounted(async () => {
  setVh()
  window.addEventListener('resize', setVh)

  await authReadyPromise
  if (auth.currentUser) {
    currentUid = auth.currentUser.uid
    bindRoutines(currentUid)
  }

  stopAuth = onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== currentUid) {
      currentUid = user.uid
      bindRoutines(currentUid)
    } else if (!user) {
      if (navigator.onLine) {
        currentUid = null
        rawRoutines.value = []
        if (stopRoutines) { stopRoutines(); stopRoutines = null }
        isLoading.value = false
        hasFetched.value = true
      }
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setVh)
  if (stopAuth) stopAuth()
  if (stopRoutines) stopRoutines()
})

function handlePrev() {
  if (selectedPeriod.value === 'W') {
    const d = addDays(selectedDate.value, -7)
    handleSelectDate(d, false)
    return
  }
  if (selectedPeriod.value === 'M') {
    const d = addMonths(selectedDate.value, -1)
    handleSelectDate(d, false)
    return
  }
  const d = addDays(selectedDate.value, -1)
  const future = d > new Date() && !isTodayDateFn(d)
  handleSelectDate(d, future)
}
function handleNext() {
  if (selectedPeriod.value === 'W') {
    const d = addDays(selectedDate.value, 7)
    handleSelectDate(d, false)
    return
  }
  if (selectedPeriod.value === 'M') {
    const d = addMonths(selectedDate.value, 1)
    handleSelectDate(d, false)
    return
  }
  const d = addDays(selectedDate.value, 1)
  const future = d > new Date() && !isTodayDateFn(d)
  handleSelectDate(d, future)
}

function handleChangePeriod(mode) {
  selectedPeriod.value = mode
  if (mode === 'T') selectedView.value = 'card'
  else if (mode === 'W') selectedView.value = 'block'
  else if (mode === 'M') selectedView.value = 'list'
  selectedFilter.value = 'notdone'
}
</script>
