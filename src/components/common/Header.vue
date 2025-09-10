<template>
  <div id="header">
    <div class="h1">
      <div class="left">
        <button class="lnb" @click.prevent="$emit('toggle-lnb')"><span>메뉴열기</span></button>
      </div>
      <div class="title">
        <h1>hey, Ruffy!</h1>
        <p>하지 말랑 하지말고 그냥 말랑말랑해~</p>
      </div>
      <div class="right">
        <button class="calendar"><span>달력열기</span></button>
      </div>
    </div>
    <div class="ruffys_item">
      <span class="ruffy01"></span>
      <span class="ruffy02"></span>
      <span class="ruffy03"></span>
      <span class="ruffy04"></span>
    </div>
  </div>
</template>

<script setup>
</script>
