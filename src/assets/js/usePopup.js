// src/assets/js/usePopup.js
import { ref, watch } from 'vue'

const activePopupId = ref(null)
const isSettingOpen = ref(false)
const isPaused = ref(false)

watch(activePopupId, (newVal) => {
  const body = document.body
  if (newVal) {
    body.classList.add('popup-open')
  } else {
    body.classList.remove('popup-open')
  }
})

function openPopup(id) {
  activePopupId.value = id
  isSettingOpen.value = false
}

function closePopup() {
  activePopupId.value = null
  isSettingOpen.value = false
}

function pauseCommitment() {
  isPaused.value = true
  closePopup()
}

function resumeCommitment() {
  isPaused.value = false
}

export function usePopup() {
  return {
    activePopupId,
    isSettingOpen,
    isPaused,
    openPopup,
    closePopup,
    pauseCommitment,
    resumeCommitment,
  }
}
