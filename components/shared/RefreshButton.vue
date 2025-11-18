<template>
  <div class="flex flex-col justify-end">
    <button
      @click="handleRefresh"
      :disabled="loading"
      class="h-[42px] px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary hover:border-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary group disabled:opacity-50 disabled:cursor-not-allowed"
      :title="title"
    >
      <svg
        class="w-5 h-5 transition-transform group-hover:rotate-180 duration-300"
        :class="{ 'animate-spin': loading }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title?: string
  onRefresh?: () => Promise<void> | void
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Refrescar listado'
})

const emit = defineEmits<{
  refresh: []
}>()

const loading = ref(false)

async function handleRefresh() {
  if (loading.value) return

  loading.value = true

  try {
    if (props.onRefresh) {
      await props.onRefresh()
    }
    emit('refresh')
  } finally {
    loading.value = false
  }
}
</script>
