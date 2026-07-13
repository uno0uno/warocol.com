<script setup lang="ts">
const searchQuery = defineModel<string>('modelValue', { default: '' })
</script>

<template>
  <div class="relative w-full">
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Buscar en el blog..."
      class="w-full px-5 py-4 ps-12 bg-surface-secondary border border-border rounded-xl text-text-primary text-base font-normal placeholder:text-text-tertiary focus:outline-none focus:border-form-control-focus-border focus:ring-4 focus:ring-form-control-focus-ring transition-all"
    >
    <svg
      class="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" stroke-width="2" />
      <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round" />
    </svg>
  </div>
</template>
