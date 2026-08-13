<template>
  <details
    class="group rounded-lg border border-border bg-surface"
    :open="openByDefault || undefined"
  >
    <summary
      class="cursor-pointer list-none min-h-[40px] px-3 py-2.5 flex items-center justify-between gap-3
             text-sm font-semibold text-text-primary select-none
             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-lg"
    >
      <span class="min-w-0 flex items-center gap-2">
        <span class="truncate">{{ title }}</span>
        <span
          v-if="badge"
          class="flex-shrink-0 text-xs font-normal text-text-tertiary normal-case tracking-normal"
        >
          {{ badge }}
        </span>
      </span>
      <svg
        class="w-4 h-4 flex-shrink-0 text-text-tertiary transition-transform group-open:rotate-180"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </summary>
    <div class="px-3 pb-3 pt-0.5">
      <slot />
    </div>
  </details>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    badge?: string
    openByDefault?: boolean
  }>(),
  { openByDefault: false },
)
</script>

<style scoped>
summary::-webkit-details-marker {
  display: none;
}
</style>
