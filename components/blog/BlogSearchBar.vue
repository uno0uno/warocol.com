<script setup lang="ts">
const searchQuery = defineModel<string>('modelValue', { default: '' })
</script>

<template>
  <div class="relative w-full">
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Buscar en el blog..."
      class="w-full px-5 py-4 pl-12 bg-titan-50 border border-titan-300 rounded-xl text-ebony-900 text-base font-normal placeholder:text-ebony-400 focus:outline-none focus:border-crocus-500 focus:ring-4 focus:ring-crocus-500/10 transition-all"
    >
    <svg
      class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ebony-500 pointer-events-none"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" stroke-width="2" />
      <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round" />
    </svg>
  </div>
</template>
