<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('analitica.head.puntos') })
import { ref, onMounted, onUnmounted } from 'vue'
import type { WaroRule } from '~/composables/warosConfigHelpers'

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()

const {
  rules,
  isEnabled,
  isLoading,
  isRefreshing,
  error,
  fetchRules,
  toggleRule,
  toggleGlobal,
  getRuleMeta,
} = useWarosConfig()

const { show: showToast } = useToast()

// ── Edit modal ────────────────────────────────────────────────────────────
const showModal = ref(false)
const selectedRule = ref<WaroRule | null>(null)

const openEdit = (rule: WaroRule) => {
  selectedRule.value = rule
  showModal.value = true
}

const onRuleSaved = async () => {
  await handleRefresh()
  const label = selectedRule.value ? getRuleMeta(selectedRule.value.rule_type).label : 'Regla'
  showToast(`${label} actualizada`, 'success')
}

// ── Global toggle ─────────────────────────────────────────────────────────
const handleToggleGlobal = async () => {
  const newValue = !isEnabled.value
  try {
    await toggleGlobal(newValue)
    showToast(newValue ? 'Sistema Waros activado' : 'Sistema Waros desactivado', 'success')
  } catch {
    showToast('Error al cambiar el estado del sistema', 'error')
  }
}

// ── Inline toggle (optimistic) ────────────────────────────────────────────
const togglingRuleType = ref<string | null>(null)

const handleToggle = async (rule: WaroRule) => {
  togglingRuleType.value = rule.rule_type
  const prev = rule.is_active
  rule.is_active = !prev
  const label = getRuleMeta(rule.rule_type).label
  try {
    await toggleRule(rule.rule_type)
    showToast(
      rule.is_active ? `${label} activada` : `${label} desactivada`,
      'success'
    )
  } catch {
    rule.is_active = prev
    showToast(`Error al cambiar ${label}`, 'error')
  } finally {
    togglingRuleType.value = null
  }
}

// ── Data lifecycle ────────────────────────────────────────────────────────
const handleRefresh = async () => {
  await fetchRules()
}

watch(() => currentTenant.value?.id, handleRefresh)

onMounted(async () => {
  if (setRefreshHandler) setRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText('Configuración de Waros')
  await fetchRules()
})
registerProgressiveLoading(isRefreshing)

onUnmounted(() => {
  if (clearRefreshHandler) clearRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(undefined)
})
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error state -->
    <CommonsTheErrorState v-else-if="error" />

    <!-- Rules grid -->
    <template v-else>
      <!-- Global toggle card -->
      <div class="bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-4">
        <span class="text-sm font-medium text-text-primary">
          {{ isEnabled ? 'Sistema activo' : 'Sistema inactivo' }}
        </span>
        <button
          role="switch"
          :aria-checked="isEnabled"
          aria-label="Activar o desactivar el sistema de puntos Waros"
          @click="handleToggleGlobal"
          :class="[
            'flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            isEnabled ? 'bg-primary' : 'bg-slate-300'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <PuntosReglaCard
          v-for="rule in rules"
          :key="rule.rule_type"
          :rule="rule"
          :toggling="togglingRuleType === rule.rule_type"
          :disabled="!isEnabled"
          @toggle="handleToggle"
          @edit="openEdit"
        />
      </div>

      <!-- Redemption + rewards admin -->
      <PuntosRedemptionConfigSection />
      <PuntosWaroRewardsSection />

      <!-- Empty state -->
      <div
        v-if="rules.length === 0"
        class="flex flex-col items-center justify-center min-h-[200px] gap-2 text-text-secondary"
      >
        <svg class="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <p class="text-sm font-medium">No hay reglas disponibles</p>
      </div>
    </template>

    <!-- Edit modal -->
    <PuntosEditarReglaModal
      v-model="showModal"
      :rule="selectedRule"
      @saved="onRuleSaved"
    />

  </div>
</template>
