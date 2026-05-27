<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-40 bg-black/40" @click="close" aria-hidden="true" />
    </Transition>

    <!-- Panel -->
    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del arqueo"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">Arqueo de caja</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  <span
                    class="inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded mr-1"
                    :class="periodBadgeClass(detail)"
                  >{{ periodTypeLabel(detail) }}</span>
                  {{ formatPeriodDates(detail) }}
                </p>
                <p v-if="formatPeriodTimes(detail)" class="text-xs text-text-secondary font-mono mt-0.5">{{ formatPeriodTimes(detail) }}</p>
              </div>
            </div>
            <button
              @click="close"
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto">
          <!-- Loading -->
          <div v-if="detailLoading" class="flex items-center justify-center py-16">
            <CommonsTheCustomLoader size="large" />
          </div>

          <template v-else-if="detail">
            <!-- Ventas -->
            <div class="border-b border-border">
              <div class="px-6 py-3 bg-background">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Ventas del período</span>
              </div>
              <div class="divide-y divide-border">
                <div class="flex justify-between px-6 py-2.5 text-sm">
                  <span class="text-text-secondary">Total ventas</span>
                  <span class="font-bold text-text-primary">{{ formatCurrency(detail.totalSales) }}</span>
                </div>
                <div class="flex justify-between px-6 py-2.5 text-sm">
                  <span class="text-text-secondary">Órdenes</span>
                  <span class="font-medium text-text-primary">{{ detail.itemsSold }}</span>
                </div>
              </div>
            </div>

            <!-- Caja -->
            <div class="border-b border-border">
              <div class="px-6 py-3 bg-background">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Caja</span>
              </div>
              <div class="divide-y divide-border">
                <div v-if="(detail.openingCash ?? 0) > 0" class="flex justify-between px-6 py-2.5 text-sm">
                  <span class="text-text-secondary">Fondo inicial</span>
                  <span class="font-medium text-text-primary">+ {{ formatCurrency(detail.openingCash) }}</span>
                </div>
                <div class="flex justify-between px-6 py-2.5 text-sm">
                  <span class="text-text-secondary">Efectivo recibido</span>
                  <span class="font-medium text-text-primary">{{ formatCurrency(detail.totalCash) }}</span>
                </div>
                <div class="flex justify-between px-6 py-2.5 text-sm">
                  <span class="text-text-secondary">Gastos en efectivo</span>
                  <span class="font-medium text-destructive">− {{ formatCurrency(detail.gastosEfectivo) }}</span>
                </div>
                <div class="flex justify-between px-6 py-2.5 text-sm">
                  <span class="text-text-secondary">Esperado en caja</span>
                  <span class="font-medium text-text-primary">{{ formatCurrency(detail.cashExpected) }}</span>
                </div>
                <div class="flex justify-between px-6 py-2.5 text-sm">
                  <span class="text-text-secondary">Contado en caja</span>
                  <span class="font-medium text-text-primary">{{ formatCurrency(detail.cashCounted) }}</span>
                </div>
                <div class="flex justify-between px-6 py-2.5 text-sm font-semibold">
                  <span class="text-text-primary">Diferencia</span>
                  <span :class="detail.cashDifference >= 0 ? 'text-emerald-600' : 'text-destructive'">
                    {{ detail.cashDifference >= 0 ? '+' : '' }}{{ formatCurrency(detail.cashDifference) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Métodos de pago -->
            <div v-if="detail.breakdown?.length" class="border-b border-border">
              <div class="px-6 py-3 bg-background">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Métodos de pago</span>
              </div>
              <div class="divide-y divide-border">
                <div v-for="row in detail.breakdown" :key="row.groupSlug + row.methodName" class="flex justify-between px-6 py-2.5 text-sm">
                  <span class="text-text-secondary">{{ row.methodName }}</span>
                  <span class="font-medium text-text-primary">{{ formatCurrency(row.total) }}</span>
                </div>
              </div>
            </div>

            <!-- Notas -->
            <div v-if="detail.notes" class="border-b border-border px-6 py-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">Notas</p>
              <p class="text-sm text-text-primary">{{ detail.notes }}</p>
            </div>

            <!-- Registrado -->
            <div class="px-6 py-3">
              <p class="text-xs text-text-secondary">Registrado: {{ formatDate(detail.closedAt) }}</p>
            </div>
          </template>

          <div v-else class="px-6 py-10 text-sm text-text-secondary text-center">No se pudo cargar el detalle.</div>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 border-t border-border px-6 py-4 bg-surface">
          <div v-if="!confirmDelete" class="flex gap-3">
            <button
              @click="confirmDelete = true"
              class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
            >
              Eliminar arqueo
            </button>
          </div>
          <div v-else class="flex flex-col gap-2">
            <p class="text-sm text-text-primary font-medium">¿Eliminar este arqueo? Esta acción no se puede deshacer.</p>
            <div class="flex gap-2">
              <button
                @click="handleDelete"
                :disabled="deleting"
                class="min-h-[44px] flex-1 px-4 py-2 rounded-lg bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {{ deleting ? 'Eliminando...' : 'Sí, eliminar' }}
              </button>
              <button
                @click="confirmDelete = false"
                :disabled="deleting"
                class="min-h-[44px] flex-1 px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  cierreId: string | null
  deleteMode?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  'deleted': []
}>()

const detail = ref<any>(null)
const detailLoading = ref(false)
const confirmDelete = ref(false)
const deleting = ref(false)

const close = () => {
  confirmDelete.value = false
  emit('update:modelValue', false)
}

watch(() => props.cierreId, async (id) => {
  detail.value = null
  confirmDelete.value = props.deleteMode ?? false
  if (!id) return
  detailLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>(`/api/cierre/${id}`)
    detail.value = res.data
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}, { immediate: true })

const handleDelete = async () => {
  if (!props.cierreId) return
  deleting.value = true
  try {
    await $fetch(`/api/cierre/${props.cierreId}`, { method: 'DELETE' })
    emit('deleted')
    close()
  } catch {
    confirmDelete.value = false
  } finally {
    deleting.value = false
  }
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const { formatPeriodDates, formatPeriodTimes, periodTypeLabel, periodBadgeClass } = useCierrePeriod()

const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'America/Bogota',
  }).format(new Date(iso))
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    opacity: 1;
    transform: translateX(100%);
  }
}
</style>
