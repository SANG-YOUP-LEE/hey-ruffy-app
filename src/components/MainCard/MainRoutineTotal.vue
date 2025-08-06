<template> 
  <!--다짐 현황-->
  <div class="routine_total">
    <p>
      <span>
        <strong>{{ isFuture ? '이날의 다짐' : '오늘의 다짐' }}</strong>
        <template v-if="!isFuture">
          총<em>15</em>건 
        </template>
      </span>
      <span>
        <template v-if="isFuture">
          미래의 다짐은 편집할 수 없어요.
        </template>
        <template v-else>
          <strong>미달성</strong> <em>5</em>  
          <strong>달성완료</strong> <em>10</em>
        </template>
      </span>
    </p>
  </div>
</template>

<script setup>
defineProps({
  isFuture: Boolean
})
</script>
