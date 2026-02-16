<script setup lang="ts">
import { ref } from 'vue';
import { Lock, Camera, Info } from 'lucide-vue-next';
import MenuMatrix from './MenuMatrix.vue';

const props = defineProps<{
  isUnlocked: boolean;
}>();

const emit = defineEmits<{
  (e: 'unlock'): void;
}>();
</script>

<template>
  <section class="relative">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold flex items-center gap-2">
        <span class="w-2 h-6 bg-orange-500 rounded-full"></span>
        Rentabilidad Real
      </h3>
      <span v-if="!isUnlocked" class="flex items-center gap-1 text-xs font-bold text-slate-500">
        <Lock :size="12" /> BLOQUEADO
      </span>
    </div>

    <div :class="['grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700', !isUnlocked ? 'filter blur-sm grayscale pointer-events-none opacity-50' : '']">
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
        <h4 class="text-slate-600 font-medium mb-6">Análisis de Menú (Rentabilidad)</h4>
        <MenuMatrix />
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-slate-600 font-medium">Costo de Alimentos</h4>
          <div class="group relative">
            <Info :size="16" class="text-slate-400 cursor-help" />
            <div class="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              Porcentaje de tus ventas destinado a la compra de insumos.
            </div>
          </div>
        </div>
        <div class="flex flex-col items-center justify-center h-full pb-8">
          <div class="relative w-32 h-32 flex items-center justify-center">
            <svg class="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="#f1f5f9" stroke-width="12" fill="none" />
              <circle cx="64" cy="64" r="58" stroke="#f59e0b" stroke-width="12" fill="none" stroke-dasharray="364" stroke-dashoffset="100" stroke-linecap="round" />
            </svg>
            <span class="absolute text-2xl font-bold">28%</span>
          </div>
          <p class="text-sm text-slate-500 mt-4 text-center">¡Cuidado! Tus insumos subieron un 4% vs mes pasado.</p>
        </div>
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
