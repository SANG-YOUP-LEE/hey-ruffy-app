<template>
  <div id="main_wrap" v-cloak :class="{ selecting: deleteMode }">
    <HeaderView @toggle-lnb="showLnb = !showLnb" :class="{ short: headerShort }" />
    <SlidePanel :show="showLnb" @close="showLnb = false">
      <LnbView @close="showLnb = false" />
    </SlidePanel>
    
    <div id="main_body">
      <div class="main_fixed" v-if="hasAnyRoutine">
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
            :layout-variant="currentVariant"
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
import ViewCardSet from '@/components/MainCard/viewCardSet.vue'

import { normalize, isActive as isActiveRule, isDue } from '@/utils/recurrence'
import SlidePanel from '@/components/common/SlidePanel.vue'
  
const isLoading = ref(true)
const hasFetched = ref(false)
const isAddRoutineOpen = ref(false)
const showLnb = ref(false)

const selectedDate = ref(new Date())
const isFutureDate = ref(false)
const selectedFilter = ref('notdone')

const selectedPeriod = ref('T')
const selectedView = ref('card')

const currentLayout = ViewCardSet
const currentVariant = computed(() =>
  selectedView.value === 'block' ? 'block'
  : selectedView.value === 'list' ? 'list'
  : 'basic'
)
  
const rawRoutines = ref([])
const routines = ref([])
const isTodayDate = computed(() => dateKey(selectedDate.value) === dateKey(new Date()))
let currentUid = null
let editingRoutine = ref(null)

const deleteMode = ref(false)
const selectedIds = ref([])
const showBulkDeleteConfirm = ref(false)

const hasAnyRoutine = computed(() => hasFetched.value && rawRoutines.value.length > 0)
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

const occurrencesActivePeriod = computed(() => {
  const s = periodStartRaw.value
  const e = periodEnd.value
  return rawRoutines.value
    .filter(r => !r.isPaused && inDateRange(r, s))
    .map(r => {
      const k = dateKey(s)
      return { ...r, status: r?.progress?.[k] ?? 'notdone', assignedDate: new Date(s), id: r.id }
    })
})
const occurrencesPausedPeriod = computed(() => {
  const s = periodStartRaw.value
  const e = periodEnd.value
  return rawRoutines.value
    .filter(r => !!r.isPaused && inDateRange(r, s))
    .map(r => {
      const k = dateKey(s)
      return { ...r, status: r?.progress?.[k] ?? 'notdone', assignedDate: new Date(s), id: r.id }
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
    else if (s === 'faildone') c.faildone++
    else if (s === 'ignored') c.ignored++
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
  return filtered
})

let scrollEl = null
const isScrolled = ref(false)
const headerShort = ref(false)
const SCROLL_EPS = 1

function updateScrollState() {
  const el = scrollEl
  if (!el) return
  const scrollable = (el.scrollHeight - el.clientHeight) > SCROLL_EPS
  const v = scrollable && (el.scrollTop || 0) > 0
  isScrolled.value = v
  headerShort.value = v
  const routineTotalEl = document.querySelector('.routine_total')
  const dateScrollEl = document.querySelector('.date_scroll')
  if (routineTotalEl) {
    if (selectedPeriod.value === 'T' && v) routineTotalEl.classList.add('top')
    else routineTotalEl.classList.remove('top')
  }
  if (dateScrollEl) {
    if (selectedPeriod.value === 'T') dateScrollEl.style.display = v ? 'none' : ''
    else dateScrollEl.style.display = ''
  }
}

function onScrollHandler() {
  updateScrollState()
}

function setVh() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

onMounted(async () => {
  setVh()
  window.addEventListener('resize', setVh)

  scrollEl = document.querySelector('.main_scroll')
  if (scrollEl) {
    scrollEl.addEventListener('scroll', onScrollHandler)
    scrollEl.scrollTop = 0
    updateScrollState()
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
        nextTick(updateScrollState)
      }
    }
  })

  nextTick(updateScrollState)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setVh)
  if (scrollEl) {
    scrollEl.removeEventListener('scroll', onScrollHandler)
    scrollEl = null
  }
  if (stopAuth) stopAuth()
  if (stopRoutines) stopRoutines()
})

watch([displayedRoutines, selectedPeriod, selectedView], () => {
  nextTick(updateScrollState)
})
</script>
