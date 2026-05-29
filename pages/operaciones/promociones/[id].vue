<script setup lang="ts">
definePageMeta({ layout: 'dashboard', module: 'mi_negocio' })

const route = useRoute()
const id = String(route.params.id)

await navigateTo(
  {
    path: '/operaciones/promociones',
    query: id === 'nuevo' ? { nuevo: '1' } : { id },
  },
  { replace: true },
)
</script>

<template>
  <div />
</template>
