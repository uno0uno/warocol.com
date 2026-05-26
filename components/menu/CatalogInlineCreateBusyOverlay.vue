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
          class="catalog-inline-panel relative mx-2 w-full max-w-md overflow-hidden rounded-[26px] border border-border px-5 pb-6 pt-7 sm:px-6"
          role="status"
          :aria-labelledby="labelId"
          :aria-describedby="hintId"
        >
          <div class="relative flex flex-col items-center gap-[18px] text-center">
            <CommonsTheCustomLoader
              size="medium"
              :show-phrase="false"
            />

            <div class="space-y-1">
              <p :id="labelId" class="text-[0.92rem] font-semibold leading-snug text-text-primary sm:text-base">
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
  background: hsl(var(--surface));
  box-shadow: 0 16px 32px hsl(var(--ebony-900) / 0.12);
}
</style>
