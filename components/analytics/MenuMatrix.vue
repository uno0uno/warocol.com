<script setup lang="ts">
import { computed } from 'vue';
import { Star, Shield, Puzzle, AlertTriangle } from 'lucide-vue-next';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  estimated_cost: number;
  profit_per_unit: number;
  profit_margin_pct: number;
  order_count: number;
  total_units_sold: number;
  total_revenue: number;
  total_profit: number;
  avg_price: number;
  classification: 'Star' | 'Plowhorse' | 'Puzzle' | 'Dog';
}

const props = defineProps<{
  menuData?: {
    menu_items: MenuItem[];
    summary: {
      total_items: number;
      stars: number;
      plowhorses: number;
      puzzles: number;
      dogs: number;
      avg_profit_margin_pct: number;
    };
    period: {
      from: string;
      to: string;
      days: number;
    };
  };
}>();

const menuItems = computed(() => {
  if (!props.menuData?.menu_items) {
    return [
      { name: 'Cargando...', classification: 'Star', profit_margin_pct: 0 },
    ];
  }
  return props.menuData.menu_items;
});

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'Star':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: Star, label: 'Excelente' };
    case 'Plowhorse':
      return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Shield, label: 'Popular' };
    case 'Puzzle':
      return { bg: 'bg-orange-100', text: 'text-orange-700', icon: Puzzle, label: 'Potencial' };
    case 'Dog':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, label: 'Crítico' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', icon: Star, label: 'Unknown' };
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value);
};

const totals = computed(() => {
  const items = props.menuData?.menu_items
  if (!items || items.length === 0) return null
  return {
    units: items.reduce((s, i) => s + (i.total_units_sold || 0), 0),
    revenue: items.reduce((s, i) => s + (i.total_revenue || 0), 0),
    profit: items.reduce((s, i) => s + (i.total_profit || 0), 0),
    margin: items.reduce((s, i) => s + (i.total_revenue || 0), 0) > 0
      ? Math.round(items.reduce((s, i) => s + (i.total_profit || 0), 0) /
          items.reduce((s, i) => s + (i.total_revenue || 0), 0) * 100)
      : 0
  }
})
</script>

<template>
  <div class="overflow-hidden">
    <table class="w-full text-sm text-left">
      <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
        <tr>
          <th class="py-3 px-4">Producto</th>
          <th class="py-3 px-4 text-center">Clasificación</th>
          <th class="py-3 px-4 text-right">Unidades</th>
          <th class="py-3 px-4 text-right">Costo</th>
          <th class="py-3 px-4 text-right">Precio</th>
          <th class="py-3 px-4 text-right">Margen</th>
          <th class="py-3 px-4 text-right">Ingresos</th>
          <th class="py-3 px-4 text-right">Ganancia</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr
          v-for="item in menuItems"
          :key="item.id || item.name"
          class="hover:bg-slate-50/50 transition-colors"
        >
          <td class="py-3 px-4">
            <div class="font-medium text-slate-800">{{ item.name }}</div>
          </td>
          <td class="py-3 px-4 flex justify-center">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
              :class="[getCategoryStyles(item.classification).bg, getCategoryStyles(item.classification).text]"
            >
              <component :is="getCategoryStyles(item.classification).icon" :size="12" />
              {{ getCategoryStyles(item.classification).label }}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <span class="text-slate-600">
              {{ item.total_units_sold || 0 }}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <span class="text-slate-600">
              {{ item.estimated_cost ? formatCurrency(item.estimated_cost) : '—' }}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <span class="text-slate-800 font-semibold">
              {{ item.price ? formatCurrency(item.price) : '—' }}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <span
              :class="item.profit_margin_pct >= 40 ? 'text-green-600 font-bold' : 'text-slate-600'"
            >
              {{ item.profit_margin_pct ? `${item.profit_margin_pct}%` : '—' }}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <span class="text-slate-800 font-bold">
              {{ item.total_revenue ? formatCurrency(item.total_revenue) : '—' }}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <span class="text-green-600 font-bold">
              {{ item.total_profit ? formatCurrency(item.total_profit) : '—' }}
            </span>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="totals" class="border-t-2 border-slate-200 bg-slate-50">
        <tr class="font-semibold text-slate-800">
          <td class="py-3 px-4">Total</td>
          <td class="py-3 px-4"></td>
          <td class="py-3 px-4 text-right">{{ totals.units }}</td>
          <td class="py-3 px-4 text-right">—</td>
          <td class="py-3 px-4 text-right">—</td>
          <td class="py-3 px-4 text-right">{{ totals.margin }}%</td>
          <td class="py-3 px-4 text-right">{{ formatCurrency(totals.revenue) }}</td>
          <td class="py-3 px-4 text-right text-green-600">{{ formatCurrency(totals.profit) }}</td>
        </tr>
      </tfoot>
    </table>

  </div>
</template>
