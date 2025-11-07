<script setup lang="ts">
import { cn } from '../utils'

export interface CardHeaderProps {
  class?: string
}

interface Props extends CardHeaderProps {}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('flex flex-col space-y-1.5 p-6', props.class)">
    <slot />
  </div>
</template>