<script setup lang="ts">
import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '../utils'

// StatusBadge variants using ONLY semantic tokens (following governance)
const statusBadgeVariants = cva(
  'inline-flex items-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Success: positive values — green, hue 145°
        success:     'bg-status-success-bg text-status-success-text',
        // Destructive/Critical: errors, critical alerts — red, hue 25°
        destructive: 'bg-status-critical-bg text-status-critical-text',
        // Warning: caution, needs attention — amber, hue 75°
        warning:     'bg-status-warning-bg text-status-warning-text',
        // Info: informational, no urgency — blue, hue 250°
        info:        'bg-status-info-bg text-status-info-text',
        // Secondary: neutral values
        secondary:   'bg-secondary text-secondary-foreground',
        // Primary: brand-highlighted values
        primary:     'bg-primary/10 text-primary'
      },
      size: {
        sm: 'px-2 py-0.5 text-xs rounded-md',
        default: 'px-2.5 py-0.5 text-xs rounded-full',
        lg: 'px-3 py-1 text-sm rounded-full'
      },
      format: {
        // For financial values that auto-determine color
        percentage: '',
        currency: '',
        number: '',
        text: ''
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
      format: 'text'
    }
  }
)

export interface StatusBadgeProps {
  variant?: VariantProps<typeof statusBadgeVariants>['variant']
  size?: VariantProps<typeof statusBadgeVariants>['size']
  format?: VariantProps<typeof statusBadgeVariants>['format']
  value?: string | number
  autoColor?: boolean // Auto-determine color based on value
  threshold?: {
    success?: number  // Above this = success
    warning?: number  // Above this = warning, below success = warning
    // Below warning = destructive
  }
  precision?: number
  class?: string
}

interface Props extends StatusBadgeProps {}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'default', 
  format: 'text',
  autoColor: false,
  precision: 1,
  threshold: () => ({
    success: 0,
    warning: undefined
  })
})

// Auto-determine variant based on value and thresholds
const computedVariant = computed(() => {
  if (!props.autoColor || props.value === undefined) {
    return props.variant
  }

  const numValue = typeof props.value === 'string' ? parseFloat(props.value) : props.value
  
  // Only apply color for percentage format (TIR values)
  if (props.format === 'percentage') {
    if (numValue >= (props.threshold?.success ?? 0)) return 'success'
    if (props.threshold?.warning !== undefined && numValue >= props.threshold.warning) return 'warning'
    return 'destructive'
  }
  
  // For all other formats, keep default (black/neutral)
  return 'secondary'
})

// Format value based on type
const formattedValue = computed(() => {
  if (props.value === undefined || props.value === null) return ''
  
  const numValue = typeof props.value === 'string' ? parseFloat(props.value) : props.value
  
  switch (props.format) {
    case 'percentage':
      return `${numValue.toFixed(props.precision)}%`
    case 'currency':
      return `$${numValue.toLocaleString()}`
    case 'number':
      return numValue.toLocaleString()
    case 'text':
    default:
      return String(props.value)
  }
})
</script>

<template>
  <span :class="cn(statusBadgeVariants({ variant: computedVariant, size, format }), props.class)">
    <slot>{{ formattedValue }}</slot>
  </span>
</template>
