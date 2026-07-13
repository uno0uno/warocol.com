<script setup lang="ts">
import { ref, computed } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
const { t } = useI18n({ useScope: 'global' })
useHead({ title: () => t('finanzas.contabilidad.createEntryHead') })

const { currentTenant } = useTenantReactive()
const { todayISO } = useTenantTimezone()
const { formatCurrency } = useFormatters()
const router = useRouter()

// ── Types ────────────────────────────────────────────────────────────────────
interface TenantAccount {
  id: string
  code: string
  name: string
  accountClass: string
  accountType: string
  isDetail: boolean
  isActive: boolean
}

interface EntryLine {
  _id: number
  accountId: string
  debit: string
  credit: string
  description: string
}

// ── Accounts (for selector) ───────────────────────────────────────────────────
const { data: accountsData, status: accountsStatus } = useQuery({
  key: () => ['accounting', 'accounts', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: TenantAccount[] }>('/api/accounting/accounts'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})

const detailAccounts = computed<TenantAccount[]>(() =>
  (accountsData.value?.data ?? []).filter(a => a.isDetail && a.isActive)
)

const accountsLoading = computed(() => accountsStatus.value === 'loading' && !accountsData.value)

// ── Form state ────────────────────────────────────────────────────────────────
const today = computed(() => todayISO())

const entryDate = ref(today.value)
const description = ref('')
const reference = ref('')

let lineCounter = 0
const makeEmptyLine = (): EntryLine => ({ _id: lineCounter++, accountId: '', debit: '', credit: '', description: '' })

const lines = ref<EntryLine[]>([makeEmptyLine(), makeEmptyLine()])

const addLine = () => lines.value.push(makeEmptyLine())
const removeLine = (id: number) => {
  if (lines.value.length <= 2) return
  lines.value = lines.value.filter(l => l._id !== id)
}

// ── Running totals ────────────────────────────────────────────────────────────
const totalDebits = computed(() =>
  lines.value.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
)
const totalCredits = computed(() =>
  lines.value.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
)
const difference = computed(() => Math.abs(totalDebits.value - totalCredits.value))
const isBalanced = computed(() => difference.value < 0.01)

// ── Validation ────────────────────────────────────────────────────────────────
const formErrors = ref<string[]>([])

const validate = (requireBalanced: boolean): boolean => {
  const errs: string[] = []
  if (!entryDate.value) errs.push(t('finanzas.contabilidad.validation.dateRequired'))
  if (!description.value.trim()) errs.push(t('finanzas.contabilidad.validation.descriptionRequired'))
  const validLines = lines.value.filter(l => l.accountId)
  if (validLines.length < 2) errs.push(t('finanzas.contabilidad.validation.minLines'))
  for (const l of validLines) {
    const d = parseFloat(l.debit) || 0
    const c = parseFloat(l.credit) || 0
    if (d === 0 && c === 0) errs.push(t('finanzas.contabilidad.validation.lineNeedsAmount'))
    if (d > 0 && c > 0) errs.push(t('finanzas.contabilidad.validation.lineOneSide'))
  }
  if (requireBalanced && !isBalanced.value)
    errs.push(t('finanzas.contabilidad.validation.unbalanced', { amount: formatCurrency(difference.value) }))
  formErrors.value = errs
  return errs.length === 0
}

// ── Submit ────────────────────────────────────────────────────────────────────
const saving = ref(false)
const posting = ref(false)
const submitError = ref<string | null>(null)

const buildPayload = () => ({
  entryDate: entryDate.value,
  description: description.value.trim(),
  reference: reference.value.trim() || null,
  lines: lines.value
    .filter(l => l.accountId)
    .map((l, i) => ({
      accountId: l.accountId,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
      description: l.description.trim() || null,
      lineOrder: i,
    })),
})

const handleSaveDraft = async () => {
  if (!validate(false)) return
  saving.value = true
  submitError.value = null
  try {
    await $fetch('/api/accounting/journal-entries', { method: 'POST', body: buildPayload() })
    router.push('/finanzas/contabilidad/asientos')
  } catch (err: any) {
    submitError.value = err?.data?.detail || err?.data?.message || t('finanzas.contabilidad.saveEntryError')
  } finally {
    saving.value = false
  }
}

const handlePost = async () => {
  if (!validate(true)) return
  posting.value = true
  submitError.value = null
  try {
    const res = await $fetch<{ success: boolean; data: { id: string } }>(
      '/api/accounting/journal-entries', { method: 'POST', body: buildPayload() }
    )
    await $fetch(`/api/accounting/journal-entries/${res.data.id}/post`, { method: 'POST' })
    router.push('/finanzas/contabilidad/asientos')
  } catch (err: any) {
    submitError.value = err?.data?.detail || err?.data?.message || t('finanzas.contabilidad.postEntryError')
  } finally {
    posting.value = false
  }
}

// ── Mutual exclusion: debit clears credit and vice versa ──────────────────────
const onDebitInput = (line: EntryLine) => {
  if (parseFloat(line.debit) > 0) line.credit = ''
}
const onCreditInput = (line: EntryLine) => {
  if (parseFloat(line.credit) > 0) line.debit = ''
}
</script>

<template>
  <div class="page-layout">

    <!-- Back link -->
    <div class="flex items-center gap-3 mb-4">
      <NuxtLink
        to="/finanzas/contabilidad/asientos"
        class="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        :aria-label="t('finanzas.contabilidad.backToEntries')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {{ t('finanzas.nav.asientos') }}
      </NuxtLink>
    </div>

    <div class="flex flex-col gap-4">

      <!-- Summary cards -->
      <div class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <MetricCard :title="t('finanzas.contabilidad.lines')" :value="lines.filter(l => l.accountId).length" format="number" variant="primary" />
        <MetricCard :title="t('finanzas.contabilidad.totalDebit')" :value="totalDebits" format="currency" variant="primary" />
        <MetricCard :title="t('finanzas.contabilidad.totalCredit')" :value="totalCredits" format="currency" variant="primary" />
        <MetricCard
          :title="t('finanzas.common.status')"
          :value="isBalanced ? t('finanzas.contabilidad.balanced') : difference"
          :format="isBalanced ? 'text' : 'currency'"
          :variant="isBalanced ? 'success' : 'warning'"
        />
      </div>

      <!-- Header fields -->
      <div class="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-text-primary">{{ t('finanzas.contabilidad.header') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="flex flex-col gap-1">
            <label for="entry-date" class="text-xs font-medium text-text-secondary">{{ t('finanzas.common.date') }} <span class="text-destructive">*</span></label>
            <input
              id="entry-date"
              v-model="entryDate"
              type="date"
              :max="today"
              class="h-9 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label for="entry-description" class="text-xs font-medium text-text-secondary">{{ t('finanzas.common.description') }} <span class="text-destructive">*</span></label>
            <input
              id="entry-description"
              v-model="description"
              type="text"
              :placeholder="t('finanzas.contabilidad.descriptionPlaceholder')"
              class="h-9 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="entry-reference" class="text-xs font-medium text-text-secondary">{{ t('finanzas.contabilidad.reference') }} <span class="text-text-secondary font-normal">{{ t('finanzas.common.optional') }}</span></label>
            <input
              id="entry-reference"
              v-model="reference"
              type="text"
              :placeholder="t('finanzas.contabilidad.referencePlaceholder')"
              class="h-9 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-text-secondary">{{ t('finanzas.contabilidad.module') }}</span>
            <div class="h-9 px-3 flex items-center rounded-lg border-2 border-border bg-surface-secondary text-sm text-text-secondary select-none">
              {{ t('finanzas.contabilidad.sources.manual') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Lines -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-primary">{{ t('finanzas.contabilidad.entryLines') }}</h2>
          <button
            type="button"
            class="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
            :aria-label="t('finanzas.contabilidad.addLine')"
            @click="addLine"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ t('finanzas.contabilidad.addLine') }}
          </button>
        </div>

        <!-- Loading accounts -->
        <div v-if="accountsLoading" class="flex items-center justify-center py-8">
          <CommonsTheCustomLoader size="medium" />
        </div>

        <!-- Lines list -->
        <div v-else class="overflow-x-auto">
          <div class="min-w-[1080px] divide-y divide-border">
          <!-- Column headers (desktop) -->
          <div class="hidden sm:grid grid-cols-[2rem_minmax(22rem,1.35fr)_10rem_10rem_minmax(18rem,1fr)_2.75rem] gap-2 px-4 py-2 bg-surface-secondary">
            <span class="text-xs font-medium text-text-secondary">#</span>
            <span class="text-xs font-medium text-text-secondary">{{ t('finanzas.contabilidad.account') }}</span>
            <span class="text-xs font-medium text-text-secondary text-end">{{ t('finanzas.contabilidad.debit') }}</span>
            <span class="text-xs font-medium text-text-secondary text-end">{{ t('finanzas.contabilidad.credit') }}</span>
            <span class="text-xs font-medium text-text-secondary">{{ t('finanzas.common.description') }}</span>
            <span />
          </div>

          <div
            v-for="(line, idx) in lines"
            :key="line._id"
            class="grid grid-cols-1 sm:grid-cols-[2rem_minmax(22rem,1.35fr)_10rem_10rem_minmax(18rem,1fr)_2.75rem] gap-2 px-4 py-2.5 items-center"
            :class="idx % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <!-- # -->
            <span class="text-xs text-text-secondary tabular-nums hidden sm:block">{{ idx + 1 }}</span>

            <!-- Account -->
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-text-secondary sm:hidden">{{ t('finanzas.contabilidad.account') }}</span>
              <select
                v-model="line.accountId"
                class="h-10 min-w-0 w-full ps-3 pe-8 rounded-lg border border-border bg-background text-sm leading-5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                :aria-label="t('finanzas.contabilidad.lineAccountOf', { number: idx + 1 })"
              >
                <option value="">{{ t('finanzas.contabilidad.selectAccount') }}</option>
                <option v-for="acc in detailAccounts" :key="acc.id" :value="acc.id">
                  {{ acc.code }} · {{ acc.name }}
                </option>
              </select>
            </div>

            <!-- Debit -->
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-text-secondary sm:hidden">{{ t('finanzas.contabilidad.debit') }}</span>
              <input
                v-model="line.debit"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="h-10 px-3 rounded-lg border border-border bg-background text-sm leading-5 text-end tabular-nums text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                :aria-label="t('finanzas.contabilidad.lineDebitOf', { number: idx + 1 })"
                @input="onDebitInput(line)"
              />
            </div>

            <!-- Credit -->
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-text-secondary sm:hidden">{{ t('finanzas.contabilidad.credit') }}</span>
              <input
                v-model="line.credit"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="h-10 px-3 rounded-lg border border-border bg-background text-sm leading-5 text-end tabular-nums text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                :aria-label="t('finanzas.contabilidad.lineCreditOf', { number: idx + 1 })"
                @input="onCreditInput(line)"
              />
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-text-secondary sm:hidden">{{ t('finanzas.contabilidad.descriptionOptional') }}</span>
              <input
                v-model="line.description"
                type="text"
                :placeholder="t('finanzas.contabilidad.descriptionOptional')"
                class="h-10 px-3 rounded-lg border border-border bg-background text-sm leading-5 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                :aria-label="t('finanzas.contabilidad.lineDescriptionOf', { number: idx + 1 })"
              />
            </div>

            <!-- Remove -->
            <button
              type="button"
              :disabled="lines.length <= 2"
              class="h-10 w-10 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-destructive hover:border-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              :aria-label="t('finanzas.contabilidad.removeLineOf', { number: idx + 1 })"
              @click="removeLine(line._id)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <!-- Totals row -->
          <div class="hidden sm:grid grid-cols-[2rem_minmax(22rem,1.35fr)_10rem_10rem_minmax(18rem,1fr)_2.75rem] gap-2 px-4 py-2 bg-surface-secondary border-t-2 border-border">
            <span />
            <span class="text-xs font-semibold text-text-primary">{{ t('finanzas.common.total') }}</span>
            <span class="text-sm font-bold tabular-nums text-end text-text-primary">{{ formatCurrency(totalDebits) }}</span>
            <span class="text-sm font-bold tabular-nums text-end text-text-primary">{{ formatCurrency(totalCredits) }}</span>
            <span />
            <span />
          </div>
          </div>
        </div>
      </div>

      <!-- Validation errors -->
      <div v-if="formErrors.length > 0" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <ul class="flex flex-col gap-1">
          <li v-for="err in formErrors" :key="err" class="text-sm text-destructive flex items-start gap-1.5">
            <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {{ err }}
          </li>
        </ul>
      </div>

      <!-- Submit error -->
      <div v-if="submitError" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
        {{ submitError }}
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 pb-4">
        <NuxtLink
          to="/finanzas/contabilidad/asientos"
          class="min-h-[44px] px-5 flex items-center rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
          :aria-label="t('finanzas.common.cancel')"
        >
          {{ t('finanzas.common.cancel') }}
        </NuxtLink>
        <div class="flex-1" />
        <button
          type="button"
          :disabled="saving || posting"
          class="min-h-[44px] px-5 rounded-lg border-2 border-border text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :aria-label="saving ? t('finanzas.contabilidad.savingDraft') : t('finanzas.contabilidad.saveDraft')"
          @click="handleSaveDraft"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {{ saving ? t('finanzas.contabilidad.savingDraft') : t('finanzas.contabilidad.saveDraft') }}
        </button>
        <button
          type="button"
          :disabled="saving || posting"
          class="min-h-[44px] px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :aria-label="posting ? t('finanzas.contabilidad.posting') : t('finanzas.contabilidad.createAndPost')"
          @click="handlePost"
        >
          <svg v-if="posting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {{ posting ? t('finanzas.contabilidad.posting') : t('finanzas.contabilidad.createAndPost') }}
        </button>
      </div>

    </div>
  </div>
</template>
