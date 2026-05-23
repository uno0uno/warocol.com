<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  module: 'menu',
})

await navigateTo(
  { path: '/menu/productos', query: { tipo: 'reventa' } },
  { replace: true },
)
</script>

<template>
  <div />
</template>
