<script setup lang="ts">
import { ref } from 'vue'

const WAREHOUSE_COPY = useWarehouseCopy()
const isOpen = ref(false)
</script>

<template>
  <div>
    <button
      type="button"
      class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <Icon name="heroicons:information-circle" class="h-4 w-4 flex-shrink-0 text-primary" />
      <span>{{ WAREHOUSE_COPY.warehouseItem }} / {{ WAREHOUSE_COPY.menuProduct }}</span>
      <Icon
        name="heroicons:chevron-down"
        class="h-3.5 w-3.5 flex-shrink-0 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <div
      v-if="isOpen"
      class="mt-2 grid gap-2 rounded-lg border border-border bg-surface-secondary/40 p-3 text-xs leading-relaxed text-text-secondary sm:grid-cols-2"
    >
      <div class="flex min-w-0 items-start gap-2">
        <Icon name="heroicons:cube" class="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <p>
          <strong class="font-medium text-text-primary">{{ WAREHOUSE_COPY.warehouseItem }}</strong>
          {{ WAREHOUSE_COPY.recipeWarehouseHint }}
        </p>
      </div>
      <div class="flex min-w-0 items-start gap-2">
        <Icon name="heroicons:shopping-bag" class="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <p>
          <strong class="font-medium text-text-primary">{{ WAREHOUSE_COPY.menuProduct }}</strong>
          {{ WAREHOUSE_COPY.recipeMenuProductHint }}
        </p>
      </div>
    </div>
  </div>
</template>
