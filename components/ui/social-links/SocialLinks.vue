<script setup>
import { cva } from 'class-variance-authority'
import { cn } from '../utils'

const props = defineProps({
  links: {
    type: Array,
    default: () => []
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'compact', 'buttons'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  class: String
})

const socialLinksVariants = cva(
  "flex items-center gap-2",
  {
    variants: {
      variant: {
        default: "",
        compact: "gap-1",
        buttons: "gap-3"
      },
      size: {
        sm: "text-sm",
        md: "text-base", 
        lg: "text-lg"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
)

const linkVariants = cva(
  "inline-flex items-center justify-center transition-colors",
  {
    variants: {
      variant: {
        default: "text-text-secondary hover:text-foreground",
        compact: "text-text-secondary hover:text-foreground",
        buttons: "px-3 py-2 bg-surface border border-border rounded-md text-text-secondary hover:bg-surface-secondary hover:text-foreground"
      },
      size: {
        sm: "w-6 h-6",
        md: "w-8 h-8",
        lg: "w-10 h-10"
      }
    },
    compoundVariants: [
      {
        variant: "buttons",
        size: "sm",
        class: "px-2 py-1 text-sm"
      },
      {
        variant: "buttons", 
        size: "lg",
        class: "px-4 py-3 text-lg"
      }
    ]
  }
)
</script>

<template>
  <div :class="cn(socialLinksVariants({ variant, size }), props.class)">
    <a
      v-for="link in links"
      :key="link.platform"
      :href="link.url"
      :title="link.platform"
      target="_blank"
      rel="noopener noreferrer"
      :class="cn(linkVariants({ variant, size }))"
    >
      <component 
        v-if="link.icon" 
        :is="link.icon" 
        :class="variant === 'buttons' ? 'w-4 h-4 mr-2' : 'w-full h-full'"
      />
      <span v-if="variant === 'buttons'">{{ link.platform }}</span>
    </a>
  </div>
</template>