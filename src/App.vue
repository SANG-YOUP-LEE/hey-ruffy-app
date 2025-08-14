<template>
  <TopLoader />
  <RouterView />
</template>

<script setup>
import TopLoader from '@/components/TopLoader.vue'
import { RouterView } from 'vue-router'
</script>
