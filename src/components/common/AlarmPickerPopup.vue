<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>알람 시간 설정</h2>
      </div>

      <div class="title date light">
        <span>오전/오후</span><span>시</span><span>분</span>
      </div>

      <div class="popup_body picker_group">
        <VueScrollPicker
          :key="pickerKey + '-ampm'"
          v-model="localValue.ampm"
          :options="ampmOptions"
          :drag-sensitivity="0.5"
          :touch-sensitivity="1"
          :scroll-sensitivity="1"
        />

        <VueScrollPicker
          :key="pickerKey + '-h'"
          v-model="selectedHourId"
          :options="hourLoopOptions"
          :drag-sensitivity="1.4"
          :touch-sensitivity="1.4"
          :scroll-sensitivity="0.7"
        >
          <template #default="{ option }">
            <div class="wheel_item"><span>{{ option.name }}</span></div>
          </template>
        </VueScrollPicker>

        <VueScrollPicker
          :key="pickerKey + '-m'"
          v-model="selectedMinuteId"
          :options="minuteLoopOptions"
          :drag-sensitivity="1.4"
          :touch-sensitivity="1.4"
          :scroll-sensitivity="0.5"
        >
          <template #default="{ option }">
            <div class="wheel_item"><span>{{ option.name }}</span></div>
          </template>
        </VueScrollPicker>
      </div>

      <div class="popup_btm">
        <button @click="confirmSelection" class="p_basic">확인</button>
        <button @click="$emit('close')" class="p_white">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'

const preventScroll = (e) => { e.preventDefault() }
const lockBodyScroll = () => {
  document.body.style.overflow = 'hidden'
  document.body.addEventListener('touchmove', preventScroll, { passive: false })
}
const unlockBodyScroll = () => {
  document.body.style.overflow = ''
  document.body.removeEventListener('touchmove', preventScroll)
}
onMounted(lockBodyScroll)
onBeforeUnmount(unlockBodyScroll)

const DISPLAY_DEFAULT = { ampm: '오전', hour: '10', minute: '00' }

const props = defineProps({
  modelValue: { type: Object, default: () => ({ ampm: null, hour: null, minute: null }) }
})
const emit = defineEmits(['update:modelValue','close'])

const pad2 = (v) => String(v ?? '').padStart(2, '0')
const toKoAMPM = (v) => (v === 'AM' ? '오전' : v === 'PM' ? '오후' : (v || '오전'))
const normalize = (v) => ({
  ampm: toKoAMPM(v?.ampm ?? DISPLAY_DEFAULT.ampm),
  hour: pad2(v?.hour ?? DISPLAY_DEFAULT.hour),
  minute: pad2(v?.minute ?? DISPLAY_DEFAULT.minute)
})

const base = normalize(props.modelValue)
const localValue = ref({ ampm: base.ampm })
const pickerKey = ref(0)

const ampmOptions = ['오전', '오후']

const LOOP = 15
const H_SIZE = 12
const M_SIZE = 60

const hoursBase = Array.from({ length: H_SIZE }, (_, i) => ({ name: pad2(i + 1), logical: i + 1 }))
const minutesBase = Array.from({ length: M_SIZE }, (_, i) => ({ name: pad2(i), logical: i }))

const hourLoopOptions = computed(() => {
  const out = []
  let id = 0
  for (let k = 0; k < LOOP; k++) {
    for (let i = 0; i < H_SIZE; i++) {
      out.push({ name: hoursBase[i].name, value: id, logical: hoursBase[i].logical })
      id++
    }
  }
  return out
})

const minuteLoopOptions = computed(() => {
  const out = []
  let id = 0
  for (let k = 0; k < LOOP; k++) {
    for (let i = 0; i < M_SIZE; i++) {
      out.push({ name: minutesBase[i].name, value: id, logical: minutesBase[i].logical })
      id++
    }
  }
  return out
})

const centerBlock = Math.floor(LOOP / 2)
const centerHourId = (logical) => centerBlock * H_SIZE + ((Number(logical) - 1 + H_SIZE) % H_SIZE)
const centerMinuteId = (logical) => centerBlock * M_SIZE + ((Number(logical) + M_SIZE) % M_SIZE)

const selectedHourId = ref(centerHourId(base.hour))
const selectedMinuteId = ref(centerMinuteId(base.minute))

watch(() => props.modelValue, async (v) => {
  const n = normalize(v)
  localValue.value.ampm = n.ampm
  selectedHourId.value = centerHourId(n.hour)
  selectedMinuteId.value = centerMinuteId(n.minute)
  await nextTick()
  pickerKey.value++
}, { immediate: true, deep: true })

const recenterHourIfEdge = () => {
  const total = LOOP * H_SIZE
  const edge = H_SIZE * 2
  if (selectedHourId.value < edge || selectedHourId.value > total - edge) {
    const logical = (selectedHourId.value % H_SIZE) + 1
    selectedHourId.value = centerHourId(logical)
  }
}
const recenterMinuteIfEdge = () => {
  const total = LOOP * M_SIZE
  const edge = M_SIZE * 2
  if (selectedMinuteId.value < edge || selectedMinuteId.value > total - edge) {
    const logical = (selectedMinuteId.value % M_SIZE)
    selectedMinuteId.value = centerMinuteId(logical)
  }
}

watch(selectedHourId, () => { recenterHourIfEdge() })
watch(selectedMinuteId, () => { recenterMinuteIfEdge() })

const confirmSelection = () => {
  const hourLogical = (selectedHourId.value % H_SIZE) + 1
  const minuteLogical = (selectedMinuteId.value % M_SIZE)
  emit('update:modelValue', {
    ampm: localValue.value.ampm || DISPLAY_DEFAULT.ampm,
    hour: pad2(hourLogical),
    minute: pad2(minuteLogical)
  })
  emit('close')
}
</script>
