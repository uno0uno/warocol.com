<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon name="lucide:bar-chart-3" class="w-8 h-8 text-indigo-500" />
          Analítica de Cocina
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Métricas de desempeño y eficiencia de las estaciones de preparación.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <VueDatePicker
          v-model="dateRangeDates"
          range
          :enable-time-picker="false"
          :preset-dates="presetDates"
          auto-apply
          :timezone="timezone"
          :max-date="maxDate"
          :format="formatDateRange"
          placeholder="Seleccionar periodo"
          class="min-w-[280px]"
          @update:model-value="fetchMetrics"
        />
        <button 
          @click="fetchMetrics" 
          class="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          :class="{ 'animate-spin': loading }"
        >
          <Icon name="lucide:refresh-cw" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>

    <div v-if="loading && !metrics" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="metrics" class="space-y-6">
      <!-- KPI Row -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
            <Icon name="lucide:clipboard-check" class="w-5 h-5" />
            <span class="text-sm font-medium uppercase tracking-wider">Total Pedidos</span>
          </div>
          <div class="text-3xl font-bold dark:text-white">{{ metrics.summary.total_orders }}</div>
          <div class="text-xs text-gray-500 mt-1">Procesados en el periodo</div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
            <Icon name="lucide:clock" class="w-5 h-5" />
            <span class="text-sm font-medium uppercase tracking-wider">T. Promedio Prep</span>
          </div>
          <div class="text-3xl font-bold dark:text-white">{{ metrics.summary.avg_prep_min }} min</div>
          <div class="text-xs text-gray-500 mt-1">Desde fire hasta ready</div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
            <Icon name="lucide:alert-triangle" class="w-5 h-5" />
            <span class="text-sm font-medium uppercase tracking-wider">Pedidos con Retraso</span>
          </div>
          <div class="text-3xl font-bold text-orange-500">{{ metrics.summary.late_orders }}</div>
          <div class="text-xs text-gray-500 mt-1">{{ metrics.summary.late_pct }}% del total</div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
            <Icon name="lucide:activity" class="w-5 h-5" />
            <span class="text-sm font-medium uppercase tracking-wider">Eficiencia Global</span>
          </div>
          <div class="text-3xl font-bold text-green-500">{{ 100 - metrics.summary.late_pct }}%</div>
          <div class="text-xs text-gray-500 mt-1">Basado en umbrales de alerta</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Station Performance -->
        <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden text-gray-500 dark:text-gray-400">
          <div class="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon name="lucide:layout-grid" class="w-5 h-5 text-indigo-500" />
              Desempeño por Estación
            </h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-gray-50 dark:bg-gray-900 text-xs font-semibold uppercase">
                <tr>
                  <th class="px-6 py-4">Estación</th>
                  <th class="px-6 py-4 text-center">Pedidos</th>
                  <th class="px-6 py-4 text-center">T. Promedio</th>
                  <th class="px-6 py-4 text-center">Retrasos</th>
                  <th class="px-6 py-4 text-right">Eficiencia</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="station in metrics.stations" :key="station.id" class="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    <div class="flex items-center gap-2">
                      <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: station.color }"></div>
                      {{ station.name }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">{{ station.total_orders }}</td>
                  <td class="px-6 py-4 text-center font-mono">{{ station.avg_prep_min }}'</td>
                  <td class="px-6 py-4 text-center">
                    <span v-if="station.late_orders > 0" class="text-orange-500 font-bold">
                      {{ station.late_orders }}
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="inline-flex items-center gap-2">
                      <span class="text-sm font-bold" :class="station.efficiency_pct > 90 ? 'text-green-500' : 'text-orange-500'">
                        {{ station.efficiency_pct }}%
                      </span>
                      <div class="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          class="h-full rounded-full" 
                          :class="station.efficiency_pct > 90 ? 'bg-green-500' : 'bg-orange-500'"
                          :style="{ width: station.efficiency_pct + '%' }"
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Slowest Products -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col text-gray-500 dark:text-gray-400">
          <div class="p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon name="lucide:turtle" class="w-5 h-5 text-indigo-500" />
              Productos con Mayor Demora
            </h3>
          </div>
          <div class="flex-1 p-5 space-y-4">
            <div v-for="(product, idx) in metrics.slowest_products" :key="idx" class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900 group hover:ring-1 hover:ring-indigo-500 transition-all">
              <div class="flex-1 min-w-0 mr-4">
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ product.name }}</p>
                <p class="text-xs text-gray-500">{{ product.total_qty }} unidades servidas</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-mono font-bold text-indigo-500">{{ product.avg_prep_min }} min</p>
                <p class="text-[10px] uppercase font-bold tracking-tighter text-gray-400">Promedio</p>
              </div>
            </div>
            
            <div v-if="metrics.slowest_products.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50 py-10">
              <Icon name="lucide:sparkles" class="w-8 h-8" />
              <p class="text-sm">Sin datos suficientes</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Peak Hours -->
      <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-gray-500 dark:text-gray-400">
        <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
          <Icon name="lucide:flame" class="w-5 h-5 text-orange-500" />
          Volumen de Comandas por Hora
        </h3>
        <div class="h-48 flex items-end gap-1.5 pt-4">
          <div 
            v-for="hour in metrics.peak_hours" 
            :key="hour.hour"
            class="flex-1 group relative flex flex-col items-center"
          >
            <!-- Label above -->
            <div v-if="hour.orders > 0" class="absolute -top-6 left-1/2 -translate-x-1/2 scale-75 opacity-0 group-hover:opacity-100 transition-all bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
              {{ hour.orders }} cmds
            </div>
            <!-- Bar -->
            <div 
              class="w-full min-h-[4px] rounded-t-sm transition-all duration-500"
              :class="hour.orders > 0 ? 'bg-indigo-500 group-hover:bg-indigo-400' : 'bg-gray-100 dark:bg-gray-900'"
              :style="{ height: (hour.orders / maxOrders * 100) + '%' }"
            ></div>
            <!-- Hour tag -->
            <span class="text-[9px] mt-2 font-mono" :class="hour.orders > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'">
              {{ hour.hour.toString().padStart(2, '0') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-20 text-gray-500">
      <Icon name="lucide:search" class="w-12 h-12 mb-4 opacity-20" />
      <p>No hay datos suficientes para generar métricas en este periodo.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Analítica de Cocina | WARO'
})

const { timezone, todayISO, addDaysISO, dateAtNoon } = useTenantTimezone()
const dateRangeDates = ref<Date[] | null>([
  dateAtNoon(addDaysISO(todayISO(), -7)),
  dateAtNoon(todayISO()),
])
const { presetDates, maxDate, formatDateRange, dateRange } = useDateRangePresets(dateRangeDates)

const loading = ref(false)
const metrics = ref<any>(null)

const maxOrders = computed(() => {
  if (!metrics.value) return 1
  return Math.max(...metrics.value.peak_hours.map((h: any) => h.orders), 1)
})

const fetchMetrics = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (dateRange.value.from && dateRange.value.to) {
      params.date_from = dateRange.value.from
      params.date_to = dateRange.value.to
    }

    const { data } = await $fetch('/api/analytics/kitchen', { params }) as any
    metrics.value = data
  } catch (e) {
    console.error('Error fetching kitchen metrics:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMetrics()
})
</script>

<style scoped>
/* Transiciones suaves para las barras de eficiencia */
.h-full {
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
