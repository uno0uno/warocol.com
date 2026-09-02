<script setup lang="ts">
import { shellHeaderToolButtonClass } from '~/utils/shellHeaderToolClasses'

const props = withDefaults(defineProps<{
  kind: 'pay' | 'print' | 'recharge'
  ariaLabel: string
  disabled?: boolean
  /** Header actions (abonar cartera / recargar) keep the shell bordered chip. */
  bordered?: boolean
  /** Row icons are slightly smaller than header chips. */
  size?: 'header' | 'row'
}>(), {
  bordered: false,
  size: 'row',
})

const dimensionClass = computed(() =>
  props.size === 'header' || props.bordered ? 'h-9 w-9' : 'h-8 w-8',
)

const buttonClass = computed(() => {
  if (props.bordered) {
    return shellHeaderToolButtonClass
  }
  return [
    'inline-flex flex-shrink-0 items-center justify-center rounded-lg',
    dimensionClass.value,
    'text-text-secondary hover:text-primary hover:bg-surface-secondary/80',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors',
  ].join(' ')
})

const emit = defineEmits<{
  click: [MouseEvent]
}>()

const onClick = (event: MouseEvent) => {
  if (props.disabled) return
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    :class="[
      buttonClass,
      disabled ? 'opacity-40 cursor-not-allowed' : '',
    ]"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click.stop="onClick"
  >
    <svg
      v-if="kind === 'pay'"
      class="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
    <svg
      v-else-if="kind === 'print'"
      class="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
      />
    </svg>
    <svg
      v-else
      class="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  </button>
</template>
