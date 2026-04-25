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

const { data: comandasData, status: comandasStatus, asyncStatus: comandasAsyncStatus, refetch } = useQuery({
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
const isRefreshing = computed(() => comandasAsyncStatus.value === 'loading' && allComandas.value.length > 0)

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
// Split into 3 visual tiers: HH:MM (dominant) · :SS (supporting) · .cs (metadata)
const clockHM = computed(() => {
  const h = String(now.value.getHours()).padStart(2, '0')
  const m = String(now.value.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
})
const clockS  = computed(() => String(now.value.getSeconds()).padStart(2, '0'))
const clockCs = computed(() => String(Math.floor(now.value.getMilliseconds() / 10)).padStart(2, '0'))

onMounted(() => {
  clockInterval.value = setInterval(() => { now.value = new Date() }, 10)
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

// ── Loading phrases (matches dashboard pattern) ────────────────────────────
const { currentPhrase: loadingPhrase, start: startPhrases, stop: stopPhrases } = useLoadingPhrases([
  'Actualizando...',
  'Sincronizando...',
  'Cargando cambios...',
])
watch(isRefreshing, (v) => v ? startPhrases() : stopPhrases(), { immediate: true })

</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">

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

      <!-- Header bar — same structure as dashboard layout header -->
      <header class="flex items-center justify-between px-4 py-3 md:px-8 md:py-4 bg-surface border-b border-border flex-shrink-0">
        <!-- Left: station identity -->
        <div class="flex items-center gap-2 min-w-0">
          <!-- Station color indicator — square pill like action buttons -->
          <div
            class="w-11 h-11 rounded-lg bg-surface-secondary flex-shrink-0 flex items-center justify-center"
          >
            <span
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: station.color || '#6B7280' }"
            />
          </div>
          <!-- Station name -->
          <span class="text-lg sm:text-xl md:text-2xl font-bold leading-tight text-text-primary truncate">
            {{ station.kitchen_name || station.name }}
          </span>
          <!-- Active count — muted pill, same tone as refresh -->
          <div
            v-if="activeComandas.length > 0"
            class="h-11 px-3 rounded-lg bg-surface-secondary flex items-center justify-center flex-shrink-0"
          >
            <span class="text-sm font-black text-text-secondary tabular-nums">{{ activeComandas.length }}</span>
          </div>
        </div>

        <!-- Right: actions — TransitionGroup matches dashboard header-actions animation -->
        <TransitionGroup
          name="header-actions"
          tag="div"
          class="relative flex items-center gap-1.5 md:gap-2 flex-shrink-0"
        >
          <!-- Progressive loading — next to sound button, same as dashboard -->
          <div
            v-if="isRefreshing"
            key="progressive-loading"
            class="hidden md:flex items-center gap-2 h-11 px-3 rounded-lg bg-surface-secondary text-primary"
            aria-live="polite"
          >
            <UiLoadingDots size="9px" class="text-primary" />
            <span class="text-sm font-medium whitespace-nowrap">{{ loadingPhrase }}</span>
          </div>

          <!-- Sound toggle -->
          <button
            key="sound"
            @click="toggleSound"
            :title="soundEnabled ? 'Silenciar alertas' : 'Activar alertas sonoras'"
            class="w-11 h-11 flex items-center justify-center bg-surface-secondary border-0 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            :class="soundEnabled ? 'text-primary' : 'text-text-tertiary'"
          >
            <svg v-if="soundEnabled" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          </button>

          <!-- Refresh button — same as dashboard -->
          <button
            key="refresh"
            @click="refetch()"
            :disabled="isRefreshing"
            aria-label="Refrescar comandas"
            class="w-11 h-11 flex items-center justify-center bg-surface-secondary border-0 rounded-lg text-primary transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refrescar"
          >
            <UiLoadingMatrix v-if="isRefreshing" size="5.5px" />
            <svg v-else class="w-5 h-5 transition-transform duration-300 hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>

          <!-- Live clock — same pill as other actions -->
          <div key="clock" class="h-11 px-3 flex items-center bg-surface-secondary rounded-lg select-none" aria-label="Hora actual">
            <span class="inline-flex items-baseline font-mono tabular-nums">
              <span class="text-base font-black text-text-primary leading-none">{{ clockHM }}</span>
              <span class="text-xs font-bold text-text-secondary leading-none">:{{ clockS }}</span>
              <span class="text-[9px] font-medium text-text-tertiary leading-none">.{{ clockCs }}</span>
            </span>
          </div>
        </TransitionGroup>
      </header>

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
          <svg class="w-16 h-16 text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
          </svg>
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
/* Header actions animation — identical to dashboard layout */
.header-actions-move,
.header-actions-enter-active,
.header-actions-leave-active {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease, filter 0.24s ease;
}
.header-actions-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateX(14px);
}
.header-actions-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateX(-10px);
}

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

</style>
