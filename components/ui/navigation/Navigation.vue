<script setup lang="ts">
import { cn } from '../utils'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  class: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <nav :class="cn('flex items-center gap-6', props.class)">
    <ul class="flex items-center gap-6 list-none">
      <li v-for="item in items" :key="item.href">
        <NuxtLink 
          :to="item.href"
          :class="cn(
            'text-sm text-gray-300 hover:text-white transition-colors',
            item.active && 'text-white font-medium'
          )"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>