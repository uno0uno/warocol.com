<script setup lang="ts">
import { cn } from '../utils'
import { cva } from 'class-variance-authority'
import { UserIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  src: String,
  alt: {
    type: String,
    default: 'Avatar'
  },
  fallback: String,
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'profile'].includes(value)
  },
  shape: {
    type: String,
    default: 'circle',
    validator: (value) => ['circle', 'square', 'rounded'].includes(value)
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'profile'].includes(value)
  },
  class: String
})

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10", 
        lg: "h-16 w-16",
        xl: "h-20 w-20",
        profile: "h-[140px] w-[140px]"
      },
      shape: {
        circle: "rounded-full",
        square: "",
        rounded: "rounded-lg"
      },
      variant: {
        default: "",
        profile: "p-1"
      }
    },
    defaultVariants: {
      size: "md",
      shape: "circle",
      variant: "default"
    }
  }
)

const fallbackVariants = cva(
  "flex h-full w-full items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        profile: "bg-gradient-to-br from-accent to-primary text-foreground"
      },
      shape: {
        circle: "rounded-full",
        square: "",
        rounded: "rounded-lg"
      }
    },
    defaultVariants: {
      variant: "default",
      shape: "circle"
    }
  }
)

const iconSizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
  profile: 'w-16 h-16'
}

const showFallback = ref(false)

const handleImageError = () => {
  showFallback.value = true
}
</script>

<template>
  <div 
    :class="cn(
      avatarVariants({ size, shape, variant }),
      props.class
    )"
  >
    <!-- Profile variant wrapper -->
    <div 
      v-if="variant === 'profile'"
      :class="cn(
        'h-full w-full flex items-center justify-center bg-gradient-to-br from-accent to-primary',
        shape === 'square' ? '' : shape === 'rounded' ? 'rounded-lg' : 'rounded-full'
      )"
    >
      <div 
        :class="cn(
          'h-[calc(100%-8px)] w-[calc(100%-8px)] bg-background flex items-center justify-center overflow-hidden',
          shape === 'square' ? '' : shape === 'rounded' ? 'rounded-lg' : 'rounded-full'
        )"
      >
        <img
          v-if="src && !showFallback"
          :src="src"
          :alt="alt"
          :class="cn(
            'aspect-square h-full w-full object-cover',
            shape === 'square' ? '' : shape === 'rounded' ? 'rounded-lg' : 'rounded-full'
          )"
          @error="handleImageError"
        />
        <div
          v-else
          :class="cn(
            fallbackVariants({ variant, shape })
          )"
        >
          <UserIcon :class="iconSizeClasses[size]" />
        </div>
      </div>
    </div>

    <!-- Default variant -->
    <template v-else>
      <img
        v-if="src && !showFallback"
        :src="src"
        :alt="alt"
        :class="cn(
          'aspect-square h-full w-full object-cover',
          shape === 'square' ? '' : shape === 'rounded' ? 'rounded-lg' : 'rounded-full'
        )"
        @error="handleImageError"
      />
      <div
        v-else
        :class="cn(
          fallbackVariants({ variant, shape })
        )"
      >
        <UserIcon :class="iconSizeClasses[size]" />
      </div>
    </template>
  </div>
</template>