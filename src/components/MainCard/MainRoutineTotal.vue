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
