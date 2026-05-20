<script setup lang="ts">
import { computed } from 'vue';
import { Lock, Camera } from 'lucide-vue-next';
import MenuMatrix from './MenuMatrix.vue';

const props = defineProps<{
  isUnlocked: boolean;
  title?: string;
  menuData?: any;
  foodCostData?: any;
}>();

const periodLabel = computed(() => {
  if (!props.menuData?.period) return null
  const { from, to, days } = props.menuData.period
  if (from === to) return from
  return `${from} → ${to} (${days} días)`
})

const emit = defineEmits<{
  (e: 'unlock'): void;
}>();
</script>

<template>
  <section class="relative">
    <div v-if="!isUnlocked" class="flex items-center justify-end mb-4">
      <span class="flex items-center gap-1 text-xs font-bold text-slate-500">
        <Lock :size="12" /> BLOQUEADO
      </span>
    </div>

    <div :class="['transition-all duration-700', !isUnlocked ? 'filter blur-sm grayscale pointer-events-none opacity-50' : '']">
      <div class="bg-slate-50 md:bg-white p-3 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between mb-3 md:mb-6">
          <h4 class="text-slate-600 font-medium">{{ title || 'Análisis de Menú (Rentabilidad)' }}</h4>
          <slot name="header-actions" />
        </div>
        <div
          v-if="foodCostData?.current_period"
          class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm"
        >
          <div class="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span class="text-slate-500 text-xs">Food cost (real)</span>
            <p class="font-semibold text-slate-800 tabular-nums">
              {{ foodCostData.current_period.food_cost_pct }}%
            </p>
          </div>
          <div
            v-if="foodCostData.current_period.food_cost_operativo_pct != null"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <span class="text-slate-500 text-xs">Food cost (operativo)</span>
            <p class="font-semibold text-slate-800 tabular-nums">
              {{ foodCostData.current_period.food_cost_operativo_pct }}%
            </p>
          </div>
        </div>
        <slot>
          <MenuMatrix :menuData="menuData" />
        </slot>
      </div>
    </div>

    <div v-if="!isUnlocked" class="absolute inset-0 z-10 flex items-center justify-center">
      <div class="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-indigo-100 text-center max-w-sm">
        <div class="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock :size="32" />
        </div>
        <h4 class="text-xl font-bold mb-2">Calculando Dinero Perdido...</h4>
        <p class="text-slate-600 text-sm mb-6">
          No podemos decirte cuánto estás ganando realmente sin saber cuánto pagaste por tus insumos esta semana.
        </p>
        <button 
          @click="emit('unlock')"
          class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <Camera :size="20" />
          Subir Factura para Desbloquear
        </button>
      </div>
    </div>
  </section>
</template>
