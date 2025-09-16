// src/composables/useMainScroll.js
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

export function useMainScroll(rStore, mv) {
  const scrollEl = ref(null)
  const isScrolled = ref(false)
  const headerShort = ref(false)

  const SCROLL_HIDE = 8
  const SCROLL_SHOW = 2

  let ticking = false
  let ro = null
  let headerEl = null
  let sumEl = null
  let contentEl = null

  function syncStickyOffsets() {
    if (!headerEl) headerEl = document.querySelector('#header')
    if (!contentEl) contentEl = document.querySelector('.main_scroll')
    if (!sumEl) sumEl = document.querySelector('.routine_total.sum')

    const hh = headerEl ? headerEl.offsetHeight || 0 : 0

    document.documentElement.style.setProperty('--header-h', `${hh}px`)

    if (contentEl) contentEl.style.paddingTop = `${hh}px`
    if (sumEl) sumEl.style.top = `${hh}px`
  }

  function updateScrollState() {
    if (!scrollEl.value) return
    const st = scrollEl.value.scrollTop || 0
    if (!isScrolled.value && st > SCROLL_HIDE) {
      isScrolled.value = true
      headerShort.value = true
    } else if (isScrolled.value && st <= SCROLL_SHOW) {
      isScrolled.value = false
      headerShort.value = false
    }
  }

  function onScrollHandler() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      updateScrollState()
      ticking = false
    })
  }

  onMounted(() => {
    scrollEl.value = document.querySelector('#main_wrap')
    headerEl = document.querySelector('#header')
    contentEl = document.querySelector('.main_scroll')
    sumEl = document.querySelector('.routine_total.sum')

    syncStickyOffsets()

    if (scrollEl.value) {
      scrollEl.value.addEventListener('scroll', onScrollHandler, { passive: true })
      scrollEl.value.scrollTop = 0
      updateScrollState()
    }

    if (headerEl && 'ResizeObserver' in window) {
      ro = new ResizeObserver(syncStickyOffsets)
      ro.observe(headerEl)
    }

    window.addEventListener('orientationchange', syncStickyOffsets, { passive: true })
    window.addEventListener('resize', syncStickyOffsets, { passive: true })

    nextTick(() => { syncStickyOffsets(); updateScrollState() })
  })

  onBeforeUnmount(() => {
    if (scrollEl.value) scrollEl.value.removeEventListener('scroll', onScrollHandler)
    window.removeEventListener('orientationchange', syncStickyOffsets)
    window.removeEventListener('resize', syncStickyOffsets)
    if (ro) ro.disconnect()
    ro = null
    headerEl = null
    sumEl = null
    contentEl = null
    scrollEl.value = null
  })

  return {
    scrollEl,
    isScrolled,
    headerShort,
    updateScrollState
  }
}
