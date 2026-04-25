<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

definePageMeta({
  layout: 'kds',
})

const route = useRoute()
const stationId = computed(() => route.params.id as string)

// ── Station metadata ────────────────────────────────────────────────────────
const { data: stationData, status: stationStatus } = useQuery({
  key: () => ['kds-station', stationId.value],
  query: () => $fetch<{ success: boolean; data: any }>(`/api/api/stations/${stationId.value}`),
  staleTime: 60_000,
})

const station = computed(() => stationData.value?.data ?? null)

// ── Feature flag guard ──────────────────────────────────────────────────────
watch(station, (s) => {
  if (s && s.kds_enabled === false) {
    navigateTo('/comandas')
  }
}, { immediate: true })

useHead({ title: computed(() => station.value ? `KDS · ${station.value.name}` : 'KDS') })

// ── Comandas fetch ──────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]

const { data: comandasData, status: comandasStatus, refetch } = useQuery({
  key: () => ['kds-comandas', stationId.value],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/comandas', {
    params: {
      station_id: stationId.value,
      status: 'pending,preparing,ready',
      date: today,
    },
  }),
})

const allComandas = computed(() => comandasData.value?.data ?? [])

const activeComandas = computed(() =>
  allComandas.value
    .filter((c: any) => c.status === 'pending' || c.status === 'preparing')
    .sort((a: any, b: any) => new Date(a.fired_at).getTime() - new Date(b.fired_at).getTime())
)

const readyComandas = computed(() =>
  allComandas.value
    .filter((c: any) => c.status === 'ready')
    .sort((a: any, b: any) => new Date(a.ready_at ?? a.fired_at).getTime() - new Date(b.ready_at ?? b.fired_at).getTime())
)

// ── Polling — 5s ───────────────────────────────────────────────────────────
const pollInterval = ref<any>(null)

onMounted(() => {
  pollInterval.value = setInterval(() => {
    if (comandasStatus.value !== 'pending') {
      refetch()
    }
  }, 5000)
})

onUnmounted(() => {
  if (pollInterval.value) clearInterval(pollInterval.value)
  if (clockInterval.value) clearInterval(clockInterval.value)
})

// ── Live clock ──────────────────────────────────────────────────────────────
const now = ref(new Date())
const clockInterval = ref<any>(null)
const clockLabel = computed(() => {
  const h = String(now.value.getHours()).padStart(2, '0')
  const m = String(now.value.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
})

onMounted(() => {
  clockInterval.value = setInterval(() => { now.value = new Date() }, 1000)
})

// ── Sound notification ──────────────────────────────────────────────────────
const soundEnabled = ref(
  typeof window !== 'undefined' ? localStorage.getItem('kds_sound_enabled') !== 'false' : true
)
const knownIds = ref<Set<string>>(new Set())

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  if (typeof window !== 'undefined') {
    localStorage.setItem('kds_sound_enabled', soundEnabled.value ? 'true' : 'false')
  }
}

const checkNewComandas = () => {
  if (!soundEnabled.value) return
  const currentIds = new Set(allComandas.value.map((c: any) => c.id))
  const hasNew = [...currentIds].some((id) => !knownIds.value.has(id as string))
  if (hasNew && knownIds.value.size > 0) {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch { /* AudioContext not available */ }
  }
  knownIds.value = currentIds
}

watch(allComandas, checkNewComandas)

// ── Settings panel ──────────────────────────────────────────────────────────
const settingsOpen = ref(false)

const FONT_SIZES = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
  { value: 'xl', label: 'Extra grande' },
]
const fontSize = ref(
  typeof window !== 'undefined' ? (localStorage.getItem('kds_font_size') || 'normal') : 'normal'
)
const setFontSize = (size: string) => {
  fontSize.value = size
  if (typeof window !== 'undefined') localStorage.setItem('kds_font_size', size)
}

const fontScaleClass = computed(() => ({
  normal: '',
  large: 'kds-font-large',
  xl: 'kds-font-xl',
}[fontSize.value] || ''))
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden" :class="fontScaleClass">

    <!-- Loading station -->
    <div v-if="stationStatus === 'pending' && !station" class="flex items-center justify-center h-full">
      <div class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
        <p class="text-text-secondary text-sm">Cargando estación…</p>
      </div>
    </div>

    <!-- Station error / not found -->
    <div v-else-if="stationStatus === 'error'" class="flex items-center justify-center h-full text-center px-8">
      <div>
        <p class="text-2xl font-bold text-destructive mb-2">Estación no encontrada</p>
        <p class="text-text-secondary">Verificá la URL o el enlace de acceso.</p>
      </div>
    </div>

    <!-- Main KDS UI -->
    <template v-else-if="station">

      <!-- Header bar -->
      <header class="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b border-border flex-shrink-0">
        <div class="flex items-center gap-3">
          <!-- Station color dot -->
          <span
            class="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-border"
            :style="{ backgroundColor: station.color || '#6B7280' }"
          />
          <span class="text-2xl font-bold leading-none text-text-primary">{{ station.kitchen_name || station.name }}</span>
          <!-- Active comanda count -->
          <span
            v-if="activeComandas.length > 0"
            class="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full bg-primary text-white text-xs font-black"
          >
            {{ activeComandas.length }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <!-- Live clock -->
          <span class="text-xl font-mono font-bold text-text-secondary tabular-nums">{{ clockLabel }}</span>

          <!-- Sound toggle -->
          <button
            @click="toggleSound"
            :title="soundEnabled ? 'Silenciar alertas' : 'Activar alertas sonoras'"
            class="flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl bg-surface hover:bg-surface-secondary border border-border transition-colors"
            :class="soundEnabled ? 'text-primary' : 'text-text-tertiary'"
          >
            <Icon :name="soundEnabled ? 'lucide:volume-2' : 'lucide:volume-x'" class="w-5 h-5" />
          </button>

          <!-- Settings -->
          <button
            @click="settingsOpen = !settingsOpen"
            class="flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl bg-surface hover:bg-surface-secondary border border-border transition-colors text-text-secondary"
            :class="settingsOpen ? 'bg-surface-secondary' : ''"
          >
            <Icon name="lucide:settings" class="w-5 h-5" />
          </button>
        </div>
      </header>

      <!-- Settings panel (slide-in, no Transition to avoid Vue bug #8105) -->
      <div
        v-if="settingsOpen"
        class="absolute top-[64px] right-4 z-50 w-64 bg-surface border border-border rounded-2xl shadow-2xl p-4 flex flex-col gap-4"
      >
        <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Ajustes KDS</h3>

        <!-- Sound -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-text-secondary">Alertas de sonido</span>
          <button
            @click="toggleSound"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            :class="soundEnabled ? 'bg-primary' : 'bg-border'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="soundEnabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <!-- Font size -->
        <div class="flex flex-col gap-2">
          <span class="text-sm text-text-secondary">Tamaño de texto</span>
          <div class="flex gap-1">
            <button
              v-for="opt in FONT_SIZES"
              :key="opt.value"
              @click="setFontSize(opt.value)"
              class="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors"
              :class="fontSize === opt.value ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Board -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-6">

        <!-- Loading skeleton -->
        <div v-if="comandasStatus === 'pending' && !allComandas.length" class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="i in 4" :key="i" class="h-52 rounded-xl bg-surface-secondary animate-pulse" />
        </div>

        <!-- Empty state -->
        <div
          v-else-if="!allComandas.length"
          class="flex flex-col items-center justify-center flex-1 text-center py-20"
        >
          <Icon name="lucide:check-circle-2" class="w-16 h-16 text-text-tertiary mb-4" />
          <p class="text-xl font-bold text-text-secondary">No hay comandas activas en esta estación</p>
        </div>

        <!-- Active comandas (pending + preparing) -->
        <div v-else>
          <div v-if="activeComandas.length > 0">
            <div class="flex items-center gap-2 mb-3">
              <h2 class="text-xs font-black uppercase tracking-widest text-text-secondary">Activas</h2>
              <span class="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-surface-secondary text-text-secondary text-[10px] font-black">
                {{ activeComandas.length }}
              </span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div
                v-for="comanda in activeComandas"
                :key="comanda.id"
                class="kds-card-enter"
              >
                <CocinaComandaCard :comanda="comanda" @refresh="refetch" />
              </div>
            </div>
          </div>

          <!-- Ready comandas -->
          <div v-if="readyComandas.length > 0" class="mt-6">
            <div class="flex items-center gap-2 mb-3">
              <h2 class="text-xs font-black uppercase tracking-widest text-success">Listos para entregar</h2>
              <span class="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-success/15 text-success text-[10px] font-black">
                {{ readyComandas.length }}
              </span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <CocinaComandaCard
                v-for="comanda in readyComandas"
                :key="comanda.id"
                :comanda="comanda"
                @refresh="refetch"
              />
            </div>
          </div>
        </div>

      </div>
    </template>

  </div>
</template>

<style scoped>
/* Card entrance animation — @keyframes only, no <Transition> (Vue bug #8105) */
@keyframes kds-slide-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.kds-card-enter {
  animation: kds-slide-in 0.2s ease-out both;
}

/* Font scale tiers */
.kds-font-large {
  font-size: 1.125rem;
}
.kds-font-xl {
  font-size: 1.25rem;
}
</style>
