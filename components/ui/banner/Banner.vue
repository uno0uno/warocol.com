<script setup lang="ts">
import { cva } from 'class-variance-authority'
import { cn } from '../utils'

const props = defineProps({
  variant: {
    type: String,
    default: 'gradient',
    validator: (value) => ['gradient', 'solid', 'image', 'pattern'].includes(value)
  },
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['sm', 'default', 'lg'].includes(value)
  },
  src: String,
  alt: String,
  class: String
})

const bannerVariants = cva(
  "w-full relative overflow-hidden",
  {
    variants: {
      variant: {
        gradient: "bg-gradient-to-br from-surface to-primary",
        solid: "bg-surface",
        image: "bg-surface",
        pattern: "bg-gradient-to-br from-surface to-surface-secondary"
      },
      size: {
        sm: "h-32",
        default: "h-48",
        lg: "h-64 md:h-80"
      }
    },
    defaultVariants: {
      variant: "gradient",
      size: "default"
    }
  }
)

const overlayVariants = cva(
  "absolute inset-0 border-x-2 border-b-2 border-border rounded-b-lg ",
  {
    variants: {
      variant: {
        gradient: "",
        solid: "",
        image: "bg-black/20",
      }
    }
  }
)
</script>

<template>
  <div 
    :class="cn(
      bannerVariants({ variant, size }),
      props.class
    )"
  >
    <!-- Background Image -->
    <img
      v-if="variant === 'image' && src"
      :src="src"
      :alt="alt || 'Banner'"
      class="w-full h-full object-cover"
    />
    
    <!-- Pattern Overlay -->
    <div 
      v-if="variant === 'pattern'"
      :class="cn(overlayVariants({ variant }))"
      style="background-image: 
        repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px),
        repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px);"
    />
    
    <!-- General Overlay -->
    <div 
      v-if="variant === 'image'"
      :class="cn(overlayVariants({ variant }))"
    />
    
    <!-- Content Slot -->
    <div class="relative z-10 h-full flex items-center justify-center">
      <slot />
    </div>
  </div>
</template>