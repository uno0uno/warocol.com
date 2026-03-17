<template>
  <div>
    <!-- Mobile: Cards View -->
    <div class="md:hidden">
      <!-- Mobile Header (optional) -->
      <div v-if="$slots.mobileHeader || title" class="bg-white border border-border rounded-lg mb-3">
        <div class="p-4 border-b border-border">
          <slot name="mobileHeader">
            <div class="flex flex-col gap-3">
              <h3 v-if="title" class="text-base font-bold text-text-primary">
                {{ title }}
              </h3>
              <slot name="mobileActions" />
            </div>
          </slot>
        </div>
      </div>

      <!-- Cards List -->
      <div class="grid grid-cols-1 gap-3">
        <slot name="card" v-for="item in data" :item="item" :key="getItemKey(item)" />

        <!-- Empty State -->
        <div v-if="data.length === 0" class="text-center py-12 col-span-1">
          <slot name="empty">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-surface-secondary rounded-full mb-4">
              <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p class="text-text-primary font-medium">{{ emptyMessage }}</p>
            <p class="text-muted-foreground text-sm mt-1">{{ emptySubMessage }}</p>
          </slot>
        </div>
      </div>
    </div>

    <!-- Desktop: Table View -->
    <div class="hidden md:block">
      <UiDataTable
        :columns="columns"
        :data="data"
        :variant="variant"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        :row-class="rowClass"
        @sort="$emit('sort', $event)"
        @row-click="$emit('row-click', $event)"
      >
        <!-- Pass through all table slots -->
        <template v-if="$slots.header" #header>
          <slot name="header" />
        </template>

        <!-- Dynamic cell slots -->
        <template v-for="column in columns" :key="`cell-${column.key}`" #[`cell-${column.key}`]="slotProps">
          <slot :name="`cell-${column.key}`" v-bind="slotProps">
            {{ slotProps.value }}
          </slot>
        </template>
      </UiDataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Column {
  key: string
  title: string
  sortable?: boolean
  format?: string
  align?: 'left' | 'center' | 'right'
}

interface Props {
  // Table columns for desktop
  columns: Column[]
  // Data array
  data: any[]
  // Table variant (from UiDataTable)
  variant?: 'default' | 'compact'
  // Mobile header title
  title?: string
  // Empty state messages
  emptyMessage?: string
  emptySubMessage?: string
  // Key field for v-for (default: 'id')
  itemKey?: string
  // Sorting props
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  // Per-row class function for desktop table highlighting
  rowClass?: (row: any) => string | undefined
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  emptyMessage: 'No hay elementos para mostrar',
  emptySubMessage: 'Los elementos aparecerán aquí cuando estén disponibles',
  itemKey: 'id',
  sortDirection: 'asc'
})

// Define emits
defineEmits(['sort', 'row-click'])

// Get unique key for items
const getItemKey = (item: any) => {
  return item[props.itemKey] || item.id || JSON.stringify(item)
}
</script>
