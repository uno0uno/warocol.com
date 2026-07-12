<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'dashboard', module: 'operaciones' })

useHead({ title: () => t('operaciones.head.personalizar') })

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

const labelPresets = computed<LabelPreset[]>(() => [
  { key: 'mesas', label: t('operaciones.personalizar.tablesDefault'), singular: t('operaciones.personalizar.tableSingular'), plural: t('operaciones.personalizar.tablePlural') },
  { key: 'habitaciones', label: t('operaciones.personalizar.roomsPreset'), singular: t('operaciones.personalizar.roomSingular'), plural: t('operaciones.personalizar.roomsPreset') },
  { key: 'cabanas', label: t('operaciones.personalizar.cabinsPreset'), singular: t('operaciones.personalizar.cabinSingular'), plural: t('operaciones.personalizar.cabinsPreset') },
  { key: 'areas', label: t('operaciones.personalizar.areasPreset'), singular: t('operaciones.personalizar.areaSingular'), plural: t('operaciones.personalizar.areasPreset') },
  { key: 'custom', label: t('operaciones.personalizar.custom'), singular: '', plural: '' },
])

const matchPresetKey = (sin: string, plu: string): string => {
  const match = labelPresets.value.find(
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
    const preset = labelPresets.value.find((p) => p.key === key)
    if (preset) {
      customSingular.value = preset.singular
      customPlural.value = preset.plural
    }
  }
}

const previewSingular = computed(() => {
  if (selectedPresetKey.value === 'custom') return customSingular.value.trim() || 'Mesa'
  const preset = labelPresets.value.find((p) => p.key === selectedPresetKey.value)
  return preset?.singular || 'Mesa'
})

const previewPlural = computed(() => {
  if (selectedPresetKey.value === 'custom') return customPlural.value.trim() || 'Mesas'
  const preset = labelPresets.value.find((p) => p.key === selectedPresetKey.value)
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
    toast.success(t('operaciones.personalizar.nameUpdated'), { title: t('operaciones.personalizar.savedTitle') })
  } catch (error: any) {
    toast.error(error?.data?.detail || t('operaciones.personalizar.saveNameError'), { title: t('operaciones.comandas.error') })
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
        ? t('operaciones.personalizar.genericOn')
        : t('operaciones.personalizar.genericOff'),
      { title: newState ? t('operaciones.personalizar.preselectOn') : t('operaciones.personalizar.preselectOff') }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || t('operaciones.personalizar.configError'), { title: t('operaciones.comandas.error') })
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
        ? t('operaciones.personalizar.openSaleActive')
        : t('operaciones.personalizar.openSaleInactive'),
      { title: newState ? t('operaciones.personalizar.openSaleActive') : t('operaciones.personalizar.openSaleInactive') }
    )
  } catch (error: any) {
    const detail = error?.data?.detail ?? error?.data?.message
    toast.error(detail || t('operaciones.personalizar.openSaleError'), { title: t('operaciones.comandas.error') })
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
              ? t('operaciones.personalizar.openSaleActive')
              : t('operaciones.personalizar.openSaleInactive') }}
          </p>
          <p class="text-xs mt-0.5 leading-snug text-text-secondary">
            {{ t('operaciones.personalizar.openSaleHelp') }}
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingOpenSale ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.open_sale_enabled
            ? t('operaciones.personalizar.disableOpenSale')
            : t('operaciones.personalizar.enableOpenSale')"
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
              ? t('operaciones.personalizar.genericActive')
              : t('operaciones.personalizar.genericInactive') }}
          </p>
          <p class="text-xs mt-0.5 leading-snug text-text-secondary">
            {{ t('operaciones.personalizar.genericHelp') }}
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingGeneric ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.auto_select_generic_enabled
            ? t('operaciones.personalizar.disableGeneric')
            : t('operaciones.personalizar.enableGeneric')"
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
          <p class="text-sm font-semibold text-text-primary">{{ t('operaciones.personalizar.tableNamesTitle') }}</p>
          <p class="text-xs leading-snug text-text-secondary">
            {{ t('operaciones.personalizar.tableNamesHelp') }}
          </p>
        </div>

        <!-- Preset chips -->
        <div role="group" :aria-label="t('operaciones.personalizar.defaultNounAria')" class="flex flex-wrap gap-2">
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
              {{ t('operaciones.personalizar.singular') }}
            </label>
            <input
              id="label-singular"
              v-model="customSingular"
              type="text"
              maxlength="40"
              :placeholder="t('operaciones.personalizar.singularPlaceholder')"
              class="input-base w-full px-4 py-2 min-h-[44px]"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="label-plural" class="text-sm font-medium text-text-primary">
              {{ t('operaciones.personalizar.plural') }}
            </label>
            <input
              id="label-plural"
              v-model="customPlural"
              type="text"
              maxlength="40"
              :placeholder="t('operaciones.personalizar.pluralPlaceholder')"
              class="input-base w-full px-4 py-2 min-h-[44px]"
            />
          </div>
        </div>

        <!-- Live preview -->
        <div class="rounded-lg bg-background border border-border px-4 py-3 flex flex-col gap-1">
          <p class="text-xs font-semibold uppercase tracking-wider text-text-secondary">{{ t('operaciones.personalizar.preview') }}</p>
          <p class="text-sm text-text-primary leading-relaxed">
            {{ t('operaciones.personalizar.previewText') }} <span class="font-semibold">{{ previewSingular }} 5</span>,
            <span class="font-semibold">{{ previewPlural }} abiertas</span>,
            <span class="font-semibold">{{ previewPlural }} configuradas</span>.
          </p>
        </div>

        <!-- Disclosure + Save -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p class="text-xs text-text-secondary">
            {{ t('operaciones.personalizar.savedDevices') }}
          </p>
          <button
            type="button"
            :disabled="!hasChanges || isSavingLabel"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-action-primary-bg text-action-primary-text font-medium text-sm transition-all hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            @click="saveLabel"
          >
            {{ isSavingLabel ? t('operaciones.personalizar.saving') : t('operaciones.personalizar.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
