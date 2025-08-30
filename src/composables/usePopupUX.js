import { ref } from 'vue'

export function usePopupUX(emit) {
  const scrollY = ref(0)

  const preventTouchMove = e => {
    if (!e.target.closest('.popup_wrap')) e.preventDefault()
  }

  const lockScroll = () => {
    scrollY.value = window.scrollY
    document.documentElement.classList.add('no-scroll')
    document.body.classList.add('no-scroll')
    document.body.style.top = `-${scrollY.value}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    document.body.style.position = 'fixed'
    window.addEventListener('touchmove', preventTouchMove, { passive: false })
  }

  const unlockScroll = () => {
    document.documentElement.classList.remove('no-scroll')
    document.body.classList.remove('no-scroll')
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    document.body.style.overflow = ''
    window.removeEventListener('touchmove', preventTouchMove)
    window.scrollTo(0, scrollY.value)
  }

  const closePopup = () => {
    unlockScroll()
    emit('close')
  }

  return { lockScroll, unlockScroll, closePopup }
}