<template>
  <div 
    :class="[
      'animate-pulse rounded-md bg-muted',
      sizeClasses,
      shapeClasses,
      variantClasses
    ]"
  />
</template>

<script setup lang="ts">
const props = defineProps({
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['sm', 'default', 'lg', 'xl', 'profile', 'avatar'].includes(value)
  },
  shape: {
    type: String,
    default: 'rectangle',
    validator: (value) => ['rectangle', 'circle', 'rounded'].includes(value)
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'light', 'profile'].includes(value)
  }
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'h-4 w-16',
    default: 'h-6 w-24',
    lg: 'h-8 w-32',
    xl: 'h-12 w-48',
    profile: 'h-24 w-24',
    avatar: 'h-16 w-16'
  }
  return sizes[props.size] || sizes.default
})

const shapeClasses = computed(() => {
  const shapes = {
    rectangle: 'rounded-md',
    circle: 'rounded-full',
    rounded: 'rounded-lg'
  }
  return shapes[props.shape] || shapes.rectangle
})

const variantClasses = computed(() => {
  const variants = {
    default: 'bg-muted/70',
    light: 'bg-muted/45',
    profile: 'bg-surface/20 backdrop-blur-sm'
  }
  return variants[props.variant] || variants.default
})
</script>
