<script setup lang="ts">
import { computed } from 'vue'

type OverlayVariant = 'glass' | 'soft'
type OverlayIndicator = 'matrix' | 'spinner'

const props = withDefaults(defineProps<{
  busy?: boolean
  label?: string
  hint?: string
  fullscreen?: boolean
  variant?: OverlayVariant
  indicator?: OverlayIndicator
}>(), {
  busy: false,
  label: 'Procesando...',
  hint: '',
  fullscreen: true,
  variant: 'glass',
  indicator: 'matrix',
})

const overlayPositionClass = computed(() =>
  props.fullscreen
    ? 'fixed inset-0 z-50'
    : 'absolute inset-0 z-20 rounded-[inherit]'
)

const panelClass = computed(() =>
  props.variant === 'glass'
    ? 'glass-panel border-white/60 bg-surface/72'
    : 'soft-panel border-border/80 bg-surface/95'
)

const labelId = computed(() => `submit-busy-${props.label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'state'}`)
const hintId = computed(() => props.hint ? `${labelId.value}-hint` : undefined)
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="busy"
      :class="[overlayPositionClass, 'submit-busy-overlay flex items-center justify-center p-4 sm:p-6']"
      aria-live="polite"
      :aria-busy="busy"
    >
      <div
        :class="[panelClass, 'relative w-full max-w-lg overflow-hidden rounded-[28px] border px-6 py-7 shadow-2xl backdrop-blur-2xl sm:px-8']"
        role="status"
        :aria-labelledby="labelId"
        :aria-describedby="hintId"
      >
        <div class="relative flex flex-col items-center gap-5 text-center">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-crocus-200 bg-crocus-100/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-crocus-700"
          >
            Submit busy
          </div>

          <CommonsTheCustomLoader
            v-if="indicator === 'matrix'"
            size="large"
            :show-phrase="false"
          />

          <div
            v-else
            class="h-10 w-10 rounded-full border-[3px] border-primary border-t-transparent animate-spin"
            aria-hidden="true"
          />

          <div class="space-y-1.5">
            <p :id="labelId" class="text-lg font-semibold text-text-primary sm:text-xl">
              {{ label }}
            </p>
            <p
              v-if="hint"
              :id="hintId"
              class="mx-auto max-w-md text-sm leading-relaxed text-text-secondary"
            >
              {{ hint }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.submit-busy-overlay {
  background:
    linear-gradient(180deg, hsl(var(--background) / 0.44), hsl(var(--background) / 0.62)),
    radial-gradient(circle at center, hsl(var(--crocus-300) / 0.16), transparent 44%);
  backdrop-filter: blur(10px) saturate(125%);
}

.glass-panel {
  background:
    linear-gradient(180deg, hsl(var(--surface) / 0.84), hsl(var(--surface) / 0.62)),
    hsl(var(--surface) / 0.42);
  box-shadow:
    inset 0 1px 0 hsl(var(--titan-50) / 0.76),
    0 24px 80px hsl(var(--ebony-900) / 0.18);
}

.glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top, hsl(var(--crocus-200) / 0.9), transparent 54%);
  pointer-events: none;
}

.soft-panel {
  box-shadow: 0 18px 48px hsl(var(--ebony-900) / 0.14);
}
</style>
