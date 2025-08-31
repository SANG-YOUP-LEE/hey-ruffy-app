// src/composables/useMainNavigation.js
export function useMainNavigation(rStore, mv, { scrolledRef, headerShortRef, update }) {
  const resetScroll = () => { scrolledRef.value = false; headerShortRef.value = false }
  const selectDate = (date, isFuture) => {
    if (rStore.deleteMode) toggleDelete(false, true)
    resetScroll()
    mv.setSelectedDate(date); mv.setFutureDate(isFuture)
    rStore.setFilter('notdone'); rStore.setPeriod('T'); mv.setSelectedView('card')
    update()
  }
  const navigate = (dir) => {
    if (rStore.selectedPeriod==='W') {
      const d = mv.addDays(mv.selectedDate, 7*dir); mv.selectedDate = d; mv.isFutureDate = d>new Date()
      rStore.setFilter('notdone'); update(); return
    }
    if (rStore.selectedPeriod==='M') {
      const d = mv.addMonths(new Date(mv.selectedDate), dir); mv.selectedDate = d; mv.isFutureDate = d>new Date()
      rStore.setFilter('notdone'); update(); return
    }
    const d = mv.addDays(mv.selectedDate, dir); selectDate(d, d>new Date())
  }
  const changeView = (v) => { if (rStore.deleteMode) toggleDelete(false, true); mv.selectedView = v; resetScroll(); update() }
  const changePeriod = (mode) => {
    if (rStore.deleteMode) toggleDelete(false, true)
    resetScroll()
    const today = new Date(); today.setHours(0,0,0,0)
    mv.selectedDate = today; mv.isFutureDate = false; rStore.setFilter('notdone'); mv.selectedView = 'card'; rStore.setPeriod(mode)
    update()
  }
  const toggleDelete = (v, force=false) => {
    if (rStore.deleteMode && !v && !force && rStore.deleteTargets.length>0) { document.body.classList.add('no-scroll'); mv.showBulkDeleteConfirm = true; return }
    rStore.setDeleteMode(!!v)
  }
  return { selectDate, navigate, changeView, changePeriod, toggleDelete }
}