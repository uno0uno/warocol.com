<template>
  <th
    :class="[
      'px-4 py-4 text-left text-sm text-foreground uppercase tracking-wider table-header-bold',
      canSort ? 'cursor-pointer select-none hover:text-foreground' : ''
    ]"
    @click="canSort ? $emit('sort') : undefined"
  >
    <div class="flex items-center space-x-2">
      <slot />
      <template v-if="canSort">
        <Icon name="heroicons:chevron-up-down" v-if="!sortDirection" class="h-4 w-4" />
        <Icon name="heroicons:chevron-up" v-else-if="sortDirection === 'asc'" class="h-4 w-4" />
        <Icon name="heroicons:chevron-down" v-else class="h-4 w-4" />
      </template>
    </div>
  </th>
</template>

<script setup lang="ts">
import Icon from '~/components/ui/Icon.vue'

defineProps({
  canSort: {
    type: Boolean,
    default: false
  },
  sortDirection: {
    type: String,
    default: null,
    validator: (value) => [null, 'asc', 'desc'].includes(value)
  }
})

defineEmits(['sort'])
</script>

<style scoped>
.table-header-bold {
  font-weight: 700 !important;
}
</style>