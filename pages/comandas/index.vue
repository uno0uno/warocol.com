<script setup lang="ts">
const { t } = useI18n()
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useHead({ title: () => t('cocina.monitor.title') })

const { currentTenant, businessProfile } = useTenantReactive()
const { plural: tablePlural } = useTableLabel()
const toast = useToast()

// ── Feature flag guard ──────────────────────────────────────────────────────
const comandasEnabled = computed(() => businessProfile.value?.comandas_enabled === true)

// ── Filters ────────────────────────────────────────────────────────────────
const SOURCE_TYPES = computed(() => [
  { value: '',         label: t('cocina.monitor.all') },
  { value: 'table',    label: tablePlural.value },
  { value: 'pos',      label: t('cocina.monitor.counter') },
  { value: 'delivery', label: t('cocina.monitor.delivery') },
  { value: 'pickup',   label: t('cocina.monitor.pickup') },
])

const STATUS_OPTIONS = [
  { value: 'pending,preparing', label: t('cocina.monitor.active') },
  { value: 'ready',             label: t('cocina.monitor.ready') },
  { value: '',                  label: t('cocina.monitor.all') },
]

const selectedSourceType = ref('')
const selectedStationId = ref('')
const selectedStatus = ref('pending,preparing')
const selectedDate = ref(new Date().toISOString().slice(0, 10))

const filters = computed(() => ({
  source_type:  selectedSourceType.value || undefined,
  station_id:   selectedStationId.value  || undefined,
  status:       selectedStatus.value     || undefined,
  date:         selectedDate.value       || undefined,
}))

// ── Stations (for dropdown) ─────────────────────────────────────────────────
const { activeStations } = useActiveStationsQuery()

// ── Comandas fetch ──────────────────────────────────────────────────────────
const { data: comandasData, status: comandasStatus, refetch } = useQuery({
  key: () => ['tenant', 'comandas', currentTenant.value?.id, filters.value],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/comandas', {
    params: filters.value,
  }),
  enabled: () => !!currentTenant.value && comandasEnabled.value,
})

const allComandas = computed(() => comandasData.value?.data ?? [])

// ── Swim lanes ─────────────────────────────────────────────────────────────
const activeComandas = computed(() =>
  allComandas.value
    .filter(c => c.status === 'pending' || c.status === 'preparing')
    .sort((a, b) => new Date(a.fired_at).getTime() - new Date(b.fired_at).getTime())
)

const readyComandas = computed(() =>
  allComandas.value
    .filter(c => c.status === 'ready')
    .sort((a, b) => new Date(a.ready_at ?? a.fired_at).getTime() - new Date(b.ready_at ?? b.fired_at).getTime())
)

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
  const currentIds = new Set(allComandas.value.map(c => c.id))
  const hasNew = [...currentIds].some(id => !knownIds.value.has(id))
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
})
</script>

<template>
  <div class="flex flex-col h-full gap-4">

    <!-- Feature flag disabled empty state -->
    <div
      v-if="!comandasEnabled && businessProfile !== undefined"
      class="flex flex-col items-center justify-center h-full text-center p-8 bg-surface border-2 border-dashed border-border rounded-2xl"
    >
      <div class="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mb-4 text-primary">
        <Icon name="lucide:queue" size="32" />
      </div>
      <h3 class="text-lg font-bold text-text-primary">{{ t('cocina.monitor.disabledTitle') }}</h3>
      <p class="text-sm text-text-secondary max-w-xs mt-1">
        {{ t('cocina.monitor.disabledBody') }}
      </p>
      <NuxtLink
        to="/negocio"
        class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-action-primary-bg text-action-primary-text text-sm font-semibold transition-colors hover:bg-action-primary-hover-bg"
      >
        <Icon name="lucide:settings" class="w-4 h-4" />
        Ir a Mi Negocio
      </NuxtLink>
    </div>

    <!-- Main content (comandas_enabled = true) -->
    <template v-else-if="comandasEnabled">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 py-2">
        <h1 class="text-xl font-bold text-text-primary">{{ t('cocina.monitor.heading') }}</h1>
        <div class="flex items-center gap-2">
          <!-- Sound toggle -->
          <button
            @click="toggleSound"
            :title="soundEnabled ? t('cocina.monitor.soundOffAria') : t('cocina.monitor.soundOnAria')"
            class="flex items-center justify-center h-9 w-9 rounded-lg bg-surface border border-border hover:bg-surface-secondary transition-colors"
            :class="soundEnabled ? 'text-primary' : 'text-text-tertiary'"
          >
            <Icon :name="soundEnabled ? 'lucide:volume-2' : 'lucide:volume-x'" class="w-4 h-4" />
          </button>
          <!-- Manual refresh -->
          <button
            @click="refetch"
            class="flex items-center justify-center h-9 w-9 rounded-lg bg-surface border border-border hover:bg-surface-secondary transition-colors"
            title="Refrescar"
          >
            <Icon
              name="lucide:refresh-cw"
              class="w-4 h-4"
              :class="comandasStatus === 'pending' ? 'animate-spin' : ''"
            />
          </button>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        <!-- Source type pills -->
        <div class="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg border border-border flex-shrink-0">
          <button
            v-for="src in SOURCE_TYPES"
            :key="src.value"
            type="button"
            class="px-3 rounded-md text-xs font-semibold transition-all min-h-[44px]"
            :class="selectedSourceType === src.value
              ? 'bg-action-primary-bg text-action-primary-text shadow-sm'
              : 'text-text-secondary hover:bg-surface-tertiary'"
            @click="selectedSourceType = src.value"
          >
            {{ src.label }}
          </button>
        </div>

        <!-- Station dropdown -->
        <select
          v-if="activeStations.length > 0"
          v-model="selectedStationId"
          class="min-h-[44px] px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 flex-shrink-0"
        >
          <option value="">Todas las estaciones</option>
          <option v-for="station in activeStations" :key="station.id" :value="station.id">
            {{ station.kitchen_name || station.name }}
          </option>
        </select>

        <!-- Status dropdown -->
        <select
          v-model="selectedStatus"
          class="min-h-[44px] px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 flex-shrink-0"
        >
          <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <!-- Date picker -->
        <input
          v-model="selectedDate"
          type="date"
          class="min-h-[44px] px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 flex-shrink-0"
        />
      </div>

      <!-- Board content -->
      <div class="flex-1 min-h-0 overflow-y-auto">

        <!-- Loading skeleton -->
        <div v-if="comandasStatus === 'pending' && !allComandas.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <div
            v-for="i in 3"
            :key="i"
            class="h-52 rounded-xl border-2 border-border bg-surface animate-pulse"
          />
        </div>

        <!-- Error state -->
        <CommonsTheErrorState v-else-if="comandasStatus === 'error'" />

        <!-- Empty state -->
        <div
          v-else-if="!allComandas.length"
          class="flex flex-col items-center justify-center h-full text-center p-8 bg-surface/50 border border-border rounded-2xl min-h-[300px]"
        >
          <div class="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mb-4 text-text-tertiary">
            <Icon name="lucide:check-circle-2" size="32" />
          </div>
          <h3 class="text-lg font-bold text-text-primary">
            {{ selectedStatus === 'pending,preparing' ? t('cocina.monitor.noActive') : t('cocina.monitor.noComandas') }}
          </h3>
          <p class="text-sm text-text-secondary mt-1">
            {{ selectedStatus === 'pending,preparing'
              ? t('cocina.monitor.emptyPending')
              : t('cocina.monitor.emptyFiltered') }}
          </p>
        </div>

        <!-- Swim lanes -->
        <div v-else class="flex flex-col gap-8 pb-8">

          <!-- Activas swim lane -->
          <div v-if="activeComandas.length > 0 || selectedStatus === 'pending,preparing'">
            <div class="flex items-center gap-2 mb-3">
              <h2 class="text-sm font-black uppercase tracking-wider text-text-secondary">Activas</h2>
              <span
                v-if="activeComandas.length > 0"
                class="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-action-primary-bg text-action-primary-text text-[10px] font-black"
              >
                {{ activeComandas.length }}
              </span>
            </div>
            <div
              v-if="activeComandas.length > 0"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
            >
              <CocinaComandaCard
                v-for="comanda in activeComandas"
                :key="comanda.id"
                :comanda="comanda"
                @refresh="refetch"
              />
            </div>
            <div
              v-else
              class="flex flex-col items-center justify-center p-6 bg-surface/50 border border-dashed border-border rounded-xl text-center"
            >
              <p class="text-sm text-text-secondary">{{ t('cocina.monitor.noActive') }}.</p>
            </div>
          </div>

          <!-- {{ t('cocina.monitor.readyToServe') }} swim lane -->
          <div v-if="readyComandas.length > 0 || selectedStatus === 'ready'">
            <div class="flex items-center gap-2 mb-3">
              <h2 class="text-sm font-black uppercase tracking-wider text-success">{{ t('cocina.monitor.readyToServe') }}</h2>
              <span
                v-if="readyComandas.length > 0"
                class="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-action-success-bg text-action-success-text text-[10px] font-black"
              >
                {{ readyComandas.length }}
              </span>
            </div>
            <div
              v-if="readyComandas.length > 0"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
            >
              <CocinaComandaCard
                v-for="comanda in readyComandas"
                :key="comanda.id"
                :comanda="comanda"
                @refresh="refetch"
              />
            </div>
            <div
              v-else
              class="flex flex-col items-center justify-center p-6 bg-surface/50 border border-dashed border-border rounded-xl text-center"
            >
              <p class="text-sm text-text-secondary">{{ t('cocina.monitor.noComandas') }} listas para entregar.</p>
            </div>
          </div>

        </div>
      </div>

    </template>

    <!-- Loading tenant profile -->
    <div v-else class="flex items-center justify-center h-full">
      <CommonsTheCustomLoader size="large" />
    </div>

  </div>
</template>
