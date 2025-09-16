// src/composables/useMainScroll.js 교체본
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

export function useMainScroll(rStore, mv) {
  const scrollEl = ref(null)
  const isScrolled = ref(false)
  const headerShort = ref(false)
  const SCROLL_HIDE = 8
  const SCROLL_SHOW = 2

  function updateScrollState() {
    const el = scrollEl.value
    if (!el) return
    const st = el.scrollTop || 0
    if (!isScrolled.value && st > SCROLL_HIDE) {
      isScrolled.value = true
      headerShort.value = true
    } else if (isScrolled.value && st <= SCROLL_SHOW) {
      isScrolled.value = false
      headerShort.value = false
    }
  }

  function onScrollHandler() {
    updateScrollState()
  }

  onMounted(() => {
    scrollEl.value = document.querySelector('#main_wrap')
    if (scrollEl.value) {
      scrollEl.value.addEventListener('scroll', onScrollHandler, { passive: true })
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
