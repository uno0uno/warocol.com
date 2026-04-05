<script setup lang="ts">
useHead({ title: 'Abastecimiento' })
</script>

<template>
  <div class="page-layout">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        to="/abastecimiento/ingredientes-propios"
        class="flex items-start gap-4 p-5 rounded-xl border-2 border-border bg-surface hover:bg-surface-secondary hover:border-primary/30 transition-all group"
      >
        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
          <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-text-primary">Ingredientes Personalizados</p>
          <p class="text-xs text-text-secondary mt-0.5 leading-relaxed">Ingredientes propios de tu restaurante, creados para tus recetas específicas</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
