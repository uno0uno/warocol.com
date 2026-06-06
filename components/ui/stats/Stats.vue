<script setup lang="ts">
import { cva } from 'class-variance-authority'
import { cn } from '../utils'
import { 
  UsersIcon,
  LinkIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  BoltIcon,
  StarIcon
} from '@heroicons/vue/24/outline'

const iconComponents = {
  users: UsersIcon,
  link: LinkIcon,
  rocket: RocketLaunchIcon,
  chart: ChartBarIcon,
  bolt: BoltIcon,
  star: StarIcon
}

const props = defineProps({
  stats: {
    type: Array,
    default: () => []
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'compact', 'cards', 'balance'].includes(value)
  },
  orientation: {
    type: String,
    default: 'horizontal',
    validator: (value) => ['horizontal', 'vertical'].includes(value)
  },
  class: String
})

const statsVariants = cva(
  "flex gap-8",
  {
    variants: {
      variant: {
        default: "border-border",
        compact: "",
        cards: "grid gap-4",
        balance: "grid gap-4"
      },
      orientation: {
        horizontal: "flex-row flex-wrap",
        vertical: "flex-col"
      }
    },
    compoundVariants: [
      {
        variant: "cards",
        orientation: "horizontal",
        class: "grid-cols-2 md:grid-cols-4 lg:grid-cols-7"
      },
      {
        variant: "balance",
        orientation: "horizontal",
        class: "grid-cols-1 md:grid-cols-3 gap-4"
      },
      {
        variant: "compact",
        orientation: "horizontal", 
        class: "gap-6"
      }
    ],
    defaultVariants: {
      variant: "default",
      orientation: "horizontal"
    }
  }
)

const statItemVariants = cva(
  "text-left",
  {
    variants: {
      variant: {
        default: "",
        compact: "",
        cards: "p-4 bg-card rounded-lg border border-border",
        balance: "bg-card rounded-2xl p-6 w-full max-w-[200px] shadow-sm border border-border"
      }
    }
  }
)

const statValueVariants = cva(
  "flex items-center gap-2 font-bold mb-1 text-foreground",
  {
    variants: {
      variant: {
        default: "text-2xl",
        compact: "text-xl",
        cards: "text-lg",
        balance: "text-3xl text-foreground mt-2"
      }
    }
  }
)

const statLabelVariants = cva(
  "text-text-secondary text-sm lowercase",
  {
    variants: {
      variant: {
        default: "text-xs",
        compact: "text-xs", 
        cards: "text-xs",
        balance: "text-text-secondary text-sm font-medium flex items-center gap-1.5"
      }
    }
  }
)
</script>

<template>
  <div 
    :class="cn(
      statsVariants({ variant, orientation }),
      props.class
    )"
  >
    <div 
      v-for="stat in stats" 
      :key="stat.label" 
      :class="cn(statItemVariants({ variant }))"
    >
      <!-- Balance card header -->
      <div v-if="variant === 'balance'" class="flex items-center justify-between mb-4">
        <div :class="cn(statLabelVariants({ variant }))">
          <span class="w-1.5 h-1.5 bg-accent rounded-full"></span>
          {{ stat.label }}
        </div>
        <div class="bg-muted/50 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-xl opacity-70">
        </div>
      </div>

      <!-- Balance card value -->
      <div v-if="variant === 'balance'" :class="cn(statValueVariants({ variant }))">
        <span>{{ stat.value }}</span>
      </div>

      <!-- Default variants -->
      <template v-else>
        <div :class="cn(statValueVariants({ variant }))">
          <component 
            v-if="stat.icon && iconComponents[stat.icon]" 
            :is="iconComponents[stat.icon]" 
            class="w-5 h-5 text-accent"
          />
          <span>{{ stat.value }}</span>
        </div>
        <div :class="cn(statLabelVariants({ variant }))">
          {{ stat.label }}
        </div>
      </template>
    </div>
  </div>
</template>
