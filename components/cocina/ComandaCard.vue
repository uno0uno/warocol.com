<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatDistanceToNow, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

const props = defineProps<{
  comanda: any
}>()

const emit = defineEmits(['refresh'])

const toast = useToast()
const isUpdating = ref(false)

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

const cardClasses = computed(() => {
  const levels: Record<string, string> = {
    ready: 'border-success bg-success/5 dark:bg-success/10',
    red: 'border-destructive bg-destructive/5 animate-pulse-slow',
    yellow: 'border-warning bg-warning/5',
    normal: 'border-border bg-surface'
  }
  return levels[alertLevel.value] || levels.normal
})

// ── Actions ────────────────────────────────────────────────────────────────
const updateStatus = async (newStatus: string) => {
  if (isUpdating.value) return
  isUpdating.value = true
  try {
    await $fetch(`/api/api/comandas/${props.comanda.id}/status`, {
      method: 'PATCH',
      body: { status: newStatus }
    })
    emit('refresh')
    if (newStatus === 'delivered') {
      toast.success('Comanda entregada')
    }
  } catch (error: any) {
    toast.error('Error al actualizar estado')
  } finally {
    isUpdating.value = false
  }
}

const deliverComanda = () => updateStatus('delivered')
const startPreparing = () => updateStatus('preparing')
const markAsReady = () => updateStatus('ready')

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
    class="flex flex-col rounded-xl border-2 shadow-sm transition-all overflow-hidden"
    :class="[cardClasses, isUpdating ? 'opacity-70 pointer-events-none' : '']"
  >
    <!-- Card Header -->
    <div class="px-3 py-2 border-b border-border flex items-center justify-between bg-surface-secondary/50">
      <div class="flex flex-col">
        <span class="text-xs font-black uppercase tracking-wider text-text-secondary">
          {{ comanda.station_kitchen_name || 'COMA' }}
        </span>
        <span class="text-2xl font-black leading-none">
          #{{ String(comanda.comanda_number).padStart(3, '0') }}
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
      <Icon 
        :name="comanda.source_type === 'table' ? 'lucide:layout-dashboard' : 'lucide:shopping-cart'" 
        class="w-3.5 h-3.5 text-primary" 
      />
      <span class="text-xs font-bold text-text-primary">
        {{ comanda.table_display_name || 'Venta Rápida' }}
      </span>
    </div>

    <!-- Items List -->
    <div class="flex-1 p-3 flex flex-col gap-3 min-h-0 overflow-y-auto">
      <CocinaItemRow
        v-for="item in comanda.items"
        :key="item.id"
        :item="item"
        :comanda-status="comanda.status"
        :comanda-id="comanda.id"
        @refresh="emit('refresh')"
      />

      <!-- Comanda Notes -->
      <div v-if="comanda.notes" class="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
        <p class="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">
          📝 Nota: {{ comanda.notes }}
        </p>
      </div>
    </div>

    <!-- Card Actions -->
    <div class="p-3 bg-surface-secondary/30 mt-auto border-t border-border flex gap-2">
      <button
        v-if="comanda.status === 'pending'"
        @click="startPreparing"
        class="flex-1 h-10 rounded-lg bg-primary text-white text-xs font-black uppercase tracking-tight shadow-sm active:scale-95 transition-transform"
      >
        Empezar
      </button>
      
      <button
        v-if="comanda.status === 'preparing'"
        @click="markAsReady"
        class="flex-1 h-10 rounded-lg bg-success text-white text-xs font-black uppercase tracking-tight shadow-sm active:scale-95 transition-transform"
      >
        Listo
      </button>

      <button
        v-if="comanda.status === 'ready'"
        @click="deliverComanda"
        class="flex-1 h-10 rounded-lg bg-success text-white text-xs font-black uppercase tracking-tight shadow-sm active:scale-95 transition-transform"
      >
        Entregar
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-slow {
  0%, 100% { opacity: 1; border-color: var(--destructive); }
  50% { opacity: 0.8; border-color: transparent; }
}
.animate-pulse-slow {
  animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
