<template>
  <div class="dashboard-page">
    <CommonsTheLoading />
  </div>
</template>

<script setup lang="ts">
// Layout configuration
definePageMeta({
  layout: 'dashboard'
})

// Meta tags
useHead({
  title: 'Financiero - Warocol',
  meta: [
    { name: 'description', content: 'Análisis financiero para Warocol' }
  ]
})

// Redirect to TIR page
await navigateTo('/financiero/tir', { redirectCode: 301 })
</script>