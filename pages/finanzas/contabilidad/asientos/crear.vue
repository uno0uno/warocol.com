<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Nuevo asiento contable - Warocol' })
</script>

<template>
  <div class="page-layout">
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink
        to="/finanzas/contabilidad/asientos"
        class="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Asientos
      </NuxtLink>
    </div>
    <h1 class="text-xl font-semibold text-gray-800">Nuevo asiento contable</h1>
    <p class="mt-2 text-gray-500">Próximamente: Formulario de creación de asientos manuales.</p>
  </div>
</template>
