<script setup>
import { cn } from '../utils'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  activeTab: {
    type: String,
    default: ''
  },
  class: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:activeTab'])

const handleTabClick = (tabValue) => {
  emit('update:activeTab', tabValue)
}
</script>

<template>
  <div :class="cn('bg-card rounded-lg border', props.class)">
    <div class="flex items-center px-6 gap-8">
      <button
        v-for="tab in items"
        :key="tab.value"
        @click="handleTabClick(tab.value)"
        :class="cn(
          'py-4 text-sm font-medium border-b-2 border-transparent transition-colors',
          activeTab === tab.value
            ? 'text-primary border-primary'
            : 'text-muted-foreground hover:text-foreground'
        )"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>