<template>
  <div class="routine_total">
    <p>
      <span>
        <strong>{{ isFuture ? '이날의 다짐' : '오늘의 다짐' }}</strong>
        <em class="t_on">{{ displayTotal }}</em>
      </span>
      <span>
        <template v-if="isFuture">
          미래에도 다짐 부자시네요!
        </template>
        <template v-else>
          <a
            href="#none"
            class="not_done"
            :class="{ uline: selectedRadio === 'notdone' }"
            @click.prevent="selectedRadio = 'notdone'"
          >
            <strong>미달성</strong> <em class="t_on">{{ displayCounts.notdone }}</em>
          </a>
          <a
            href="#none"
            class="done"
            :class="{ uline: selectedRadio === 'done' }"
            @click.prevent="selectedRadio = 'done'"
          >
            <strong>달성완료</strong> <em class="t_on">{{ displayCounts.done }}</em>
          </a>
          <a
            href="#none"
            class="fail_done"
            :class="{ uline: selectedRadio === 'faildone' }"
            @click.prevent="selectedRadio = 'faildone'"
          >
            <strong>달성실패</strong> <em class="t_on">{{ displayCounts.faildone }}</em>
          </a>
          <a
            href="#none"
            class="ignored"
            :class="{ uline: selectedRadio === 'ignored' }"
            @click.prevent="selectedRadio = 'ignored'"
          >
            <strong>흐린눈</strong> <em class="t_on">{{ displayCounts.ignored }}</em>
          </a>
        </template>
      </span>
    </p>
  </div>

  <div class="today_tools">
    <div class="today">
      <p>
        <a 
          href="#none" 
          class="prev" 
          :class="{ hidden: isToday }" 
          @click.prevent="$emit('requestPrev')"
        ><span>전날</span></a>
        {{ formattedDate }}
        <a href="#none" class="next" @click.prevent="$emit('requestNext')"><span>다음날</span></a>
      </p>
    </div>
    <div class="tools">
      <a href="#none" class="r_card on"><span>다짐카드보기</span></a>
      <a href="#none" class="r_block"><span>다짐블록보기</span></a>
      <a href="#none" class="r_list"><span>다짐목록보기</span></a>
      <a href="#none" class="r_select"><span>다짐선택</span></a>
      <a href="#none" class="r_del"><span>다짐삭제</span></a>
      <a href="#none" class="r_move"><span>다짐이동</span></a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const emit = defineEmits(['update:modelValue','changeFilter','showWeekly','requestPrev','requestNext'])
const props = defineProps({
  isFuture: { type: Boolean, default: false },
  modelValue: { type: [String, null], default: 'notdone' },
  counts: { type: Object, default: null },
  totalCount: { type: Number, default: null },
  selectedDate: { type: Date, required: true }
})

const displayCounts = computed(() => props.counts ?? { notdone:5, done:8, faildone:8, ignored:2 })
const displayTotal = computed(() => props.totalCount ?? 15)

const selectedRadio = computed({
  get: () => props.modelValue,
  set: (v) => { emit('update:modelValue', v); emit('changeFilter', v) }
})

const isToday = computed(() => {
  const a = new Date(props.selectedDate); a.setHours(0,0,0,0)
  const b = new Date(); b.setHours(0,0,0,0)
  return a.getTime() === b.getTime()
})

const formattedDate = computed(() => {
  const d = props.selectedDate
  const dayNames = ['일','월','화','수','목','금','토']
  return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}.${dayNames[d.getDay()]}`
})
</script>
