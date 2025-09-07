import { defineStore } from 'pinia'

export const useModalStore = defineStore('modal', {
  state: () => ({
    open: false,
    title: '',
    message: '',
    okText: '확인',
    cancelText: '취소',
    _resolver: null,
  }),
  actions: {
    confirm(opts = {}) {
      this.title = opts.title || '알림'
      this.message = opts.message || ''
      this.okText = opts.okText || '확인'
      this.cancelText = opts.cancelText || '취소'
      this.open = true
      return new Promise((resolve) => { this._resolver = resolve })
    },
    ok() { this.open = false; if (this._resolver) this._resolver(true); this._resolver = null },
    cancel() { this.open = false; if (this._resolver) this._resolver(false); this._resolver = null },
  },
})