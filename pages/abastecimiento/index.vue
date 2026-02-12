<script setup>
// Usar middleware para redirect en lugar de navigateTo directo
definePageMeta({
  middleware: (to) => {
    if (to.path === '/abastecimiento' || to.path === '/abastecimiento/') {
      return navigateTo('/abastecimiento/lector-facturas', { replace: true })
    }
  }
})
</script>

<template>
  <div></div>
</template>