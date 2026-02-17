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
      return { bg: 'bg-green-100', text: 'text-green-700', icon: Star, label: 'Estrella' };
    case 'Plowhorse':
      return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Shield, label: 'Caballo' };
    case 'Puzzle':
      return { bg: 'bg-orange-100', text: 'text-orange-700', icon: Puzzle, label: 'Puzzle' };
    case 'Dog':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, label: 'Perro' };
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
</script>

<template>
  <div class="overflow-hidden">
    <table class="w-full text-sm text-left">
      <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
        <tr>
          <th class="py-3 px-4">Producto</th>
          <th class="py-3 px-4 text-center">Clasificación</th>
          <th class="py-3 px-4 text-right">Margen</th>
          <th class="py-3 px-4 text-right">Ventas</th>
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
            <div v-if="item.category" class="text-xs text-slate-500 mt-0.5">{{ item.category }}</div>
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
            <span
              :class="item.profit_margin_pct >= 40 ? 'text-green-600 font-bold' : 'text-slate-600'"
            >
              {{ item.profit_margin_pct ? `${item.profit_margin_pct}%` : '—' }}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <span class="text-slate-800 font-medium">
              {{ item.total_revenue ? formatCurrency(item.total_revenue) : '—' }}
            </span>
            <div v-if="item.total_units_sold" class="text-xs text-slate-500 mt-0.5">
              {{ item.total_units_sold }} uds
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Summary if data available -->
    <div v-if="menuData?.summary" class="mt-4 pt-4 border-t border-slate-200">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
        <div>
          <div class="text-slate-500">Estrellas</div>
          <div class="text-green-600 font-bold text-lg">{{ menuData.summary.stars }}</div>
        </div>
        <div>
          <div class="text-slate-500">Caballos</div>
          <div class="text-blue-600 font-bold text-lg">{{ menuData.summary.plowhorses }}</div>
        </div>
        <div>
          <div class="text-slate-500">Puzzles</div>
          <div class="text-orange-600 font-bold text-lg">{{ menuData.summary.puzzles }}</div>
        </div>
        <div>
          <div class="text-slate-500">Perros</div>
          <div class="text-red-600 font-bold text-lg">{{ menuData.summary.dogs }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
