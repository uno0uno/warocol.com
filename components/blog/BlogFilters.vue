<script setup lang="ts">
interface Props {
  filters: string[]
  activeFilter?: string
}

const props = withDefaults(defineProps<Props>(), {
  activeFilter: 'All'
})

const emit = defineEmits<{
  'update:activeFilter': [filter: string]
}>()

const handleFilterClick = (filter: string) => {
  emit('update:activeFilter', filter)
}
</script>

<template>
  <div class="flex gap-2 flex-wrap">
    <button
      v-for="filter in filters"
      :key="filter"
      :class="[
        'px-4 py-2 rounded-full text-sm font-medium transition-all',
        activeFilter === filter
          ? 'bg-ebony-900 text-white'
          : 'bg-transparent text-ebony-600 hover:bg-titan-100 hover:text-ebony-900'
      ]"
      @click="handleFilterClick(filter)"
    >
      {{ filter }}
    </button>
  </div>
</template>
