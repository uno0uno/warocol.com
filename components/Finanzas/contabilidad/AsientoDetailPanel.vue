<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface JournalLine {
  id: string
  accountId: string
  debit: number
  credit: number
  description: string | null
  lineOrder: number
}

interface JournalEntryWithLines {
  id: string
  entryDate: string
  description: string
  reference: string | null
  sourceModule: string | null
  sourceId: string | null
  status: string
  totalDebit: number
  totalCredit: number
  pendingReview: boolean
  postedAt: string | null
  voidedAt: string | null
  lines: JournalLine[]
}

interface AccountLookup {
  id: string
  code: string
  name: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  entryId: string | null
  allAccounts: AccountLookup[]
  allowActions?: boolean
}>(), {
  allowActions: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'updated': []
  'void-request': []
}>()

const close = () => emit('update:modelValue', false)

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(v ?? 0)

const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const SOURCE_LABELS: Record<string, string> = {
  ventas: 'Ventas',
  gastos: 'Gastos',
  nomina: 'Nómina',
  nomina_provision: 'Nómina — provisión',
  nomina_ss: 'Nómina — seguridad social',
  nomina_prima: 'Nómina — prima',
  nomina_cesantias: 'Nómina — cesantías',
  nomina_int_cesantias: 'Nómina — int. cesantías',
  nomina_vacaciones: 'Nómina — vacaciones',
  nomina_dotacion: 'Nómina — dotación',
  nomina_pila: 'Nómina — PILA',
  nomina_horas_extras: 'Nómina — horas extras',
  nomina_liquidacion: 'Nómina — liquidación',
  inventario: 'Inventario',
  cartera: 'Cartera',
  arqueo: 'Arqueo',
  manual: 'Manual',
  manual_balance_adjustment: 'Ajuste de saldo',
  system: 'Sistema',
  orden: 'Orden',
  orden_cogs: 'Orden (CMV)',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  posted: 'Publicado',
  voided: 'Anulado',
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary'> = {
  draft: 'warning',
  posted: 'success',
  voided: 'secondary',
}

// ── Fetch entry detail ──────────────────────────────────────────────────────
const entry = ref<JournalEntryWithLines | null>(null)
const loading = ref(false)
const error = ref('')

const accountById = computed<Record<string, AccountLookup>>(() => {
  const map: Record<string, AccountLookup> = {}
  for (const a of props.allAccounts) map[a.id] = a
  return map
})

const entryLink = computed((): string | null => {
  if (!entry.value?.sourceId) return null
  if (entry.value.sourceModule === 'orden' || entry.value.sourceModule === 'orden_cogs') {
    return `/ventas/${entry.value.sourceId}`
  }
  if (entry.value.sourceModule === 'inventario') {
    return `/abastecimiento/compras-directas/${entry.value.sourceId}`
  }
  return null
})

const posting = ref(false)
const postError = ref('')

const handlePost = async () => {
  if (!entry.value) return
  posting.value = true
  postError.value = ''
  try {
    await $fetch(`/api/accounting/journal-entries/${entry.value.id}/post`, { method: 'POST' })
    await fetchEntry(entry.value.id)
    emit('updated')
  } catch (err: any) {
    postError.value = err?.data?.detail || err?.data?.message || 'Error al publicar el asiento'
  } finally {
    posting.value = false
  }
}

const fetchEntry = async (id: string) => {
  loading.value = true
  error.value = ''
  entry.value = null
  try {
    const res = await $fetch<{ success: boolean; data: JournalEntryWithLines }>(
      `/api/accounting/journal-entries/${id}`,
    )
    if (res.success) entry.value = res.data
  } catch (err: any) {
    error.value = err?.data?.detail || err?.message || 'Error al cargar el asiento'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.entryId] as const,
  ([open, id]) => {
    if (open && id) fetchEntry(id)
    if (!open) { entry.value = null; error.value = '' }
  },
  { immediate: true },
)
</script>

<template>
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
        v-if="modelValue"
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del asiento contable"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-lg md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  Asiento contable
                </h2>
                <p v-if="entry" class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ formatDate(entry.entryDate) }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="close"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <!-- Loading -->
          <div v-if="loading" class="flex items-center justify-center py-12">
            <CommonsTheCustomLoader size="medium" />
          </div>

          <!-- Error -->
          <div v-else-if="error" class="rounded-xl border border-destructive/40 bg-destructive/8 px-4 py-3">
            <p class="text-sm text-destructive font-medium">{{ error }}</p>
          </div>

          <!-- Entry detail -->
          <template v-else-if="entry">
            <!-- Status + module + pending_review badges -->
            <div class="flex flex-wrap items-center gap-2">
              <UiStatusBadge
                :value="STATUS_LABELS[entry.status] || entry.status"
                format="text"
                :variant="STATUS_VARIANTS[entry.status] || 'secondary'"
                size="sm"
              />
              <UiStatusBadge
                v-if="entry.sourceModule"
                :value="SOURCE_LABELS[entry.sourceModule] || entry.sourceModule"
                format="text"
                variant="secondary"
                size="sm"
              />
              <span
                v-if="entry.pendingReview"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium dark:bg-amber-950/30 dark:text-amber-400"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Pendiente de revisar
              </span>
            </div>

            <!-- Description -->
            <div>
              <p class="text-xs uppercase tracking-wider text-text-secondary font-medium mb-1">
                Descripción
              </p>
              <NuxtLink
                v-if="entryLink"
                :to="entryLink"
                class="text-sm text-primary hover:underline leading-relaxed"
              >
                {{ entry.description }}
              </NuxtLink>
              <p v-else class="text-sm text-text-primary leading-relaxed">{{ entry.description }}</p>
            </div>

            <!-- Reference -->
            <div v-if="entry.reference">
              <p class="text-xs uppercase tracking-wider text-text-secondary font-medium mb-1">
                Referencia
              </p>
              <p class="text-sm font-mono text-text-primary">{{ entry.reference }}</p>
            </div>

            <!-- Lines table -->
            <div>
              <p class="text-xs uppercase tracking-wider text-text-secondary font-medium mb-2">
                Movimientos ({{ entry.lines.length }})
              </p>
              <div class="rounded-xl border border-border overflow-hidden">
                <div class="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 bg-surface-secondary/40 text-xs font-semibold text-text-secondary">
                  <span>Cuenta</span>
                  <span class="text-right">Débito</span>
                  <span class="text-right">Crédito</span>
                </div>
                <div
                  v-for="(line, idx) in entry.lines"
                  :key="line.id"
                  class="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2.5 text-sm border-t border-border"
                  :class="idx % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/20'"
                >
                  <div class="min-w-0">
                    <p class="font-medium text-text-primary truncate">
                      <span class="font-mono text-text-secondary mr-1.5">{{ accountById[line.accountId]?.code || '?' }}</span>
                      {{ accountById[line.accountId]?.name || 'Cuenta desconocida' }}
                    </p>
                    <p v-if="line.description" class="text-xs text-text-secondary leading-snug mt-0.5 truncate">
                      {{ line.description }}
                    </p>
                  </div>
                  <span class="text-sm font-mono tabular-nums text-right" :class="line.debit ? 'text-primary font-medium' : 'text-text-tertiary'">
                    {{ line.debit ? formatCOP(line.debit) : '—' }}
                  </span>
                  <span class="text-sm font-mono tabular-nums text-right" :class="line.credit ? 'text-text-secondary' : 'text-text-tertiary'">
                    {{ line.credit ? formatCOP(line.credit) : '—' }}
                  </span>
                </div>
                <!-- Totals -->
                <div class="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2.5 bg-surface-secondary/60 border-t-2 border-border text-sm font-bold">
                  <span class="text-text-primary">Totales</span>
                  <span class="text-primary font-mono tabular-nums text-right">{{ formatCOP(entry.totalDebit) }}</span>
                  <span class="text-text-secondary font-mono tabular-nums text-right">{{ formatCOP(entry.totalCredit) }}</span>
                </div>
              </div>
            </div>

            <!-- Timestamps -->
            <div class="text-xs text-text-secondary space-y-1 pt-2 border-t border-border/50">
              <p v-if="entry.postedAt">
                <span class="font-medium">Publicado:</span> {{ new Date(entry.postedAt).toLocaleString('es-CO') }}
              </p>
              <p v-if="entry.voidedAt">
                <span class="font-medium text-destructive">Anulado:</span> {{ new Date(entry.voidedAt).toLocaleString('es-CO') }}
              </p>
            </div>

            <div v-if="postError" class="rounded-xl border border-destructive/40 bg-destructive/8 px-4 py-3">
              <p class="text-sm text-destructive font-medium">{{ postError }}</p>
            </div>
          </template>
        </div>

        <!-- Sticky footer -->
        <div class="flex-shrink-0 border-t border-border bg-surface px-6 py-4">
          <div v-if="allowActions && entry && !loading && !error" class="flex items-center gap-3">
            <button
              type="button"
              class="min-h-[44px] px-4 py-2 rounded-lg border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="close"
            >
              Cerrar
            </button>
            <div class="flex-1" />
            <button
              v-if="entry.status === 'draft'"
              type="button"
              :disabled="posting"
              class="min-h-[44px] px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              @click="handlePost"
            >
              <svg v-if="posting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>{{ posting ? 'Publicando...' : 'Publicar' }}</span>
            </button>
            <button
              v-if="entry.status === 'posted'"
              type="button"
              class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-destructive/50 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors"
              @click="emit('void-request')"
            >
              Anular
            </button>
          </div>
          <button
            v-else
            type="button"
            class="w-full min-h-[44px] rounded-lg border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            @click="close"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
