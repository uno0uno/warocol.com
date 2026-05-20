<script setup lang="ts">
import { computed } from 'vue'
import { Star, Shield, Puzzle, AlertTriangle, Info } from 'lucide-vue-next'

interface MenuProfitabilityItem {
  id: string
  name: string
  category: string
  price: number
  estimated_cost: number
  costo_percibido?: number | null
  profit_per_unit: number
  profit_margin_pct: number
  profit_margin_real_pct?: number | null
  profit_margin_operativo_pct?: number | null
  cost_used_for_classification?: 'real' | 'operativo'
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

const {
  marginRealPct,
  marginOperativoPct,
  formatCostCell: formatCostCellValue,
} = useProductMargins()

const tableColumns: MatrixColumn[] = [
  { key: 'name', title: 'Producto', sortable: false, align: 'left', format: 'text' },
  { key: 'classification', title: 'Clasificación', sortable: false, align: 'center', format: 'text' },
  { key: 'total_units_sold', title: 'Unidades', sortable: false, align: 'right', format: 'number' },
  { key: 'estimated_cost', title: 'Costo real', sortable: false, align: 'right', format: 'text' },
  { key: 'costo_percibido', title: 'Mi costo', sortable: false, align: 'right', format: 'text' },
  { key: 'price', title: 'Precio', sortable: false, align: 'right', format: 'text' },
  { key: 'profit_margin_real_pct', title: 'Margen real', sortable: false, align: 'right', format: 'text' },
  { key: 'profit_margin_operativo_pct', title: 'Margen op.', sortable: false, align: 'right', format: 'text' },
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

const formatCostCell = (value: unknown) => formatCostCellValue(value, formatCurrency)

/** Map analytics row to margin helpers (estimated_cost = real). */
function marginRow(item: MenuProfitabilityItem) {
  return {
    price: item.price,
    costo_calculado: item.estimated_cost,
    costo_percibido: item.costo_percibido,
    margen_real_pct: item.profit_margin_real_pct,
    margen_operativo_pct: item.profit_margin_operativo_pct,
  }
}

const usesOperativoClassification = computed(() =>
  menuItems.value.some(i => i.cost_used_for_classification === 'operativo')
)

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
    <p
      v-if="usesOperativoClassification"
      class="flex items-start gap-2 text-xs text-text-secondary mb-3 px-1"
    >
      <Info :size="14" class="flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        La matriz BCG usa <strong>mi costo del plato</strong> cuando está configurado; si no, costo real del sistema.
        <strong>Costo real</strong> = inventario/compras; <strong>mi costo</strong> = referencia operativa que tú defines.
      </span>
    </p>

    <UiResponsiveDataView
      :columns="tableColumns"
      :data="menuItems"
      :empty-message="emptyMessage"
      :empty-sub-message="emptySubMessage"
      variant="default"
      row-size="sm"
    >
      <template #card="{ item, index }">
        <div
          class="flex items-center gap-3 py-3 px-3 border-b border-border"
          :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
        >
          <div
            class="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
            :class="getCategoryStyles(item.classification).bg"
          >
            <component
              :is="getCategoryStyles(item.classification).icon"
              :size="16"
              :class="getCategoryStyles(item.classification).text"
            />
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-text-primary leading-tight truncate">{{ item.name }}</p>
            <p class="text-xs text-text-secondary mt-0.5">
              {{ item.total_units_sold || 0 }} uds · {{ getCategoryStyles(item.classification).label }}
            </p>
            <p class="text-xs text-text-tertiary">
              Real: {{ formatCostCell(item.estimated_cost) }}
              · Mi costo: {{ formatCostCell(item.costo_percibido) }}
            </p>
          </div>

          <div class="flex flex-col items-end gap-1 flex-shrink-0">
            <UiStatusBadge
              v-if="marginRealPct(marginRow(item)) !== null"
              :value="marginRealPct(marginRow(item))!"
              format="percentage"
              :variant="(marginRealPct(marginRow(item)) ?? 0) >= 0 ? 'success' : 'secondary'"
              size="sm"
              title="Margen real"
            />
            <UiStatusBadge
              v-if="marginOperativoPct(marginRow(item)) !== null"
              :value="marginOperativoPct(marginRow(item))!"
              format="percentage"
              variant="secondary"
              size="sm"
              title="Margen operativo"
            />
            <span class="text-xs text-text-secondary">
              {{ item.total_profit ? formatCurrency(item.total_profit) : '—' }}
            </span>
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
        <div class="text-right text-text-primary">{{ formatCostCell(value) }}</div>
      </template>

      <template #cell-costo_percibido="{ value }">
        <div class="text-right text-text-primary">{{ formatCostCell(value) }}</div>
      </template>

      <template #cell-price="{ value }">
        <div class="text-right font-semibold text-text-primary">{{ value ? formatCurrency(value) : '—' }}</div>
      </template>

      <template #cell-profit_margin_real_pct="{ row }">
        <div class="text-right">
          <span
            v-if="marginRealPct(marginRow(row)) !== null"
            :class="(marginRealPct(marginRow(row)) ?? 0) >= 40 ? 'text-green-600 font-bold' : 'text-text-primary'"
          >
            {{ marginRealPct(marginRow(row))!.toFixed(1) }}%
          </span>
          <span v-else class="text-text-secondary">—</span>
        </div>
      </template>

      <template #cell-profit_margin_operativo_pct="{ row }">
        <div class="text-right">
          <span
            v-if="marginOperativoPct(marginRow(row)) !== null"
            class="text-text-primary font-medium"
          >
            {{ marginOperativoPct(marginRow(row))!.toFixed(1) }}%
          </span>
          <span v-else class="text-text-secondary">—</span>
        </div>
      </template>

      <template #header-total_revenue>
        <div class="flex items-center justify-end gap-1">
          <span>Ingresos</span>
          <span
            class="text-text-secondary cursor-default"
            title="Los ingresos reflejan el precio neto después de descuentos aplicados"
            aria-label="Los ingresos reflejan el precio neto después de descuentos aplicados"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </span>
        </div>
      </template>

      <template #cell-total_revenue="{ value }">
        <div class="text-right font-semibold text-text-primary">{{ value ? formatCurrency(value) : '—' }}</div>
      </template>

      <template #cell-total_profit="{ value }">
        <div class="text-right text-green-600 font-bold">{{ value ? formatCurrency(value) : '—' }}</div>
      </template>
    </UiResponsiveDataView>
  </div>
</template>
