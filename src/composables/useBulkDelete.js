// src/composables/useBulkDelete.js
export function useBulkDelete(rStore, mv) {
  const s = mv
  const open = () => { s.showBulkDeleteConfirm = true; document.body.classList.add('no-scroll') }
  const close = () => { s.showBulkDeleteConfirm = false; document.body.classList.remove('no-scroll') }
  const toggle = (v, force=false) => {
    const next = !!v
    if (rStore.deleteMode && !next && !force && rStore.deleteTargets.length>0) { open(); return }
    rStore.setDeleteMode(next)
  }
  const confirm = async (onDelete) => {
    const ids = rStore.deleteTargets.slice()
    close()
    await onDelete(ids)
  }
  return { open, close, toggle, confirm }
}