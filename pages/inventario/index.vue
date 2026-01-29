<script setup>
useHead({ title: 'Inventario' })

// Redirect to stock by default (sin await para evitar bloqueo en navegación client-side)
navigateTo('/inventario/stock', { replace: true })
</script>

<template>
  <!-- This page redirects, no content needed -->
  <div></div>
</template>
