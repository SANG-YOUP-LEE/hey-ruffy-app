<template> 
  <!--다짐 현황-->
  <div class="routine_total">
    <p>
      <span>
        <strong>{{ isFuture ? '이날의 다짐' : '오늘의 다짐' }}</strong>
        총<em class="t_on">15</em>건
      </span>
      <span>
        <template v-if="isFuture">
          미래의 다짐은 총 건만 표시됩니다.
        </template>
        <template v-else>
          <strong>미달성</strong> <em class="t_on">5</em>  
          <strong>달성완료</strong> <em class="t_on">8</em>
          <strong>흐린눈</strong> <em class="t_on">2</em>
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
