<script setup lang="ts">
import { cn } from '../utils'

export interface CardProps {
  class?: string
}

interface Props extends CardProps {}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('rounded-lg border bg-card text-card-foreground shadow-sm', props.class)">
    <slot />
  </div>
</template>