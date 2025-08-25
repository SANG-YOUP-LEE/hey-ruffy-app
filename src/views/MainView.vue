<template>
  <div id="main_wrap" :class="{ selecting: deleteMode }">
    <HeaderView @toggle-lnb="showLnb = !showLnb" :class="{ short: headerShort }" />
    <LnbView v-if="showLnb" @close-lnb="showLnb = false" />

    <div id="main_body">
      <div class="main_fixed">
        <MainDateScroll
          v-if="selectedPeriod==='T'"
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
          :deleteMode="deleteMode"
          @changeFilter="handleFilterChange"
          @requestPrev="handlePrev"
          @requestNext="handleNext"
          @changeView="v => handleChangeView(v)"
          @changePeriod="handleChangePeriod"
          @toggleDeleteMode="handleToggleDeleteMode"
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
            :isToday="selectedPeriod==='T' && isRoutineForToday(rt)"
            :assigned-date="getAssignedDate(rt)"
            :layout="currentLayout"
            :period-mode="selectedPeriod"
            :delete-targets="selectedIds"
            :delete-mode="deleteMode"
            @changeStatus="onChangeStatus"
            @delete="onDelete"
            @edit="openEditRoutine"
            @togglePause="onTogglePause"
            @toggleSelect="onToggleSelect"
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

    <teleport to="body">
      <div v-if="showBulkDeleteConfirm" class="com_popup_wrap">
        <div class="popup_inner alert">
          <div class="popup_tit"><h2>선택한 다짐을 삭제할까요?</h2></div>
          <div class="popup_body">삭제된 다짐은 되돌릴 수 없어요.</div>
          <div class="popup_btm">
            <button @click="confirmBulkDelete" class="p_basic">삭제</button>
            <button @click="closeBulkDeleteConfirm" class="p_white">취소</button>
          </div>
          <button class="close_btn" @click="closeBulkDeleteConfirm"><span>닫기</span></button>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
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

const deleteMode = ref(false)
const selectedIds = ref([])
const showBulkDeleteConfirm = ref(false)

function handleToggleDeleteMode(v) {
  const next = !!v
  if (deleteMode.value && !next) {
    if (selectedIds.value.length > 0) {
      showBulkDeleteConfirm.value = true
      document.body.classList.add('no-scroll')
      return
    }
  }
  deleteMode.value = next
  if (!deleteMode.value) selectedIds.value = []
  toggleListStateButtonClass(deleteMode.value)
}

function onToggleSelect({ id, checked }) {
  const base = String(id).split('-')[0]
  if (!base) return
  const idx = selectedIds.value.indexOf(base)
  if (checked && idx === -1) selectedIds.value = [...selectedIds.value, base]
  if (!checked && idx !== -1) selectedIds.value = selectedIds.value.filter(x => x !== base)
}

function closeBulkDeleteConfirm() {
  showBulkDeleteConfirm.value = false
  document.body.classList.remove('no-scroll')
}

async function confirmBulkDelete() {
  const ids = selectedIds.value.slice()
  closeBulkDeleteConfirm()
  await onDelete(ids)
}

function toggleListStateButtonClass(on) {
  const els = document.querySelectorAll('.vlist .state_button')
  els.forEach(el => el.classList.toggle('check', !!on))
}

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

function weekRangeInMonth(d){
  const mStart = startOfMonth(d)
  const mEnd = endOfMonth(d)
  const wStart = startOfWeekSun(d)
  const wEnd = endOfWeekSun(d)
  if (wStart.getMonth() !== d.getMonth()) {
    return { s: mStart, e: new Date(Math.min(wEnd.getTime(), mEnd.getTime())) }
  }
  if (wEnd.getMonth() !== d.getMonth()) {
    return { s: new Date(Math.max(wStart.getTime(), mStart.getTime())), e: mEnd }
  }
  return { s: new Date(Math.max(wStart.getTime(), mStart.getTime())), e: new Date(Math.min(wEnd.getTime(), mEnd.getTime())) }
}

const periodStartRaw = computed(() => {
  if (selectedPeriod.value==='W') return startOfWeekSun(selectedDate.value)
  if (selectedPeriod.value==='M') return startOfMonth(selectedDate.value)
  return startOfDay(selectedDate.value)
})
const periodEnd = computed(() => {
  if (selectedPeriod.value==='W') return endOfWeekSun(selectedDate.value)
  if (selectedPeriod.value==='M') return endOfMonth(selectedDate.value)
  return endOfDay(selectedDate.value)
})

function eachDate(s, e) {
  const out = []
  const cur = new Date(s)
  cur.setHours(0,0,0,0)
  const last = new Date(e)
  last.setHours(0,0,0,0)
  while (cur.getTime() <= last.getTime()) {
    out.push(new Date(cur))
    cur.setDate(cur.getDate()+1)
    cur.setHours(0,0,0,0)
  }
  return out
}

const occurrencesActiveDay = computed(() => {
  const d = startOfDay(selectedDate.value)
  const list = rawRoutines.value.filter(r => !r.isPaused && inDateRange(r, d))
  const key = dateKey(d)
  return list.map(r => ({ ...r, status: r?.progress?.[key] ?? 'notdone', assignedDate: new Date(d), id: `${r.id}-${key}` }))
})
const occurrencesPausedDay = computed(() => {
  const d = startOfDay(selectedDate.value)
  const list = rawRoutines.value.filter(r => !!r.isPaused && inDateRange(r, d))
  const key = dateKey(d)
  return list.map(r => ({ ...r, status: r?.progress?.[key] ?? 'notdone', assignedDate: new Date(d), id: `${r.id}-paused-${key}` }))
})

function isActiveOnAnyDay(r, s, e){
  const days = eachDate(s, e)
  for (const d of days) if (inDateRange(r, d)) return true
  return false
}
function latestStatusInRange(r, s, e){
  const days = eachDate(s, e)
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]
    if (inDateRange(r, d)) {
      const k = dateKey(d)
      return r?.progress?.[k] ?? 'notdone'
    }
  }
  return 'notdone'
}
function lastActiveDateInRange(r, s, e){
  const days = eachDate(s, e)
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]
    if (inDateRange(r, d)) return new Date(d)
  }
  return null
}

const occurrencesActivePeriod = computed(() => {
  const s = periodStartRaw.value
  const e = periodEnd.value
  return rawRoutines.value
    .filter(r => !r.isPaused && isActiveOnAnyDay(r, s, e))
    .map(r => {
      const d = lastActiveDateInRange(r, s, e) || s
      const k = dateKey(d)
      return { ...r, status: r?.progress?.[k] ?? 'notdone', assignedDate: new Date(d), id: r.id }
    })
})
const occurrencesPausedPeriod = computed(() => {
  const s = periodStartRaw.value
  const e = periodEnd.value
  return rawRoutines.value
    .filter(r => !!r.isPaused && isActiveOnAnyDay(r, s, e))
    .map(r => {
      const d = lastActiveDateInRange(r, s, e) || s
      const k = dateKey(d)
      return { ...r, status: r?.progress?.[k] ?? 'notdone', assignedDate: new Date(d), id: r.id }
    })
})

watch([selectedDate, rawRoutines, selectedPeriod], () => {
  if (selectedPeriod.value === 'T') {
    routines.value = [...occurrencesActiveDay.value, ...occurrencesPausedDay.value]
  } else {
    routines.value = [...occurrencesActivePeriod.value, ...occurrencesPausedPeriod.value]
  }
}, { immediate: true })

const headerCounts = computed(() => {
  const src = selectedPeriod.value === 'T'
    ? [...occurrencesActiveDay.value]
    : [...occurrencesActivePeriod.value, ...occurrencesPausedPeriod.value]
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
const headerTotal = computed(() => {
  return selectedPeriod.value === 'T'
    ? occurrencesActiveDay.value.length
    : occurrencesActivePeriod.value.length + occurrencesPausedPeriod.value.length
})

const displayedRoutines = computed(() => {
  const base = selectedPeriod.value === 'T'
    ? [...occurrencesActiveDay.value, ...occurrencesPausedDay.value]
    : [...occurrencesActivePeriod.value, ...occurrencesPausedPeriod.value]

  const filtered = base.filter(r => getStatus(r) === selectedFilter.value)

  const toMs = (v) => {
    if (!v) return 0
    if (v instanceof Date) return v.getTime()
    if (typeof v.toDate === 'function') {
      const d = v.toDate()
      return d instanceof Date ? d.getTime() : 0
    }
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const d = new Date(v)
      return isNaN(d) ? 0 : d.getTime()
    }
    return 0
  }

  const arr = filtered.slice()
  arr.sort((a, b) => {
    if (selectedPeriod.value === 'T') {
      const ca = toMs(a.createdAt)
      const cb = toMs(b.createdAt)
      return cb - ca
    } else {
      const da = toMs(a.assignedDate)
      const db = toMs(b.assignedDate)
      if (da !== db) return da - db
      const ca = toMs(a.createdAt)
      const cb = toMs(b.createdAt)
      return cb - ca
    }
  })
  return arr
})

function handleSelectDate(date, isFuture) {
  selectedDate.value = date
  isFutureDate.value = isFuture
  selectedFilter.value = 'notdone'
  selectedPeriod.value = 'T'
  selectedView.value = 'card'
  nextTick(recomputeScrollability)
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
  nextTick(recomputeScrollability)
}

async function onChangeStatus({ id, status }) {
  const key = dateKey(selectedDate.value)
  if (!currentUid) return
  const rid = id.split('-')[0]
  const j = rawRoutines.value.findIndex(r => r.id === rid)
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
    await updateDoc(doc(db, 'users', currentUid, 'routines', rid), payload)
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
  nextTick(recomputeScrollability)
}

async function onTogglePause({ id, isPaused }) {
  const rid = typeof id === 'string' ? id.split('-')[0] : id
  if (!currentUid || !rid) return
  try {
    await updateDoc(doc(db, 'users', currentUid, 'routines', rid), {
      isPaused: !!isPaused,
      updatedAt: serverTimestamp(),
    })
  } catch (e) { return }
  const j = rawRoutines.value.findIndex(r => r.id === rid)
  if (j !== -1) {
    const next = { ...rawRoutines.value[j], isPaused: !!isPaused }
    rawRoutines.value.splice(j, 1, next)
  }
  nextTick(recomputeScrollability)
}

async function onDelete(payload) {
  const ids = Array.isArray(payload) ? payload : [payload]
  const ridList = ids
    .map(x => typeof x === 'string' ? x.split('-')[0] : x?.id ? String(x.id).split('-')[0] : null)
    .filter(Boolean)

  if (!currentUid || ridList.length === 0) {
    alert('삭제 실패: 잘못된 ID입니다.')
    return
  }

  try {
    await Promise.all(ridList.map(rid => deleteDoc(doc(db, 'users', currentUid, 'routines', rid))))
  } catch (e) {
    alert('파이어베이스 삭제에 실패했습니다. 콘솔 로그를 확인해주세요.')
  }

  rawRoutines.value = rawRoutines.value.filter(r => !ridList.includes(r.id))
  if (deleteMode.value) {
    selectedIds.value = []
    deleteMode.value = false
    toggleListStateButtonClass(false)
  }
  nextTick(recomputeScrollability)
}

function openAddRoutine() {
  window.dispatchEvent(new Event('close-other-popups'))
  editingRoutine.value = null
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
      nextTick(recomputeScrollability)
    },
    () => {
      rawRoutines.value = []
      isLoading.value = false
      hasFetched.value = true
      nextTick(recomputeScrollability)
    }
  )
}

const isScrolled = ref(false)
const headerShort = ref(false)
const canScroll = ref(false)
let scrollEl = null
const SCROLL_EPS = 8

function recomputeScrollability() {
  const el = scrollEl
  if (!el) return
  const scrollable = (el.scrollHeight - el.clientHeight) > SCROLL_EPS
  canScroll.value = scrollable
  const v = scrollable && (el.scrollTop || 0) > 0
  isScrolled.value = v
  headerShort.value = v
  if (!scrollable) {
    const rt = document.querySelector('.routine_total')
    rt && rt.classList.remove('top')
    const ds = document.querySelector('.date_scroll')
    if (ds) ds.style.display = ''
  }
}

function onScrollHandler() {
  const el = scrollEl
  if (!el) return
  const scrollable = (el.scrollHeight - el.clientHeight) > SCROLL_EPS
  canScroll.value = scrollable
  const v = scrollable && (el.scrollTop || 0) > 0
  isScrolled.value = v
  headerShort.value = v
}

function updateScrolledUI() {
  const routineTotalEl = document.querySelector('.routine_total')
  const dateScrollEl = document.querySelector('.date_scroll')
  const v = isScrolled.value
  if (routineTotalEl) {
    if (selectedPeriod.value === 'T' && v) routineTotalEl.classList.add('top')
    else routineTotalEl.classList.remove('top')
  }
  if (dateScrollEl) {
    if (selectedPeriod.value === 'T') {
      dateScrollEl.style.display = v ? 'none' : ''
    } else {
      dateScrollEl.style.display = ''
    }
  }
}

function safeUpdateScrolledUI() {
  if (!canScroll.value) return
  updateScrolledUI()
}

onMounted(async () => {
  setVh()
  window.addEventListener('resize', setVh)
  window.addEventListener('resize', recomputeScrollability)

  scrollEl = document.querySelector('.main_scroll')
  if (scrollEl) {
    scrollEl.addEventListener('scroll', onScrollHandler)
    const v = (scrollEl.scrollHeight - scrollEl.clientHeight) > SCROLL_EPS && (scrollEl.scrollTop || 0) > 0
    isScrolled.value = v
    headerShort.value = v
  }

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
        nextTick(recomputeScrollability)
      }
    }
  })

  nextTick(recomputeScrollability)
  updateScrolledUI()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setVh)
  window.removeEventListener('resize', recomputeScrollability)
  if (scrollEl) {
    scrollEl.removeEventListener('scroll', onScrollHandler)
    scrollEl = null
  }
  if (stopAuth) stopAuth()
  if (stopRoutines) stopRoutines()
})

watch(isScrolled, () => {
  safeUpdateScrolledUI()
})

watch([displayedRoutines, selectedPeriod, selectedView], () => {
  nextTick(recomputeScrollability)
})

function handlePrev() {
  if (selectedPeriod.value === 'W') {
    const d = addDays(selectedDate.value, -7)
    selectedDate.value = d
    isFutureDate.value = d > new Date() && !isTodayDateFn(d)
    selectedFilter.value = 'notdone'
    nextTick(recomputeScrollability)
    return
  }
  if (selectedPeriod.value === 'M') {
    const cur = new Date(selectedDate.value)
    const prev = addMonths(cur, -1)
    selectedDate.value = prev
    isFutureDate.value = prev > new Date() && !isTodayDateFn(prev)
    selectedFilter.value = 'notdone'
    nextTick(recomputeScrollability)
    return
  }
  const d = addDays(selectedDate.value, -1)
  const future = d > new Date() && !isTodayDateFn(d)
  handleSelectDate(d, future)
}
function handleNext() {
  if (selectedPeriod.value === 'W') {
    const d = addDays(selectedDate.value, 7)
    selectedDate.value = d
    isFutureDate.value = d > new Date() && !isTodayDateFn(d)
    selectedFilter.value = 'notdone'
    nextTick(recomputeScrollability)
    return
  }
  if (selectedPeriod.value === 'M') {
    const cur = new Date(selectedDate.value)
    const next = addMonths(cur, 1)
    selectedDate.value = next
    isFutureDate.value = next > new Date() && !isTodayDateFn(next)
    selectedFilter.value = 'notdone'
    nextTick(recomputeScrollability)
    return
  }
  const d = addDays(selectedDate.value, 1)
  const future = d > new Date() && !isTodayDateFn(d)
  handleSelectDate(d, future)
}

function handleChangeView(v) {
  selectedView.value = v
  nextTick(recomputeScrollability)
}

function handleChangePeriod(mode) {
  if (selectedPeriod.value !== mode) {
    selectedPeriod.value = mode
    selectedView.value = 'card'   // 기간 바꿀 때 항상 카드형으로 초기화
    selectedFilter.value = 'notdone'
    nextTick(recomputeScrollability)
    updateScrolledUI()
  }
}

function isRoutineForToday(r) {
  const today = new Date()
  const ad = r?.assignedDate ? new Date(r.assignedDate) : today
  const a = startOfDay(ad).getTime()
  const b = startOfDay(today).getTime()
  return a === b
}

function getAssignedDate(r) {
  if (r?.assignedDate) return new Date(r.assignedDate)
  if (selectedPeriod.value === 'T') return new Date(selectedDate.value)
  const d = lastActiveDateInRange(r, periodStartRaw.value, periodEnd.value)
  return d ? d : new Date(periodStartRaw.value)
}
</script>
