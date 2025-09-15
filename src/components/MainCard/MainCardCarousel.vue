<template>
  <div class="vcar_wrap" @wheel.prevent.stop="onWheel" @pointerdown="onPtrDown">
    <div class="vcar_stage" ref="stage">
      <div
        v-for="(rt, i) in windowItems"
        :key="String(rt.id||'').split('-')[0]"
        class="vcar_item"
        :class="{ center: winToGlobal(i)===index }"
        :style="styleFor(winToGlobal(i))"
        @click="onTap(winToGlobal(i), rt)"
      >
        <MainCard
          :routine="rt"
          :selected="rt?.status || 'notdone'"
          :isToday="periodMode==='T' && isToday(rt)"
          :assigned-date="new Date(rt?.assignedDate || periodStartRaw)"
          :layout="layout"
          :layout-variant="card"
          :period-mode="periodMode"
          :delete-targets="deleteTargets"
          :delete-mode="deleteMode"
          @delete="$emit('delete',$event)"
          @changeStatus="$emit('changeStatus',$event)"
          @edit="$emit('edit',$event)"
          @togglePause="$emit('togglePause',$event)"
          @toggleSelect="$emit('toggleSelect',$event)"
        />
      </div>
    </div>
    <div class="vcar_fade top"></div>
    <div class="vcar_fade bot"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import MainCard from '@/components/MainCard/MainCard.vue'

const props = defineProps({
  routines: { type:Array, default:()=>[] },
  layout: { type:[Object,Function], required:true },
  layoutVariant: { type:String, default:'basic' },
  periodMode: { type:String, default:'T' },
  deleteTargets: { type:[Array,String], default:null },
  deleteMode: { type:Boolean, default:false },
  periodStartRaw: { type:[String,Date,Number], default:null }
})
const emit = defineEmits(['delete','changeStatus','edit','togglePause','toggleSelect'])

const stage = ref(null)
const index = ref(0)
const cardH = ref(300)         // 더 커진 카드 기준 높이 추정
const gap = ref(170)           // 겹침 최소화(시원시원) 간격
const visibleRange = ref(2)    // 위 2, 아래 2
const topPad = ref(12)
const dragging = ref(false)
const startY = ref(0)
const lastY = ref(0)
const velocity = ref(0)
let lastT = 0

const total = computed(()=>props.routines.length)
watch(()=>props.routines, ()=>{ if(index.value>total.value-1) index.value=Math.max(0,total.value-1) }, { deep:true })

const startGlobal = computed(()=>Math.max(0, index.value - visibleRange.value))
const endGlobal = computed(()=>Math.min(total.value, index.value + visibleRange.value + 1))
const windowItems = computed(()=>props.routines.slice(startGlobal.value, endGlobal.value))
function winToGlobal(i){ return startGlobal.value + i }

function clamp(v,min,max){ return v<min?min:v>max?max:v }

function baseShift(){
  const sh = stage.value?.clientHeight || 0
  const center = sh/2
  const topTarget = topPad.value + (cardH.value/2)
  return -(center - topTarget)
}

function styleFor(i){
  const off = i - index.value
  const y = off * gap.value + baseShift()
  const s = off===0 ? 1 : (Math.abs(off)===1 ? 0.92 : 0.86)   // 더 크게, 주변만 살짝 축소
  const o = Math.abs(off)>visibleRange.value ? 0 : 1
  const z = 100 - Math.abs(off)
  return {
    transform:`translate3d(-50%, ${y}px, 0) scale(${s})`,     // 회전 제거(정렬 바로)
    zIndex:String(z),
    opacity:String(o),
    pointerEvents: off===0 ? 'auto' : 'none'
  }
}

function onWheel(e){
  if(total.value<=0) return
  const delta = e.deltaY
  if(Math.abs(delta)<2) return
  if(delta>0) index.value = clamp(index.value+1, 0, total.value-1)
  else index.value = clamp(index.value-1, 0, total.value-1)
}

function onPtrDown(e){
  dragging.value = true
  startY.value = e.clientY
  lastY.value = e.clientY
  velocity.value = 0
  lastT = performance.now()
  window.addEventListener('pointermove', onPtrMove, { passive:false })
  window.addEventListener('pointerup', onPtrUp, { passive:false, once:true })
}

function onPtrMove(e){
  if(!dragging.value) return
  e.preventDefault()
  const now = performance.now()
  const dy = e.clientY - lastY.value
  const dt = Math.max(1, now - lastT)
  velocity.value = 0.9*velocity.value + 0.1*(dy/dt)
  lastY.value = e.clientY
  lastT = now
  const threshold = gap.value*0.42
  const moved = e.clientY - startY.value
  if(moved <= -threshold){ index.value = clamp(index.value+1, 0, total.value-1); startY.value = e.clientY }
  else if(moved >= threshold){ index.value = clamp(index.value-1, 0, total.value-1); startY.value = e.clientY }
}

function onPtrUp(){
  dragging.value = false
  const dir = velocity.value>0.002 ? -1 : velocity.value<-0.002 ? 1 : 0
  if(dir!==0) index.value = clamp(index.value+dir, 0, total.value-1)
  window.removeEventListener('pointermove', onPtrMove)
}

function onTap(i){ if(i!==index.value) index.value = clamp(i, 0, total.value-1) }

function isToday(rt){
  const d = rt?.assignedDate?new Date(rt.assignedDate):new Date()
  const t = new Date()
  d.setHours(0,0,0,0); t.setHours(0,0,0,0)
  return d.getTime()===t.getTime()
}

function measure(){
  const first = stage.value?.querySelector('.vcar_item')
  if(first){
    const r = first.getBoundingClientRect()
    cardH.value = Math.max(220, r.height || cardH.value)
    gap.value = Math.round(cardH.value*0.56)  // 카드가 크게 보이면서 살짝 겹침
  }
}

onMounted(()=>{
  measure()
  index.value = Math.min(2, Math.max(0, total.value-1))
  window.addEventListener('resize', measure)
})
onBeforeUnmount(()=>{
  window.removeEventListener('resize', measure)
})
</script>

<style scoped>
.vcar_wrap{position:relative; width:100%; height:100%; overflow:hidden; touch-action:none}
.vcar_stage{position:relative; width:100%; height:100%}
.vcar_item{position:absolute; top:50%; left:50%; width:96%; transition:transform .22s cubic-bezier(.2,.8,.2,1), opacity .18s ease}
.vcar_item.center{transition:transform .2s cubic-bezier(.16,.84,.2,1), opacity .18s ease}
.vcar_fade{position:absolute; left:0; right:0; height:72px; pointer-events:none; z-index:200}
.vcar_fade.top{top:0; background:linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))}
.vcar_fade.bot{bottom:0; background:linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))}
</style>
