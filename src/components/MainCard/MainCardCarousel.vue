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
          :layout-variant="layoutVariant"
          :period-mode="periodMode"
          :delete-targets="deleteTargets"
          :delete-mode="deleteMode"
          @delete="$emit('delete',$event)"
          @changeStatus="$emit('changeStatus',$event)"
          @edit="$emit('edit',$event)"
          @togglePause="$emit('togglePause',$event)"
          @toggleSelect="$emit('toggleSelect',$event)"
        />
        <div class="vcar_notch"></div>
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
const cardH = ref(172)
const gap = ref(68)
const visibleRange = ref(3)
const dragging = ref(false)
const startY = ref(0)
const lastY = ref(0)
const velocity = ref(0)
let rafId = 0
let lastT = 0

const total = computed(()=>props.routines.length)
watch(()=>props.routines, ()=>{ if(index.value>total.value-1) index.value=Math.max(0,total.value-1) }, { deep:true })

const startGlobal = computed(()=>Math.max(0, index.value - visibleRange.value))
const endGlobal = computed(()=>Math.min(total.value, index.value + visibleRange.value + 1))
const windowItems = computed(()=>props.routines.slice(startGlobal.value, endGlobal.value))
function winToGlobal(i){ return startGlobal.value + i }

function clamp(v,min,max){ return v<min?min:v>max?max:v }

function styleFor(i){
  const off = i - index.value
  const y = off * gap.value
  const s = 1 - Math.min(Math.abs(off)*0.06, 0.24)
  const o = Math.abs(off)>visibleRange.value ? 0 : 1 - Math.max(0, (Math.abs(off)-0.2)/ (visibleRange.value))
  const z = 100 - Math.abs(off)
  const rot = off* -1.2
  return { transform:`translate3d(-50%, ${y}px, 0) scale(${s}) rotate(${rot}deg)`, zIndex:String(z), opacity:String(o), pointerEvents: off===0 ? 'auto' : 'none' }
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
  const threshold = gap.value*0.45
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

function onTap(i, rt){
  if(i!==index.value){ index.value = clamp(i, 0, total.value-1); return }
}

function isToday(rt){
  const d = rt?.assignedDate?new Date(rt.assignedDate):new Date()
  const t = new Date()
  d.setHours(0,0,0,0)
  t.setHours(0,0,0,0)
  return d.getTime()===t.getTime()
}

function measure(){
  if(!stage.value) return
  const first = stage.value.querySelector('.vcar_item')
  if(first){
    const r = first.getBoundingClientRect()
    cardH.value = Math.max(140, r.height || cardH.value)
    gap.value = Math.round(cardH.value*0.42)
  }
}

onMounted(()=>{
  measure()
  rafId = requestAnimationFrame(function loop(){ rafId=requestAnimationFrame(loop) })
  window.addEventListener('resize', measure)
})
onBeforeUnmount(()=>{
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', measure)
})
</script>

<style scoped>
.vcar_wrap{position:relative; width:100%; height:100%; overflow:hidden; touch-action:none}
.vcar_stage{position:relative; width:100%; height:100%}
.vcar_item{position:absolute; top:50%; left:50%; width:88%; transition:transform .24s cubic-bezier(.2,.8,.2,1), opacity .24s ease}
.vcar_item.center{transition:transform .22s cubic-bezier(.16,.84,.2,1), opacity .22s ease}
.vcar_notch{position:absolute; left:0; right:0; bottom:-10px; height:20px; pointer-events:none; background:
 radial-gradient(60px 14px at 50% 0,#fff 60%,transparent 61%) center bottom no-repeat}
.vcar_fade{position:absolute; left:0; right:0; height:80px; pointer-events:none; z-index:200}
.vcar_fade.top{top:0; background:linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))}
.vcar_fade.bot{bottom:0; background:linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))}
</style>
