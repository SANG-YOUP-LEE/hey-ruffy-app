<template>
  <div class="done_group">
    <div v-if="selected === 'notdone'" class="not_done">달성전</div>
    <div v-if="selected === 'done'" class="done">달성후</div>
    <div v-if="selected === 'ignored'" class="ignored">흐린눈</div>
  </div>
</template>

<script setup>
defineProps({
  selected: String
})
</script>
