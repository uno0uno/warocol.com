<script setup lang="ts">
// Redirect to miembros by default
definePageMeta({
  layout: 'dashboard',
  module: 'equipo',
  middleware: [
    function () {
      return navigateTo('/equipo/miembros', { replace: true })
    }
  ]
})
</script>

<template>
  <div></div>
</template>
