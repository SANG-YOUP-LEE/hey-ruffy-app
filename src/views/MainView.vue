<template>
  <div id="main_wrap" v-cloak :class="{ selecting: rStore.deleteMode }">
    <HeaderView @toggle-lnb="showLnb = !showLnb" :class="{ short: headerShort }" />
    <SlidePanel :show="showLnb" @close="showLnb = false"><LnbView @close="showLnb = false" /></SlidePanel>
    <div id="main_body">
      <div class="main_fixed" v-if="hasFetched && rStore.items?.length">
        <MainDateScroll v-if="rStore.selectedPeriod==='T'" :selectedDate="selectedDate" @selectDate="nav.selectDate" />
        <MainRoutineTotal
          :isFuture="isFutureDate" :selectedDate="selectedDate"
          v-model:modelValue="rStore.selectedFilter"
          :counts="mv.headerCounts" :totalCount="mv.headerTotal"
          :viewMode="selectedView" :periodMode="rStore.selectedPeriod" :deleteMode="rStore.deleteMode"
          @requestPrev="nav.navigate(-1)" @requestNext="nav.navigate(1)"
          @changeView="nav.changeView" @changePeriod="nav.changePeriod" @toggleDeleteMode="handleToggleDeleteMode"
        />
      </div>
      <div class="main_scroll">
        <div v-if="isLoading" class="skeleton-wrap"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>
        <div v-else-if="hasFetched && !mv.displayedRoutines?.length" class="no_data">
          <span v-if="!rStore.items?.length">아직 지켜야할 다짐이 없어요.<br />오른쪽 하단 +버튼을 눌러 다짐을 추가해 볼까요?</span>
          <span v-else>해당 조건에 맞는 다짐이 없어요.</span>
        </div>
        <template v-else>
          <MainCard
            v-for="rt in (mv.displayedRoutines||[])" :key="rt.id"
            :selected="rt?.status || 'notdone'" :routine="rt"
            :isToday="rStore.selectedPeriod==='T' && mv.startOfDay(rt?.assignedDate?new Date(rt.assignedDate):new Date()).getTime()===mv.startOfDay(new Date()).getTime()"
            :assigned-date="new Date(rt?.assignedDate || mv.periodStartRaw)"
            :layout="ViewCardSet" :layout-variant="selectedView==='block'?'block':(selectedView==='list'?'list':'basic')"
            :period-mode="rStore.selectedPeriod"
            :delete-targets="rStore.deleteTargets" :delete-mode="rStore.deleteMode"
            @changeStatus="onChangeStatus" @delete="onDelete" @edit="openRoutine" @togglePause="onTogglePause" @toggleSelect="rStore.toggleSelect"
          />
        </template>
      </div>
    </div>
    <FooterView @refresh-main="refreshBinding" />
    <button @click="openRoutine()" class="add"><span>다짐 추가하기</span></button>
    <AddRoutineSelector v-if="isAddRoutineOpen" @close="isAddRoutineOpen=false; editingRoutine=null" @save="onSaved" :routineToEdit="editingRoutine" />
    <teleport to="body">
      <div v-if="showBulkDeleteConfirm" class="com_popup_wrap">
        <div class="popup_inner alert">
          <div class="popup_tit"><h2>선택한 다짐을 삭제할까요?</h2></div>
          <div class="popup_body">삭제된 다짐은 되돌릴 수 없어요.</div>
          <div class="popup_btm">
            <button @click="_confirmBulkDelete(onDelete)" class="p_basic">삭제</button>
            <button @click="closeBulkDeleteConfirm" class="p_white">취소</button>
          </div>
          <button class="close_btn" @click="closeBulkDeleteConfirm"><span>닫기</span></button>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, nextTick, watchEffect } from 'vue'
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
import { useRoutineBinding } from '@/composables/useRoutineBinding'
import { useBulkDelete } from '@/composables/useBulkDelete'
import { useMainNavigation } from '@/composables/useMainNavigation'
import { useVH } from '@/composables/useVH'
import { storeToRefs } from 'pinia'

const rStore = useRoutinesStore()
const mv = useMainViewStore()
const { isLoading, hasFetched, isAddRoutineOpen, showLnb, selectedDate, isFutureDate, selectedView, editingRoutine, showBulkDeleteConfirm, headerShort } = storeToRefs(mv)

const { isScrolled: scrolledRef, headerShort: headerShortRef, updateScrollState } = useMainScroll(rStore, mv)
const update = () => nextTick(updateScrollState)

const { initBinding, disposeBinding, refreshBinding } = useRoutineBinding(rStore, mv, update)
const { close: closeBulkDeleteConfirm, confirm: _confirmBulkDelete, toggle: handleToggleDeleteMode } = useBulkDelete(rStore, mv)
const nav = useMainNavigation(rStore, mv, { scrolledRef, headerShortRef, update })

function onSaved(rt){
  const n=normalizeRecurrence(rt), i=(rStore.items||[]).findIndex(r=>r.id===n.id)
  rStore.items = i<0 ? [n,...(rStore.items||[])] : [...rStore.items.slice(0,i),{...rStore.items[i],...n},...rStore.items.slice(i+1)]
  isAddRoutineOpen.value=false; editingRoutine.value=null; rStore.setFilter('notdone'); update()
}

async function onChangeStatus({ id, status }){ rStore.changeStatus({ id: String((typeof id==='string'?id:id?.id)).split('-')[0], status, date: mv.dateKey(selectedDate.value) }); rStore.setFilter(status); update() }
async function onTogglePause({ id, isPaused }){ rStore.togglePause({ id: String((typeof id==='string'?id:id?.id)).split('-')[0], isPaused }); update() }
async function onDelete(payload){ rStore.deleteRoutines((Array.isArray(payload)?payload:[payload]).map(v=>String((typeof v==='string'?v:v?.id)).split('-')[0])); update() }
function openRoutine(rt=null){ window.dispatchEvent(new Event('close-other-popups')); editingRoutine.value = rt; isAddRoutineOpen.value = true }

const { initVH, disposeVH } = useVH()
onMounted(async () => { initVH(); await initBinding(); update() })
onBeforeUnmount(() => { disposeVH(); disposeBinding() })

</script>