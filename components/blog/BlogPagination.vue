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
    <nav class="flex items-center gap-1.5 bg-surface p-1.5 rounded-xl shadow-sm border border-border">
      <button
        :disabled="currentPage === 1"
        class="p-2 rounded-xl hover:bg-surface-secondary text-text-secondary disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
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
          'w-9 h-9 rounded-xl text-sm font-medium transition-all',
          currentPage === page
            ? 'bg-text-primary text-surface ring-2 ring-badge-primary-border shadow-sm'
            : 'bg-text-primary text-surface hover:bg-action-primary-bg hover:text-action-primary-text'
        ]"
        @click="emit('page', page)"
      >
        {{ page }}
      </button>

      <button
        :disabled="currentPage === totalPages"
        class="p-2 rounded-xl hover:bg-surface-secondary text-text-secondary disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
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
