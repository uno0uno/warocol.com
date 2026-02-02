<script setup>
// Redirect to miembros by default
definePageMeta({
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
