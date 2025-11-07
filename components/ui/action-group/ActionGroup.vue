<script setup>
import { cva } from 'class-variance-authority'
import { cn } from '../utils'
import { Button } from '~/components/ui'

const props = defineProps({
  actions: {
    type: Array,
    default: () => []
  },
  variant: {
    type: String,
    default: 'outline',
    validator: (value) => ['outline', 'ghost', 'secondary'].includes(value)
  },
  size: {
    type: String,
    default: 'icon',
    validator: (value) => ['sm', 'icon', 'default'].includes(value)
  },
  orientation: {
    type: String,
    default: 'horizontal',
    validator: (value) => ['horizontal', 'vertical'].includes(value)
  },
  label: String,
  class: String
})

const emit = defineEmits(['action'])

const actionGroupVariants = cva(
  "flex items-center",
  {
    variants: {
      orientation: {
        horizontal: "flex-row gap-2",
        vertical: "flex-col gap-2"
      }
    },
    defaultVariants: {
      orientation: "horizontal"
    }
  }
)

const containerVariants = cva(
  "flex items-center flex-wrap",
  {
    variants: {
      orientation: {
        horizontal: "gap-4 flex-shrink-0",
        vertical: "flex-col gap-3 items-start"
      }
    }
  }
)

const handleAction = (action) => {
  emit('action', action)
  if (action.handler && typeof action.handler === 'function') {
    action.handler()
  }
}
</script>

<template>
  <div :class="cn(containerVariants({ orientation }), props.class)">
    <!-- Label -->
    <span v-if="label" class="text-sm text-accent font-mono whitespace-nowrap">
      {{ label }}
    </span>
    
    <!-- Actions -->
    <div :class="cn(actionGroupVariants({ orientation }))">
      <Button
        v-for="action in actions"
        :key="action.key || action.title"
        :variant="variant"
        :size="size"
        :title="action.title"
        :disabled="action.disabled"
        :class="action.class || 'bg-surface border-border hover:bg-surface-secondary text-text-secondary'"
        @click="handleAction(action)"
      >
        <component 
          v-if="action.icon" 
          :is="action.icon" 
          class="w-4 h-4" 
        />
        <span v-if="action.text && size !== 'icon'">{{ action.text }}</span>
      </Button>
    </div>
  </div>
</template>