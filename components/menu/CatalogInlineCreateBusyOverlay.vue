<template>
  <div class="relative">
    <div
      v-if="busy"
      class="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-surface/85 backdrop-blur-[2px]"
      aria-live="polite"
      :aria-busy="busy"
    >
      <div class="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-border bg-surface shadow-md mx-4 max-w-md">
        <div
          class="h-5 w-5 flex-shrink-0 rounded-full border-2 border-primary border-t-transparent animate-spin"
          role="status"
          :aria-label="statusLabel"
        />
        <div class="min-w-0">
          <p class="text-sm font-medium text-text-primary">
            {{ label || 'Procesando…' }}
          </p>
          <p v-if="hint" class="text-sm text-text-secondary mt-0.5">
            {{ hint }}
          </p>
        </div>
      </div>
    </div>
    <div :class="{ 'pointer-events-none opacity-50': busy }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    busy?: boolean
    label?: string
    hint?: string
  }>(),
  {
    busy: false,
    label: '',
    hint: '',
  },
)

const statusLabel = computed(() => props.label || 'Procesando')
</script>
