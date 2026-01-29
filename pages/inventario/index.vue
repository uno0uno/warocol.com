<script setup>
// Usar middleware para redirect en lugar de navigateTo directo
definePageMeta({
  middleware: (to) => {
    if (to.path === '/inventario' || to.path === '/inventario/') {
      return navigateTo('/inventario/stock', { replace: true })
    }
  }
})
</script>

<template>
  <div></div>
</template>
