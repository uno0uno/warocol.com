<script setup lang="ts">
import { ref, computed } from 'vue'
import { format as fnsFormat } from 'date-fns'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Nuevo asiento contable - Warocol' })

const { currentTenant } = useTenantReactive()
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
const today = fnsFormat(new Date(), 'yyyy-MM-dd')

const entryDate = ref(today)
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
  if (!entryDate.value) errs.push('La fecha es requerida.')
  if (!description.value.trim()) errs.push('La descripción es requerida.')
  const validLines = lines.value.filter(l => l.accountId)
  if (validLines.length < 2) errs.push('Se requieren al menos 2 líneas con cuenta.')
  for (const l of validLines) {
    const d = parseFloat(l.debit) || 0
    const c = parseFloat(l.credit) || 0
    if (d === 0 && c === 0) errs.push('Cada línea debe tener un valor en débito o crédito.')
    if (d > 0 && c > 0) errs.push('Una línea no puede tener débito y crédito al mismo tiempo.')
  }
  if (requireBalanced && !isBalanced.value)
    errs.push(`El asiento no cuadra. Diferencia: ${formatCurrency(difference.value)}`)
  formErrors.value = errs
  return errs.length === 0
}

// ── Submit ────────────────────────────────────────────────────────────────────
const saving = ref(false)
const posting = ref(false)
const submitError = ref<string | null>(null)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

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
    submitError.value = err?.data?.detail || err?.data?.message || 'Error al guardar el asiento'
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
    submitError.value = err?.data?.detail || err?.data?.message || 'Error al publicar el asiento'
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
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Asientos
      </NuxtLink>
    </div>

    <div class="flex flex-col gap-4">

      <!-- Summary cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
        <div class="bg-surface px-4 py-3 flex flex-col gap-0.5">
          <span class="text-xs text-text-secondary">Líneas</span>
          <span class="text-lg font-bold text-text-primary tabular-nums">{{ lines.filter(l => l.accountId).length }}</span>
        </div>
        <div class="bg-surface px-4 py-3 flex flex-col gap-0.5">
          <span class="text-xs text-text-secondary">Total débito</span>
          <span class="text-lg font-bold text-text-primary tabular-nums">{{ formatCurrency(totalDebits) }}</span>
        </div>
        <div class="bg-surface px-4 py-3 flex flex-col gap-0.5">
          <span class="text-xs text-text-secondary">Total crédito</span>
          <span class="text-lg font-bold text-text-primary tabular-nums">{{ formatCurrency(totalCredits) }}</span>
        </div>
        <div class="bg-surface px-4 py-3 flex flex-col gap-0.5">
          <span class="text-xs text-text-secondary">Estado</span>
          <span
            class="text-sm font-semibold flex items-center gap-1"
            :class="isBalanced ? 'text-green-600' : 'text-amber-600'"
          >
            <svg v-if="isBalanced" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {{ isBalanced ? 'Cuadrado' : formatCurrency(difference) }}
          </span>
        </div>
      </div>

      <!-- Header fields -->
      <div class="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-text-primary">Encabezado</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="flex flex-col gap-1">
            <label for="entry-date" class="text-xs font-medium text-text-secondary">Fecha <span class="text-destructive">*</span></label>
            <input
              id="entry-date"
              v-model="entryDate"
              type="date"
              :max="today"
              class="h-9 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label for="entry-description" class="text-xs font-medium text-text-secondary">Descripción <span class="text-destructive">*</span></label>
            <input
              id="entry-description"
              v-model="description"
              type="text"
              placeholder="Ej: Pago de nómina enero 2025"
              class="h-9 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="entry-reference" class="text-xs font-medium text-text-secondary">Referencia <span class="text-text-secondary font-normal">(opcional)</span></label>
            <input
              id="entry-reference"
              v-model="reference"
              type="text"
              placeholder="Ej: FAC-001, NOM-2025-01"
              class="h-9 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-text-secondary">Módulo</span>
            <div class="h-9 px-3 flex items-center rounded-lg border-2 border-border bg-surface-secondary text-sm text-text-secondary select-none">
              Manual
            </div>
          </div>
        </div>
      </div>

      <!-- Lines -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-primary">Líneas del asiento</h2>
          <button
            type="button"
            class="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
            @click="addLine"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Agregar línea
          </button>
        </div>

        <!-- Loading accounts -->
        <div v-if="accountsLoading" class="flex items-center justify-center py-8">
          <CommonsTheCustomLoader size="medium" />
        </div>

        <!-- Lines list -->
        <div v-else class="divide-y divide-border">
          <!-- Column headers (desktop) -->
          <div class="hidden sm:grid grid-cols-[2rem_1fr_9rem_9rem_1fr_2.25rem] gap-2 px-4 py-2 bg-surface-secondary">
            <span class="text-xs font-medium text-text-secondary">#</span>
            <span class="text-xs font-medium text-text-secondary">Cuenta</span>
            <span class="text-xs font-medium text-text-secondary text-right">Débito</span>
            <span class="text-xs font-medium text-text-secondary text-right">Crédito</span>
            <span class="text-xs font-medium text-text-secondary">Descripción</span>
            <span />
          </div>

          <div
            v-for="(line, idx) in lines"
            :key="line._id"
            class="grid grid-cols-1 sm:grid-cols-[2rem_1fr_9rem_9rem_1fr_2.25rem] gap-2 px-4 py-2 items-center"
            :class="idx % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <!-- # -->
            <span class="text-xs text-text-secondary tabular-nums hidden sm:block">{{ idx + 1 }}</span>

            <!-- Account -->
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-text-secondary sm:hidden">Cuenta</span>
              <select
                v-model="line.accountId"
                class="h-8 pl-2 pr-6 rounded-lg border border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                :aria-label="`Cuenta de la línea ${idx + 1}`"
              >
                <option value="">Seleccionar cuenta...</option>
                <option v-for="acc in detailAccounts" :key="acc.id" :value="acc.id">
                  {{ acc.code }} · {{ acc.name }}
                </option>
              </select>
            </div>

            <!-- Debit -->
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-text-secondary sm:hidden">Débito</span>
              <input
                v-model="line.debit"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="h-8 px-2 rounded-lg border border-border bg-background text-sm text-right tabular-nums text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                :aria-label="`Débito línea ${idx + 1}`"
                @input="onDebitInput(line)"
              />
            </div>

            <!-- Credit -->
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-text-secondary sm:hidden">Crédito</span>
              <input
                v-model="line.credit"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="h-8 px-2 rounded-lg border border-border bg-background text-sm text-right tabular-nums text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                :aria-label="`Crédito línea ${idx + 1}`"
                @input="onCreditInput(line)"
              />
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-text-secondary sm:hidden">Descripción (opcional)</span>
              <input
                v-model="line.description"
                type="text"
                placeholder="Descripción (opcional)"
                class="h-8 px-2 rounded-lg border border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                :aria-label="`Descripción línea ${idx + 1}`"
              />
            </div>

            <!-- Remove -->
            <button
              type="button"
              :disabled="lines.length <= 2"
              class="h-8 w-9 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-destructive hover:border-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              :aria-label="`Eliminar línea ${idx + 1}`"
              @click="removeLine(line._id)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <!-- Totals row -->
          <div class="hidden sm:grid grid-cols-[2rem_1fr_9rem_9rem_1fr_2.25rem] gap-2 px-4 py-2 bg-surface-secondary border-t-2 border-border">
            <span />
            <span class="text-xs font-semibold text-text-primary">Total</span>
            <span class="text-sm font-bold tabular-nums text-right text-text-primary">{{ formatCurrency(totalDebits) }}</span>
            <span class="text-sm font-bold tabular-nums text-right text-text-primary">{{ formatCurrency(totalCredits) }}</span>
            <span />
            <span />
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
        >
          Cancelar
        </NuxtLink>
        <div class="flex-1" />
        <button
          type="button"
          :disabled="saving || posting"
          class="min-h-[44px] px-5 rounded-lg border-2 border-border text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          @click="handleSaveDraft"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {{ saving ? 'Guardando...' : 'Guardar borrador' }}
        </button>
        <button
          type="button"
          :disabled="saving || posting"
          class="min-h-[44px] px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          @click="handlePost"
        >
          <svg v-if="posting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {{ posting ? 'Publicando...' : 'Crear y publicar' }}
        </button>
      </div>

    </div>
  </div>
</template>
