<template>
  <button
    type="button"
    :disabled="disabled"
    :aria-pressed="selected"
    :class="cardClass"
    @click="emit('click')"
  >
    <div :class="iconWrapClass" aria-hidden="true">
      <slot name="icon" />
    </div>
    <div class="min-w-0 flex-1 text-left">
      <span class="block text-sm font-semibold leading-snug text-text-primary">
        {{ title }}
      </span>
      <span
        v-if="description"
        class="mt-0.5 block text-xs leading-relaxed text-text-secondary"
      >
        {{ description }}
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
/**
 * Tarjeta de opción seleccionable (icono + título + descripción).
 * Colorimetría alineada con Finanzas → Arqueo → Nuevo arqueo (primary/5, primary/30).
 */
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    selected?: boolean
    disabled?: boolean
  }>(),
  {
    description: undefined,
    selected: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  click: []
}>()

const cardClass = computed(() =>
  [
    'flex w-full min-h-[44px] items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors duration-200',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-60',
    '[&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0',
    props.selected
      ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
      : 'border-border bg-background hover:border-primary/30 hover:bg-primary/5',
  ].join(' '),
)

const iconWrapClass = computed(() =>
  [
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
    props.selected ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary',
  ].join(' '),
)
</script>
