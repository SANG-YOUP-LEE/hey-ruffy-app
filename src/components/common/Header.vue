<template>
  <div id="header">
    <div class="left">
      <a href="#none" @click.prevent="$emit('toggle-lnb')">lnb</a>
    </div>
    <div class="title">
      <h1>hey, Ruffy!</h1>
      <p>하지 말랑 하지말고 그냥 말랑말랑해~</p>
    </div>
    <div class="right"></div>
  </div>
</template>
