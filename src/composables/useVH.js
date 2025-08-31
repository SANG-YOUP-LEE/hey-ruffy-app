// src/composables/useVH.js
export function useVH() {
  let onResize = null
  const setVh = () => {
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }
  const initVH = () => {
    if (onResize) return
    setVh()
    onResize = () => setVh()
    window.addEventListener('resize', onResize, { passive: true })
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', onResize, { passive: true })
  }
  const disposeVH = () => {
    if (!onResize) return
    window.removeEventListener('resize', onResize)
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
    onResize = null
  }
  return { initVH, disposeVH, setVh }
}