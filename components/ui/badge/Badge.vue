<script setup lang="ts">
import { cva } from 'class-variance-authority'
import { cn } from '../utils'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => [
      'default', 'secondary', 'destructive', 'outline', 'success', 
      'warning', 'info', 'profile', 'titan', 'crocus'
    ].includes(value)
  },
  class: String
})

const badgeVariants = cva(
  'inline-flex items-center border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'rounded-full border-transparent bg-surface text-foreground hover:bg-surface-secondary px-2.5 py-0.5',
        secondary: 'rounded-full border-transparent bg-secondary text-secondary-foreground hover:bg-surface-tertiary px-2.5 py-0.5',
        destructive: 'rounded-full border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 px-2.5 py-0.5',
        outline: 'rounded-full border-border text-text-secondary hover:bg-surface px-2.5 py-0.5',
        success: 'rounded-full border-transparent bg-success text-success-foreground hover:bg-success/80 px-2.5 py-0.5',
        warning: 'rounded-full border-transparent bg-warning text-warning-foreground hover:bg-warning/80 px-2.5 py-0.5',
        info: 'rounded-full border-transparent bg-info text-info-foreground hover:bg-info/80 px-2.5 py-0.5',
        profile: 'rounded-md border border-border bg-surface text-text-secondary hover:bg-surface-secondary px-3 py-1',
        titan: 'rounded-md border border-titan-400 bg-titan-200 text-titan-800 hover:bg-titan-300 px-3 py-1',
        crocus: 'rounded-md border border-crocus-400 bg-crocus-100 text-crocus-800 hover:bg-crocus-200 px-3 py-1'
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
</script>

<template>
  <div :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </div>
</template>