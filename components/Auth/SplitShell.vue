<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  imageSrc: string
  imagePosition?: string
  contentWidth?: 'default' | 'wide'
}>(), {
  imagePosition: 'center',
  contentWidth: 'default',
})

const contentWidthClass = computed(() =>
  props.contentWidth === 'wide' ? 'max-w-lg' : 'max-w-md',
)
</script>

<template>
  <main class="auth-shell flex min-h-[100dvh] w-full bg-surface">
    <section
      class="flex min-h-[100dvh] w-full items-center justify-center px-5 py-6 sm:px-10 lg:w-[46%] lg:px-12 lg:py-5 xl:w-[38%] xl:px-14"
    >
      <div :class="['w-full', contentWidthClass]">
        <slot />
      </div>
    </section>

    <aside
      class="sticky top-0 hidden h-[100dvh] min-w-0 flex-1 overflow-hidden bg-surface-secondary lg:block"
      aria-hidden="true"
    >
      <img
        :src="imageSrc"
        alt=""
        class="h-full w-full object-cover"
        :style="{ objectPosition: imagePosition }"
      >
    </aside>
  </main>
</template>

<style scoped>
.auth-shell {
  --auth-action-bg: var(--neutral-950);
  --auth-action-text: var(--neutral-50);
  --auth-action-hover-bg: var(--neutral-800);
  --auth-action-focus-ring: var(--neutral-500);
  --auth-action-disabled-bg: var(--muted);
  --auth-action-disabled-text: var(--muted-foreground);
  --auth-link-text: var(--neutral-700);
  --auth-link-hover-text: var(--neutral-950);
}

:global(.dark) .auth-shell {
  --auth-action-bg: var(--neutral-50);
  --auth-action-text: var(--neutral-950);
  --auth-action-hover-bg: var(--neutral-200);
  --auth-action-focus-ring: var(--neutral-300);
  --auth-link-text: var(--neutral-100);
  --auth-link-hover-text: var(--neutral-50);
}
</style>
