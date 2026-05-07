<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Personalizar | Operaciones' })

const { currentTenant } = useTenantReactive()
const cache = useQueryCache()

// Shared cache key with /operaciones/mesas and /operaciones/comandas so a
// PATCH from any of these pages refreshes the others on next visit.
const { data: profileData, asyncStatus: profileAsyncStatus, refetch: refreshProfile } = useQuery({
  key: () => ['tenant', 'negocio-profile', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/public-profile'),
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

// ── Toggle: auto-select Genérico at /pos/checkout open ──────────────────────
const toast = useToast()
const isToggling = ref(false)

const toggleAutoSelectGeneric = async () => {
  if (!businessProfile.value || isToggling.value) return
  isToggling.value = true
  const newState = !businessProfile.value.auto_select_generic_enabled
  try {
    await $fetch('/api/api/tenant/public-profile', {
      method: 'PATCH',
      body: { auto_select_generic_enabled: newState },
    })
    // Invalidate both cache entries that hold the public profile:
    //  - local 'negocio-profile' (this page + mesas/comandas)
    //  - tenants store 'business-profile' (read by useTenantReactive in checkout)
    await cache.invalidateQueries({ key: ['tenant'] })
    await refreshProfile()
    toast.success(
      newState
        ? 'El cobro abrirá con cliente Genérico ya seleccionado'
        : 'El cobro abrirá sin cliente seleccionado',
      { title: newState ? 'Pre-selección activada' : 'Pre-selección desactivada' }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al cambiar la configuración', { title: 'Error' })
  } finally {
    isToggling.value = false
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
          :class="isToggling ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.auto_select_generic_enabled
            ? 'Desactivar pre-selección de cliente Genérico'
            : 'Activar pre-selección de cliente Genérico'"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="businessProfile.auto_select_generic_enabled"
            :disabled="isToggling"
            @change="toggleAutoSelectGeneric"
          />
          <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>
    </div>
  </div>
</template>
