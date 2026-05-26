<template>
  <div class="relative">
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
        class="catalog-inline-busy absolute inset-0 z-20 flex items-center justify-center rounded-lg p-3 sm:p-4"
        aria-live="polite"
        :aria-busy="busy"
      >
        <div
          class="catalog-inline-panel relative mx-2 w-full max-w-md overflow-hidden rounded-[26px] border border-white/60 px-5 py-5 shadow-2xl backdrop-blur-xl sm:px-6"
          role="status"
          :aria-labelledby="labelId"
          :aria-describedby="hintId"
        >
          <div class="relative flex flex-col items-center gap-4 text-center">
            <div
              class="inline-flex items-center gap-2 rounded-full border border-crocus-200 bg-crocus-100/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-crocus-700"
            >
              Inline busy
            </div>

            <CommonsTheCustomLoader
              size="medium"
              :show-phrase="false"
            />

            <div class="space-y-1">
              <p :id="labelId" class="text-sm font-semibold text-text-primary sm:text-base">
                {{ resolvedLabel }}
              </p>
              <p
                v-if="hint"
                :id="hintId"
                class="mx-auto max-w-xs text-xs leading-relaxed text-text-secondary sm:text-sm"
              >
                {{ hint }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
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

const resolvedLabel = computed(() => props.label || 'Procesando...')
const statusLabel = computed(() => props.label || 'Procesando')
const labelId = computed(() => `catalog-inline-busy-${statusLabel.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'state'}`)
const hintId = computed(() => props.hint ? `${labelId.value}-hint` : undefined)
</script>

<style scoped>
.catalog-inline-busy {
  background:
    linear-gradient(180deg, hsl(var(--background) / 0.18), hsl(var(--background) / 0.34)),
    radial-gradient(circle at center, hsl(var(--crocus-300) / 0.14), transparent 48%);
  backdrop-filter: blur(8px) saturate(120%);
}

.catalog-inline-panel {
  background:
    linear-gradient(180deg, hsl(var(--surface) / 0.84), hsl(var(--surface) / 0.62)),
    hsl(var(--surface) / 0.42);
  box-shadow:
    inset 0 1px 0 hsl(var(--titan-50) / 0.76),
    0 20px 48px hsl(var(--ebony-900) / 0.16);
}

.catalog-inline-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top, hsl(var(--crocus-200) / 0.9), transparent 56%);
  pointer-events: none;
}
</style>
