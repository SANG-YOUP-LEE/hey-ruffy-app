// src/composables/useMainScroll.js
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

export function useMainScroll(rStore, mv) {
  const scrollEl = ref(null)
  const isScrolled = ref(false)
  const headerShort = ref(false)
  const SCROLL_EPS = 1

  function updateScrollState() {
    const el = scrollEl.value
    if (!el) return
    const scrollable = (el.scrollHeight - el.clientHeight) > SCROLL_EPS
    const v = scrollable && (el.scrollTop || 0) > 0
    isScrolled.value = v
    headerShort.value = v
    const routineTotalEl = document.querySelector('.routine_total')
    const dateScrollEl = document.querySelector('.date_scroll')
    if (routineTotalEl) {
      if (rStore.selectedPeriod === 'T' && v) routineTotalEl.classList.add('top')
      else routineTotalEl.classList.remove('top')
    }
    if (dateScrollEl) {
      if (rStore.selectedPeriod === 'T') dateScrollEl.style.display = v ? 'none' : ''
      else dateScrollEl.style.display = ''
    }
  }

  function onScrollHandler() {
    updateScrollState()
  }

  onMounted(() => {
    scrollEl.value = document.querySelector('.main_scroll')
    if (scrollEl.value) {
      scrollEl.value.addEventListener('scroll', onScrollHandler)
      scrollEl.value.scrollTop = 0
      updateScrollState()
    }
    nextTick(updateScrollState)
  })

  onBeforeUnmount(() => {
    if (scrollEl.value) {
      scrollEl.value.removeEventListener('scroll', onScrollHandler)
      scrollEl.value = null
    }
  })

  return {
    scrollEl,
    isScrolled,
    headerShort,
    updateScrollState
  }
}