<template> 
  <!--다짐 현황-->
  <div class="routine_total">
    <p>
      <span>
        <strong>{{ isFuture ? '이날의 다짐' : '오늘의 다짐' }}</strong>
        총<em class="t_on">15</em>건
        <template v-if="!isFuture"> 중</template>
      </span>
      <span>
        <template v-if="isFuture">
          미래에도 다짐 부자시네요!
        </template>
        <template v-else>
          <strong>미달성</strong> <em class="t_on">5</em>  
          <strong>달성완료</strong> <em class="t_on">8</em>
          <strong>흐린눈</strong> <em class="t_on">2</em>
        </template>
      </span>
    </p>

    <p>
      <span></span>
      <span>
        <label class="custom-radio">
          <input 
            type="radio" 
           />
          <span class="circle"></span>
        </label>
        달성 전
        
        <label class="custom-radio">
          <input 
            type="radio" 
           />
          <span class="circle"></span>
        </label>
        달성 완료
        
        <label class="custom-radio">
          <input 
            type="radio" 
           />
          <span class="circle"></span>
        </label>
        흐린 눈
      </span>
    </p>
  </div>
</template>


<script setup>
import { ref } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue' // 경로 확인 필요

defineProps({
  isFuture: Boolean
})

const filterNotDone = ref(true)
const filterDone = ref(false)
const filterIgnored = ref(false)
</script>
