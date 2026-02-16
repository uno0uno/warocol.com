<script setup lang="ts">
import { computed } from 'vue';
import { Star, Shield, Puzzle, AlertTriangle } from 'lucide-vue-next';

interface MenuItem {
  name: string;
  profitability: 'High' | 'Low';
  popularity: 'High' | 'Low';
  category: 'Star' | 'PlowHorse' | 'Puzzle' | 'Dog';
}

const menuItems: MenuItem[] = [
  { name: 'Hamburguesa Pro', profitability: 'High', popularity: 'High', category: 'Star' },
  { name: 'Papas Fritas', profitability: 'Low', popularity: 'High', category: 'PlowHorse' },
  { name: 'Ensalada Cesar', profitability: 'High', popularity: 'Low', category: 'Puzzle' },
  { name: 'Sopa del día', profitability: 'Low', popularity: 'Low', category: 'Dog' },
];

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'Star': return { bg: 'bg-green-100', text: 'text-green-700', icon: Star, label: 'Estrella' };
    case 'PlowHorse': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Shield, label: 'Caballo' };
    case 'Puzzle': return { bg: 'bg-orange-100', text: 'text-orange-700', icon: Puzzle, label: 'Puzzle' };
    case 'Dog': return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, label: 'Perro' };
    default: return { bg: 'bg-slate-100', text: 'text-slate-700', icon: Star, label: 'Unknown' };
  }
};
</script>

<template>
  <div class="overflow-hidden">
    <table class="w-full text-sm text-left">
      <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
        <tr>
          <th class="py-3 px-4">Producto</th>
          <th class="py-3 px-4 text-center">Clasificación</th>
          <th class="py-3 px-4 text-right">Rentabilidad</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="item in menuItems" :key="item.name" class="hover:bg-slate-50/50 transition-colors">
          <td class="py-3 px-4 font-medium text-slate-800">{{ item.name }}</td>
          <td class="py-3 px-4 flex justify-center">
            <span 
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
              :class="[getCategoryStyles(item.category).bg, getCategoryStyles(item.category).text]"
            >
              <component :is="getCategoryStyles(item.category).icon" :size="12" />
              {{ getCategoryStyles(item.category).label }}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <span :class="item.profitability === 'High' ? 'text-green-600 font-bold' : 'text-slate-400'">
              {{ item.profitability === 'High' ? 'Alta' : 'Baja' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
