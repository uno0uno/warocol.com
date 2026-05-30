<template>
  <section class="px-5 py-5 md:px-6 md:py-5">
    <header class="mb-4">
      <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 class="text-base font-semibold text-text-primary leading-snug tracking-tight">
              {{ title }}
            </h3>
            <slot name="badge" />
          </div>
          <p
            v-if="description"
            class="text-sm text-text-secondary mt-1 leading-relaxed max-w-prose"
          >
            {{ description }}
          </p>
        </div>
        <div v-if="$slots.actions" class="flex-shrink-0">
          <slot name="actions" />
        </div>
      </div>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>
