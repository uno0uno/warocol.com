<template>
  <div class="page-layout">

    <!-- Header: group name + add button -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-lg font-bold text-text-primary">{{ group?.name ?? '…' }}</h1>
      <button
        v-if="group?.slug !== 'cash'"
        class="flex items-center gap-1.5 min-h-[36px] px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all"
        @click="openCreate"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Agregar método
      </button>
    </div>

    <!-- GL account card -->
    <div class="mb-4 rounded-xl border border-border bg-surface px-4 py-3 flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <svg class="w-4 h-4 flex-shrink-0 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span class="text-sm font-medium text-text-primary">Cuenta contable (débito)</span>
        <span
          v-if="group?.glAccountCode"
          class="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary"
        >
          {{ group.glAccountCode }}
        </span>
        <span v-if="currentGlAccount" class="text-sm text-text-secondary truncate">{{ currentGlAccount.name }}</span>
        <span v-else-if="!group?.glAccountCode" class="text-sm text-text-secondary italic">Sin asignar</span>
      </div>

      <!-- Editable for custom groups only -->
      <div v-if="group?.tenantId !== null" class="flex items-center gap-2 flex-shrink-0">
        <select
          v-model="glAccountCode"
          class="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
          :disabled="savingGl"
          aria-label="Seleccionar cuenta contable de débito"
        >
          <option value="">— Sin asignar —</option>
          <option v-for="acct in leafAccounts" :key="acct.code" :value="acct.code">
            {{ acct.code }} · {{ acct.name }}
          </option>
        </select>
        <button
          :disabled="savingGl || glAccountCode === (group?.glAccountCode ?? '')"
          class="min-h-[36px] px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          @click="saveGlAccount"
        >
          <svg v-if="savingGl" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ savingGl ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>

      <!-- Read-only for global groups -->
      <span v-else class="text-xs text-text-secondary flex-shrink-0">predeterminado</span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <UiResponsiveDataView
      v-else
      :columns="columns"
      :data="methods"
      empty-message="No hay métodos configurados"
      empty-sub-message="Agrega un método para que aparezca en el POS"
      row-size="sm"
    >
      <!-- Mobile card -->
      <template #card="{ item, index }">
        <div
          v-if="item"
          class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
          :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
        >
          <div class="flex-1 min-w-0">
            <span
              class="text-sm block"
              :class="item.isActive ? 'text-text-primary' : 'text-text-secondary line-through'"
            >
              {{ item.name }}
            </span>
            <span v-if="item.glAccountCode" class="text-xs font-mono text-text-secondary">{{ item.glAccountCode }}</span>
            <span v-else class="text-xs text-text-secondary italic">Sin asociar</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              :disabled="savingId === item.id"
              class="text-xs px-2.5 py-1.5 rounded border transition-colors min-h-[32px] disabled:opacity-50"
              :class="item.isActive
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-border bg-background text-text-secondary hover:text-text-primary'"
              @click.stop="toggleActive(item)"
            >
              {{ item.isActive ? 'Activo' : 'Inactivo' }}
            </button>
            <button
              class="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
              @click.stop="openEdit(item)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              :disabled="savingId === item.id"
              class="p-2 rounded text-text-secondary hover:text-destructive hover:bg-background transition-colors disabled:opacity-50"
              @click.stop="deleteMethod(item)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </template>

      <!-- name -->
      <template #cell-name="{ row }">
        <span :class="row.isActive ? 'text-text-primary' : 'text-text-secondary line-through'">
          {{ row.name }}
        </span>
      </template>

      <!-- cuenta contable -->
      <template #cell-glAccountCode="{ row }">
        <span v-if="row.glAccountCode" class="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary">
          {{ row.glAccountCode }}
        </span>
        <span v-else class="text-xs text-text-secondary italic">Sin asociar</span>
      </template>

      <!-- status toggle -->
      <template #cell-isActive="{ row }">
        <button
          :disabled="savingId === row.id"
          class="text-xs px-2.5 py-1.5 rounded border transition-colors min-h-[32px] disabled:opacity-50 disabled:cursor-not-allowed"
          :class="row.isActive
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-border bg-background text-text-secondary hover:text-text-primary'"
          :aria-label="row.isActive ? `Desactivar ${row.name}` : `Activar ${row.name}`"
          @click.stop="toggleActive(row)"
        >
          {{ row.isActive ? 'Activo' : 'Inactivo' }}
        </button>
      </template>

      <!-- actions -->
      <template #cell-actions="{ row }">
        <div class="flex items-center gap-1 justify-end">
          <button
            class="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
            :aria-label="`Renombrar ${row.name}`"
            @click.stop="openEdit(row)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            :disabled="savingId === row.id"
            class="p-2 rounded text-text-secondary hover:text-destructive hover:bg-surface-secondary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            :aria-label="`Eliminar ${row.name}`"
            @click.stop="deleteMethod(row)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </template>
    </UiResponsiveDataView>

  </div>

  <!-- ── Slide-over ────────────────────────────────────────────────────────── -->
  <Teleport to="body">
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
                  {{ group?.name ?? '' }}
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
import { ref, computed, nextTick } from 'vue'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({ layout: 'dashboard' })

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const route = useRoute()
const groupId = route.params.groupId as string

interface PaymentGroup {
  id: string
  tenantId: string | null
  name: string
  slug: string
  triggersCartera: boolean
  isActive: boolean
  sortOrder: number
  methodCount: number
  glAccountCode: string | null
}

interface TenantAccount {
  id: string
  code: string
  name: string
  is_detail: boolean
  is_active: boolean
}

interface PaymentMethod {
  id: string
  tenantId: string
  groupId: string
  name: string
  isActive: boolean
  sortOrder: number
  glAccountCode: string | null
}

const columns: Column[] = [
  { key: 'name',           title: 'Nombre',          sortable: false },
  { key: 'glAccountCode',  title: 'Cuenta contable',  sortable: false },
  { key: 'isActive',       title: 'Estado',           sortable: false, align: 'center' },
  { key: 'actions',        title: 'Acciones',         sortable: false, align: 'right' },
]

// ── Data fetching ────────────────────────────────────────────────────────

const {
  data: groupsData,
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
  status: methodsStatus,
  asyncStatus: methodsAsyncStatus,
  error: methodsError,
  refetch: refetchMethods,
} = useQuery({
  key: () => ['payments', 'methods', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PaymentMethod[] }>('/api/finanzas/metodos-pago'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const group = computed<PaymentGroup | undefined>(() =>
  (groupsData.value?.data ?? []).find(g => g.id === groupId)
)
const methods = computed<PaymentMethod[]>(() =>
  (methodsData.value?.data ?? [])
    .filter(m => m.groupId === groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
)

const isLoading    = computed(() => methodsStatus.value === 'pending' && !methodsData.value)
const isRefreshing = computed(() => methodsAsyncStatus.value === 'loading' && methodsData.value != null)
const fetchError   = computed(() => groupsError.value || methodsError.value)

// ── Accounts (for GL selector) ────────────────────────────────────────────

const { data: accountsData } = useQuery({
  key: () => ['accounting', 'accounts', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: TenantAccount[] }>('/api/accounting/accounts'),
  enabled: () => !!currentTenant.value && group.value?.tenantId !== null,
  staleTime: 60_000,
})

const leafAccounts = computed<TenantAccount[]>(() =>
  (accountsData.value?.data ?? []).filter(a => a.is_detail && a.is_active)
)

const currentGlAccount = computed(() =>
  leafAccounts.value.find(a => a.code === group.value?.glAccountCode)
)

const savingGl = ref(false)
const glAccountCode = ref<string>('')

watch(group, (g) => {
  if (g) glAccountCode.value = g.glAccountCode ?? ''
}, { immediate: true })

const saveGlAccount = async () => {
  if (savingGl.value) return
  savingGl.value = true
  try {
    await $fetch(`/api/finanzas/metodos-pago/grupos/${groupId}`, {
      method: 'PATCH',
      body: { glAccountCode: glAccountCode.value || null },
    })
    await refetchGroups()
  } finally {
    savingGl.value = false
  }
}

useHead(() => ({
  title: group.value ? `${group.value.name} — Métodos de pago` : 'Métodos de pago - Warocol',
}))

registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(refetchMethods))
onUnmounted(() => clearRefreshHandler(refetchMethods))

// ── Toggle active ────────────────────────────────────────────────────────

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

// ── Delete ───────────────────────────────────────────────────────────────

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

// ── Slide-over ───────────────────────────────────────────────────────────

const showPanel  = ref(false)
const panelMode  = ref<'create' | 'edit'>('create')
const panelMethod = ref<PaymentMethod | null>(null)
const panelName  = ref('')
const saving     = ref(false)
const panelInput = ref<HTMLInputElement | null>(null)

const openCreate = async () => {
  panelMode.value = 'create'
  panelMethod.value = null
  panelName.value = ''
  showPanel.value = true
  await nextTick()
  panelInput.value?.focus()
}

const openEdit = async (method: PaymentMethod) => {
  panelMode.value = 'edit'
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
        body: { groupId, name: panelName.value.trim(), sortOrder: 0 },
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
.metodos-panel-enter-active,
.metodos-panel-leave-active {
  transition: transform 0.3s ease;
}
.metodos-panel-enter-from,
.metodos-panel-leave-to {
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .metodos-panel-enter-from,
  .metodos-panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
