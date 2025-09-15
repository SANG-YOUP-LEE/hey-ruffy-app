<template>
  <div :class="rootClass">
    <label class="checkbox-label" v-if="isSelectMode && variant !== 'list'">
      <input type="checkbox" :checked="isSelected" @change="e => $emit('select', e.target.checked)" />
      <span class="checkmark"></span>
    </label>

    <button class="setting" @click.stop="$emit('toggle-open', cardId)">
      <span>다짐설정</span>
    </button>

    <div
      v-if="variant !== 'basic'"
      class="state_button"
      :class="{ check: isSelectMode, twice: flags.hasTwoButtons }"
    >
      <div class="done_set" v-if="flags.canShowStatusButton && (periodMode === 'T' || variant === 'list')">
        <button class="p_basic" @click="$emit('status', cardId)">달성현황 체크하기</button>
      </div>
      <div class="walk_check" v-if="flags.hasWalkResolved">
        <button class="p_basic_white" @click="$emit('walk', cardId)">산책 현황 보기</button>
      </div>
    </div>

    <div v-if="isOpen" class="setting_popup">
      <button class="close_spop" @click="$emit('toggle-open', null)"><span>설정팝업닫기</span></button>
      <ul>
        <li :class="{ disabled: flags.isPaused }">
          <button class="modify" :disabled="flags.isPaused" @click="$emit('edit', cardId)">다짐 수정하기</button>
        </li>
        <li>
          <button class="lock" @click="$emit('pause-restart', cardId)">
            {{ flags.isPaused ? '다짐 다시 시작하기' : '다짐 잠시 멈추기' }}
          </button>
        </li>
        <li :class="{ disabled: flags.isPaused }">
          <button class="share" :disabled="flags.isPaused" @click="$emit('share', cardId)">다짐 공유하기</button>
        </li>
        <li :class="{ disabled: flags.isPaused }">
          <button class="del" :disabled="flags.isPaused" @click="$emit('delete', cardId)">다짐 삭제하기</button>
        </li>
      </ul>
    </div>

    <div class="rc_inner">
      <div class="left">
        <p class="today" v-if="ui.dateText && periodMode !== 'T'">{{ ui.dateText }}</p>
        <p class="title">
          <label class="checkbox-label" v-if="isSelectMode && variant === 'list'">
            <input type="checkbox" :checked="isSelected" @change="e => $emit('select', e.target.checked)" />
            <span class="checkmark"></span>
          </label>
          <span :class="ui.colorClass"></span>
          {{ ui.titleText }}
        </p>
        <p class="term" v-show="showDetails"><i>{{ ui.repeatLabel }}</i> {{ ui.repeatDetail }}</p>
        <p class="se_date" v-show="showDetails">{{ ui.periodText }}</p>
        <p class="alaram" v-show="showDetails">{{ ui.alarmText }}</p>
        <p class="comment" v-if="ui.commentText" v-show="showDetails">{{ ui.commentText }}</p>
        <div class="walk_info" v-if="flags.hasWalkResolved" v-show="showDetails">
          <span class="walk_ruffy">{{ ui.ruffyName }}</span>
          <span class="walk_course">{{ ui.courseName }}</span>
          <span class="walk_goal">목표 {{ ui.goalCount }}회</span>
        </div>
      </div>

      <div
        v-if="variant === 'basic'"
        :class="['state_button', { twice: flags.hasTwoButtons }]"
      >
        <div class="done_set" v-if="periodMode==='T' && flags.canShowStatusButton">
          <button class="p_basic" @click="$emit('status', cardId)">달성현황 체크하기</button>
        </div>
        <div class="walk_check" v-if="flags.hasWalkResolved">
          <button class="p_basic_white" @click="$emit('walk', cardId)">산책 현황 보기</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'basic' },
  cls: { type: [Array, Object, String], default: () => [] },
  ui: { type: Object, required: true },
  flags: { type: Object, required: true },
  periodMode: { type: String, required: true },
  isSelectMode: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
  cardId: { type: [String, Number], required: true },
  openedCardId: { type: [String, Number, null], default: null }
})

const emit = defineEmits(['toggle-open','delete','edit','pause-restart','share','select','status','walk'])

const rootClass = computed(() => {
  if (props.variant === 'list') return ['vlist', props.cls]
  return ['vbasic', props.cls]
})

const isOpen = computed(() => props.openedCardId === props.cardId)
const showDetails = computed(() => props.variant === 'basic')
</script>
