// src/stores/mainView.js
import { defineStore } from 'pinia'
import { useRoutinesStore } from '@/stores/routines'
import { isActive as isActiveRule, isDue } from '@/utils/recurrence'

function dateKey(date, tz = 'Asia/Seoul') { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date) }
function getYMDFromAny(v){ if(!v) return null; if(typeof v==='string') return v.slice(0,10); if(v instanceof Date) return dateKey(v); if(typeof v.toDate==='function') return dateKey(v.toDate()); return null }
function startOfDay(d){ const nd=new Date(d); nd.setHours(0,0,0,0); return nd }
function endOfDay(d){ const nd=new Date(d); nd.setHours(23,59,59,999); return nd }
function startOfWeekSun(d){ const nd=startOfDay(d); nd.setDate(nd.getDate()-nd.getDay()); return nd }
function endOfWeekSun(d){ const s=startOfWeekSun(d); const nd=new Date(s); nd.setDate(s.getDate()+6); nd.setHours(23,59,59,999); return nd }
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d){ return endOfDay(new Date(d.getFullYear(), d.getMonth()+1, 0)) }
function addDays(d, days){ const nd=new Date(d); nd.setDate(nd.getDate()+days); nd.setHours(0,0,0,0); return nd }
function addMonths(d, months){ const nd=new Date(d); nd.setMonth(nd.getMonth()+months); nd.setHours(0,0,0,0); return nd }
function isActive(r, date){ const ymd=dateKey(date); const startISO=r.start||getYMDFromAny(r.startDate||r.period?.start); const endISO=r.end||getYMDFromAny(r.endDate||r.period?.end); const rule=r.rule||{freq:'daily',interval:1,anchor:startISO}; const anchor=rule.anchor||startISO; return isActiveRule(ymd,startISO,endISO)&&isDue(ymd,rule,anchor) }
function isActiveOnAnyDay(r,s,e){ const cur=new Date(s); cur.setHours(0,0,0,0); const last=new Date(e); last.setHours(0,0,0,0); while(cur<=last){ if(isActive(r,cur)) return true; cur.setDate(cur.getDate()+1); cur.setHours(0,0,0,0) } return false }
function lastActiveDateInRange(r,s,e){ const cur=new Date(e); cur.setHours(0,0,0,0); const first=new Date(s); first.setHours(0,0,0,0); while(cur>=first){ if(isActive(r,cur)) return new Date(cur); cur.setDate(cur.getDate()-1); cur.setHours(0,0,0,0) } return null }
function getStatus(r){ return r?.status||'notdone' }
function toMs(v){ if(!v) return 0; if(v instanceof Date) return v.getTime(); if(typeof v?.toDate==='function'){ const d=v.toDate(); return d instanceof Date? d.getTime():0 } if(typeof v==='number') return v; if(typeof v==='string'){ const d=new Date(v); return isNaN(d)?0:d.getTime() } return 0 }

export const useMainViewStore = defineStore('mainView', {
  state: () => ({
    isLoading: true,
    hasFetched: false,
    isAddRoutineOpen: false,
    showLnb: false,
    selectedDate: new Date(),
    isFutureDate: false,
    selectedView: 'card',
    editingRoutine: null,
    showBulkDeleteConfirm: false,
    isScrolled: false,
    headerShort: false
  }),
  getters: {
    periodStartRaw(state){
      const r = useRoutinesStore()
      if (r.selectedPeriod==='W') return startOfWeekSun(state.selectedDate)
      if (r.selectedPeriod==='M') return startOfMonth(state.selectedDate)
      return startOfDay(state.selectedDate)
    },
    periodEnd(state){
      const r = useRoutinesStore()
      if (r.selectedPeriod==='W') return endOfWeekSun(state.selectedDate)
      if (r.selectedPeriod==='M') return endOfMonth(state.selectedDate)
      return endOfDay(state.selectedDate)
    },
    occurrencesActiveDay(state){
      const r = useRoutinesStore()
      const items = Array.isArray(r.items) ? r.items : []
      const d = startOfDay(state.selectedDate)
      const key = dateKey(d)
      return items.filter(x => !x.isPaused && isActive(x, d))
        .map(x => ({ ...x, status: x?.statuses?.[key] ?? 'notdone', assignedDate: new Date(d), id: `${x.id}-${key}` }))
    },
    occurrencesPausedDay(state){
      const r = useRoutinesStore()
      const items = Array.isArray(r.items) ? r.items : []
      const d = startOfDay(state.selectedDate)
      const key = dateKey(d)
      return items.filter(x => !!x.isPaused && isActive(x, d))
        .map(x => ({ ...x, status: x?.statuses?.[key] ?? 'notdone', assignedDate: new Date(d), id: `${x.id}-paused-${key}` }))
    },
    occurrencesActivePeriod(){
      const r = useRoutinesStore()
      const items = Array.isArray(r.items) ? r.items : []
      const s = this.periodStartRaw, e = this.periodEnd
      return items.filter(x => !x.isPaused && isActiveOnAnyDay(x, s, e))
        .map(x => { const d = lastActiveDateInRange(x, s, e) || s; const k = dateKey(d); return { ...x, status: x?.statuses?.[k] ?? 'notdone', assignedDate: new Date(d), id: x.id } })
    },
    occurrencesPausedPeriod(){
      const r = useRoutinesStore()
      const items = Array.isArray(r.items) ? r.items : []
      const s = this.periodStartRaw, e = this.periodEnd
      return items.filter(x => !!x.isPaused && isActiveOnAnyDay(x, s, e))
        .map(x => { const d = lastActiveDateInRange(x, s, e) || s; const k = dateKey(d); return { ...x, status: x?.statuses?.[k] ?? 'notdone', assignedDate: new Date(d), id: x.id } })
    },
    headerCounts(){
      const r = useRoutinesStore()
      const src = r.selectedPeriod==='T' ? [...(this.occurrencesActiveDay||[])] : [...(this.occurrencesActivePeriod||[]), ...(this.occurrencesPausedPeriod||[])]
      const c = { notdone:0, done:0, faildone:0, ignored:0 }
      for (const x of src){
        const s = getStatus(x)
        if (s==='done') c.done++
        else if (s==='faildone' || s==='fail') c.faildone++
        else if (s==='ignored' || s==='skip') c.ignored++
        else c.notdone++
      }
      return c
    },
    headerTotal(){
      const r = useRoutinesStore()
      return r.selectedPeriod==='T'
        ? (this.occurrencesActiveDay||[]).length
        : (this.occurrencesActivePeriod||[]).length + (this.occurrencesPausedPeriod||[]).length
    },
    displayedRoutines(){
      const r = useRoutinesStore()
      const base = r.selectedPeriod==='T'
        ? [...(this.occurrencesActiveDay||[]), ...(this.occurrencesPausedDay||[])]
        : [...(this.occurrencesActivePeriod||[]), ...(this.occurrencesPausedPeriod||[])]
      const filtered = base.filter(x => getStatus(x) === r.selectedFilter)
      const arr = filtered.slice()
      arr.sort((a,b)=>{
        if (r.selectedPeriod==='T') return toMs(b.createdAt) - toMs(a.createdAt)
        const da = toMs(a.assignedDate), db = toMs(b.assignedDate)
        if (da !== db) return da - db
        return toMs(b.createdAt) - toMs(a.createdAt)
      })
      return arr
    },
    dateKey: () => dateKey,
    addDays: () => addDays,
    addMonths: () => addMonths,
    startOfDay: () => startOfDay
  },
  actions: {
    setLoading(v){ this.isLoading = !!v },
    setFetched(v){ this.hasFetched = !!v },
    setAddRoutineOpen(v){ this.isAddRoutineOpen = !!v },
    setShowLnb(v){ this.showLnb = !!v },
    setSelectedDate(d){ this.selectedDate = d },
    setFutureDate(v){ this.isFutureDate = !!v },
    setSelectedView(v){ this.selectedView = v },
    setEditingRoutine(r){ this.editingRoutine = r },
    setBulkDeleteConfirm(v){ this.showBulkDeleteConfirm = !!v },
    setScrolled(v){ this.isScrolled = !!v },
    setHeaderShort(v){ this.headerShort = !!v }
  }
})