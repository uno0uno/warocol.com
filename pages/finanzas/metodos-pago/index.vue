<template>
  <div class="page-layout">

    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
      <div class="bg-surface border-2 border-border rounded-lg overflow-hidden">

        <!-- Groups -->
        <template v-for="(group, gi) in groups" :key="group.id">

          <!-- Group header row -->
          <div
            class="flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors hover:bg-surface-secondary/40"
            :class="gi > 0 ? 'border-t border-border' : ''"
            @click="toggleGroup(group.id)"
          >
            <!-- Chevron -->
            <svg
              class="w-4 h-4 flex-shrink-0 text-text-secondary transition-transform duration-200"
              :class="expandedGroups.has(group.id) ? 'rotate-90' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>

            <!-- Group name + badges -->
            <div class="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <span class="text-sm font-semibold text-text-primary">{{ group.name }}</span>
              <span class="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary">
                {{ group.slug }}
              </span>
              <span
                v-if="group.tenantId === null"
                class="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary"
              >
                predeterminado
              </span>
              <span
                v-if="group.triggersCartera"
                class="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5"
              >
                genera cartera
              </span>
            </div>

            <!-- Count -->
            <span class="text-xs text-text-secondary whitespace-nowrap flex-shrink-0">
              {{ methodsForGroup(group.id).length }} método{{ methodsForGroup(group.id).length !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Methods sub-rows -->
          <template v-if="expandedGroups.has(group.id)">
            <div
              v-for="method in methodsForGroup(group.id)"
              :key="method.id"
              class="flex items-center gap-3 px-4 py-2.5 pl-11 border-t border-border bg-background/40"
            >
              <span
                class="flex-1 text-sm"
                :class="method.isActive ? 'text-text-primary' : 'text-text-secondary line-through'"
              >
                {{ method.name }}
              </span>

              <!-- Active toggle -->
              <button
                :disabled="savingId === method.id"
                class="text-xs px-2.5 py-1.5 rounded border transition-colors min-h-[32px] disabled:opacity-50 disabled:cursor-not-allowed"
                :class="method.isActive
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-border bg-background text-text-secondary hover:text-text-primary'"
                :aria-label="method.isActive ? `Desactivar ${method.name}` : `Activar ${method.name}`"
                @click="toggleActive(method)"
              >
                {{ method.isActive ? 'Activo' : 'Inactivo' }}
              </button>

              <!-- Edit -->
              <button
                class="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                :aria-label="`Renombrar ${method.name}`"
                @click="openEdit(method)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <!-- Delete -->
              <button
                :disabled="savingId === method.id"
                class="p-2 rounded text-text-secondary hover:text-destructive hover:bg-surface-secondary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                :aria-label="`Eliminar ${method.name}`"
                @click="deleteMethod(method)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <!-- Empty state within group -->
            <div
              v-if="methodsForGroup(group.id).length === 0"
              class="px-11 py-3 border-t border-border bg-background/40 text-sm text-text-secondary"
            >
              No hay métodos configurados.
            </div>

            <!-- Add method row -->
            <div class="px-4 py-2.5 pl-11 border-t border-border bg-background/40">
              <button
                class="text-sm text-primary hover:text-primary/80 font-medium transition-colors min-h-[32px] flex items-center gap-1.5"
                @click="openCreate(group.id)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Agregar método
              </button>
            </div>
          </template>

        </template>

        <!-- Empty state: no groups -->
        <div v-if="groups.length === 0" class="px-4 py-8 text-center text-sm text-text-secondary">
          No hay grupos de pago configurados.
        </div>

      </div>
    </template>

  </div>

  <!-- ── Slide-over ──────────────────────────────────────────────────────── -->
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
        v-if="showPanel"
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="closePanel"
      />
    </Transition>

    <!-- Panel -->
    <Transition name="metodos-panel">
      <div
        v-if="showPanel"
        role="dialog"
        aria-modal="true"
        :aria-label="panelMode === 'create' ? 'Agregar método de pago' : 'Renombrar método'"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-border" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg v-if="panelMode === 'create'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ panelMode === 'create' ? 'Agregar método de pago' : 'Renombrar método' }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ panelGroupName }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="closePanel"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <div class="flex flex-col gap-1.5">
            <label for="panel-method-name" class="text-sm font-medium text-text-primary">
              Nombre del método
            </label>
            <input
              id="panel-method-name"
              ref="panelInput"
              v-model="panelName"
              type="text"
              placeholder="ej: Nequi, Tarjeta débito…"
              class="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-secondary"
              @keydown.enter="savePanel"
              @keydown.escape="closePanel"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 border-t border-border px-6 py-4 flex gap-3">
          <button
            :disabled="saving || !panelName.trim()"
            class="flex-1 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            @click="savePanel"
          >
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ saving ? 'Guardando…' : panelMode === 'create' ? 'Agregar' : 'Guardar' }}
          </button>
          <button
            class="min-h-[44px] px-5 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
            @click="closePanel"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Métodos de pago - Warocol' })

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

interface PaymentGroup {
  id: string
  tenantId: string | null
  name: string
  slug: string
  triggersCartera: boolean
  isActive: boolean
  sortOrder: number
  methodCount: number
}

interface PaymentMethod {
  id: string
  tenantId: string
  groupId: string
  name: string
  isActive: boolean
  sortOrder: number
}

// ── Data fetching ──────────────────────────────────────────────────────────

const {
  data: groupsData,
  status: groupsStatus,
  error: groupsError,
  refetch: refetchGroups,
} = useQuery({
  key: () => ['payments', 'groups', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PaymentGroup[] }>('/api/finanzas/metodos-pago/grupos'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const {
  data: methodsData,
  asyncStatus: methodsAsyncStatus,
  error: methodsError,
  refetch: refetchMethods,
} = useQuery({
  key: () => ['payments', 'methods', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PaymentMethod[] }>('/api/finanzas/metodos-pago'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const groups = computed<PaymentGroup[]>(() =>
  (groupsData.value?.data ?? []).filter(g => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
)
const methods = computed<PaymentMethod[]>(() => methodsData.value?.data ?? [])

const isLoading   = computed(() => groupsStatus.value === 'pending' && !groupsData.value)
const isRefreshing = computed(() => methodsAsyncStatus.value === 'loading' && methodsData.value != null)
const fetchError  = computed(() => groupsError.value || methodsError.value)

const methodsForGroup = (groupId: string) =>
  methods.value.filter(m => m.groupId === groupId).sort((a, b) => a.sortOrder - b.sortOrder)

registerProgressiveLoading(isRefreshing)

const refetch = () => { refetchGroups(); refetchMethods() }
onMounted(() => setRefreshHandler(refetch))
onUnmounted(() => clearRefreshHandler(refetch))

// ── Expand / collapse ──────────────────────────────────────────────────────

const expandedGroups = ref<Set<string>>(new Set())

watch(groups, (newGroups) => {
  newGroups.forEach(g => expandedGroups.value.add(g.id))
}, { immediate: true })

const toggleGroup = (groupId: string) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

// ── Toggle active ──────────────────────────────────────────────────────────

const savingId = ref<string | null>(null)

const toggleActive = async (method: PaymentMethod) => {
  if (savingId.value) return
  savingId.value = method.id
  try {
    await $fetch(`/api/finanzas/metodos-pago/${method.id}`, {
      method: 'PATCH',
      body: { isActive: !method.isActive },
    })
    await refetchMethods()
  } finally {
    savingId.value = null
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────

const deleteMethod = async (method: PaymentMethod) => {
  if (savingId.value) return
  savingId.value = method.id
  try {
    await $fetch(`/api/finanzas/metodos-pago/${method.id}`, { method: 'DELETE' })
    await refetchMethods()
  } finally {
    savingId.value = null
  }
}

// ── Slide-over ─────────────────────────────────────────────────────────────

const showPanel  = ref(false)
const panelMode  = ref<'create' | 'edit'>('create')
const panelGroupId = ref<string | null>(null)
const panelMethod  = ref<PaymentMethod | null>(null)
const panelName  = ref('')
const saving     = ref(false)
const panelInput = ref<HTMLInputElement | null>(null)

const panelGroupName = computed(() =>
  groups.value.find(g => g.id === panelGroupId.value)?.name ?? ''
)

const openCreate = async (groupId: string) => {
  panelMode.value = 'create'
  panelGroupId.value = groupId
  panelMethod.value = null
  panelName.value = ''
  showPanel.value = true
  await nextTick()
  panelInput.value?.focus()
}

const openEdit = async (method: PaymentMethod) => {
  panelMode.value = 'edit'
  panelGroupId.value = method.groupId
  panelMethod.value = method
  panelName.value = method.name
  showPanel.value = true
  await nextTick()
  panelInput.value?.focus()
}

const closePanel = () => {
  showPanel.value = false
  panelMethod.value = null
  panelName.value = ''
}

const savePanel = async () => {
  if (!panelName.value.trim() || saving.value) return
  saving.value = true
  try {
    if (panelMode.value === 'create') {
      await $fetch('/api/finanzas/metodos-pago', {
        method: 'POST',
        body: { groupId: panelGroupId.value, name: panelName.value.trim(), sortOrder: 0 },
      })
    } else {
      await $fetch(`/api/finanzas/metodos-pago/${panelMethod.value!.id}`, {
        method: 'PATCH',
        body: { name: panelName.value.trim() },
      })
    }
    closePanel()
    await refetchMethods()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* Mobile: slide up from bottom */
.metodos-panel-enter-active,
.metodos-panel-leave-active {
  transition: transform 0.3s ease;
}
.metodos-panel-enter-from,
.metodos-panel-leave-to {
  transform: translateY(100%);
}

/* Desktop: slide in from right */
@media (min-width: 768px) {
  .metodos-panel-enter-from,
  .metodos-panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
