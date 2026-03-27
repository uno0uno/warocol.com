<script setup lang="ts">
import { computed } from 'vue'
import { Star, Shield, Puzzle, AlertTriangle } from 'lucide-vue-next'

interface MenuProfitabilityItem {
  id: string
  name: string
  category: string
  price: number
  estimated_cost: number
  profit_per_unit: number
  profit_margin_pct: number
  order_count: number
  total_units_sold: number
  total_revenue: number
  total_profit: number
  avg_price: number
  classification: 'Star' | 'Plowhorse' | 'Puzzle' | 'Dog'
}

interface MatrixColumn {
  key: string
  title: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  format?: 'currency' | 'percentage' | 'number' | 'text'
}

const props = withDefaults(defineProps<{
  items?: MenuProfitabilityItem[]
  title?: string
  emptyMessage?: string
  emptySubMessage?: string
}>(), {
  title: 'Rentabilidad por producto',
  emptyMessage: 'No hay productos para analizar',
  emptySubMessage: 'Los productos aparecerán aquí cuando haya ventas en el período seleccionado',
})

const menuItems = computed(() => props.items || [])

const tableColumns: MatrixColumn[] = [
  { key: 'name', title: 'Producto', sortable: false, align: 'left', format: 'text' },
  { key: 'classification', title: 'Clasificación', sortable: false, align: 'center', format: 'text' },
  { key: 'total_units_sold', title: 'Unidades', sortable: false, align: 'right', format: 'number' },
  { key: 'estimated_cost', title: 'Costo', sortable: false, align: 'right', format: 'text' },
  { key: 'price', title: 'Precio', sortable: false, align: 'right', format: 'text' },
  { key: 'profit_margin_pct', title: 'Margen', sortable: false, align: 'right', format: 'text' },
  { key: 'total_revenue', title: 'Ingresos', sortable: false, align: 'right', format: 'text' },
  { key: 'total_profit', title: 'Ganancia', sortable: false, align: 'right', format: 'text' },
]

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'Star':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: Star, label: 'Excelente' }
    case 'Plowhorse':
      return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Shield, label: 'Popular' }
    case 'Puzzle':
      return { bg: 'bg-orange-100', text: 'text-orange-700', icon: Puzzle, label: 'Potencial' }
    case 'Dog':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, label: 'Crítico' }
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', icon: Star, label: 'Unknown' }
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const totals = computed(() => {
  const items = menuItems.value
  if (!items.length) return null

  const revenue = items.reduce((sum, item) => sum + (item.total_revenue || 0), 0)
  const profit = items.reduce((sum, item) => sum + (item.total_profit || 0), 0)

  return {
    units: items.reduce((sum, item) => sum + (item.total_units_sold || 0), 0),
    revenue,
    profit,
    margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
  }
})
</script>

<template>
  <div class="overflow-hidden">
    <UiResponsiveDataView
      :columns="tableColumns"
      :data="menuItems"
      :title="title"
      :empty-message="emptyMessage"
      :empty-sub-message="emptySubMessage"
      variant="default"
      row-size="sm"
    >
      <template #card="{ item }">
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-text-primary truncate">{{ item.name }}</p>
              <p class="text-xs text-text-secondary mt-1">
                {{ item.total_units_sold || 0 }} unidades
              </p>
            </div>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide shrink-0"
              :class="[getCategoryStyles(item.classification).bg, getCategoryStyles(item.classification).text]"
            >
              <component :is="getCategoryStyles(item.classification).icon" :size="12" />
              {{ getCategoryStyles(item.classification).label }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div>
              <p class="text-text-secondary text-xs">Costo</p>
              <p class="text-text-primary">{{ item.estimated_cost ? formatCurrency(item.estimated_cost) : '—' }}</p>
            </div>
            <div>
              <p class="text-text-secondary text-xs">Precio</p>
              <p class="text-text-primary font-semibold">{{ item.price ? formatCurrency(item.price) : '—' }}</p>
            </div>
            <div>
              <p class="text-text-secondary text-xs">Margen</p>
              <p :class="item.profit_margin_pct >= 40 ? 'text-green-600 font-bold' : 'text-text-primary'">
                {{ item.profit_margin_pct ? `${item.profit_margin_pct}%` : '—' }}
              </p>
            </div>
            <div>
              <p class="text-text-secondary text-xs">Ganancia</p>
              <p class="text-green-600 font-bold">{{ item.total_profit ? formatCurrency(item.total_profit) : '—' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-text-secondary text-xs">Ingresos</p>
              <p class="text-text-primary font-semibold">{{ item.total_revenue ? formatCurrency(item.total_revenue) : '—' }}</p>
            </div>
          </div>
        </div>
      </template>

      <template #cell-name="{ value }">
        <span class="font-medium text-text-primary">{{ value }}</span>
      </template>

      <template #cell-classification="{ row }">
        <div class="flex justify-center">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
            :class="[getCategoryStyles(row.classification).bg, getCategoryStyles(row.classification).text]"
          >
            <component :is="getCategoryStyles(row.classification).icon" :size="12" />
            {{ getCategoryStyles(row.classification).label }}
          </span>
        </div>
      </template>

      <template #cell-total_units_sold="{ value }">
        <div class="text-right text-text-primary">{{ value || 0 }}</div>
      </template>

      <template #cell-estimated_cost="{ value }">
        <div class="text-right text-text-primary">{{ value ? formatCurrency(value) : '—' }}</div>
      </template>

      <template #cell-price="{ value }">
        <div class="text-right font-semibold text-text-primary">{{ value ? formatCurrency(value) : '—' }}</div>
      </template>

      <template #cell-profit_margin_pct="{ value }">
        <div class="text-right" :class="value >= 40 ? 'text-green-600 font-bold' : 'text-text-primary'">
          {{ value ? `${value}%` : '—' }}
        </div>
      </template>

      <template #cell-total_revenue="{ value }">
        <div class="text-right font-semibold text-text-primary">{{ value ? formatCurrency(value) : '—' }}</div>
      </template>

      <template #cell-total_profit="{ value }">
        <div class="text-right text-green-600 font-bold">{{ value ? formatCurrency(value) : '—' }}</div>
      </template>
    </UiResponsiveDataView>

    <div
      v-if="totals"
      class="mt-3 border border-border rounded-xl bg-surface-secondary px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm"
    >
      <div>
        <p class="text-text-secondary text-xs">Total productos</p>
        <p class="font-semibold text-text-primary">{{ menuItems.length }}</p>
      </div>
      <div>
        <p class="text-text-secondary text-xs">Unidades</p>
        <p class="font-semibold text-text-primary">{{ totals.units }}</p>
      </div>
      <div>
        <p class="text-text-secondary text-xs">Margen global</p>
        <p class="font-semibold text-text-primary">{{ totals.margin }}%</p>
      </div>
      <div>
        <p class="text-text-secondary text-xs">Ingresos</p>
        <p class="font-semibold text-text-primary">{{ formatCurrency(totals.revenue) }}</p>
      </div>
      <div>
        <p class="text-text-secondary text-xs">Ganancia</p>
        <p class="font-semibold text-green-600">{{ formatCurrency(totals.profit) }}</p>
      </div>
    </div>
  </div>
</template>
