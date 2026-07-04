<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'dashboard', module: 'operaciones' })

useHead({ title: 'Personalizar | Operaciones' })

const { currentTenant } = useTenantReactive()
const cache = useQueryCache()

// Operaciones audience aggregator — gated under OPERACIONES.
// Migrated from /api/api/tenant/public-profile (now owner-only MI_NEGOCIO).
// Shared cache key with /operaciones/mesas and /operaciones/comandas.
const { data: profileData, asyncStatus: profileAsyncStatus, refetch: refreshProfile } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const businessProfile = computed(() => profileData.value?.data ?? null)

const isRefreshing = computed(() =>
  profileAsyncStatus.value === 'loading' && profileData.value != null
)
const loading = computed(() => !profileData.value)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(refreshProfile))
onUnmounted(() => clearRefreshHandler(refreshProfile))

const toast = useToast()

// ── Table label customization (issue #612 → DB-backed in #614) ─────────────
const { singular: storedSingular, plural: storedPlural, setLabel, migrateLocalStorageIfPresent } = useTableLabel()

interface LabelPreset {
  key: string
  label: string
  singular: string
  plural: string
}

const labelPresets: LabelPreset[] = [
  { key: 'mesas', label: 'Mesas (predeterminado)', singular: 'Mesa', plural: 'Mesas' },
  { key: 'habitaciones', label: 'Habitaciones', singular: 'Habitación', plural: 'Habitaciones' },
  { key: 'cabanas', label: 'Cabañas', singular: 'Cabaña', plural: 'Cabañas' },
  { key: 'areas', label: 'Áreas', singular: 'Área', plural: 'Áreas' },
  { key: 'custom', label: 'Personalizado', singular: '', plural: '' },
]

const matchPresetKey = (sin: string, plu: string): string => {
  const match = labelPresets.find(
    (p) => p.key !== 'custom' && p.singular === sin && p.plural === plu,
  )
  return match ? match.key : 'custom'
}

const selectedPresetKey = ref<string>('mesas')
const customSingular = ref<string>('')
const customPlural = ref<string>('')

// Initialize from stored values
watch(
  [storedSingular, storedPlural],
  ([sin, plu]) => {
    const key = matchPresetKey(sin, plu)
    selectedPresetKey.value = key
    if (key === 'custom') {
      customSingular.value = sin
      customPlural.value = plu
    } else {
      customSingular.value = ''
      customPlural.value = ''
    }
  },
  { immediate: true },
)

const selectPreset = (key: string) => {
  selectedPresetKey.value = key
  if (key !== 'custom') {
    const preset = labelPresets.find((p) => p.key === key)
    if (preset) {
      customSingular.value = preset.singular
      customPlural.value = preset.plural
    }
  }
}

const previewSingular = computed(() => {
  if (selectedPresetKey.value === 'custom') return customSingular.value.trim() || 'Mesa'
  const preset = labelPresets.find((p) => p.key === selectedPresetKey.value)
  return preset?.singular || 'Mesa'
})

const previewPlural = computed(() => {
  if (selectedPresetKey.value === 'custom') return customPlural.value.trim() || 'Mesas'
  const preset = labelPresets.find((p) => p.key === selectedPresetKey.value)
  return preset?.plural || 'Mesas'
})

const hasChanges = computed(
  () =>
    previewSingular.value !== storedSingular.value
    || previewPlural.value !== storedPlural.value,
)

const isSavingLabel = ref(false)

const saveLabel = async () => {
  if (!hasChanges.value || isSavingLabel.value) return
  isSavingLabel.value = true
  try {
    await setLabel(previewSingular.value, previewPlural.value)
    toast.success('Nombre actualizado para todo el restaurante', { title: 'Guardado' })
  } catch (error: any) {
    toast.error(error?.data?.detail || 'No se pudo guardar el nombre', { title: 'Error' })
  } finally {
    isSavingLabel.value = false
  }
}

// One-shot migration: read any pre-#614 per-device value and push it to
// the DB on first mount per device. No-op if the localStorage key is
// already gone (already migrated, or never set).
onMounted(() => {
  void migrateLocalStorageIfPresent()
})

// ── Toggles (Operaciones → Personalizar) ────────────────────────────────────
const isTogglingGeneric = ref(false)
const isTogglingOpenSale = ref(false)

const invalidateRestaurantContext = async () => {
  await cache.invalidateQueries({ key: ['operaciones', 'restaurant-context'] })
  await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
}

const toggleAutoSelectGeneric = async () => {
  if (!businessProfile.value || isTogglingGeneric.value) return
  isTogglingGeneric.value = true
  const newState = !businessProfile.value.auto_select_generic_enabled
  try {
    await $fetch('/api/operaciones/toggles/auto-select-generic', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateRestaurantContext()
    toast.success(
      newState
        ? 'El cobro abrirá con cliente Genérico ya seleccionado'
        : 'El cobro abrirá sin cliente seleccionado',
      { title: newState ? 'Pre-selección activada' : 'Pre-selección desactivada' }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al cambiar la configuración', { title: 'Error' })
  } finally {
    isTogglingGeneric.value = false
  }
}

const toggleOpenSale = async () => {
  if (!businessProfile.value || isTogglingOpenSale.value) return
  isTogglingOpenSale.value = true
  const newState = !businessProfile.value.open_sale_enabled
  try {
    await $fetch('/api/operaciones/toggles/open-sale', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateRestaurantContext()
    toast.success(
      newState
        ? 'Venta libre visible en el POS para los cajeros'
        : 'Venta libre oculta en el POS',
      { title: newState ? 'Venta libre activada' : 'Venta libre desactivada' }
    )
  } catch (error: any) {
    const detail = error?.data?.detail ?? error?.data?.message
    toast.error(detail || 'Error al cambiar venta libre', { title: 'Error' })
  } finally {
    isTogglingOpenSale.value = false
  }
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- ══════ VENTA LIBRE EN POS (#805) ══════ -->
      <div
        v-if="businessProfile"
        class="flex items-center justify-between gap-4 rounded-xl border-2 border-border bg-surface px-4 py-3"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-snug text-text-primary">
            {{ businessProfile.open_sale_enabled
              ? 'Venta libre en POS activa'
              : 'Venta libre en POS desactivada' }}
          </p>
          <p class="text-xs mt-0.5 leading-snug text-text-secondary">
            Cuando está activa, los cajeros ven el botón Venta libre para cobrar montos que no están en el menú. Se crea un producto contenedor automáticamente.
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingOpenSale ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.open_sale_enabled
            ? 'Desactivar venta libre en el POS'
            : 'Activar venta libre en el POS'"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="!!businessProfile.open_sale_enabled"
            :disabled="isTogglingOpenSale"
            @change="toggleOpenSale"
          />
          <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <!-- ══════ AUTO-SELECT GENÉRICO TOGGLE (Issue #529) ══════ -->
      <div
        v-if="businessProfile"
        class="flex items-center justify-between gap-4 rounded-xl border-2 border-border bg-surface px-4 py-3"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-snug text-text-primary">
            {{ businessProfile.auto_select_generic_enabled
              ? 'Cliente Genérico automático activo'
              : 'Cliente Genérico automático desactivado' }}
          </p>
          <p class="text-xs mt-0.5 leading-snug text-text-secondary">
            El cobro abre con cliente Genérico ya seleccionado. El cajero puede cambiarlo desde la tarjeta de cliente.
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingGeneric ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.auto_select_generic_enabled
            ? 'Desactivar pre-selección de cliente Genérico'
            : 'Activar pre-selección de cliente Genérico'"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="businessProfile.auto_select_generic_enabled"
            :disabled="isTogglingGeneric"
            @change="toggleAutoSelectGeneric"
          />
          <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <!-- ══════ TABLE LABEL CUSTOMIZATION (Issue #612) ══════ -->
      <div class="rounded-xl border-2 border-border bg-surface px-4 py-4 flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <p class="text-sm font-semibold text-text-primary">Nombre de las mesas</p>
          <p class="text-xs leading-snug text-text-secondary">
            Cambia el sustantivo que aparece en toda la plataforma. Usa palabras femeninas para que la concordancia del texto siga siendo correcta.
          </p>
        </div>

        <!-- Preset chips -->
        <div role="group" aria-label="Sustantivo predeterminado" class="flex flex-wrap gap-2">
          <button
            v-for="preset in labelPresets"
            :key="preset.key"
            type="button"
            :aria-pressed="selectedPresetKey === preset.key"
            class="min-h-[44px] px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all active:scale-95"
            :class="selectedPresetKey === preset.key
              ? 'border-primary bg-primary/10 text-primary shadow-sm'
              : 'border-border bg-background text-text-secondary hover:border-primary/40 hover:text-text-primary'"
            @click="selectPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- Custom inputs (only when Personalizado is selected) -->
        <div v-if="selectedPresetKey === 'custom'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="label-singular" class="text-sm font-medium text-text-primary">
              Singular
            </label>
            <input
              id="label-singular"
              v-model="customSingular"
              type="text"
              maxlength="40"
              placeholder="Ej: Habitación"
              class="input-base w-full px-4 py-2 min-h-[44px]"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="label-plural" class="text-sm font-medium text-text-primary">
              Plural
            </label>
            <input
              id="label-plural"
              v-model="customPlural"
              type="text"
              maxlength="40"
              placeholder="Ej: Habitaciones"
              class="input-base w-full px-4 py-2 min-h-[44px]"
            />
          </div>
        </div>

        <!-- Live preview -->
        <div class="rounded-lg bg-background border border-border px-4 py-3 flex flex-col gap-1">
          <p class="text-xs font-semibold uppercase tracking-wider text-text-secondary">Vista previa</p>
          <p class="text-sm text-text-primary leading-relaxed">
            Tu menú dirá: <span class="font-semibold">{{ previewSingular }} 5</span>,
            <span class="font-semibold">{{ previewPlural }} abiertas</span>,
            <span class="font-semibold">{{ previewPlural }} configuradas</span>.
          </p>
        </div>

        <!-- Disclosure + Save -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p class="text-xs text-text-secondary">
            Configuración guardada para todo el restaurante. Todos los dispositivos verán el mismo nombre.
          </p>
          <button
            type="button"
            :disabled="!hasChanges || isSavingLabel"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-action-primary-bg text-action-primary-text font-medium text-sm transition-all hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            @click="saveLabel"
          >
            {{ isSavingLabel ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
