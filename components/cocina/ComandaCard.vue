<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, type Ref } from 'vue'
import { formatDistanceToNow, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

const props = defineProps<{
  comanda: any
}>()

const emit = defineEmits(['refresh'])

const toast = useToast()
const isUpdating = ref(false)

// KDS token (provided by /cocina/[id].vue). Optional so the component
// keeps working under cookie auth in non-KDS contexts.
const kdsToken = inject<Ref<string>>('kdsToken')

// ── Timer ──────────────────────────────────────────────────────────────────
const now = ref(new Date())
const timerInterval = ref<any>(null)

const elapsedMinutes = computed(() => {
  return differenceInMinutes(now.value, new Date(props.comanda.fired_at))
})

const elapsedTimeLabel = computed(() => {
  return formatDistanceToNow(new Date(props.comanda.fired_at), { locale: es, addSuffix: false })
})

// ── Visual Alerts ──────────────────────────────────────────────────────────
const alertLevel = computed(() => {
  const t1 = props.comanda.alert_threshold_1_min || 8
  const t2 = props.comanda.alert_threshold_2_min || 15
  
  if (props.comanda.status === 'ready') return 'ready'
  if (elapsedMinutes.value >= t2) return 'red'
  if (elapsedMinutes.value >= t1) return 'yellow'
  return 'normal'
})

// Card: static border, alert communicated via header strip + subtle bg tint
const cardBg = computed(() => {
  const levels: Record<string, string> = {
    ready:  'bg-success/5',
    red:    'bg-destructive/5',
    yellow: 'bg-warning/5',
    normal: 'bg-surface',
  }
  return levels[alertLevel.value] || levels.normal
})

// Top urgency strip
const stripClass = computed(() => {
  const levels: Record<string, string> = {
    ready:  'bg-success',
    red:    'bg-destructive strip-pulse',
    yellow: 'bg-warning',
    normal: 'bg-border',
  }
  return levels[alertLevel.value] || levels.normal
})

// ── Visible items — cancelled shown with strikethrough (industry standard) ──
const visibleItems = computed(() => props.comanda.items)

// ── Actions ────────────────────────────────────────────────────────────────
const updateStatus = async (newStatus: string) => {
  if (isUpdating.value) return
  isUpdating.value = true
  try {
    await $fetch(`/api/api/comandas/${props.comanda.id}/status`, {
      method: 'PATCH',
      params: kdsToken?.value ? { token: kdsToken.value } : undefined,
      body: { status: newStatus }
    })
    emit('refresh')
    if (newStatus === 'delivered') {
      toast.success('Comanda entregada')
    }
  } catch (error: any) {
    const status = error?.status ?? error?.statusCode ?? error?.response?.status
    toast.error(
      status === 401
        ? 'Enlace KDS expirado. Recarga la página.'
        : 'Error al actualizar estado',
    )
  } finally {
    isUpdating.value = false
  }
}

const deliverComanda = () => updateStatus('delivered')
const startPreparing = () => updateStatus('preparing')
const markAsReady = () => updateStatus('ready')
const cancelComanda = () => updateStatus('cancelled')

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  timerInterval.value = setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval.value) clearInterval(timerInterval.value)
})
</script>

<template>
  <div
    class="flex flex-col rounded-xl border border-border shadow-sm transition-colors overflow-hidden"
    :class="[cardBg, isUpdating ? 'opacity-70 pointer-events-none' : '']"
  >
    <!-- Urgency strip -->
    <div class="h-1.5 w-full transition-colors" :class="stripClass" />
    <!-- Card Header -->
    <div class="px-3 py-2 border-b border-border flex items-center justify-between bg-surface-secondary/50">
      <div class="flex flex-col">
        <span class="text-xs font-black uppercase tracking-wider text-text-secondary">
          {{ comanda.station_kitchen_name || 'COMA' }}
        </span>
        <span class="text-2xl font-black leading-none">
          #{{ comanda.comanda_number }}-{{ String(comanda.comanda_index).padStart(2, '0') }}
        </span>
      </div>
      <div class="flex flex-col items-end text-right">
        <span class="text-[10px] font-bold text-text-secondary uppercase">Hace</span>
        <span 
          class="text-sm font-black"
          :class="alertLevel === 'red' ? 'text-destructive' : alertLevel === 'yellow' ? 'text-warning' : 'text-text-primary'"
        >
          {{ elapsedTimeLabel }}
        </span>
      </div>
    </div>

    <!-- Source Info -->
    <div class="px-3 py-1.5 flex items-center gap-2 bg-surface-tertiary/30">
      <!-- table icon -->
      <svg v-if="comanda.source_type === 'table'" class="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
      <!-- shopping-cart icon (pos / other) -->
      <svg v-else class="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
      </svg>
      <span class="text-xs font-bold text-text-primary">
        {{ comanda.table_display_name || 'Venta Rápida' }}
      </span>
    </div>

    <!-- Items List -->
    <div class="flex-1 p-3 flex flex-col gap-3 min-h-0 overflow-y-auto">
      <CocinaItemRow
        v-for="item in visibleItems"
        :key="item.id"
        :item="item"
        :comanda-status="comanda.status"
        :comanda-id="comanda.id"
        @refresh="emit('refresh')"
      />

      <!-- Comanda Notes -->
      <div v-if="comanda.notes" class="mt-2 p-2 bg-state-warning-bg  rounded-lg border border-state-warning-border ">
        <p class="text-[11px] font-bold text-state-warning-text  uppercase">
          📝 Nota: {{ comanda.notes }}
        </p>
      </div>
    </div>

    <!-- Card Actions — hidden for POS when status is not pending (backend auto-delivers) -->
    <div
      v-if="!(comanda.source_type === 'pos' && comanda.status !== 'pending')"
      class="p-3 mt-auto border-t border-border flex gap-2"
    >

      <!-- POS/Counter mode: skip 'preparing', go straight to ready -->
      <template v-if="comanda.source_type === 'pos'">
        <template v-if="comanda.status === 'pending'">
          <button
            @click="markAsReady"
            :disabled="isUpdating"
            class="flex-1 h-10 rounded-lg border border-success text-success text-xs font-black uppercase tracking-tight active:scale-95 transition-colors hover:bg-success/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <UiLoadingDots v-if="isUpdating" size="7px" color="currentColor" />
            <span v-else>Listo</span>
          </button>
          <button
            @click="cancelComanda"
            :disabled="isUpdating"
            class="h-10 px-3 rounded-lg border border-border text-text-tertiary text-xs font-bold uppercase tracking-tight active:scale-95 transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <UiLoadingDots v-if="isUpdating" size="7px" color="currentColor" />
            <span v-else>Cancelar</span>
          </button>
        </template>
      </template>

      <!-- Table mode: full flow pending → preparing → ready -->
      <template v-else>
        <template v-if="comanda.status === 'pending'">
          <button
            @click="startPreparing"
            :disabled="isUpdating"
            class="flex-1 h-10 rounded-lg border border-primary text-primary text-xs font-black uppercase tracking-tight active:scale-95 transition-colors hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <UiLoadingDots v-if="isUpdating" size="7px" color="currentColor" />
            <span v-else>Empezar</span>
          </button>
          <button
            @click="cancelComanda"
            :disabled="isUpdating"
            class="h-10 px-3 rounded-lg border border-border text-text-tertiary text-xs font-bold uppercase tracking-tight active:scale-95 transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <UiLoadingDots v-if="isUpdating" size="7px" color="currentColor" />
            <span v-else>Cancelar</span>
          </button>
        </template>
        <template v-else-if="comanda.status === 'preparing'">
          <button
            @click="markAsReady"
            :disabled="isUpdating"
            class="flex-1 h-10 rounded-lg border border-success text-success text-xs font-black uppercase tracking-tight active:scale-95 transition-colors hover:bg-success/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <UiLoadingDots v-if="isUpdating" size="7px" color="currentColor" />
            <span v-else>Listo</span>
          </button>
          <button
            @click="cancelComanda"
            :disabled="isUpdating"
            class="h-10 px-3 rounded-lg border border-border text-text-tertiary text-xs font-bold uppercase tracking-tight active:scale-95 transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <UiLoadingDots v-if="isUpdating" size="7px" color="currentColor" />
            <span v-else>Cancelar</span>
          </button>
        </template>
      </template>

      <!-- Table mode only: deliver when ready (POS auto-delivers on backend) -->
      <button
        v-if="comanda.status === 'ready' && comanda.source_type !== 'pos'"
        @click="deliverComanda"
        :disabled="isUpdating"
        class="flex-1 h-10 rounded-lg border border-success text-success text-xs font-black uppercase tracking-tight active:scale-95 transition-colors hover:bg-success/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <UiLoadingDots v-if="isUpdating" size="7px" color="currentColor" />
        <span v-else>Entregar</span>
      </button>

    </div>
  </div>
</template>

<style scoped>
@keyframes strip-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.strip-pulse {
  animation: strip-pulse 1.5s ease-in-out infinite;
}
</style>
