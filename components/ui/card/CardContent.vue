<script setup lang="ts">
import { cn } from '../utils'

export interface CardContentProps {
  class?: string
}

interface Props extends CardContentProps {}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('p-6 pt-0', props.class)">
    <slot />
  </div>
</template>