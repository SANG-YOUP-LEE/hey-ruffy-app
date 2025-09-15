<template>
  <div class="carousel_wrap">
    <div
      v-for="(rt, i) in visibleRoutines"
      :key="String(rt.id||'').split('-')[0]"
      class="carousel_card"
      :style="cardStyle(i)"
      @click="onSelect(i, rt)"
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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

const index = ref(0)
const maxVisible = 7

const visibleRoutines = computed(()=>{
  const half = Math.floor(maxVisible/2)
  const start = Math.max(0, index.value-half)
  const end = Math.min(props.routines.length, index.value+half+1)
  return props.routines.slice(start,end)
})

function cardStyle(i){
  const center = index.value
  const offset = i - center
  const scale = 1 - Math.min(Math.abs(offset)*0.05,0.3)
  const translate = offset*40
  const z = 100 - Math.abs(offset)
  const opacity = Math.abs(offset)>3?0:1
  return {
    transform:`translateX(${translate}%) scale(${scale})`,
    zIndex:z,
    opacity
  }
}

function onSelect(i,rt){
  index.value = props.routines.findIndex(r=>r.id===rt.id)
}

function isToday(rt){
  const d = rt?.assignedDate?new Date(rt.assignedDate):new Date()
  const t = new Date()
  d.setHours(0,0,0,0)
  t.setHours(0,0,0,0)
  return d.getTime()===t.getTime()
}
</script>

<style scoped>
.carousel_wrap{
  position:relative;
  width:100%;
  height:100%;
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
}
.carousel_card{
  position:absolute;
  top:0;
  left:50%;
  width:80%;
  transition:transform .3s ease,opacity .3s ease;
}
</style>
