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

function weekIndexForMonthBy(dateOfWeek, baseYear, baseMonth) {
  const weekStart = startOfWeekSun(dateOfWeek)
  const monthFirst = new Date(baseYear, baseMonth, 1)
  const firstWeekStart = startOfWeekSun(monthFirst)
  const diffWeeks = Math.floor(
    (startOfDay(weekStart) - startOfDay(firstWeekStart)) / (7 * 24 * 60 * 60 * 1000)
  )
  return diffWeeks + 1
}

function weekLabelForDate(date) {
  const ws = startOfWeekSun(date)
  let cur=0, oth=0, othM=null, othY=null
  for (let i=0;i<7;i++) {
    const d = new Date(ws); d.setDate(ws.getDate()+i)
    if (d.getMonth()===date.getMonth()) cur++
    else { oth++; othM=d.getMonth(); othY=d.getFullYear() }
  }
  const baseMonth = cur >= 4 ? date.getMonth() : othM
  const baseYear  = cur >= 4 ? date.getFullYear() : othY
  const idx = weekIndexForMonthBy(ws, baseYear, baseMonth)
  return { year: baseYear, month: baseMonth, idx }
}
</script>
