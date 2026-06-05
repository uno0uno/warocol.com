<script setup lang="ts">
defineProps<{
  currentPage: number
  totalPages: number
}>()

const emit = defineEmits<{
  page: [page: number]
}>()
</script>

<template>
  <div v-if="totalPages > 1" class="flex justify-center mt-12 mb-4">
    <nav class="flex items-center gap-1.5 bg-white p-1.5 rounded-xl shadow-sm border border-titan-200">
      <button
        :disabled="currentPage === 1"
        class="p-2 rounded-lg hover:bg-titan-100 text-ebony-500 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        aria-label="Página anterior"
        @click="emit('page', currentPage - 1)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        v-for="page in totalPages"
        :key="page"
        :class="[
          'w-9 h-9 rounded-lg text-sm font-medium transition-all',
          currentPage === page
            ? 'bg-crocus-600 text-white shadow-sm'
            : 'text-ebony-500 hover:bg-titan-100'
        ]"
        @click="emit('page', page)"
      >
        {{ page }}
      </button>

      <button
        :disabled="currentPage === totalPages"
        class="p-2 rounded-lg hover:bg-titan-100 text-ebony-500 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        aria-label="Página siguiente"
        @click="emit('page', currentPage + 1)"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  </div>
</template>
