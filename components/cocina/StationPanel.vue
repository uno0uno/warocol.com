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
      <div
        v-if="modelValue"
        class="fixed inset-0 z-40 bg-foreground/40"
        @click="close"
        aria-hidden="true"
      />
    </Transition>

    <!-- Panel: bottom sheet on mobile, slide-over on desktop -->
    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="t('cocina.station.createAria')"
        @keydown.esc="close"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-sheet-border" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.24 17 7.07c.66 1.32.59 2.93.42 4.43-.07.62-.17 1.24-.32 1.85-.05.21-.21.46-.43.65a3.5 3.5 0 003.49.49M9 13a3 3 0 116 0 3 3 0 01-6 0z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">{{ t('cocina.station.newTitle') }}</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  Punto de preparación para comandas (KDS)
                </p>
              </div>
            </div>
            <button
              @click="close"
              type="button"
              :aria-label="t('cocina.station.closePanelAria')"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <form @submit.prevent="submit" class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p
            v-if="isActiveKitchenQuotaBlocked"
            role="alert"
            class="rounded-lg border border-state-warning-border bg-state-warning-bg px-3 py-2 text-sm text-state-warning-text"
          >
            {{ activeKitchenQuotaMessage }}
          </p>

          <div class="flex flex-col gap-1.5">
            <label for="station-name" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="station-name"
              ref="nameInputRef"
              v-model="name"
              type="text"
              required
              maxlength="100"
              :placeholder="t('cocina.station.namePlaceholder')"
              class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring text-sm text-text-primary bg-surface"
              autocomplete="off"
              :disabled="loading"
            />
            <p class="text-xs text-text-tertiary">{{ name.length }} / 100 caracteres</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="station-color" class="text-sm font-medium text-text-primary">Color</label>
            <div class="flex items-center gap-2">
              <input
                id="station-color"
                v-model="color"
                type="color"
                :aria-label="t('cocina.station.colorPickerAria')"
                :disabled="loading"
                class="w-11 h-11 rounded-lg cursor-pointer border border-border p-0 overflow-hidden disabled:cursor-not-allowed disabled:opacity-50"
              />
              <input
                v-model="color"
                type="text"
                pattern="^#[0-9A-Fa-f]{6}$"
                placeholder="#6B7280"
                :aria-label="t('cocina.station.hexAria')"
                :disabled="loading"
                class="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring text-sm font-mono uppercase text-text-primary bg-surface"
              />
            </div>
            <p class="text-xs text-text-tertiary">
              Indicador visual de la estación en el listado y en el KDS
            </p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="station-kitchen-name" class="text-sm font-medium text-text-primary">
              Nombre del monitor <span class="text-text-tertiary text-xs font-normal">(opcional)</span>
            </label>
            <input
              id="station-kitchen-name"
              v-model="kitchenName"
              type="text"
              maxlength="50"
              placeholder="Ej: K1, BAR-01"
              class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring text-sm text-text-primary bg-surface"
              autocomplete="off"
              :disabled="loading"
            />
            <p class="text-xs text-text-tertiary">
              Nombre corto que se muestra en la pantalla de cocina (KDS)
            </p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="station-display-order" class="text-sm font-medium text-text-primary">
              Orden <span class="text-text-tertiary text-xs font-normal">(opcional)</span>
            </label>
            <input
              id="station-display-order"
              v-model.number="displayOrder"
              type="number"
              min="0"
              placeholder="0"
              class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring text-sm text-text-primary bg-surface"
              :disabled="loading"
            />
            <p class="text-xs text-text-tertiary">
              Posición en el listado (números más bajos aparecen primero)
            </p>
          </div>

          <p
            v-if="errorMsg"
            role="alert"
            class="flex items-start gap-2 text-sm text-destructive"
          >
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
            <span>{{ errorMsg }}</span>
          </p>
        </form>

        <!-- Footer -->
        <div class="flex-shrink-0 border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="close"
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="submit"
            :disabled="loading || !canSubmit"
            class="min-h-[44px] px-5 py-2 rounded-lg bg-action-primary-bg text-action-primary-text text-sm font-semibold hover:bg-action-primary-hover-bg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring focus:ring-offset-2 transition-colors flex items-center gap-2"
          >
            <template v-if="loading">
              <span>Creando</span>
              <CommonsInlineDots :aria-label="t('cocina.station.creating')" :size="5" />
            </template>
            <template v-else>
              Crear estación
            </template>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { computed, nextTick, ref, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useTenantReactive } from '~/composables/useTenantReactive'

interface Station {
  id: string
  name: string
  kitchen_name: string | null
  color: string
  is_active: boolean
  display_order: number
  alert_threshold_1_min: number
  alert_threshold_2_min: number
  tenant_id: string
}

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', station: Station): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const cache = useQueryCache()
const { currentTenant } = useTenantReactive()
const { operationalQuotas, fetchBillingOverview } = useBilling()

const name = ref('')
const color = ref('#6B7280')
const kitchenName = ref('')
const displayOrder = ref<number>(0)
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)

// Backend's CreateStationRequest validates color with regex ^#[0-9A-Fa-f]{6}$.
// Mirror the rule client-side so we don't ship a request guaranteed to fail.
const isValidColor = computed(() => /^#[0-9A-Fa-f]{6}$/.test(color.value))
const activeKitchenQuota = computed(() => operationalQuotas.value.active_kitchens)
const isActiveKitchenQuotaBlocked = computed(() => activeKitchenQuota.value.blocked)
const activeKitchenQuotaMessage = computed(() => {
  const quota = activeKitchenQuota.value
  const metric = quota.metric

  if (!metric || metric.limit === null) return quota.message

  const used = metric.used.toLocaleString('es-CO')
  const limit = metric.limit.toLocaleString('es-CO')
  return `${quota.message} Uso actual: ${used} de ${limit} ${quota.unit}. Revisa Mi Plan para ampliar tu cupo.`
})
const canSubmit = computed(() => (
  name.value.trim().length > 0 &&
  isValidColor.value &&
  !isActiveKitchenQuotaBlocked.value
))

const isQuotaExceededError = (err: any) => {
  const detail = err?.data?.detail
  return err?.status === 429 ||
    err?.statusCode === 429 ||
    err?.data?.code === 'quota_exceeded' ||
    err?.data?.error === 'quota_exceeded' ||
    detail?.code === 'quota_exceeded' ||
    detail?.error === 'quota_exceeded'
}

const quotaExceededMessageFromError = (err: any) => {
  const detail = err?.data?.detail ?? err?.data ?? {}
  const used = typeof detail.used === 'number' ? detail.used : null
  const limit = typeof detail.limit === 'number' ? detail.limit : null

  if (used !== null && limit !== null) {
    return `Alcanzaste el límite de cocinas activas de tu plan. Uso actual: ${used.toLocaleString('es-CO')} de ${limit.toLocaleString('es-CO')} cocinas. Revisa Mi Plan para ampliar tu cupo.`
  }

  return typeof detail === 'string' ? detail : activeKitchenQuotaMessage.value
}

// Reset state every time the panel opens; auto-focus the name input.
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      name.value = ''
      color.value = '#6B7280'
      kitchenName.value = ''
      displayOrder.value = 0
      errorMsg.value = null
      loading.value = false
      await nextTick()
      nameInputRef.value?.focus()
    }
  },
)

function close() {
  if (loading.value) return
  emit('update:modelValue', false)
}

async function submit() {
  if (isActiveKitchenQuotaBlocked.value) {
    errorMsg.value = activeKitchenQuotaMessage.value
    return
  }

  const trimmedName = name.value.trim()
  if (!trimmedName) {
    errorMsg.value = 'El nombre es obligatorio'
    return
  }
  if (!isValidColor.value) {
    errorMsg.value = 'El color debe estar en formato #RRGGBB'
    return
  }

  loading.value = true
  errorMsg.value = null
  try {
    const res = await $fetch<{ success: boolean; data: Station }>('/api/api/stations', {
      method: 'POST',
      body: {
        name: trimmedName,
        color: color.value,
        kitchen_name: kitchenName.value.trim() || null,
        display_order: displayOrder.value || 0,
        // Thresholds use backend defaults (8 / 15) — kept out of this slide-over
        // for compactness. Editing thresholds is done from /operaciones/comandas.
        alert_threshold_1_min: 8,
        alert_threshold_2_min: 15,
      },
    })
    cache.invalidateQueries({ key: ['tenant', 'stations', currentTenant.value?.id ?? 'none'] })
    await fetchBillingOverview()
    emit('saved', res.data)
    emit('update:modelValue', false)
  } catch (e: any) {
    if (e?.response?.status === 409 || e?.statusCode === 409) {
      errorMsg.value = t('cocina.station.nameExists')
    } else if (isQuotaExceededError(e)) {
      errorMsg.value = quotaExceededMessageFromError(e)
    } else {
      errorMsg.value = e?.data?.detail || e?.message || t('cocina.station.createError')
    }
  } finally {
    loading.value = false
  }
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
    transform: translateX(100%);
  }
}
</style>
