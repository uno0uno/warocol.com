<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { WaroRule } from '~/composables/useWarosConfig'

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText } = useLayoutActions()
const { onTenantChange } = useTenantReactive()

const {
  rules,
  isEnabled,
  isLoading,
  error,
  fetchRules,
  toggleRule,
  toggleGlobal,
} = useWarosConfig()

// ── Edit modal ────────────────────────────────────────────────────────────
const showModal = ref(false)
const selectedRule = ref<WaroRule | null>(null)

const openEdit = (rule: WaroRule) => {
  selectedRule.value = rule
  showModal.value = true
}

// ── Inline toggle (optimistic) ────────────────────────────────────────────
const togglingRuleType = ref<string | null>(null)

const handleToggle = async (rule: WaroRule) => {
  togglingRuleType.value = rule.rule_type
  const prev = rule.is_active
  rule.is_active = !prev
  try {
    await toggleRule(rule.rule_type)
  } catch {
    rule.is_active = prev // revert on error
  } finally {
    togglingRuleType.value = null
  }
}

// ── Data lifecycle ────────────────────────────────────────────────────────
const handleRefresh = async () => {
  await fetchRules()
}

onTenantChange(handleRefresh)

onMounted(async () => {
  if (setRefreshHandler) setRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText('Configuración de Waros')
  await fetchRules()
})

onUnmounted(() => {
  if (clearRefreshHandler) clearRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(undefined)
})
</script>

<template>
  <div class="space-y-4">

    <!-- Global system toggle card -->
    <div class="bg-surface border border-border rounded-lg p-4 sm:p-6 flex items-center justify-between gap-4">
      <div class="min-w-0">
        <h2 class="text-base font-semibold text-text-primary">Sistema de Puntos Waros</h2>
        <p class="text-sm text-text-secondary leading-relaxed mt-0.5">
          {{ isEnabled
            ? 'Activo — los clientes acumulan puntos en cada compra'
            : 'Inactivo — ninguna regla otorga puntos actualmente' }}
        </p>
      </div>
      <button
        role="switch"
        :aria-checked="isEnabled"
        aria-label="Activar o desactivar el sistema de puntos Waros"
        @click="toggleGlobal(!isEnabled)"
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

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <div class="flex items-center gap-2 text-red-600">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span class="text-base font-semibold">Error al cargar configuración</span>
      </div>
      <p class="text-sm text-slate-600">{{ error }}</p>
      <button
        @click="handleRefresh"
        class="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Reintentar
      </button>
    </div>

    <!-- Rules list -->
    <template v-else>
      <div class="space-y-3">
        <PuntosReglaCard
          v-for="rule in rules"
          :key="rule.rule_type"
          :rule="rule"
          :toggling="togglingRuleType === rule.rule_type"
          :disabled="!isEnabled"
          @toggle="handleToggle"
          @edit="openEdit"
        />

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
      </div>
    </template>

    <!-- Edit modal -->
    <PuntosEditarReglaModal
      v-model="showModal"
      :rule="selectedRule"
      @saved="handleRefresh"
    />

  </div>
</template>
