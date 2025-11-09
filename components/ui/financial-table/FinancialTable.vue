<script setup lang="ts">
import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '../utils'
import { 
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon
} from '@heroicons/vue/24/outline'

// Financial table variants using semantic tokens only
const tableVariants = cva(
  'w-full overflow-x-auto',
  {
    variants: {
      variant: {
        default: 'bg-surface border border-border rounded-xl shadow-sm',
        minimal: 'bg-surface',
        bordered: 'bg-surface border border-border'
      },
      size: {
        sm: 'text-sm',
        default: '',
        lg: 'text-lg'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

const headerVariants = cva(
  'border-b transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-surface-secondary border-border',
        minimal: 'border-border',
        bordered: 'bg-surface-tertiary border-border'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const rowVariants = cva(
  'border-b transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border hover:bg-surface-secondary',
        minimal: 'border-border hover:bg-surface-tertiary/50',
        bordered: 'border-border hover:bg-surface-secondary'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const cellVariants = cva(
  'py-4 px-2',
  {
    variants: {
      align: {
        left: 'text-left',
        center: 'text-center', 
        right: 'text-right'
      },
      size: {
        sm: 'py-2 px-1',
        default: 'py-4 px-2',
        lg: 'py-6 px-4'
      }
    },
    defaultVariants: {
      align: 'left',
      size: 'default'
    }
  }
)

export interface Column {
  key: string
  title: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  format?: 'currency' | 'percentage' | 'number' | 'text'
  precision?: number
  class?: string
}

export interface FinancialTableProps {
  variant?: VariantProps<typeof tableVariants>['variant']
  size?: VariantProps<typeof tableVariants>['size']
  columns: Column[]
  data: Record<string, any>[]
  loading?: boolean
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  showTotals?: boolean
  totalsData?: Record<string, any>
  emptyMessage?: string
  class?: string
}

interface Props extends FinancialTableProps {}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  loading: false,
  sortDirection: 'asc',
  showTotals: false,
  emptyMessage: 'No data available'
})

const emit = defineEmits<{
  sort: [field: string]
}>()

// Format cell value based on column format
function formatCellValue(value: any, column: Column): string {
  if (value === null || value === undefined) return ''
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  const precision = column.precision ?? 2
  
  switch (column.format) {
    case 'currency':
      return `$${numValue.toLocaleString()}`
    case 'percentage':
      return `${numValue.toFixed(precision)}%`
    case 'number':
      return numValue.toLocaleString()
    case 'text':
    default:
      return String(value)
  }
}

// Get sort icon component
function getSortIcon(column: Column): any {
  if (!column.sortable) return null
  
  if (props.sortField !== column.key) return ChevronUpDownIcon
  return props.sortDirection === 'asc' ? ChevronUpIcon : ChevronDownIcon
}

// Handle sort click
function handleSort(column: Column) {
  if (!column.sortable) return
  emit('sort', column.key)
}

// Get value color for financial data
function getValueColor(value: any, column: Column): string {
  if (column.format === 'percentage' || column.format === 'currency') {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    return numValue >= 0 ? 'text-success' : 'text-destructive'
  }
  return 'text-text-primary'
}
</script>

<template>
  <div :class="cn(tableVariants({ variant, size }), props.class)">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="text-text-secondary">Loading...</div>
    </div>
    
    <!-- Table Content -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <!-- Header -->
        <thead>
          <tr :class="headerVariants({ variant })">
            <th 
              v-for="column in columns" 
              :key="column.key"
              :class="cn(cellVariants({ align: column.align, size }), column.class)"
            >
              <button 
                v-if="column.sortable"
                @click="handleSort(column)"
                :class="cn(
                  'font-bold flex items-center gap-1 transition-colors text-text-primary hover:text-primary',
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
              <span 
                v-else
                :class="cn('font-bold text-text-primary', {
                  'block text-center': column.align === 'center',
                  'block text-right': column.align === 'right'
                })"
              >
                {{ column.title }}
              </span>
            </th>
          </tr>
        </thead>
        
        <!-- Body -->
        <tbody>
          <!-- Empty State -->
          <tr v-if="data.length === 0">
            <td :colspan="columns.length" :class="cellVariants({ align: 'center', size })">
              <div class="py-8 text-text-secondary">
                {{ emptyMessage }}
              </div>
            </td>
          </tr>
          
          <!-- Data Rows -->
          <tr 
            v-else
            v-for="(row, index) in data" 
            :key="index"
            :class="rowVariants({ variant })"
          >
            <td 
              v-for="column in columns"
              :key="column.key"
              :class="cn(
                cellVariants({ align: column.align, size }),
                getValueColor(row[column.key], column),
                column.class
              )"
            >
              <!-- Custom slot for column if provided -->
              <slot 
                :name="`cell-${column.key}`" 
                :row="row" 
                :value="row[column.key]"
                :column="column"
              >
                {{ formatCellValue(row[column.key], column) }}
              </slot>
            </td>
          </tr>
          
          <!-- Totals Row -->
          <tr 
            v-if="showTotals && totalsData"
            :class="cn(headerVariants({ variant }), 'font-semibold border-t-2')"
          >
            <td 
              v-for="column in columns"
              :key="`total-${column.key}`"
              :class="cn(
                cellVariants({ align: column.align, size }),
                'text-text-primary font-semibold',
                column.class
              )"
            >
              <slot 
                :name="`total-${column.key}`"
                :value="totalsData[column.key]"
                :column="column"
              >
                {{ formatCellValue(totalsData[column.key], column) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>