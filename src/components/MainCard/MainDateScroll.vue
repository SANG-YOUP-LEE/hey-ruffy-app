<template>
  <!--상단 날짜 휠-->
  <div class="date_scroll">
    <div class="date_group">
      <span
        v-for="(date, index) in dateList"
        :key="index"
        :class="{ on: selectedIndex === index }"
        @click="selectDate(index)"
      >
        <i>{{ getDayLabel(date) }}</i>{{ date.getDate() }}
      </span>
    </div>
  </div>
  <!--//상단 날짜 휠-->
</template>
