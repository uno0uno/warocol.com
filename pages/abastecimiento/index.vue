<script setup>
useHead({ title: 'Abastecimiento' })

// Redirect to proveedores by default (sin await para evitar bloqueo en navegación client-side)
navigateTo('/abastecimiento/proveedores', { replace: true })
</script>

<template>
  <!-- This page redirects, no content needed -->
  <div></div>
</template>