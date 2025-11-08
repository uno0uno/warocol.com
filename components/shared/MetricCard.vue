<template>
  <div :class="cn(metricCardVariants({ variant, size }), props.class)">
    <!-- Title using semantic tokens -->
    <div class="mb-2">
      <div :class="cn(titleVariants({ size }), 'text-text-primary')">
        {{ title }}
      </div>
    </div>
    
    <!-- Value and Icon row -->
    <div class="flex items-end justify-between mb-2">
      <div :class="valueVariants({ variant, size })">
        {{ formattedValue }}
      </div>
      <div v-if="icon && showIcon" :class="iconContainerVariants({ variant })">
        <component :is="icon" :class="iconVariants({ variant })" />
      </div>
    </div>
    
    <!-- Unit display -->
    <div v-if="unit" :class="cn(unitVariants({ variant, size }), '-mt-2 mb-2')">
      {{ unit }}
    </div>
    
    <!-- Subtitle using semantic tokens -->
    <div v-if="subtitle" :class="cn(subtitleVariants({ size }), 'text-text-secondary')">
      {{ subtitle }}
    </div>
    
    <!-- Trend indicator using semantic tokens -->
    <div v-if="trend" class="mt-2">
      <span :class="trendVariants({ trendType: trend.type })">
        {{ trend.value }}{{ trend.suffix || '' }} {{ trend.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '../ui/utils'

// Define metric card variants using CVA following governance rules
const metricCardVariants = cva(
  // Base classes using ONLY semantic tokens (NEVER hardcoded colors)
  'bg-surface rounded-xl shadow-sm border transition-colors',
  {
    variants: {
      variant: {
        // Primary: For main metrics using semantic tokens
        primary: 'border-primary',
        // Secondary: For supporting metrics
        secondary: 'border-border',
        // Success: For positive indicators
        success: 'border-success',
        // Warning: For metrics needing attention
        warning: 'border-warning',
        // Destructive: For negative metrics (was "danger")
        destructive: 'border-destructive',
        // Info: For informational metrics
        info: 'border-info'
      },
      size: {
        sm: 'px-6 py-3',
        default: 'px-8 py-4',
        lg: 'px-10 py-6'
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default'
    }
  }
)

const valueVariants = cva(
  'font-bold',
  {
    variants: {
      variant: {
        primary: 'text-primary',
        secondary: 'text-text-primary',
        success: 'text-success',
        warning: 'text-warning',
        destructive: 'text-destructive',
        info: 'text-info'
      },
      size: {
        sm: 'text-2xl',
        default: 'text-4xl',
        lg: 'text-5xl'
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default'
    }
  }
)

const titleVariants = cva(
  'font-medium tracking-wide',
  {
    variants: {
      size: {
        sm: 'text-sm',
        default: 'text-base',
        lg: 'text-lg'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)

const subtitleVariants = cva(
  'mb-2',
  {
    variants: {
      size: {
        sm: 'text-xs',
        default: 'text-xs',
        lg: 'text-sm'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)

const unitVariants = cva(
  '',
  {
    variants: {
      variant: {
        primary: 'text-primary',
        secondary: 'text-text-secondary',
        success: 'text-success',
        warning: 'text-warning',
        destructive: 'text-destructive',
        info: 'text-info'
      },
      size: {
        sm: 'text-sm',
        default: 'text-base',
        lg: 'text-lg'
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default'
    }
  }
)

const iconContainerVariants = cva(
  'p-2 rounded-lg ml-4',
  {
    variants: {
      variant: {
        primary: 'bg-primary/10',
        secondary: 'bg-surface-secondary',
        success: 'bg-success/10',
        warning: 'bg-warning/10',
        destructive: 'bg-destructive/10',
        info: 'bg-info/10'
      }
    },
    defaultVariants: {
      variant: 'secondary'
    }
  }
)

const iconVariants = cva(
  'h-6 w-6',
  {
    variants: {
      variant: {
        primary: 'text-primary',
        secondary: 'text-text-secondary',
        success: 'text-success',
        warning: 'text-warning',
        destructive: 'text-destructive',
        info: 'text-info'
      }
    },
    defaultVariants: {
      variant: 'secondary'
    }
  }
)

const trendVariants = cva(
  'text-sm font-medium',
  {
    variants: {
      trendType: {
        positive: 'text-success',
        negative: 'text-destructive',
        neutral: 'text-text-secondary'
      }
    },
    defaultVariants: {
      trendType: 'neutral'
    }
  }
)

export interface MetricCardProps {
  variant?: VariantProps<typeof metricCardVariants>['variant']
  size?: VariantProps<typeof metricCardVariants>['size']
  title: string
  value: string | number
  suffix?: string
  unit?: string
  subtitle?: string
  format?: 'currency' | 'percentage' | 'number' | 'decimal'
  precision?: number
  icon?: any
  showIcon?: boolean
  trend?: {
    type: 'positive' | 'negative' | 'neutral'
    value: string | number
    suffix?: string
    label: string
  }
  class?: string
}

interface Props extends MetricCardProps {}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'default',
  suffix: '',
  unit: '',
  subtitle: '',
  format: 'number',
  precision: 2,
  showIcon: true
})

// Format value based on type - keeping existing functionality
const formattedValue = computed(() => {
  const numValue = typeof props.value === 'string' ? parseFloat(props.value) : props.value
  
  switch (props.format) {
    case 'currency':
      return `$${numValue.toLocaleString()}`
    case 'percentage':
      return `${numValue.toFixed(props.precision)}%`
    case 'decimal':
      return numValue.toFixed(props.precision)
    case 'number':
    default:
      // Keep existing behavior with suffix
      return `${numValue.toLocaleString()}${props.suffix}`
  }
})
</script>