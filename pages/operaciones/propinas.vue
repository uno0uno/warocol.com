<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

definePageMeta({
  layout: 'dashboard',

  module: 'finanzas',
})

useHead({ title: () => t('operaciones.head.propinas') })

const { currentTenant } = useTenantReactive()
const cache = useQueryCache()
const toast = useToast()

// Aggregator query — shared with /operaciones/* siblings.
// Returns tip_enabled, tip_default_percentages, tip_preselect_index in
// addition to the existing operaciones/POS toggles (warocol.com#638
// backend extension).
const { data: profileData, asyncStatus: profileAsyncStatus, error: fetchError, refetch: refreshProfile } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const businessProfile = computed(() => profileData.value?.data ?? null)
const isLoading = computed(() => !profileData.value && !fetchError.value)
const isRefreshing = computed(
  () => profileAsyncStatus.value === 'loading' && profileData.value != null,
)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(refreshProfile))
onUnmounted(() => clearRefreshHandler(refreshProfile))

const invalidateContextCaches = async () => {
  // POS reads tip_enabled at checkout (warocol.com#637 wiring), so both
  // audiences must be invalidated after any save.
  await cache.invalidateQueries({ key: ['operaciones', 'restaurant-context'] })
  await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
}

// ── Master toggle ──────────────────────────────────────────────────────────
const isToggling = ref(false)
const isTogglingTaxable = ref(false)

const toggleTipTaxableDefault = async () => {
  if (!businessProfile.value || isTogglingTaxable.value) return
  const newState = !businessProfile.value.tip_taxable_default
  isTogglingTaxable.value = true
  try {
    await $fetch('/api/operaciones/toggles/tip-taxable-default', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateContextCaches()
    toast.success(
      newState
        ? t('operaciones.propinas.taxedDefaultOn')
        : t('operaciones.propinas.taxedDefaultOff'),
      { title: newState ? t('operaciones.propinas.taxedDefault') : t('operaciones.propinas.untaxedDefault') },
    )
  } catch (error: any) {
    toast.error(error?.data?.detail || t('operaciones.propinas.configError'), { title: t('operaciones.comandas.error') })
  } finally {
    isTogglingTaxable.value = false
  }
}

const toggleTipEnabled = async () => {
  if (!businessProfile.value || isToggling.value) return
  const newState = !businessProfile.value.tip_enabled
  isToggling.value = true
  try {
    await $fetch('/api/operaciones/toggles/tip', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateContextCaches()
    toast.success(
      newState
        ? t('operaciones.propinas.visibleOn')
        : t('operaciones.propinas.hiddenOff'),
      { title: newState ? t('operaciones.propinas.enabled') : t('operaciones.propinas.disabled') },
    )
  } catch (error: any) {
    toast.error(error?.data?.detail || t('operaciones.propinas.configError'), { title: t('operaciones.comandas.error') })
  } finally {
    isToggling.value = false
  }
}

// ── Presets + preselect (editable local state, save explicit) ──────────────
const draftPresets = ref<number[]>([])
const draftPreselect = ref<boolean>(false)
const newPresetInput = ref<string>('')
const presetError = ref<string>('')

// Hydrate the draft from the server every time the profile loads/refreshes.
watch(
  businessProfile,
  (profile) => {
    if (!profile) return
    const serverPresets: number[] = (profile.tip_default_percentages ?? [10]).map((p: any) => Number(p))
    draftPresets.value = [...serverPresets]
    draftPreselect.value = profile.tip_preselect_index === 0
  },
  { immediate: true },
)

const serverPresets = computed<number[]>(() =>
  (businessProfile.value?.tip_default_percentages ?? [10]).map((p: any) => Number(p)),
)
const serverPreselect = computed<boolean>(() => businessProfile.value?.tip_preselect_index === 0)

const hasChanges = computed(() => {
  if (draftPresets.value.length !== serverPresets.value.length) return true
  for (let i = 0; i < draftPresets.value.length; i++) {
    if (draftPresets.value[i] !== serverPresets.value[i]) return true
  }
  if (draftPreselect.value !== serverPreselect.value) return true
  return false
})

const addPreset = () => {
  presetError.value = ''
  const raw = newPresetInput.value.trim().replace(',', '.')
  if (!raw) {
    presetError.value = t('operaciones.propinas.enterPercent')
    return
  }
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    presetError.value = t('operaciones.propinas.invalidNumber')
    return
  }
  if (value < 0 || value > 100) {
    presetError.value = t('operaciones.propinas.percentRange')
    return
  }
  if (draftPresets.value.length >= 5) {
    presetError.value = t('operaciones.propinas.maxPresets')
    return
  }
  // Round to 2 decimals to match DB numeric(5,2) precision and avoid silent rounding.
  const rounded = Math.round(value * 100) / 100
  draftPresets.value.push(rounded)
  newPresetInput.value = ''
}

const removePreset = (index: number) => {
  // Removing the preselected first preset turns the toggle off (the index becomes invalid).
  if (index === 0 && draftPreselect.value) {
    draftPreselect.value = false
  }
  draftPresets.value.splice(index, 1)
}

const formatPreset = (p: number): string => {
  return Number.isInteger(p) ? `${p}%` : `${p}%`
}

const isSavingConfig = ref(false)

const saveConfig = async () => {
  if (!hasChanges.value || isSavingConfig.value) return
  if (draftPresets.value.length === 0) {
    toast.error(t('operaciones.propinas.needPreset'), { title: t('operaciones.propinas.noPresets') })
    return
  }
  isSavingConfig.value = true
  try {
    await $fetch('/api/operaciones/tip/config', {
      method: 'PATCH',
      body: {
        percentages: draftPresets.value,
        preselect_index: draftPreselect.value && draftPresets.value.length > 0 ? 0 : null,
      },
    })
    await invalidateContextCaches()
    toast.success(t('operaciones.propinas.saved'), { title: t('operaciones.comandas.savedTitle') })
  } catch (error: any) {
    toast.error(error?.data?.detail || t('operaciones.propinas.saveError'), { title: t('operaciones.comandas.error') })
  } finally {
    isSavingConfig.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- ══════ MASTER TOGGLE ══════ -->
      <div
        v-if="businessProfile"
        class="flex items-center justify-between gap-4 rounded-xl border-2 border-border bg-surface px-4 py-3"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-snug text-text-primary">
            {{ businessProfile.tip_enabled ? t('operaciones.propinas.enabled') : t('operaciones.propinas.disabled') }}
          </p>
          <p class="text-xs mt-0.5 leading-snug text-text-secondary">
            {{ t('operaciones.propinas.enabledHelp') }}
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isToggling ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.tip_enabled ? t('operaciones.propinas.disable') : t('operaciones.propinas.enable')"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="businessProfile.tip_enabled"
            :disabled="isToggling"
            @change="toggleTipEnabled"
          />
          <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <!-- ══════ SUB-BLOCK (only when tip_enabled) ══════ -->
      <template v-if="businessProfile?.tip_enabled">
        <!-- warocol.com#740 — default taxable tip at checkout -->
        <div
          class="flex items-center justify-between gap-4 rounded-xl border-2 border-border bg-surface px-4 py-3"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-snug text-text-primary">
              {{ businessProfile.tip_taxable_default ? t('operaciones.propinas.taxedDefault') : t('operaciones.propinas.untaxedDefault') }}
            </p>
            <p class="text-xs mt-0.5 leading-snug text-text-secondary">
              {{ t('operaciones.propinas.taxableHelp') }}
            </p>
          </div>
          <label
            class="relative inline-flex items-center cursor-pointer flex-shrink-0"
            :class="isTogglingTaxable ? 'opacity-50 pointer-events-none' : ''"
            :aria-label="businessProfile.tip_taxable_default ? t('operaciones.propinas.disableTaxedDefault') : t('operaciones.propinas.enableTaxedDefault')"
          >
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="businessProfile.tip_taxable_default"
              :disabled="isTogglingTaxable"
              @change="toggleTipTaxableDefault"
            />
            <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <!-- Fixed informational banner (Ley 1935 framing) -->
        <div class="rounded-xl border border-state-warning-border bg-state-warning-bg px-4 py-3 flex gap-3">
          <span aria-hidden="true" class="text-state-warning-text mt-0.5">⚠</span>
          <p class="text-sm text-state-warning-text leading-snug">
            {{ t('operaciones.propinas.distributionWarning') }}
          </p>
        </div>

        <!-- ── Presets section ── -->
        <div class="rounded-xl border-2 border-border bg-surface px-4 py-4 flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <p class="text-sm font-semibold text-text-primary">{{ t('operaciones.propinas.suggestedPercents') }}</p>
            <p class="text-xs leading-snug text-text-secondary">
              {{ t('operaciones.propinas.suggestedHelp') }}
            </p>
          </div>

          <!-- Chip row -->
          <div role="group" :aria-label="t('operaciones.propinas.suggestedPercents')" class="flex flex-wrap gap-2">
            <div
              v-for="(p, i) in draftPresets"
              :key="`preset-${i}-${p}`"
              class="min-h-[44px] inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-primary bg-primary/10 text-primary text-sm font-medium"
            >
              <span>{{ formatPreset(p) }}</span>
              <button
                type="button"
                class="text-primary/70 hover:text-primary"
                :aria-label="t('operaciones.propinas.removePreset', { value: formatPreset(p) })"
                @click="removePreset(i)"
              >
                ×
              </button>
            </div>
            <p v-if="draftPresets.length === 0" class="text-xs text-text-secondary self-center">
              {{ t('operaciones.propinas.noPresetsHelp') }}
            </p>
          </div>

          <!-- Add control -->
          <div class="flex flex-col sm:flex-row gap-2 sm:items-start">
            <div class="flex-1 flex flex-col gap-1">
              <label for="new-preset" class="sr-only">{{ t('operaciones.propinas.addPercent') }}</label>
              <input
                id="new-preset"
                v-model="newPresetInput"
                type="text"
                inputmode="decimal"
                :placeholder="t('operaciones.propinas.addPlaceholder')"
                maxlength="6"
                :disabled="draftPresets.length >= 5"
                class="input-base w-full sm:w-40 px-4 py-2 min-h-[44px]"
                @keydown.enter.prevent="addPreset"
              />
              <p v-if="presetError" class="text-xs text-destructive">{{ presetError }}</p>
            </div>
            <button
              type="button"
              :disabled="draftPresets.length >= 5"
              class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border bg-background text-text-primary text-sm font-medium hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="addPreset"
            >
              {{ t('operaciones.propinas.add') }}
            </button>
          </div>
        </div>

        <!-- ── Preselect toggle ── -->
        <div class="flex items-center justify-between gap-4 rounded-xl border-2 border-border bg-surface px-4 py-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-snug text-text-primary">
              {{ t('operaciones.propinas.preselectTitle') }}
            </p>
            <p class="text-xs mt-0.5 leading-snug text-text-secondary">
              <i18n-t keypath="operaciones.propinas.preselectHelp" tag="span">
                <template #status><strong>{{ t('operaciones.propinas.preselectOff') }}</strong></template>
                <template #onlineOrders><strong>{{ t('operaciones.propinas.onlineOrders') }}</strong></template>
              </i18n-t>
            </p>
          </div>
          <label
            class="relative inline-flex items-center cursor-pointer flex-shrink-0"
            :aria-label="draftPreselect ? t('operaciones.propinas.disablePreselect') : t('operaciones.propinas.enablePreselect')"
          >
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="draftPreselect"
              :disabled="draftPresets.length === 0"
              @change="draftPreselect = !draftPreselect"
            />
            <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <!-- ── Save bar ── -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-surface border-2 border-border px-4 py-3">
          <p class="text-xs text-text-secondary">
            {{ t('operaciones.propinas.saveHelp') }}
          </p>
          <button
            type="button"
            :disabled="!hasChanges || isSavingConfig"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-action-primary-bg text-action-primary-text font-medium text-sm transition-all hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            @click="saveConfig"
          >
            {{ isSavingConfig ? t('common.loading') : t('operaciones.propinas.saveChanges') }}
          </button>
        </div>

        <NuxtLink to="/ventas/propinas" class="text-sm text-primary hover:underline self-start">
          {{ t('operaciones.propinas.history') }}
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
