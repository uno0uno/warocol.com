<template>
  <component
    :is="componentType"
    :to="to"
    :type="type"
    :disabled="disabled"
    :class="buttonClasses"
    @click="handleClick"
  >
    <slot name="icon" />
    <span>{{ label }}</span>
  </component>
</template>

<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'w-full flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200',
  {
    variants: {
      variant: {
        back: 'bg-surface-secondary text-text-primary border-0 hover:bg-opacity-80',
        waiting: 'bg-white text-warning border-2 border-dashed border-warning',
        approve: 'bg-white text-success border-2 border-success hover:opacity-60',
        cancel: 'bg-white text-destructive border-2 border-destructive hover:opacity-60'
      },
      size: {
        sm: 'px-3 py-2 text-xs',
        default: 'px-4 py-3.5 text-[15px]',
        lg: 'px-6 py-4 text-base'
      }
    },
    defaultVariants: {
      variant: 'back',
      size: 'default'
    }
  }
)

interface Props {
  label: string
  variant?: VariantProps<typeof buttonVariants>['variant']
  size?: VariantProps<typeof buttonVariants>['size']
  to?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'back',
  size: 'default',
  type: 'button',
  disabled: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const componentType = computed(() => props.to ? 'NuxtLink' : 'button')

const buttonClasses = computed(() =>
  buttonVariants({ variant: props.variant, size: props.size })
)

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.to) {
    emit('click', event)
  }
}
</script>
