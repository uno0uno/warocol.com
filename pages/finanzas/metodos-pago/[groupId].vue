<template>
  <div class="page-layout">

    <!-- Header: group name + add button -->
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-base font-bold text-text-primary">{{ group ? paymentGroupLabel(group) : '…' }}</h1>
      <button
        v-if="group && !isCashGroup(group)"
        class="flex items-center gap-1.5 min-h-[32px] px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-[0.98] transition-all"
        @click="onOpenCreateClick"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {{ t('finanzas.metodosPago.addMethod') }}
      </button>
    </div>

    <!-- GL account card -->
    <div class="mb-3 rounded-lg border border-border bg-surface px-3 py-2 flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1.5 flex-1 min-w-0">
        <span class="text-xs text-text-secondary">{{ t('finanzas.metodosPago.accountLabel') }}</span>
        <span
          v-if="group?.glAccountCode"
          class="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary"
        >
          {{ group.glAccountCode }}
        </span>
        <span v-if="currentGlAccount" class="text-xs text-text-secondary truncate">{{ currentGlAccount.name }}</span>
        <span v-else-if="!group?.glAccountCode" class="text-xs text-text-secondary italic">{{ t('finanzas.metodosPago.unassigned') }}</span>
      </div>

      <!-- Editable for custom groups only -->
      <div v-if="group?.tenantId !== null" class="flex items-center gap-1.5 flex-shrink-0">
        <select
          v-model="glAccountCode"
          class="text-xs border border-border rounded px-2 py-1 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[28px]"
          :disabled="savingGl"
          :aria-label="t('finanzas.metodosPago.selectDebitAccount')"
        >
          <option value="">{{ t('finanzas.metodosPago.noAssignedOption') }}</option>
          <option v-for="acct in leafAccounts" :key="acct.code" :value="acct.code">
            {{ acct.code }} · {{ acct.name }}
          </option>
        </select>
        <button
          :disabled="savingGl || glAccountCode === (group?.glAccountCode ?? '')"
          class="min-h-[28px] px-2.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          @click="saveGlAccount"
        >
          <svg v-if="savingGl" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ savingGl ? '…' : t('common.save') }}
        </button>
      </div>

      <!-- Read-only for global groups -->
      <span v-else class="text-xs text-text-secondary flex-shrink-0">{{ t('finanzas.metodosPago.defaultLower') }}</span>
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
      :empty-message="t('finanzas.metodosPago.noMethods')"
      :empty-sub-message="t('finanzas.metodosPago.noMethodsSub')"
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
            <span v-else class="text-xs text-text-secondary italic">{{ t('finanzas.metodosPago.noAssociated') }}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              :disabled="savingId === item.id"
              class="text-xs px-2.5 py-1.5 rounded border transition-colors min-h-[32px] disabled:opacity-50"
              :class="item.isActive
                ? 'border-state-success-border bg-state-success-bg text-state-success-text hover:bg-state-success-bg/80'
                : 'border-border bg-background text-text-secondary hover:text-text-primary'"
              @click.stop="toggleActive(item)"
            >
              {{ item.isActive ? t('finanzas.metodosPago.active') : t('finanzas.metodosPago.inactive') }}
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
        <span v-else class="text-xs text-text-secondary italic">{{ t('finanzas.metodosPago.noAssociated') }}</span>
      </template>

      <!-- status toggle -->
      <template #cell-isActive="{ row }">
        <button
          :disabled="savingId === row.id"
          class="text-xs px-2.5 py-1.5 rounded border transition-colors min-h-[32px] disabled:opacity-50 disabled:cursor-not-allowed"
          :class="row.isActive
            ? 'border-state-success-border bg-state-success-bg text-state-success-text hover:bg-state-success-bg/80'
            : 'border-border bg-background text-text-secondary hover:text-text-primary'"
          :aria-label="row.isActive ? t('finanzas.metodosPago.deactivateNamed', { name: row.name }) : t('finanzas.metodosPago.activateNamed', { name: row.name })"
          @click.stop="toggleActive(row)"
        >
          {{ row.isActive ? t('finanzas.metodosPago.active') : t('finanzas.metodosPago.inactive') }}
        </button>
      </template>

      <!-- actions -->
      <template #cell-actions="{ row }">
        <div class="flex items-center gap-1 justify-end">
          <button
            class="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
            :aria-label="t('finanzas.metodosPago.renameNamed', { name: row.name })"
            @click.stop="openEdit(row)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            :disabled="savingId === row.id"
            class="p-2 rounded text-text-secondary hover:text-destructive hover:bg-surface-secondary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            :aria-label="t('finanzas.metodosPago.deleteNamed', { name: row.name })"
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
        class="fixed inset-0 z-40 bg-overlay-backdrop/40"
        aria-hidden="true"
        @click="closePanel"
      />
    </Transition>

    <Transition name="metodos-panel">
      <div
        v-if="showPanel"
        role="dialog"
        aria-modal="true"
        :aria-label="panelTitle"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
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
                  {{ panelTitle }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ group ? paymentGroupLabel(group) : '' }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('finanzas.metodosPago.closePanel')"
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
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="flex flex-col gap-1.5">
            <label for="panel-method-name" class="text-sm font-medium text-text-primary">
              {{ t('finanzas.metodosPago.methodName') }}
            </label>
            <input
              id="panel-method-name"
              ref="panelInput"
              v-model="panelName"
              type="text"
              :placeholder="t('finanzas.metodosPago.methodPlaceholder')"
              class="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-secondary"
              @keydown.enter="onSavePanelClick"
              @keydown.escape="closePanel"
            />
          </div>

          <!-- Issue #533 — Auto-create PUC sub-account on method creation -->
          <!-- Checkbox: only on create + when group supports it -->
          <label
            v-if="panelMode === 'create' && canAutoCreate"
            class="flex items-start gap-3 px-4 py-3 rounded-lg border-2 border-border bg-surface cursor-pointer hover:border-primary/40 transition-colors"
          >
            <input
              v-model="autoCreateAccount"
              type="checkbox"
              :disabled="saving"
              class="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary/30"
              aria-describedby="auto-create-help"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text-primary leading-snug">
                {{ t('finanzas.metodosPago.autoCreateTitle') }}
              </p>
              <p id="auto-create-help" class="text-xs text-text-secondary leading-snug mt-0.5">
                {{ t('finanzas.metodosPago.autoCreateHelp') }}
              </p>
            </div>
          </label>

          <!-- Preview line -->
          <div
            v-if="panelMode === 'create' && autoCreateAccount && canAutoCreate && panelName.trim()"
            class="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
          >
            <p class="text-xs uppercase tracking-wider text-primary font-medium mb-1">
              {{ t('finanzas.metodosPago.preview') }}
            </p>
            <p class="text-sm text-text-primary leading-snug">
              {{ t('finanzas.metodosPago.previewCreateAccount') }}
              <span class="font-mono font-semibold">{{ previewCode }} "{{ panelName.trim() }}"</span>
              {{ t('finanzas.metodosPago.previewUnder') }}
              <span class="font-mono">{{ parentAccount!.code }} {{ parentAccount!.name }}</span>.
            </p>
          </div>

          <!-- Warning: group has no default account configured -->
          <div
            v-else-if="panelMode === 'create' && group && !isCashGroup(group) && !group.glAccountCode"
            class="rounded-lg border border-state-warning-border bg-state-warning-bg px-4 py-3"
          >
            <p class="text-xs text-state-warning-text leading-snug flex items-start gap-1.5">
              <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                {{ t('finanzas.metodosPago.autoCreateWarning') }}
              </span>
            </p>
          </div>

          <!-- Submit error -->
          <div v-if="panelError" class="rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3">
            <p class="text-sm text-destructive font-medium">{{ panelError }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 border-t border-border px-6 py-4 flex gap-3">
          <button
            :disabled="saving || !panelName.trim()"
            class="flex-1 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            @click="onSavePanelClick"
          >
            <UiLoadingDots v-if="saving" size="8px" color="currentColor" />
            <template v-else>{{ panelMode === 'create' ? t('finanzas.metodosPago.add') : t('common.save') }}</template>
          </button>
          <button
            class="min-h-[44px] px-5 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
            @click="closePanel"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <UiConfirmActionModal
    v-model="quotaLimitModalOpen"
    :title="t('billing.upgrade.quotaBlocked')"
    :message="quotaLimitModalMessage"
    :confirm-label="t('nav.miPlan')"
    :cancel-label="t('billing.close')"
    @confirm="goToBillingFromQuotaLimitModal"
    @cancel="closeQuotaLimitModal"
  />
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import { useOperationalQuotaGate } from '~/composables/useOperationalQuotaGate'
import { useQuotaExceeded } from '~/composables/useQuotaExceeded'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })

const { t } = useI18n({ useScope: 'global' })
const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const route = useRoute()
const groupId = route.params.groupId as string

const {
  quotaLimitModalOpen,
  quotaLimitModalMessage,
  closeQuotaLimitModal,
  goToBillingFromQuotaLimitModal,
  handleCreateClick,
} = useOperationalQuotaGate('payment_methods')
const { handleQuotaError, getQuotaMessage } = useQuotaExceeded()

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
  // FastAPI default response_model_by_alias=True → API emits camelCase.
  isDetail: boolean
  isActive: boolean
  accountClass: string
  accountType: string
  normalBalance: 'debit' | 'credit'
  level: number
  parentId: string | null
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

const columns = computed<Column[]>(() => [
  { key: 'name',           title: t('finanzas.metodosPago.name'), sortable: false },
  { key: 'glAccountCode',  title: t('finanzas.metodosPago.account'), sortable: false },
  { key: 'isActive',       title: t('finanzas.common.status'), sortable: false, align: 'center' },
  { key: 'actions',        title: t('finanzas.common.actions'), sortable: false, align: 'right' },
])

// ── Data fetching ────────────────────────────────────────────────────────

const {
  data: groupsData,
  status: groupsStatus,
  asyncStatus: groupsAsyncStatus,
  error: groupsError,
  refetch: refetchGroups,
} = useQuery({
  key: () => ['payments', 'admin-groups', currentTenant.value?.id],
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

const fetchError = computed(() => groupsError.value || methodsError.value)

const hasEverLoaded = ref(false)
watch(() => methodsData.value, (v) => { if (v != null) hasEverLoaded.value = true })
watch(() => currentTenant.value?.id, () => { hasEverLoaded.value = false })

const isMethodsFetching = computed(() =>
  !!currentTenant.value &&
  (methodsStatus.value === 'pending' || methodsAsyncStatus.value === 'loading'),
)
const isGroupsFetching = computed(() =>
  !!currentTenant.value &&
  (groupsStatus.value === 'pending' || groupsAsyncStatus.value === 'loading'),
)
const isFetching = computed(() => isMethodsFetching.value || isGroupsFetching.value)
const isLoading = computed(() => !hasEverLoaded.value && isMethodsFetching.value && !fetchError.value)

// ── Accounts (for GL selector) ────────────────────────────────────────────

const { data: accountsData, refetch: refetchAccounts } = useQuery({
  key: () => ['accounting', 'accounts', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: TenantAccount[] }>('/api/accounting/accounts'),
  enabled: () => !!currentTenant.value && group.value?.tenantId !== null,
  staleTime: 60_000,
})

const leafAccounts = computed<TenantAccount[]>(() =>
  (accountsData.value?.data ?? []).filter(a => a.isDetail && a.isActive)
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
  title: group.value
    ? t('finanzas.metodosPago.detailTitle', { group: paymentGroupLabel(group.value) })
    : t('finanzas.head.metodosPago'),
}))

const refreshAll = async () => {
  await Promise.all([refetchGroups(), refetchMethods()])
}

registerProgressiveLoading(isFetching)
onMounted(() => setRefreshHandler(refreshAll))
onUnmounted(() => clearRefreshHandler(refreshAll))

// ── Toggle active ────────────────────────────────────────────────────────

const savingId = ref<string | null>(null)

const toggleActive = async (method: PaymentMethod) => {
  if (savingId.value) return
  if (!method.isActive) {
    const allowed = await handleCreateClick(() => {})
    if (!allowed) return
  }
  savingId.value = method.id
  try {
    await $fetch(`/api/finanzas/metodos-pago/${method.id}`, {
      method: 'PATCH',
      body: { isActive: !method.isActive },
    })
    await refetchMethods()
  } catch (err: any) {
    if (handleQuotaError(err, { resource: 'payment_methods', showInline: false })) {
      quotaLimitModalMessage.value = getQuotaMessage(err, 'payment_methods')
      quotaLimitModalOpen.value = true
      return
    }
    useToast().error(
      err?.data?.detail || err?.data?.message || err?.message || t('finanzas.metodosPago.savingError'),
      { title: t('finanzas.common.error') },
    )
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
// Issue #533 — auto-create PUC sub-account state
const autoCreateAccount = ref(true)
const panelError = ref('')
const panelTitle = computed(() =>
  panelMode.value === 'create'
    ? t('finanzas.metodosPago.createMethodTitle')
    : t('finanzas.metodosPago.renameMethodTitle'),
)

const paymentGroupLabel = (paymentGroup: PaymentGroup): string => {
  if (paymentGroup.tenantId !== null) return paymentGroup.name
  const labels: Record<string, string> = {
    cash: t('finanzas.common.cash'),
    efectivo: t('finanzas.common.cash'),
    card: t('finanzas.common.card'),
    tarjeta: t('finanzas.common.card'),
    digital: t('finanzas.common.digital'),
    credit: t('finanzas.common.credit'),
    credito: t('finanzas.common.credit'),
  }
  return labels[paymentGroup.slug] || paymentGroup.name
}

const isCashGroup = (paymentGroup: PaymentGroup) => ['cash', 'efectivo'].includes(paymentGroup.slug)

const parentAccount = computed<TenantAccount | null>(() =>
  group.value?.glAccountCode
    ? leafAccounts.value.find(a => a.code === group.value!.glAccountCode) ?? null
    : null,
)
const previewSuffix = computed(() =>
  parentAccount.value
    ? suggestSubAccountSuffix(parentAccount.value.code, accountsData.value?.data ?? [])
    : '',
)
const previewCode = computed(() =>
  parentAccount.value ? parentAccount.value.code + previewSuffix.value : '',
)
const canAutoCreate = computed(() =>
  group.value?.slug !== 'cash'
  && !!group.value?.glAccountCode
  && !!parentAccount.value,
)

const openCreate = async () => {
  panelMode.value = 'create'
  panelMethod.value = null
  panelName.value = ''
  autoCreateAccount.value = true
  panelError.value = ''
  showPanel.value = true
  await nextTick()
  panelInput.value?.focus()
}

const onOpenCreateClick = () => {
  void handleCreateClick(() => { void openCreate() })
}

const openEdit = async (method: PaymentMethod) => {
  panelMode.value = 'edit'
  panelMethod.value = method
  panelName.value = method.name
  autoCreateAccount.value = false
  panelError.value = ''
  showPanel.value = true
  await nextTick()
  panelInput.value?.focus()
}

const closePanel = () => {
  showPanel.value = false
  panelMethod.value = null
  panelName.value = ''
  panelError.value = ''
}

const createAccountForMethod = async (
  parent: TenantAccount,
  desiredCode: string,
  methodName: string,
): Promise<string> => {
  // Helper that POSTs the sub-account; on uniqueness conflict (race condition)
  // it refetches the chart and retries once with a recomputed code.
  const buildBody = (code: string) => ({
    code,
    name: methodName,
    parentId: parent.id,
    isDetail: true,
    isActive: true,
    accountClass: parent.accountClass,
    accountType: parent.accountType,
    normalBalance: parent.normalBalance,
    level: parent.level + 1,
  })
  try {
    await $fetch('/api/accounting/accounts', { method: 'POST', body: buildBody(desiredCode) })
    return desiredCode
  } catch (err: any) {
    const msg = err?.data?.detail ?? err?.data?.message ?? ''
    if (/Ya existe/.test(msg)) {
      // Race-condition retry: someone else just took this code.
      await refetchAccounts()
      const retrySuffix = suggestSubAccountSuffix(parent.code, accountsData.value?.data ?? [])
      const retryCode = parent.code + retrySuffix
      await $fetch('/api/accounting/accounts', { method: 'POST', body: buildBody(retryCode) })
      return retryCode
    }
    throw err
  }
}

const savePanel = async () => {
  if (!panelName.value.trim() || saving.value) return
  saving.value = true
  panelError.value = ''
  try {
    if (panelMode.value === 'create') {
      let glAccountCode: string | null = null

      // Issue #533 — optionally auto-create the PUC sub-account first.
      if (autoCreateAccount.value && canAutoCreate.value && parentAccount.value) {
        glAccountCode = await createAccountForMethod(
          parentAccount.value,
          previewCode.value,
          panelName.value.trim(),
        )
      }

      // Create the method (now with glAccountCode if auto-created).
      await $fetch('/api/finanzas/metodos-pago', {
        method: 'POST',
        body: {
          groupId,
          name: panelName.value.trim(),
          sortOrder: 0,
          glAccountCode,
        },
      })
    } else {
      await $fetch(`/api/finanzas/metodos-pago/${panelMethod.value!.id}`, {
        method: 'PATCH',
        body: { name: panelName.value.trim() },
      })
    }
    closePanel()
    await Promise.all([refetchMethods(), refetchAccounts()])
  } catch (err: any) {
    if (handleQuotaError(err, { resource: 'payment_methods', showInline: false })) {
      quotaLimitModalMessage.value = getQuotaMessage(err, 'payment_methods')
      quotaLimitModalOpen.value = true
      panelError.value = ''
      return
    }
    panelError.value = err?.data?.detail || err?.data?.message || err?.message || t('finanzas.metodosPago.savingError')
  } finally {
    saving.value = false
  }
}

const onSavePanelClick = () => {
  if (panelMode.value === 'create') {
    void handleCreateClick(() => { void savePanel() })
    return
  }
  void savePanel()
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
