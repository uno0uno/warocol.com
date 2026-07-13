<script setup lang="ts">
import { ref, watch } from 'vue'
import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '../utils'
import { 
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon
} from '@heroicons/vue/24/outline'

// DataTable variants using ONLY semantic tokens (governance compliant)
const tableContainerVariants = cva(
  'rounded-xl shadow-sm border overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-data-table-container-bg border-data-table-border',
        minimal: 'bg-data-table-container-bg border-data-table-border/50',
        elevated: 'bg-data-table-container-bg border-data-table-border shadow-lg'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const headerSectionVariants = cva(
  'p-6',
  {
    variants: {
      variant: {
        default: 'bg-data-table-container-bg',
        minimal: 'bg-data-table-container-bg',
        elevated: 'bg-data-table-container-bg'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const tableHeaderVariants = cva(
  'border-b',
  {
    variants: {
      variant: {
        default: 'bg-data-table-header-bg border-data-table-border',
        minimal: 'bg-data-table-header-bg border-data-table-border',
        elevated: 'bg-data-table-header-bg border-data-table-border'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const tableRowVariants = cva(
  'border-b transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'border-data-table-border hover:bg-data-table-row-hover-bg',
        minimal: 'border-data-table-border hover:bg-data-table-row-hover-bg',
        elevated: 'border-data-table-border hover:bg-data-table-row-hover-bg'
      },
      rowType: {
        normal: '',
        totals: 'font-semibold border-t-2 bg-data-table-footer-bg'
      }
    },
    defaultVariants: {
      variant: 'default',
      rowType: 'normal'
    }
  }
)

export interface TableColumn {
  key: string
  title: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  format?: 'currency' | 'percentage' | 'number' | 'text'
  currencySymbol?: string
  precision?: number
  width?: string
  class?: string
}

export interface DataTableProps {
  variant?: VariantProps<typeof tableContainerVariants>['variant']
  // Header props
  title?: string
  subtitle?: string
  
  // Table props
  columns: TableColumn[]
  data: Record<string, any>[]
  loading?: boolean
  emptyMessage?: string
  
  // Sorting props
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  
  // Footer props
  showFooter?: boolean
  totalsData?: Record<string, any>
  
  // Header alignment (deprecated - headers should match content alignment)
  centerHeaders?: boolean

  // Per-row class function — return a class string for a row, or undefined for default styling
  rowClass?: (row: any) => string | undefined

  // Row density: 'sm' uses tighter padding for information-dense tables
  rowSize?: 'xs' | 'sm' | 'default'

  rowKey?: string | ((row: Record<string, any>) => string | number)
  animateNewRows?: boolean

  class?: string
}

interface Props extends DataTableProps {}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  loading: false,
  emptyMessage: 'No data available',
  sortDirection: 'asc',
  showFooter: false,
  centerHeaders: false,
  rowSize: 'default',
  rowKey: 'id',
  animateNewRows: true,
})

const emit = defineEmits<{
  sort: [field: string]
  rowClick: [row: any]
}>()

// Format cell values based on column format
function formatValue(value: any, column: TableColumn): string {
  if (value === null || value === undefined) return ''
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  const precision = column.precision ?? 2
  
  switch (column.format) {
    case 'currency':
      const symbol = column.currencySymbol || ''
      // Formato COP: usar puntos como separadores de miles
      const formattedNumber = numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      return symbol ? `${symbol}${formattedNumber}` : formattedNumber
    case 'percentage':
      return `${numValue.toFixed(precision)}%`
    case 'number':
      // Formato COP: usar puntos como separadores de miles
      return numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: column.precision ?? 0 })
    case 'text':
    default:
      // Check if it's a numeric string that should be formatted
      if (!isNaN(numValue) && numValue !== 0) {
        // Formato COP: usar puntos como separadores de miles
        return numValue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      }
      return String(value)
  }
}

// Get sort icon component
function getSortIcon(column: TableColumn) {
  if (!column.sortable) return null
  if (props.sortField !== column.key) return ChevronUpDownIcon
  return props.sortDirection === 'asc' ? ChevronUpIcon : ChevronDownIcon
}

// Handle sort click
function handleSort(column: TableColumn) {
  if (!column.sortable) return
  emit('sort', column.key)
}

function getCellColor(value: any, column: TableColumn): string {
  return 'text-data-table-cell-text'
}

function getRowKey(row: Record<string, any>, index: number): string | number {
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  const keyField = props.rowKey || 'id'
  return row?.[keyField] ?? row?.id ?? `${index}-${JSON.stringify(row)}`
}

const recentRowKeys = ref<Set<string | number>>(new Set())
let previousRowKeys = new Set<string | number>()
let hasInitializedRows = false

watch(
  () => props.data,
  (rows) => {
    const nextRowKeys = new Set(rows.map((row, index) => getRowKey(row, index)))

    if (!props.animateNewRows) {
      previousRowKeys = nextRowKeys
      hasInitializedRows = true
      recentRowKeys.value = new Set()
      return
    }

    if (!hasInitializedRows) {
      previousRowKeys = nextRowKeys
      hasInitializedRows = true
      return
    }

    const isProgressiveAppend =
      nextRowKeys.size > previousRowKeys.size &&
      Array.from(previousRowKeys).every(key => nextRowKeys.has(key))

    if (!isProgressiveAppend) {
      previousRowKeys = nextRowKeys
      recentRowKeys.value = new Set()
      return
    }

    const addedKeys = Array.from(nextRowKeys).filter(key => !previousRowKeys.has(key))
    recentRowKeys.value = new Set(addedKeys)
    previousRowKeys = nextRowKeys

    globalThis.setTimeout(() => {
      recentRowKeys.value = new Set()
    }, 900)
  },
  { deep: false, immediate: true }
)
</script>

<template>
  <div :class="cn(tableContainerVariants({ variant }), props.class)">
    <!-- Header Section -->
    <div v-if="title || subtitle || $slots.header" :class="headerSectionVariants({ variant })">
      <slot name="header">
        <h3 v-if="title" class="text-lg font-bold text-data-table-cell-text">
          {{ title }}
        </h3>
        <p v-if="subtitle" class="text-data-table-cell-muted text-sm">
          {{ subtitle }}
        </p>
      </slot>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="text-data-table-cell-muted">Loading table data...</div>
    </div>

    <!-- Table Body -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <!-- Table Header -->
        <thead>
          <tr :class="tableHeaderVariants({ variant })">
            <th
              v-for="column in columns"
              :key="column.key"
              :class="cn(
                rowSize === 'xs' ? 'py-1 px-2' : rowSize === 'sm' ? 'py-2 px-3' : 'py-3 px-4',
                'border-r border-dashed border-data-table-border/60 last:border-e-0',
                column.align === 'center' && 'text-center',
                column.align === 'right' && 'text-end',
                column.class
              )"
              :style="column.width ? { width: column.width } : undefined"
            >
              <slot :name="`header-${column.key}`">
                <!-- Sortable header button -->
                <button
                  v-if="column.sortable"
                  @click="handleSort(column)"
                  :class="cn(
                    'text-xs font-semibold text-data-table-header-text uppercase tracking-wider flex items-center gap-1 transition-colors hover:text-data-table-cell-text w-full',
                    column.align === 'left' && 'justify-start',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )"
                >
                  {{ column.title }}
                  <component
                    :is="getSortIcon(column)"
                    class="w-3 h-3"
                    v-if="getSortIcon(column)"
                  />
                </button>

                <!-- Non-sortable header -->
                <span
                  v-else
                  :class="cn(
                    'text-xs font-semibold text-data-table-header-text uppercase tracking-wider block',
                    (!column.align || column.align === 'left') && 'text-start',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-end'
                  )"
                >
                  {{ column.title }}
                </span>
              </slot>
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody>
          <!-- Empty State -->
          <tr v-if="data.length === 0">
            <td :colspan="columns.length" class="py-8 text-center text-data-table-cell-muted">
              {{ emptyMessage }}
            </td>
          </tr>

          <!-- Data Rows -->
          <tr
            v-else
            v-for="(row, index) in data"
            :key="getRowKey(row, index)"
            :class="[
              tableRowVariants({ variant, rowType: 'normal' }),
              rowClass?.(row) || (index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'),
              recentRowKeys.has(getRowKey(row, index)) && 'table-row-new',
              'cursor-pointer hover:bg-data-table-row-hover-bg transition-colors'
            ]"
            @click="emit('rowClick', row)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              :class="cn(
                rowSize === 'xs' ? 'py-1 px-2' : rowSize === 'sm' ? 'py-2 px-3' : 'py-3.5 px-4',
                'text-sm font-medium border-r border-dashed border-data-table-border/60 last:border-e-0',
                getCellColor(row[column.key], column),
                column.align === 'center' && 'text-center',
                column.align === 'right' && 'text-end',
                column.class
              )"
            >
              <!-- Custom slot for specific columns -->
              <slot 
                :name="`cell-${column.key}`" 
                :row="row" 
                :value="row[column.key]"
                :column="column"
                :formatted-value="formatValue(row[column.key], column)"
              >
                {{ formatValue(row[column.key], column) }}
              </slot>
            </td>
          </tr>
        </tbody>

        <!-- Table Footer (Totals) -->
        <tbody v-if="showFooter && totalsData">
          <tr :class="tableRowVariants({ variant, rowType: 'totals' })">
            <td
              v-for="column in columns"
              :key="`total-${column.key}`"
              :class="cn(
                'py-3.5 px-4 text-sm text-data-table-cell-text font-semibold border-r border-dashed border-data-table-border/60 last:border-e-0',
                column.align === 'center' && 'text-center',
                column.align === 'right' && 'text-end',
                column.class
              )"
            >
              <!-- Custom slot for total cells -->
              <slot 
                :name="`total-${column.key}`"
                :value="totalsData[column.key]"
                :column="column"
                :formatted-value="formatValue(totalsData[column.key], column)"
              >
                {{ formatValue(totalsData[column.key], column) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer Section (outside table) -->
    <div v-if="$slots.footer" class="p-6 border-t border-data-table-border bg-data-table-footer-bg">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
/* Padding horizontal para primera y última columna de tabla */
thead tr th:first-child,
tbody tr td:first-child {
  padding-left: 1.5rem; /* px-6 */
}

thead tr th:last-child,
tbody tr td:last-child {
  padding-right: 1.5rem; /* px-6 */
}

tbody tr.table-row-new > td {
  animation: table-row-cell-enter 0.85s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes table-row-cell-enter {
  0% {
    opacity: 0;
    transform: translateX(-16px);
    background-color: color-mix(in srgb, hsl(var(--data-table-row-new-bg)) 60%, transparent);
  }

  55% {
    opacity: 1;
    transform: translateX(0);
    background-color: color-mix(in srgb, hsl(var(--data-table-row-new-bg)) 40%, transparent);
  }

  100% {
    opacity: 1;
    transform: translateX(0);
    background-color: transparent;
  }
}
</style>
