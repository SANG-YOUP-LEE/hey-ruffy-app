// src/composables/useMainScroll.js
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

export function useMainScroll(rStore, mv) {
  const scrollEl = ref(null)
  const isScrolled = ref(false)
  const headerShort = ref(false)
  const SCROLL_HIDE = 8
  const SCROLL_SHOW = 2
  let spacer = null

  function ensureSpacer() {
    const el = scrollEl.value
    if (!el) return
    if (!spacer) {
      spacer = document.createElement('div')
      spacer.style.cssText = 'height:1px;width:1px;pointer-events:none;opacity:0;'
      el.appendChild(spacer)
    }
    const gap = el.scrollHeight - el.clientHeight
    spacer.style.height = gap <= 0 ? '2px' : '1px'
  }

  function updateScrollState() {
    const el = scrollEl.value
    if (!el) return
    ensureSpacer()
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
    scrollEl.value = document.querySelector('.main_scroll')
    if (scrollEl.value) {
      scrollEl.value.addEventListener('scroll', onScrollHandler, { passive: true })
      scrollEl.value.scrollTop = 0
      updateScrollState()
    }
    nextTick(updateScrollState)
    window.addEventListener('resize', ensureSpacer)
  })

  onBeforeUnmount(() => {
    if (scrollEl.value) {
      scrollEl.value.removeEventListener('scroll', onScrollHandler)
      if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer)
      scrollEl.value = null
      spacer = null
    }
    window.removeEventListener('resize', ensureSpacer)
  })

  return {
    scrollEl,
    isScrolled,
    headerShort,
    updateScrollState
  }
}
