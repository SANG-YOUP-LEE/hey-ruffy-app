<template>
  <div :class="['routine_list', cls]">
    <div class="rl_head">
      <p class="title">{{ ui.titleText }}</p>
      <div class="actions">
        <button class="p_white sm" @click="expanded = !expanded">{{ expanded ? '접기' : '자세히' }}</button>
        <button class="setting sm" @click.stop="actions.togglePopup"><span>설정</span></button>
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

    <div class="rl_body" v-if="expanded">
      <p class="term"><i>{{ ui.repeatLabel }}</i> {{ ui.repeatDetail }}</p>
      <p class="se_date">{{ ui.periodText }}</p>
      <p class="alaram">{{ ui.alarmText }}</p>
      <p class="comment" v-if="ui.commentText">{{ ui.commentText }}</p>

      <div class="inline_actions">
        <button v-if="flags.canShowStatusButton" class="p_white sm" @click="actions.openStatusPopup">현황</button>
        <button v-if="flags.hasWalkResolved" class="p_white sm" @click="actions.openWalkPopup">산책</button>
      </div>
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
  showPopup: { type: Boolean, default: false }
})
const expanded = ref(false)
</script>
