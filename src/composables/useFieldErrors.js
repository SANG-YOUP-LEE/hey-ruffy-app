import { ref } from 'vue'

export function useFieldErrors(form) {
  const refs = {}
  const timers = {}

  const register = (key) => {
    const r = ref(null)
    refs[key] = r
    return r
    }

  const autoHideErrors = (ms = 2500) => {
    const keys = Object.keys(form.fieldErrors || {})
    keys.forEach(k => {
      if (timers[k]) clearTimeout(timers[k])
      timers[k] = setTimeout(() => {
        const fe = { ...form.fieldErrors }
        delete fe[k]
        form.fieldErrors = fe
      }, ms)
    })
  }

  const showFirstError = () => {
    const first = Object.keys(form.fieldErrors || {})[0]
    const el = first ? refs[first]?.value : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const clearTimers = () => {
    Object.values(timers).forEach(t => t && clearTimeout(t))
  }

  return { register, autoHideErrors, showFirstError, clearTimers }
}