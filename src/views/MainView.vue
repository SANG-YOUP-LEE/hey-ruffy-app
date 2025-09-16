<template>
  <div id="main_wrap" v-cloak :class="{ selecting: rStore.deleteMode }">
    <HeaderView @toggle-lnb="showLnb = !showLnb" />
    <SlidePanel :show="panelOpen" @close="closePanel">
      <LnbView @close="closePanel" />
    </SlidePanel>
    
    <div v-show="hasFetched">
      <MainDateScroll :selectedDate="selectedDate" @selectDate="onSelectDate" />
      <MainRoutineTotal
        :key="rtResetKey"
        :isFuture="isFutureDate"
        :selectedDate="selectedDate"
        v-model:modelValue="rStore.selectedFilter"
        :counts="mv.headerCounts"
        :totalCount="mv.headerTotal"
        :periodMode="rStore.selectedPeriod"
        @requestPrev="onRequestPrev"
        @requestNext="onRequestNext"
        @changePeriod="onChangePeriod"
      />

      <div class="routine_summary">
        <div class="sum_date">
          <button class="prev" @click="onRequestPrev"><span>prev</span></button>
          <div class="today">
            <span class="y_m">{{ sumYear }}.{{ sumMonth }}</span>
            <em>{{ sumDay }}</em>
          </div>
          <button class="next" @click="onRequestNext"><span>next</span></button>
        </div>
        <div class="r_state">
          <a href="#" :class="{ on: rStore.selectedFilter==='notdone' }" @click.prevent="rStore.setFilter('notdone')">
            <span>체크전</span><em>{{ (mv.headerCounts && mv.headerCounts.notdone) || 0 }}</em>
          </a>
          <a href="#" :class="{ on: rStore.selectedFilter==='done' }" @click.prevent="rStore.setFilter('done')">
            <span>달성완료</span><em>{{ (mv.headerCounts && mv.headerCounts.done) || 0 }}</em>
          </a>
          <a href="#" :class="{ on: rStore.selectedFilter==='faildone' || rStore.selectedFilter==='fail' }" @click.prevent="rStore.setFilter('faildone')">
            <span>실패</span><em>{{ (mv.headerCounts && (mv.headerCounts.faildone ?? mv.headerCounts.fail)) || 0 }}</em>
          </a>
          <a href="#" :class="{ on: rStore.selectedFilter==='ignored' || rStore.selectedFilter==='ign' }" @click.prevent="rStore.setFilter('ignored')">
            <span>흐린눈</span><em>{{ (mv.headerCounts && (mv.headerCounts.ignored ?? mv.headerCounts.ign)) || 0 }}</em>
          </a>
        </div>
      </div>

      <div class="today_tools">
        <div class="today">
          <a href="#none" class="prev" @click.prevent="onClickPrev"><span>{{ prevLabel }}</span></a>
          <span class="term"></span> <em>{{ periodTitle }}</em>
          <a href="#none" class="next" @click.prevent="onClickNext"><span>{{ nextLabel }}</span></a>
        </div>
        <div class="tools">
          <a href="#none" class="r_card" :class="{ on: activeTool === 'card' }" @click.prevent="onChangeView('card')"><span>다짐카드보기</span></a>
          <a href="#none" class="r_list" :class="{ on: activeTool === 'list' }" @click.prevent="onChangeView('list')"><span>다짐목록보기</span></a>
          <a href="#none" class="r_carousel" :class="{ on: activeTool === 'carousel' }" @click.prevent="onChangeView('carousel')"><span>다짐캐러셀보기</span></a>
          <a href="#none" :class="[ localDelete ? 'r_del' : 'r_select', { on: activeTool === 'delete' } ]" @click.prevent="toggleDeleteMode"><span>{{ localDelete ? '삭제하기' : '다짐선택' }}</span></a>
        </div>
      </div>
    </div>

    <div id="main_body">
      <div class="main_scroll" ref="scrollEl">
        <div v-if="isLoading" class="skeleton-wrap"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>
        <div v-else-if="hasFetched && !filteredRoutines.length" class="no_data">
          <span v-if="!rStore.items?.length">아직 지켜야할 다짐이 없어요.<br />오른쪽 하단 +버튼을 눌러 다짐을 추가해 볼까요?</span>
          <span v-else>해당 조건에 맞는 다짐이 없어요.</span>
        </div>
        <template v-else>
          <MainCardCarousel
            v-if="selectedView==='carousel'"
            :routines="filteredRoutines"
            :layout="ViewCardSet"
            :layout-variant="selectedView"
            :period-mode="rStore.selectedPeriod"
            :delete-targets="rStore.deleteTargets"
            :delete-mode="rStore.deleteMode"
            :period-start-raw="mv.periodStartRaw"
            @changeStatus="onChangeStatus"
            @delete="onDelete"
            @edit="openRoutine"
            @togglePause="onTogglePause"
            @toggleSelect="rStore.toggleSelect"
          />
          <MainCard
            v-else
            v-for="rt in filteredRoutines"
            :key="String(rt.id||'').split('-')[0]"
            :selected="rt?.status || 'notdone'"
            :routine="rt"
            :isToday="rStore.selectedPeriod==='T' && mv.startOfDay(rt?.assignedDate?new Date(rt.assignedDate):new Date()).getTime()===mv.startOfDay(new Date()).getTime()"
            :assigned-date="new Date(rt?.assignedDate || mv.periodStartRaw)"
            :layout="ViewCardSet"
            :layout-variant="selectedView==='list'?'list':'basic'"
            :period-mode="rStore.selectedPeriod"
            :delete-targets="rStore.deleteTargets"
            :delete-mode="rStore.deleteMode"
            @changeStatus="onChangeStatus"
            @delete="onDelete"
            @edit="openRoutine"
            @togglePause="onTogglePause"
            @toggleSelect="rStore.toggleSelect"
          />
        </template>
      </div>
    </div>

    <FooterView @refresh-main="refreshBinding" />
    <button @click="openRoutine()" class="add"><span>다짐 추가하기</span></button>
    <AddRoutineSelector
      v-if="isAddRoutineOpen"
      @close="isAddRoutineOpen=false; editingRoutine=null"
      @save="onSaved"
      :routineToEdit="editingRoutine"
    />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, nextTick, watchEffect, computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'
import MainDateScroll from '@/components/MainCard/MainDateScroll.vue'
import MainRoutineTotal from '@/components/MainCard/MainRoutineTotal.vue'
import MainCard from '@/components/MainCard/MainCard.vue'
import MainCardCarousel from '@/components/MainCard/MainCardCarousel.vue'
import ViewCardSet from '@/components/MainCard/viewCardSet.vue'
import SlidePanel from '@/components/common/SlidePanel.vue'

import { useRoutinesStore } from '@/stores/routines'
import { useMainViewStore } from '@/stores/mainView'
import { useMainScroll } from '@/composables/useMainScroll'
import { useRoutineBinding } from '@/composables/useRoutineBinding'
import { useBulkDelete } from '@/composables/useBulkDelete'
import { useMainNavigation } from '@/composables/useMainNavigation'
import { useVH } from '@/composables/useVH'
import { useModalStore } from '@/stores/modal'

const route = useRoute()
const router = useRouter()

const rStore = useRoutinesStore()
const mv = useMainViewStore()
const modal = useModalStore()
const { isLoading, hasFetched, isAddRoutineOpen, showLnb, selectedDate, isFutureDate, selectedView, editingRoutine } = storeToRefs(mv)

const panelOpen = computed(() => showLnb.value || route.path === '/lnb')
function closePanel(){
  showLnb.value = false
  if (route.path === '/lnb') router.replace('/main')
}

const { isScrolled: scrolledRef, headerShort: headerShortRef, updateScrollState, scrollEl } = useMainScroll(rStore, mv)
const update = () => nextTick(updateScrollState)

const { initBinding, disposeBinding, refreshBinding } = useRoutineBinding(rStore, mv, update)
const { toggle: handleToggleDeleteMode } = useBulkDelete(rStore, mv)
const nav = useMainNavigation(rStore, mv, { scrolledRef, headerShortRef, update })

const rtResetKey = ref(0)
const resetGraph = () => { rtResetKey.value++ }

const filteredRoutines = computed(() => {
  const f = rStore.selectedFilter || 'notdone'
  return (mv.displayedRoutines || []).filter(rt => (rt?.status || 'notdone') === f)
})

const onSelectDate = (date, isFuture, isToday) => { resetGraph(); nav.selectDate(date, isFuture, isToday) }
const onRequestPrev = () => { resetGraph(); nav.navigate(-1) }
const onRequestNext = () => { resetGraph(); nav.navigate(1) }
const onChangePeriod = (mode) => { resetGraph(); nav.changePeriod(mode) }

async function onSaved(rt){
  isAddRoutineOpen.value = false
  editingRoutine.value = null
  rStore.setFilter('notdone')
  await refreshBinding()
  update()
}

async function onChangeStatus({ id, status }){ rStore.changeStatus({ id: String((typeof id==='string'?id:id?.id)).split('-')[0], status, date: mv.dateKey(selectedDate.value) }); rStore.setFilter(status); update() }
async function onTogglePause({ id, isPaused }){ rStore.togglePause({ id: String((typeof id==='string'?id:id?.id)).split('-')[0], isPaused }); update() }
async function onDelete(payload){ rStore.deleteRoutines((Array.isArray(payload)?payload:[payload]).map(v=>String((typeof v==='string'?v:v?.id)).split('-')[0])); update() }
function openRoutine(rt=null){ window.dispatchEvent(new Event('close-other-popups')); editingRoutine.value = rt; isAddRoutineOpen.value = true }

const sumDate = computed(() => new Date(selectedDate.value))
const sumYear = computed(() => String(sumDate.value.getFullYear()))
const sumMonth = computed(() => String(sumDate.value.getMonth() + 1).padStart(2, '0'))
const sumDay = computed(() => String(sumDate.value.getDate()).padStart(2, '0'))

const activeTool = computed(() => (rStore.deleteMode ? 'delete' : selectedView.value))
const localDelete = computed(() => rStore.deleteMode)
function onChangeView(view){
  if (selectedView.value !== view) nav.changeView(view)
  if (rStore.deleteMode) handleToggleDeleteMode()
}
function toggleDeleteMode(){ handleToggleDeleteMode() }
function onClickPrev(){ onRequestPrev() }
function onClickNext(){ onRequestNext() }

const prevLabel = computed(() => rStore.selectedPeriod === 'W' ? '이전주' : rStore.selectedPeriod === 'M' ? '이전달' : '전날')
const nextLabel = computed(() => rStore.selectedPeriod === 'W' ? '다음주' : rStore.selectedPeriod === 'M' ? '다음달' : '다음날')
const periodTitle = computed(() => {
  const f = rStore.selectedFilter
  if (f === 'notdone') return '달성 체크 전'
  if (f === 'done') return '달성완료 다짐'
  if (f === 'faildone' || f === 'fail') return '달성실패 다짐'
  if (f === 'ignored' || f === 'ign') return '흐린눈 다짐'
  if (rStore.selectedPeriod === 'W') return '주간 다짐'
  if (rStore.selectedPeriod === 'M') return '월간 다짐'
  return '오늘의 다짐'
})

const { initVH, disposeVH } = useVH()
onMounted(async () => {
  showLnb.value = false
  initVH()
  await initBinding()
  update()
})
onBeforeUnmount(() => { disposeVH(); disposeBinding() })

watchEffect(() => {
  mv.setLoading(rStore.isLoading)
  mv.setFetched(rStore.hasFetched)
})

watchEffect(async () => {
  if (mv.showBulkDeleteConfirm) {
    const ok = await modal.confirm({
      title: '선택한 다짐을 삭제할까요?',
      message: '삭제된 다짐은 되돌릴 수 없어요.',
      okText: '삭제',
      cancelText: '취소',
    })
    mv.showBulkDeleteConfirm = false
    if (ok) {
      await onDelete(rStore.deleteTargets || [])
      await modal.confirm({ title: '완료', message: '선택한 다짐을 삭제했어요.', okText: '확인', cancelText: '' })
      handleToggleDeleteMode()
    }
  }
})
</script>
