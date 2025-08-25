<template>
  <div :class="['vlist', cls, { close: !expanded }]">
    <button class="setting" @click.stop="actions.togglePopup">
      <span>다짐설정</span>
    </button>

    <div class="state_button" :class="{ check: isSelectMode }">
      <div class="done_set" v-if="periodMode==='T' && flags.canShowStatusButton">
        <button class="p_basic" @click="actions.handleStatusButtonClick">달성현황 체크하기</button>
      </div>
      <div class="walk_check" v-if="flags.hasWalkResolved">
        <button class="p_basic_white" @click="actions.openWalkPopup">산책 현황 보기</button>
      </div>
    </div>

    <div v-if="showPopup" class="setting_popup">
      <button class="close_spop" @click="actions.closePopup"><span>설정팝업닫기</span></button>
      <ul>
        <li :class="{ disabled: flags.isPaused }">
          <button class="modify" :disabled="flags.isPaused" @click="actions.onEdit">다짐 수정하기</button>
        </li>
        <li>
          <button class="lock" @click="actions.openPauseRestartConfirm">
            {{ flags.isPaused ? '다짐 다시 시작하기' : '다짐 잠시 멈추기' }}
          </button>
        </li>
        <li :class="{ disabled: flags.isPaused }">
          <button class="share" @click="actions.openShareConfirm" :disabled="flags.isPaused">다짐 공유하기</button>
        </li>
        <li :class="{ disabled: flags.isPaused }">
          <button class="del" @click="actions.openDeleteConfirm" :disabled="flags.isPaused">다짐 삭제하기</button>
        </li>
      </ul>
    </div>

    <div class="rc_inner">
      <div class="left">
        <p class="today" v-if="ui.dateText && periodMode !== 'T'">{{ ui.dateText }}</p>
        <p class="title">
          <label class="checkbox-label" v-if="isSelectMode">
            <input
              type="checkbox"
              :checked="isSelected"
              @change="e => actions?.toggleSelect?.(e.target.checked)"
            />
            <span class="checkmark"></span>
          </label>
          <span :class="ui.colorClass"></span>
          {{ ui.titleText }}
        </p>
        <p class="term" v-show="expanded"><i>{{ ui.repeatLabel }}</i> {{ ui.repeatDetail }}</p>
        <p class="se_date" v-show="expanded">{{ ui.periodText }}</p>
        <p class="alaram" v-show="expanded">{{ ui.alarmText }}</p>
        <p class="comment" v-if="ui.commentText" v-show="expanded">{{ ui.commentText }}</p>
        <div class="walk_info" v-if="flags.hasWalkResolved" v-show="expanded">
          <span class="walk_ruffy">{{ ui.ruffyName }}</span>
          <span class="walk_course">{{ ui.courseName }}</span>
          <span class="walk_goal">목표 {{ ui.goalCount }}회</span>
        </div>
      </div>
      <div class="right"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
defineProps({
  cls: { type: [Array,Object,String], default: () => [] },
  ui: { type: Object, required: true },
  flags: { type: Object, required: true },
  actions: { type: Object, required: true },
  showPopup: { type: Boolean, default: false },
  periodMode: { type: String, required: true },
  isSelectMode: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false }
})
const expanded = ref(false)
</script>
