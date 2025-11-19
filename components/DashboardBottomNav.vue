<template>
  <!-- Bottom Navigation - Solo Mobile -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-titan-300 shadow-lg z-50 safe-area-bottom">
    <div class="flex items-center justify-around px-2 py-2">

      <!-- Financiero -->
      <NuxtLink
        to="/financiero"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
          :class="activePage === 'financiero'
            ? 'bg-crocus-100'
            : 'hover:bg-titan-100'"
        >
          <ChartBarIcon
            class="w-5 h-5 transition-colors"
            :class="activePage === 'financiero'
              ? 'text-crocus-600'
              : 'text-titan-500'"
          />
        </div>
        <span
          class="text-[10px] font-medium transition-colors"
          :class="activePage === 'financiero'
            ? 'text-crocus-700 font-semibold'
            : 'text-titan-600'"
        >
          Financiero
        </span>
      </NuxtLink>

      <!-- Abastecimiento -->
      <NuxtLink
        to="/abastecimiento"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
          :class="activePage === 'abastecimiento'
            ? 'bg-crocus-100'
            : 'hover:bg-titan-100'"
        >
          <TruckIcon
            class="w-5 h-5 transition-colors"
            :class="activePage === 'abastecimiento'
              ? 'text-crocus-600'
              : 'text-titan-500'"
          />
        </div>
        <span
          class="text-[10px] font-medium transition-colors"
          :class="activePage === 'abastecimiento'
            ? 'text-crocus-700 font-semibold'
            : 'text-titan-600'"
        >
          Abastecimiento
        </span>
      </NuxtLink>

      <!-- Pagos -->
      <NuxtLink
        to="/pagos"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
          :class="activePage === 'pagos'
            ? 'bg-crocus-100'
            : 'hover:bg-titan-100'"
        >
          <BanknotesIcon
            class="w-5 h-5 transition-colors"
            :class="activePage === 'pagos'
              ? 'text-crocus-600'
              : 'text-titan-500'"
          />
        </div>
        <span
          class="text-[10px] font-medium transition-colors"
          :class="activePage === 'pagos'
            ? 'text-crocus-700 font-semibold'
            : 'text-titan-600'"
        >
          Pagos
        </span>
      </NuxtLink>

    </div>
  </nav>
</template>

<script setup lang="ts">
import {
  BanknotesIcon,
  ChartBarIcon,
  TruckIcon
} from '@heroicons/vue/24/outline'

interface Props {
  activePage?: 'dashboard' | 'financiero' | 'abastecimiento' | 'pagos' | 'analytics' | 'reportes' | 'configuracion' | 'admin'
}

const props = withDefaults(defineProps<Props>(), {
  activePage: 'financiero'
})
</script>

<style scoped>
/* Safe area para dispositivos con notch */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
