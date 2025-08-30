<template>
  <div id="main_wrap" v-cloak :class="{ selecting: rStore.deleteMode }">
    <HeaderView @toggle-lnb="showLnb = !showLnb" :class="{ short: headerShort }" />
    <SlidePanel :show="showLnb" @close="showLnb = false"><LnbView @close="showLnb = false" /></SlidePanel>

    <div id="main_body">
      <div class="main_fixed" v-if="hasAnyRoutine">
        <MainDateScroll v-if="rStore.selectedPeriod==='T'" :selectedDate="selectedDate" @selectDate="handleSelectDate" />
        <MainRoutineTotal
          :isFuture="isFutureDate" :selectedDate="selectedDate"
          v-model:modelValue="rStore.selectedFilter"
          :counts="mv.headerCounts" :totalCount="mv.headerTotal"
          :viewMode="selectedView" :periodMode="rStore.selectedPeriod"
          :deleteMode="rStore.deleteMode"
          @requestPrev="handlePrev" @requestNext="handleNext"
          @changeView="handleChangeView" @changePeriod="handleChangePeriod" @toggleDeleteMode="handleToggleDeleteMode"
        />
      </div>

      <div class="main_scroll">
        <div v-if="isLoading" class="skeleton-wrap"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>

        <div v-else-if="hasFetched && (mv.displayedRoutines?.length || 0)===0" class="no_data">
          <span v-if="(rStore.items && rStore.items.length===0)">아직 지켜야할 다짐이 없어요.<br />오른쪽 하단 +버튼을 눌러 다짐을 추가해 볼까요?</span>
          <span v-else>해당 조건에 맞는 다짐이 없어요.</span>
        </div>

        <template v-else>
          <MainCard
            v-for="rt in (mv.displayedRoutines || [])" :key="rt.id"
            :selected="getStatus(rt)" :routine="rt"
            :isToday="rStore.selectedPeriod==='T' && isRoutineForToday(rt)"
            :assigned-date="getAssignedDate(rt)"
            :layout="currentLayout" :layout-variant="selectedView==='block'?'block':(selectedView==='list'?'list':'basic')"
            :period-mode="rStore.selectedPeriod"
            :delete-targets="rStore.deleteTargets" :delete-mode="rStore.deleteMode"
            @changeStatus="onChangeStatus" @delete="onDelete" @edit="openEditRoutine"
            @togglePause="onTogglePause" @toggleSelect="onToggleSelect"
          />
        </template>
      </div>
    </div>

    <FooterView @refresh-main="refreshMain" />
    <button @click="openAddRoutine" class="add"><span>다짐 추가하기</span></button>

    <AddRoutineSelector v-if="isAddRoutineOpen" @close="isAddRoutineOpen=false; editingRoutine=null" @save="onSaved" :routineToEdit="editingRoutine" />

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
import { computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { authReadyPromise } from '@/lib/authReady'

import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'
import MainDateScroll from '@/components/MainCard/MainDateScroll.vue'
import MainRoutineTotal from '@/components/MainCard/MainRoutineTotal.vue'
import MainCard from '@/components/MainCard/MainCard.vue'
import ViewCardSet from '@/components/MainCard/viewCardSet.vue'
import SlidePanel from '@/components/common/SlidePanel.vue'

import { normalize as normalizeRecurrence } from '@/utils/recurrence'
import { useRoutinesStore } from '@/stores/routines'
import { useMainViewStore } from '@/stores/mainView'
import { useMainScroll } from '@/composables/useMainScroll'
import { storeToRefs } from 'pinia'

const rStore = useRoutinesStore()
const mv = useMainViewStore()
const { isLoading, hasFetched, isAddRoutineOpen, showLnb, selectedDate, isFutureDate, selectedView, editingRoutine, showBulkDeleteConfirm, isScrolled, headerShort } = storeToRefs(mv)

const currentLayout = ViewCardSet
const { isScrolled: scrolledRef, headerShort: headerShortRef, updateScrollState } = useMainScroll(rStore, mv)
watch(scrolledRef, v => mv.setScrolled(v))
watch(headerShortRef, v => mv.setHeaderShort(v))

const hasAnyRoutine = computed(() => hasFetched.value && Array.isArray(rStore.items) && rStore.items.length > 0)

function getStatus(r){ return r?.status || 'notdone' }

function closeBulkDeleteConfirm(){ showBulkDeleteConfirm.value = false; document.body.classList.remove('no-scroll') }
async function confirmBulkDelete(){ const ids = rStore.deleteTargets.slice(); closeBulkDeleteConfirm(); await onDelete(ids) }

function handleSelectDate(date, isFuture){
  if (rStore.deleteMode) handleToggleDeleteMode(false, true)
  scrolledRef.value = false
  headerShortRef.value = false
  mv.setSelectedDate(date)
  mv.setFutureDate(isFuture)
  rStore.setFilter('notdone')
  rStore.setPeriod('T')
  mv.setSelectedView('card')
  nextTick(updateScrollState)
}

function onSaved(rt){
  const norm = normalizeRecurrence(rt)
  const i = (rStore.items || []).findIndex(r => r.id === norm.id)
  if (i === -1) rStore.items = [norm, ...(rStore.items || [])]
  else { const arr = (rStore.items || []).slice(); arr.splice(i, 1, { ...rStore.items[i], ...norm }); rStore.items = arr }
  isAddRoutineOpen.value = false
  editingRoutine.value = null
  rStore.setFilter('notdone')
  nextTick(updateScrollState)
}

let currentUid = null

async function onChangeStatus({ id, status }){
  const key = mv.dateKey(selectedDate.value)
  const rid = String(id).split('-')[0]
  rStore.changeStatus({ id: rid, status, date: key })
  rStore.setFilter(status)
  nextTick(updateScrollState)
}

async function onTogglePause({ id, isPaused }){
  const rid = String(id).split('-')[0]
  rStore.togglePause({ id: rid, isPaused })
  nextTick(updateScrollState)
}

async function onDelete(payload){
  const ids = Array.isArray(payload) ? payload : [payload]
  const ridList = ids.map(x => typeof x === 'string' ? x.split('-')[0] : x?.id ? String(x.id).split('-')[0] : null).filter(Boolean)
  rStore.deleteRoutines(ridList)
  nextTick(updateScrollState)
}

function openAddRoutine(){ window.dispatchEvent(new Event('close-other-popups')); editingRoutine.value = null; isAddRoutineOpen.value = true }
function openEditRoutine(rt){ window.dispatchEvent(new Event('close-other-popups')); editingRoutine.value = rt; isAddRoutineOpen.value = true }

function setVh(){ const vh = window.innerHeight * 0.01; document.documentElement.style.setProperty('--vh', `${vh}px`) }
function refreshMain(){ if (currentUid) rStore.bind(currentUid) }

let stopAuth = null
onMounted(async () => {
  setVh(); window.addEventListener('resize', setVh)

  await authReadyPromise
  if (auth.currentUser){ currentUid = auth.currentUser.uid; rStore.bind(currentUid) }

  stopAuth = onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== currentUid){ currentUid = user.uid; rStore.bind(currentUid) }
    else if (!user){
      currentUid = null
      rStore.release()
      rStore.items = []
      rStore.isLoading = false
      rStore.hasFetched = true
      mv.setLoading(false)
      mv.setFetched(true)
      nextTick(updateScrollState)
    }
  })

  watch([() => rStore.isLoading, () => rStore.hasFetched], ([a,b]) => { mv.setLoading(a); mv.setFetched(b) }, { immediate: true })
  nextTick(updateScrollState)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setVh)
  if (stopAuth) stopAuth()
})

watch([() => mv.displayedRoutines, () => rStore.selectedPeriod, () => selectedView.value], () => { nextTick(updateScrollState) })

function handlePrev(){
  if (rStore.selectedPeriod==='W'){ const d = mv.addDays(selectedDate.value, -7); selectedDate.value=d; isFutureDate.value = d>new Date(); rStore.setFilter('notdone'); nextTick(updateScrollState); return }
  if (rStore.selectedPeriod==='M'){ const prev = mv.addMonths(new Date(selectedDate.value), -1); selectedDate.value=prev; isFutureDate.value = prev>new Date(); rStore.setFilter('notdone'); nextTick(updateScrollState); return }
  const d = mv.addDays(selectedDate.value, -1); handleSelectDate(d, d>new Date())
}
function handleNext(){
  if (rStore.selectedPeriod==='W'){ const d = mv.addDays(selectedDate.value, 7); selectedDate.value=d; isFutureDate.value = d>new Date(); rStore.setFilter('notdone'); nextTick(updateScrollState); return }
  if (rStore.selectedPeriod==='M'){ const next = mv.addMonths(new Date(selectedDate.value), 1); selectedDate.value=next; isFutureDate.value = next>new Date(); rStore.setFilter('notdone'); nextTick(updateScrollState); return }
  const d = mv.addDays(selectedDate.value, 1); handleSelectDate(d, d>new Date())
}

function handleChangeView(v){
  if (rStore.deleteMode) handleToggleDeleteMode(false, true)
  selectedView.value = v
  scrolledRef.value = false
  headerShortRef.value = false
  nextTick(updateScrollState)
}
function handleChangePeriod(mode){
  if (rStore.deleteMode) handleToggleDeleteMode(false, true)
  scrolledRef.value = false
  headerShortRef.value = false
  const today = new Date(); today.setHours(0,0,0,0)
  selectedDate.value = today
  isFutureDate.value = false
  rStore.setFilter('notdone')
  selectedView.value = 'card'
  rStore.setPeriod(mode)
  nextTick(updateScrollState)
}
function handleToggleDeleteMode(v, force=false){
  const next = !!v
  if (rStore.deleteMode && !next && !force){
    if (rStore.deleteTargets.length > 0){ showBulkDeleteConfirm.value = true; document.body.classList.add('no-scroll'); return }
  }
  rStore.setDeleteMode(next)
}
function onToggleSelect({ id, checked }){ rStore.toggleSelect({ id, checked }) }

function isRoutineForToday(r){
  const a = mv.startOfDay(r?.assignedDate ? new Date(r.assignedDate) : new Date()).getTime()
  const b = mv.startOfDay(new Date()).getTime()
  return a === b
}
function getAssignedDate(r){
  return new Date(r?.assignedDate || mv.periodStartRaw)
}
</script>