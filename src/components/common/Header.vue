<template>
  <div id="header">
    <div class="left">
      <span class="ruffy01"></span>
      <h1>hey, Ruffy!</h1>
      <p>하지 말랑 하지말고 그냥 말랑말랑해~</p>
    </div>
    <div class="right">
      <button class="lnb" @click.prevent="$emit('toggle-lnb')"><span>메뉴열기</span></button>
      <button class="calendar"><span>달력열기</span></button>
    </div>
  </div>
</template>

<script setup>
</script>
