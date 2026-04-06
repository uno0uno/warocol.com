<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Gestionar Mesas' })

const { currentTenant } = useTenantReactive()

// ── Data ───────────────────────────────────────────────────────────────────
const { data: tablesData, status: tablesStatus, asyncStatus: tablesAsyncStatus, error: tablesError, refetch } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const loadingTables = computed(() => tablesStatus.value === 'loading' && !tablesData.value)
const isRefreshing = computed(() => tablesAsyncStatus.value === 'loading' && tablesData.value != null)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

const tables = computed(() => tablesData.value?.data ?? [])

// ── Panel state ────────────────────────────────────────────────────────────
const showPanel = ref(false)
const panelTable = ref<any>(null)

const openPanel = (table: any = null) => {
  panelTable.value = table
  showPanel.value = true
}

const onSaved = () => {
  refetch()
}

// ── Deactivate with inline confirmation ────────────────────────────────────
const confirmingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const deleteErrors = ref<Record<string, string>>({})

const startConfirm = (id: string) => {
  confirmingId.value = id
  delete deleteErrors.value[id]
}

const cancelConfirm = () => {
  confirmingId.value = null
}

const confirmDeactivate = async (id: string) => {
  deletingId.value = id
  delete deleteErrors.value[id]
  try {
    await $fetch(`/api/tables/${id}`, { method: 'DELETE' })
    confirmingId.value = null
    await refetch()
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status
    if (status === 409) {
      deleteErrors.value[id] = 'Esta mesa tiene una sesión abierta, ciérrala primero'
    } else {
      deleteErrors.value[id] = err?.data?.detail ?? 'Error al desactivar'
    }
    confirmingId.value = null
  } finally {
    deletingId.value = null
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const statusLabel = (status: string) => {
  if (status === 'open') return 'Ocupada'
  if (status === 'bill_requested') return 'Pidiendo cuenta'
  return 'Libre'
}

const badgeVariant = (status: string) => {
  if (status === 'open') return 'success'
  if (status === 'bill_requested') return 'warning'
  return 'secondary'
}

const freeCount = computed(() => tables.value.filter(t => t.status === 'free').length)
const openCount = computed(() => tables.value.filter(t => t.status === 'open').length)
const billCount = computed(() => tables.value.filter(t => t.status === 'bill_requested').length)

const accentBarClass = (status: string) => {
  if (status === 'open') return 'bg-status-success-text'
  if (status === 'bill_requested') return 'bg-status-warning-text'
  return 'bg-border/40'
}

onMounted(() => setRefreshHandler(refetch))
onUnmounted(() => clearRefreshHandler(refetch))
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loadingTables" class="flex items-center justify-center min-h-[70vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="tablesError" />

    <!-- Content -->
    <div v-else class="flex flex-col gap-5">
      <!-- Header -->
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-bold text-text-primary">Mesas</h1>
          <p v-if="tables.length > 0" class="text-xs text-text-secondary mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{{ tables.length }} configuradas</span>
            <template v-if="openCount > 0">
              <span class="text-text-tertiary">·</span>
              <span class="text-status-success-text font-medium">{{ openCount }} ocupada{{ openCount !== 1 ? 's' : '' }}</span>
            </template>
            <template v-if="billCount > 0">
              <span class="text-text-tertiary">·</span>
              <span class="text-status-warning-text font-medium">{{ billCount }} pidiendo cuenta</span>
            </template>
          </p>
        </div>
        <button
          type="button"
          class="h-10 px-4 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] transition-all shadow-sm shadow-primary/30 flex-shrink-0"
          @click="openPanel(null)"
        >
          + Nueva mesa
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="tables.length === 0" class="flex flex-col items-center justify-center min-h-[40vh] text-text-secondary gap-4">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M3 14h18M10 10V6m4 4V6m-9 8v4m14-4v4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>
        <div class="text-center">
          <p class="text-lg font-semibold text-text-primary">No tienes mesas configuradas</p>
          <p class="text-sm mt-1 leading-relaxed">Crea tu primera mesa para empezar a gestionar el salón</p>
        </div>
        <button
          type="button"
          class="mt-2 h-11 px-5 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] transition-all shadow-sm shadow-primary/30"
          @click="openPanel(null)"
        >
          Crear primera mesa
        </button>
      </div>

      <!-- Tables Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <div
          v-for="table in tables"
          :key="table.id"
          class="relative flex flex-col rounded-xl border border-border bg-surface overflow-hidden shadow-sm transition-shadow hover:shadow-md"
        >
          <!-- Status accent top bar -->
          <div class="h-1.5 flex-shrink-0 transition-colors" :class="accentBarClass(table.status)" />

          <!-- Card body -->
          <div class="flex items-start gap-2 px-4 pt-3 pb-3">
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-base font-bold text-text-primary truncate">{{ table.name }}</span>
                <UiStatusBadge :variant="badgeVariant(table.status)" size="sm">
                  {{ statusLabel(table.status) }}
                </UiStatusBadge>
              </div>
              <p v-if="table.capacity" class="text-xs text-text-secondary mt-1.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ table.capacity }} {{ table.capacity === 1 ? 'persona' : 'personas' }}
              </p>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-0.5 flex-shrink-0 -mr-1">
              <button
                type="button"
                :aria-label="`Editar ${table.name}`"
                title="Editar"
                class="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                @click="openPanel(table)"
              >
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                v-if="confirmingId !== table.id"
                type="button"
                :aria-label="`Desactivar ${table.name}`"
                title="Desactivar"
                :disabled="deletingId === table.id"
                class="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/30 disabled:opacity-40 disabled:cursor-not-allowed"
                @click="startConfirm(table.id)"
              >
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Inline confirmation (expands at bottom of card) -->
          <div
            v-if="confirmingId === table.id"
            class="px-4 pb-3 pt-2.5 border-t border-border/50 bg-surface-secondary/40 flex flex-col gap-2.5"
          >
            <p class="text-xs text-text-secondary leading-snug">
              ¿Desactivar esta mesa? Desaparecerá del salón pero no se eliminarán sus datos.
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="h-8 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                @click="cancelConfirm"
              >
                Cancelar
              </button>
              <button
                type="button"
                :disabled="deletingId === table.id"
                class="h-8 px-3 rounded-lg bg-destructive text-xs font-semibold text-white hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                @click="confirmDeactivate(table.id)"
              >
                <span v-if="deletingId === table.id">Desactivando...</span>
                <span v-else>Sí, desactivar</span>
              </button>
            </div>
          </div>

          <!-- 409 / error message -->
          <p v-if="deleteErrors[table.id]" class="mx-4 mb-3 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 flex items-start gap-1.5">
            <svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {{ deleteErrors[table.id] }}
          </p>
        </div>
      </div>
    </div>

    <!-- Create / Edit Panel -->
    <MesasMesaPanel
      v-model="showPanel"
      :table="panelTable"
      @saved="onSaved"
    />
  </div>
</template>
