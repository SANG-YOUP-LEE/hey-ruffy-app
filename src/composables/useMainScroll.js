// src/composables/useMainScroll.js
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

export function useMainScroll(rStore, mv) {
  const scrollEl = ref(null)
  const isScrolled = ref(false)
  const headerShort = ref(false)
  const SCROLL_HIDE = 8
  const SCROLL_SHOW = 2
  let ticking = false
  let spacer = null
  let contentEl = null
  let mo = null

  function ensureSpacer() {
    if (!contentEl) contentEl = document.querySelector('.main_scroll')
    if (!scrollEl.value || !contentEl) return
    if (!spacer) {
      spacer = document.createElement('div')
      spacer.style.cssText = 'height:1px;width:1px;pointer-events:none;opacity:0;'
      contentEl.appendChild(spacer)
    }
    const gap = scrollEl.value.scrollHeight - scrollEl.value.clientHeight
    spacer.style.height = gap <= 1 ? '3px' : '1px'
  }

  function updateScrollState() {
    if (!scrollEl.value) return
    ensureSpacer()
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
    contentEl = document.querySelector('.main_scroll')
    if (scrollEl.value) {
      scrollEl.value.addEventListener('scroll', onScrollHandler, { passive: true })
      scrollEl.value.scrollTop = 0
      ensureSpacer()
      updateScrollState()
    }
    if (contentEl) {
      mo = new MutationObserver(ensureSpacer)
      mo.observe(contentEl, { childList: true, subtree: true })
    }
    window.addEventListener('resize', ensureSpacer, { passive: true })
    nextTick(() => { ensureSpacer(); updateScrollState() })
  })

  onBeforeUnmount(() => {
    if (scrollEl.value) {
      scrollEl.value.removeEventListener('scroll', onScrollHandler)
    }
    window.removeEventListener('resize', ensureSpacer)
    if (mo) mo.disconnect()
    if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer)
    spacer = null
    contentEl = null
    scrollEl.value = null
    mo = null
  })

  return {
    scrollEl,
    isScrolled,
    headerShort,
    updateScrollState
  }
}
