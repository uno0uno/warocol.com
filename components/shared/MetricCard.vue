<template>
  <div :class="cn(metricCardVariants({ variant, size }), props.class)">
    <!-- Desktop Layout (md and above) -->
    <div class="hidden md:flex md:flex-col md:flex-1">
      <!-- Title using semantic tokens -->
      <div class="mb-2">
        <div :class="cn(titleVariants({ size }), 'text-text-primary')">
          {{ title }}
        </div>
      </div>

      <!-- Value and Icon row -->
      <div class="flex min-w-0 items-end justify-between mb-2">
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

    <!-- Mobile Layout (below md) -->
    <div
      class="md:hidden flex flex-col flex-1 justify-between"
      :class="size === 'compact' ? 'min-h-[44px]' : 'min-h-[52px]'"
    >
      <!-- Title -->
      <div :class="cn(titleVariants({ size }), 'text-text-primary opacity-85')">
        {{ title }}
      </div>

      <!-- Value Row -->
      <div class="flex items-center justify-between">
        <div :class="valueVariants({ variant, size })">
          {{ formattedValue }}
        </div>
        <div v-if="unit" :class="cn(unitVariants({ variant, size }))">
          {{ unit }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '../ui/utils'
import { formatMetricCardValue } from './metricCardValue'

// Define metric card variants using CVA following governance rules
const metricCardVariants = cva(
  // Base classes using ONLY semantic tokens (NEVER hardcoded colors)
  'bg-surface rounded-xl shadow-sm border-2 transition-colors flex flex-col',
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
        // Dense KPI strip (e.g. arqueo summary) — smaller than sm, opt-in only (#2076).
        compact: 'px-3 py-2.5 md:px-3 md:py-2.5',
        sm: 'px-4 py-4 md:px-6 md:py-3',
        default: 'px-5 py-4 md:px-8 md:py-4',
        lg: 'px-6 py-5 md:px-10 md:py-6'
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default'
    }
  }
)

const valueVariants = cva(
  'font-bold leading-none min-w-0 max-w-full [overflow-wrap:anywhere]',
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
        compact: 'text-lg md:text-xl tabular-nums tracking-tight',
        sm: 'text-2xl md:text-2xl',
        default: 'text-3xl md:text-4xl',
        lg: 'text-3xl md:text-5xl'
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default'
    }
  }
)

const titleVariants = cva(
  'font-medium',
  {
    variants: {
      size: {
        compact: 'text-xs leading-tight md:text-xs md:font-semibold md:tracking-wide',
        sm: 'text-sm leading-tight md:text-sm md:font-semibold md:tracking-wide',
        default: 'text-sm leading-tight md:text-base md:font-semibold md:tracking-wide',
        lg: 'text-base leading-tight md:text-lg md:font-semibold md:tracking-wide'
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
        compact: 'text-xs md:text-xs',
        sm: 'text-sm md:text-xs',
        default: 'text-sm md:text-xs',
        lg: 'text-base md:text-sm'
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
        compact: 'text-xs',
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
  'p-2 rounded-lg ms-4',
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
  format?: 'currency' | 'percentage' | 'number' | 'decimal' | 'text'
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

interface Props extends MetricCardProps { }

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

const { formatCurrency, formatNumber } = useFormatters()

// Format value based on type
const formattedValue = computed(() => {
  return formatMetricCardValue({
    value: props.value,
    format: props.format,
    precision: props.precision,
    suffix: props.suffix,
    formatCurrency,
    formatNumber,
  })
})
</script>
