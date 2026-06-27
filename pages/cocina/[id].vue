<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, watch } from 'vue'

definePageMeta({
  layout: 'kds',
})

const route = useRoute()
const stationId = computed(() => route.params.id as string)
const kdsToken = computed(() => (route.query.token as string) || '')

// Make the KDS token available to descendant components (ComandaCard,
// ItemRow) so their PATCH requests can carry it and satisfy the
// kds_public middleware bypass on the backend.
provide('kdsToken', kdsToken)

// ── Token guard ─────────────────────────────────────────────────────────────
const tokenError = ref(false)

// ── Station metadata ────────────────────────────────────────────────────────
const { data: stationData, status: stationStatus } = useQuery({
  key: () => ['kds-station', stationId.value],
  query: async () => {
    try {
      return await $fetch<{ success: boolean; data: any }>(`/api/api/stations/${stationId.value}`, {
        params: { token: kdsToken.value || undefined },
      })
    } catch (e: any) {
      if (e.status === 401 || e.statusCode === 401) tokenError.value = true
      throw e
    }
  },
  enabled: () => !!kdsToken.value,
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
const { todayISO } = useTenantTimezone()
const today = computed(() => todayISO())

const { data: comandasData, status: comandasStatus, asyncStatus: comandasAsyncStatus, refetch } = useQuery({
  key: () => ['kds-comandas', stationId.value, today.value],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/comandas', {
    params: {
      station_id: stationId.value,
      status: 'pending,preparing,ready',
      date: today.value,
      token: kdsToken.value || undefined,
    },
  }),
  enabled: () => !!kdsToken.value,
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
  }, 10000)
  // Pre-fetch + decode the chime buffer eagerly. The fetch/decode awaits
  // would otherwise consume the user gesture inside authorizeAudio(),
  // pushing AudioContext.resume() out of the activation window — and the
  // context would silently stay 'suspended' even though the test chime
  // appeared to fire. Decoding is allowed on a suspended context.
  prefetchAudioBuffer()
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
// Track whether the first poll has settled. The previous size-based guard
// (knownIds.size > 0) silently swallowed the chime for the first comanda
// when the page loaded with zero existing comandas — that comanda was
// genuinely new but the guard treated the empty initial state as
// "uninitialized" forever.
const hasSeenFirstPoll = ref(false)

// Audio gate — explicit user click required (browser autoplay policy).
// Once authorized in this tab, the AudioContext is unlocked for the session.
const audioAuthorized = ref(false)
const isAuthorizingAudio = ref(false)

// AudioContext + decoded buffer.
//   - Buffer is decoded eagerly on mount via prefetchAudioBuffer (no resume,
//     no gesture required — decoding is allowed on a suspended context).
//   - resume() is called from authorizeAudio synchronously inside the user
//     click, with NO awaits before it, so the activation isn't consumed.
let _audioCtx: AudioContext | null = null
let _audioBuffer: AudioBuffer | null = null

const prefetchAudioBuffer = async () => {
  if (typeof window === 'undefined') return
  try {
    if (!_audioCtx) _audioCtx = new AudioContext()
    if (!_audioBuffer) {
      const res = await fetch('/sounds/kds-new-order.wav')
      const raw = await res.arrayBuffer()
      _audioBuffer = await _audioCtx.decodeAudioData(raw)
    }
  } catch { /* not available */ }
}

const playChime = async () => {
  if (!_audioCtx || !_audioBuffer) return
  try {
    if (_audioCtx.state === 'suspended') await _audioCtx.resume()
    if (_audioCtx.state !== 'running') return
    const src = _audioCtx.createBufferSource()
    src.buffer = _audioBuffer
    const gain = _audioCtx.createGain()
    gain.gain.value = 0.7
    src.connect(gain)
    gain.connect(_audioCtx.destination)
    src.start()
  } catch { /* not available */ }
}

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  if (typeof window !== 'undefined') {
    localStorage.setItem('kds_sound_enabled', soundEnabled.value ? 'true' : 'false')
  }
  // Re-prime the context on the gesture in case it was suspended.
  if (soundEnabled.value && _audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {})
  }
}

// Explicit authorization handler. CRITICAL: AudioContext.resume() is called
// synchronously inside the user click, BEFORE any await, so the browser's
// "sticky activation" window covers it. The buffer was pre-fetched on mount
// (prefetchAudioBuffer), so no fetch/decode awaits are needed here.
const authorizeAudio = async () => {
  if (isAuthorizingAudio.value) return
  isAuthorizingAudio.value = true
  try {
    if (!_audioCtx) _audioCtx = new AudioContext()
    // Kick off resume in the same tick as the click — DO NOT await yet.
    const resumePromise = _audioCtx.state === 'suspended'
      ? _audioCtx.resume()
      : Promise.resolve()
    // Ensure buffer is decoded (usually already done by prefetchAudioBuffer).
    if (!_audioBuffer) {
      const res = await fetch('/sounds/kds-new-order.wav')
      const raw = await res.arrayBuffer()
      _audioBuffer = await _audioCtx.decodeAudioData(raw)
    }
    // Now wait for the resume to settle and play the test chime.
    await resumePromise
    await playChime()
    audioAuthorized.value = true
  } finally {
    isAuthorizingAudio.value = false
  }
}

const continueWithoutSound = () => {
  audioAuthorized.value = true
  soundEnabled.value = false
  if (typeof window !== 'undefined') {
    localStorage.setItem('kds_sound_enabled', 'false')
  }
}

const checkNewComandas = () => {
  // Always update knownIds — even when sound is muted — so re-enabling
  // doesn't unleash a chime burst for everything seen during the mute window.
  const currentIds = new Set<string>(allComandas.value.map((c: any) => String(c.id)))
  const hasNew = [...currentIds].some((id) => !knownIds.value.has(id as string))
  if (hasNew && hasSeenFirstPoll.value && soundEnabled.value) playChime()
  knownIds.value = currentIds
  hasSeenFirstPoll.value = true
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
  <!-- Token missing or invalid -->
  <div v-if="!kdsToken || tokenError" class="flex items-center justify-center h-screen bg-background">
    <div class="text-center space-y-3 p-8">
      <svg class="w-16 h-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
      <h1 class="text-xl font-bold text-text-primary">Enlace inválido</h1>
      <p class="text-sm text-text-secondary max-w-sm">Este enlace KDS no es válido o fue revocado. Solicita un nuevo enlace al administrador desde Operaciones → Comandas.</p>
    </div>
  </div>

  <div v-else class="flex flex-col h-screen overflow-hidden">

    <!-- Audio authorization gate — required by browser autoplay policy.
         Full-screen overlay until the user picks an option. Both choices
         dismiss the overlay; one enables audio, the other skips. -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-300"
      leave-to-class="opacity-0"
    >
      <div
        v-if="!audioAuthorized && station"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-surface px-6 text-center"
      >
        <div class="flex flex-col items-center gap-3 max-w-md">
          <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          </div>
          <h2 class="text-2xl md:text-3xl font-bold text-text-primary">Activar alertas sonoras</h2>
          <p class="text-sm md:text-base text-text-secondary">
            El navegador requiere un toque para permitir audio. Activa el
            aviso sonoro o continúa en silencio.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch gap-3 w-full max-w-md">
          <button
            type="button"
            :disabled="isAuthorizingAudio"
            class="flex-1 min-h-[60px] px-6 rounded-2xl bg-action-primary-bg text-action-primary-text text-base md:text-lg font-bold shadow-md hover:bg-action-primary-hover-bg active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-action-primary-focus-ring/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            @click="authorizeAudio"
          >
            <UiLoadingDots v-if="isAuthorizingAudio" size="9px" color="currentColor" />
            <template v-else>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
              <span>Activar sonido</span>
            </template>
          </button>
          <button
            type="button"
            :disabled="isAuthorizingAudio"
            class="flex-1 min-h-[60px] px-6 rounded-2xl border-2 border-border bg-surface text-text-primary text-base md:text-lg font-semibold hover:bg-surface-secondary active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-border disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            @click="continueWithoutSound"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
            <span>Sin sonido</span>
          </button>
        </div>
      </div>
    </Transition>

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

      <!-- Header -->
      <header class="flex items-center justify-between px-4 py-3 md:px-6 bg-surface border-b border-border flex-shrink-0 gap-4">

        <!-- Left: station identity -->
        <div class="flex items-center gap-3 min-w-0">
          <!-- Color accent strip — signals station, no extra box noise -->
          <div
            class="w-1 h-8 rounded-full flex-shrink-0"
            :style="{ backgroundColor: station.color || '#6B7280' }"
          />
          <!-- Station name — dominant heading -->
          <span class="text-xl font-bold text-text-primary leading-none truncate">
            {{ station.kitchen_name || station.name }}
          </span>
          <!-- Active comanda count — compact, muted -->
          <div
            v-if="activeComandas.length > 0"
            class="h-7 min-w-[28px] px-2 rounded-md bg-surface-secondary flex items-center justify-center flex-shrink-0"
          >
            <span class="text-xs font-black text-text-secondary tabular-nums leading-none">{{ activeComandas.length }}</span>
          </div>
        </div>

        <!-- Right: actions -->
        <TransitionGroup
          name="header-actions"
          tag="div"
          class="relative flex items-center gap-1.5 flex-shrink-0"
        >
          <!-- Progressive loading -->
          <div
            v-if="isRefreshing"
            key="progressive-loading"
            class="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg bg-surface-secondary text-text-secondary"
            aria-live="polite"
          >
            <UiLoadingDots size="8px" class="text-text-secondary" />
            <span class="text-xs font-medium whitespace-nowrap">{{ loadingPhrase }}</span>
          </div>

          <!-- Sound toggle -->
          <button
            key="sound"
            @click="toggleSound"
            :title="soundEnabled ? 'Silenciar alertas' : 'Activar alertas sonoras'"
            class="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            :class="soundEnabled ? 'text-text-primary' : 'text-text-tertiary'"
          >
            <svg v-if="soundEnabled" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          </button>

          <!-- Refresh -->
          <button
            key="refresh"
            @click="refetch()"
            :disabled="isRefreshing"
            aria-label="Refrescar comandas"
            class="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UiLoadingMatrix v-if="isRefreshing" size="5px" />
            <svg v-else class="w-4 h-4 transition-transform duration-300 hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>

          <!-- Clock pill -->
          <div
            key="clock"
            class="h-9 px-3 flex items-center rounded-lg bg-surface-secondary select-none"
            aria-label="Hora actual"
          >
            <span class="inline-flex items-baseline font-mono tabular-nums">
              <span class="text-sm font-bold text-text-primary leading-none">{{ clockHM }}</span>
              <span class="text-[11px] font-semibold text-text-secondary leading-none">:{{ clockS }}</span>
              <span class="text-[9px] font-medium text-text-tertiary leading-none">.{{ clockCs }}</span>
            </span>
          </div>
        </TransitionGroup>
      </header>

      <!-- Board -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-6">

        <!-- Loading skeleton -->
        <div v-if="comandasStatus === 'pending' && !allComandas.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
