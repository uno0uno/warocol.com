<script setup lang="ts">
import { AlertCircle, AlertTriangle, ArrowRight } from 'lucide-vue-next';
</script>

<template>
  <section class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-100 transition-opacity duration-300">
    <h3 class="text-lg font-bold flex items-center gap-2 mb-4">
      <span class="w-2 h-6 bg-red-500 rounded-full"></span>
      Alertas
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      <!-- Alerta 1 -->
      <div class="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
        <div class="bg-white p-2 rounded-lg shadow-sm text-red-500">
          <AlertCircle :size="20" />
        </div>
        <div>
          <h4 class="font-bold text-red-700 text-sm">Inventario Crítico: Queso Mozzarella</h4>
          <p class="text-red-600/80 text-xs mt-1 mb-2">Quedan solo 2kg (consumo diario: 1.5kg). Se acabará mañana al mediodía.</p>
          <button class="flex items-center gap-1 text-xs font-bold text-red-700 hover:underline">
            Pedir ahora <ArrowRight :size="12" />
          </button>
        </div>
      </div>

      <!-- Alerta 2 -->
      <div class="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3">
        <div class="bg-white p-2 rounded-lg shadow-sm text-orange-500">
          <AlertTriangle :size="20" />
        </div>
        <div>
          <h4 class="font-bold text-orange-700 text-sm">Descuadre de Caja: Turno Tarde</h4>
          <p class="text-orange-600/80 text-xs mt-1 mb-2">Faltan $15.000 en el cierre de ayer de Ana. Revisar transacciones.</p>
          <button class="flex items-center gap-1 text-xs font-bold text-orange-700 hover:underline">
            Ver detalle <ArrowRight :size="12" />
          </button>
        </div>
      </div>

    </div>
  </section>
</template>
