<script setup lang="ts">
import { Camera } from 'lucide-vue-next';

defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-overlay-backdrop/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-modal-surface-bg text-modal-surface-text rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
      <div class="p-6 text-center">
        <div class="w-20 h-20 bg-state-info-bg rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-state-info-border">
          <Camera class="text-state-info-icon" :size="40" />
        </div>
        <h3 class="text-xl font-bold mb-2">Escanear con IA</h3>
        <p class="text-text-secondary text-sm mb-6">
          Toma una foto de tu factura de proveedor. Extraeremos automáticamente productos, precios y actualizaremos tu stock.
        </p>
        <div class="space-y-3">
          <button 
            @click="emit('confirm')"
            class="w-full bg-action-info-bg text-action-info-text py-4 rounded-2xl font-bold hover:bg-action-info-hover-bg transition-all shadow-lg"
          >
            Simular Carga de Foto
          </button>
          <button 
            @click="emit('close')"
            class="w-full bg-action-ghost-bg text-action-ghost-text py-3 font-medium hover:text-action-ghost-hover-text"
          >
            Cancelar
          </button>
        </div>
      </div>
      <div class="bg-surface-secondary p-4 text-[10px] text-text-tertiary text-center uppercase tracking-widest font-bold border-t border-modal-footer-border">
        Procesado por Motor IA RestoGrowth
      </div>
    </div>
  </div>
</template>
