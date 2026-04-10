<template>
  <div class="page-layout">

    <!-- ── View toggle ─────────────────────────────────────────────────────── -->
    <div class="flex gap-2 mb-1">
      <button
        v-for="v in views"
        :key="v.key"
        @click="activeView = v.key"
        class="min-h-[36px] px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="activeView === v.key
          ? 'bg-primary text-primary-foreground'
          : 'border border-border text-text-secondary hover:text-text-primary hover:border-primary'"
      >
        {{ v.label }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- HISTORIAL                                                              -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeView === 'historial'">
      <div v-if="isLoadingHistorial" class="flex justify-center py-16">
        <CommonsTheCustomLoader size="large" />
      </div>
      <UiResponsiveDataView
        v-else
        :data="historialList"
        :columns="historialColumns"
        row-size="sm"
        empty-message="No hay cierres registrados aún."
      >
        <template #cell-period="{ item }">
          <span class="text-sm text-text-primary">{{ formatPeriod(item.periodStart, item.periodEnd) }}</span>
        </template>
        <template #cell-totalSales="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-cashDifference="{ value }">
          <span
            class="text-sm font-semibold"
            :class="diffClass(value)"
          >
            {{ value >= 0 ? '+' : '' }}{{ formatCurrency(value) }}
          </span>
        </template>
        <template #cell-closedAt="{ value }">
          <span class="text-xs text-text-secondary">{{ formatDate(value) }}</span>
        </template>
      </UiResponsiveDataView>

      <!-- Monthly discrepancy summary -->
      <div v-if="historialList.length > 0" class="mt-3 px-4 py-3 bg-surface border border-border rounded-lg flex items-center justify-between">
        <span class="text-sm text-text-secondary">Diferencia acumulada del mes</span>
        <span class="text-sm font-semibold" :class="diffClass(monthlyDiff)">
          {{ monthlyDiff >= 0 ? '+' : '' }}{{ formatCurrency(monthlyDiff) }}
        </span>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- CIERRE                                                                 -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <template v-else>

      <!-- ── SUCCESS screen ─────────────────────────────────────────────────── -->
      <div v-if="cierreMode === 'success'" class="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircleIcon class="w-9 h-9 text-emerald-600" />
        </div>
        <div>
          <p class="text-xl font-semibold text-text-primary">Cierre registrado</p>
          <p class="text-sm text-text-secondary mt-1">{{ formatPeriod(periodStart, periodEnd) }}</p>
        </div>
        <div class="w-full max-w-sm bg-surface border border-border rounded-lg divide-y divide-border">
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Total ventas</span>
            <span class="font-medium">{{ formatCurrency(successData?.totalSales) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Efectivo esperado</span>
            <span class="font-medium">{{ formatCurrency(successData?.cashExpected) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Efectivo contado</span>
            <span class="font-medium">{{ formatCurrency(successData?.cashCounted) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Diferencia</span>
            <span class="font-semibold" :class="diffClass(successData?.cashDifference ?? 0)">
              {{ (successData?.cashDifference ?? 0) >= 0 ? '+' : '' }}{{ formatCurrency(successData?.cashDifference) }}
            </span>
          </div>
        </div>
        <div class="flex gap-3">
          <button
            @click="resetAll"
            class="min-h-[44px] px-5 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Volver al inicio
          </button>
          <button
            @click="activeView = 'historial'"
            class="min-h-[44px] px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver historial
          </button>
        </div>
      </div>

      <!-- ── LANDING ─────────────────────────────────────────────────────────── -->
      <div v-else-if="!cierreMode" class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <!-- Cierre X -->
        <button
          @click="startPreview"
          class="text-left p-6 bg-surface border-2 border-border rounded-xl hover:border-primary/40 transition-colors group"
        >
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <ChartBarIcon class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="font-semibold text-text-primary group-hover:text-primary transition-colors">📊 Cierre X</p>
              <p class="text-sm text-text-secondary mt-1">Ver estado del día</p>
              <p class="text-xs text-text-tertiary mt-2 leading-relaxed">
                Reporte sin bloquear. Consúltalo en cualquier momento del turno.
              </p>
            </div>
          </div>
        </button>

        <!-- Cierre Z -->
        <button
          @click="startWizard"
          class="text-left p-6 bg-surface border-2 border-border rounded-xl hover:border-primary/40 transition-colors group"
        >
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <LockClosedIcon class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="font-semibold text-text-primary group-hover:text-primary transition-colors">🔒 Cierre Z</p>
              <p class="text-sm text-text-secondary mt-1">Cerrar el día</p>
              <p class="text-xs text-text-tertiary mt-2 leading-relaxed">
                Definitivo. Requiere confirmar dos veces.
              </p>
            </div>
          </div>
        </button>

        <!-- Period selector -->
        <div class="sm:col-span-2 flex flex-wrap items-center gap-3 text-sm">
          <span class="text-text-secondary">Período:</span>
          <input
            v-model="periodStart"
            type="date"
            class="px-3 py-1.5 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span class="text-text-secondary">–</span>
          <input
            v-model="periodEnd"
            type="date"
            class="px-3 py-1.5 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <!-- ── CIERRE X — PREVIEW ──────────────────────────────────────────────── -->
      <div v-else-if="cierreMode === 'preview'">
        <div class="flex items-center gap-3 mb-4">
          <button @click="resetAll" class="text-text-secondary hover:text-text-primary transition-colors" aria-label="Volver">
            <ArrowLeftIcon class="w-5 h-5" />
          </button>
          <h2 class="text-base font-semibold text-text-primary">📊 Cierre X — {{ formatPeriod(periodStart, periodEnd) }}</h2>
        </div>

        <div v-if="previewLoading" class="flex justify-center py-12">
          <CommonsTheCustomLoader size="large" />
        </div>
        <div v-else-if="previewError" class="text-center py-12 text-text-secondary text-sm">
          No se pudo cargar el resumen. Intenta de nuevo.
        </div>
        <div v-else-if="previewData" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PreviewSummaryCard :preview="previewData" />
        </div>
      </div>

      <!-- ── CIERRE Z — WIZARD ───────────────────────────────────────────────── -->
      <div v-else-if="cierreMode === 'wizard'">

        <!-- Back + progress -->
        <div class="flex items-center gap-4 mb-5">
          <button @click="goBackFromWizard" class="text-text-secondary hover:text-text-primary transition-colors" aria-label="Volver">
            <ArrowLeftIcon class="w-5 h-5" />
          </button>
          <div class="flex items-center gap-2">
            <span
              v-for="s in 4"
              :key="s"
              class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors"
              :class="s < currentStep
                ? 'bg-primary text-primary-foreground'
                : s === currentStep
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-border text-text-tertiary'"
            >
              {{ s < currentStep ? '✓' : s }}
            </span>
            <span class="text-xs text-text-secondary ml-1">Paso {{ currentStep }} de 4</span>
          </div>
        </div>

        <!-- ── Step 1: Cuentas abiertas ── -->
        <div v-if="currentStep === 1" class="bg-surface border-2 border-border rounded-xl p-6">
          <h3 class="font-semibold text-text-primary mb-4">Paso 1 — Cuentas abiertas</h3>
          <div v-if="previewLoading" class="flex justify-center py-8">
            <CommonsTheCustomLoader size="large" />
          </div>
          <template v-else-if="previewData">
            <div v-if="previewData.openTablesCount === 0" class="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 mb-6">
              <CheckCircleIcon class="w-5 h-5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
              <span class="text-sm text-emerald-700">No hay cuentas abiertas</span>
            </div>
            <div v-else class="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 mb-6">
              <ExclamationTriangleIcon class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p class="text-sm font-medium text-amber-800">
                  Hay {{ previewData.openTablesCount }} mesa(s) con cuenta abierta
                </p>
                <p class="text-xs text-amber-600 mt-0.5">Cierra las mesas antes de continuar, o usa la autorización de gerente.</p>
                <NuxtLink to="/mesas" class="inline-block mt-2 text-xs font-medium text-amber-700 underline hover:no-underline">
                  Ir a mesas →
                </NuxtLink>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button
                v-if="previewData.openTablesCount === 0"
                @click="currentStep = 2"
                class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Continuar →
              </button>
              <button
                v-else
                @click="managerOverride = true; currentStep = 2"
                class="min-h-[44px] px-6 py-2 rounded-lg border-2 border-amber-400 text-amber-700 text-sm font-medium hover:bg-amber-50 transition-colors"
              >
                Continuar con autorización de gerente
              </button>
            </div>
          </template>
          <div v-else class="text-sm text-text-secondary py-4">No se pudo cargar el estado de las mesas.</div>
        </div>

        <!-- ── Step 2: Contar efectivo ── -->
        <div v-else-if="currentStep === 2" class="bg-surface border-2 border-border rounded-xl p-6">
          <h3 class="font-semibold text-text-primary mb-1">Paso 2 — Contar efectivo</h3>
          <p class="text-xs text-text-secondary mb-5">Cuenta los billetes que tienes en caja:</p>

          <!-- Denomination table -->
          <div class="space-y-2 mb-4">
            <div
              v-for="(denom, idx) in denominations"
              :key="denom"
              class="flex items-center gap-3"
            >
              <span class="text-sm text-text-secondary w-24 text-right flex-shrink-0">{{ formatCurrency(denom) }}</span>
              <span class="text-text-tertiary">×</span>
              <input
                :ref="el => { if (el) denomRefs[idx] = el as HTMLInputElement }"
                v-model="counts[denom]"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                @input="counts[denom] = sanitizeInt($event)"
                @keydown.enter.prevent="focusNext(idx)"
                class="w-20 px-3 py-1.5 rounded-lg border border-border bg-background text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                :aria-label="`Cantidad de billetes de ${formatCurrency(denom)}`"
              />
              <span class="text-text-tertiary">=</span>
              <span class="text-sm font-medium text-text-primary w-28">{{ formatCurrency(denom * (parseInt(counts[denom]) || 0)) }}</span>
            </div>

            <!-- Monedas -->
            <div class="flex items-center gap-3">
              <span class="text-sm text-text-secondary w-24 text-right flex-shrink-0">Monedas</span>
              <span class="text-transparent">×</span>
              <input
                v-model="monedasAmount"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                @input="monedasAmount = sanitizeIntStr($event)"
                placeholder="0"
                class="w-20 px-3 py-1.5 rounded-lg border border-border bg-background text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Monto total en monedas"
              />
              <span class="text-text-tertiary">=</span>
              <span class="text-sm font-medium text-text-primary w-28">{{ formatCurrency(parseInt(monedasAmount) || 0) }}</span>
            </div>
          </div>

          <!-- Running total -->
          <div class="border-t border-border pt-3 mb-5 flex justify-between items-center">
            <span class="text-sm font-medium text-text-secondary">Total contado:</span>
            <span class="text-lg font-bold text-text-primary">{{ formatCurrency(totalCounted) }}</span>
          </div>

          <!-- Ver resultado -->
          <div v-if="!revealed">
            <button
              @click="revealed = true"
              class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Ver resultado →
            </button>
          </div>

          <!-- Result revealed -->
          <template v-else>
            <div class="p-4 rounded-xl border-2 mb-5" :class="diffResultClass">
              <div class="flex justify-between text-sm mb-1.5">
                <span class="text-text-secondary">Efectivo esperado:</span>
                <span class="font-medium">{{ formatCurrency(previewData?.cashExpected ?? 0) }}</span>
              </div>
              <div class="flex justify-between text-sm mb-1.5">
                <span class="text-text-secondary">Tú contaste:</span>
                <span class="font-medium">{{ formatCurrency(totalCounted) }}</span>
              </div>
              <div class="flex justify-between text-sm font-semibold border-t border-current/20 pt-1.5 mt-1.5">
                <span>Diferencia:</span>
                <span>{{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }} {{ cashDiff >= 0 ? '✅ Sobrante' : cashDiff >= -(previewData?.cashExpected ?? 0) * 0.02 ? '⚠ Faltante menor' : '❌ Faltante' }}</span>
              </div>
            </div>

            <!-- Notes -->
            <div class="mb-5">
              <label class="block text-sm font-medium text-text-secondary mb-1">Observaciones (opcional)</label>
              <textarea
                v-model="notes"
                rows="2"
                placeholder="Ej: Sobrante de cambio de ayer..."
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <button
              @click="currentStep = 3"
              class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Continuar →
            </button>
          </template>
        </div>

        <!-- ── Step 3: Resumen del día ── -->
        <div v-else-if="currentStep === 3" class="bg-surface border-2 border-border rounded-xl p-6">
          <h3 class="font-semibold text-text-primary mb-5">Paso 3 — Resumen del día</h3>

          <div v-if="previewData" class="space-y-4">
            <!-- Ventas -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">Ventas del día</p>
              <div class="bg-background rounded-lg border border-border divide-y divide-border">
                <div class="flex justify-between px-4 py-2 text-sm">
                  <span class="text-text-secondary">Efectivo</span>
                  <span class="font-medium">{{ formatCurrency(previewData.totalCash) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2 text-sm">
                  <span class="text-text-secondary">Tarjeta</span>
                  <span class="font-medium">{{ formatCurrency(previewData.totalCard) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2 text-sm">
                  <span class="text-text-secondary">Digital</span>
                  <span class="font-medium">{{ formatCurrency(previewData.totalDigital) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2 text-sm">
                  <span class="text-text-secondary">Crédito</span>
                  <span class="font-medium">{{ formatCurrency(previewData.totalCredit) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2 text-sm font-semibold">
                  <span>Total</span>
                  <span class="text-primary">{{ formatCurrency(previewData.totalSales) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2 text-xs text-text-secondary">
                  <span>Ítems vendidos</span>
                  <span>{{ previewData.itemsSold }}</span>
                </div>
              </div>
            </div>

            <!-- Gastos + Arqueo -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">Arqueo de caja</p>
              <div class="bg-background rounded-lg border border-border divide-y divide-border">
                <div class="flex justify-between px-4 py-2 text-sm">
                  <span class="text-text-secondary">Gastos en efectivo</span>
                  <span class="font-medium">{{ formatCurrency(previewData.gastosEfectivo) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2 text-sm">
                  <span class="text-text-secondary">Esperado en caja</span>
                  <span class="font-medium">{{ formatCurrency(previewData.cashExpected) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2 text-sm">
                  <span class="text-text-secondary">Contado</span>
                  <span class="font-medium">{{ formatCurrency(totalCounted) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2 text-sm font-semibold">
                  <span>Diferencia</span>
                  <span :class="diffClass(cashDiff)">{{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}</span>
                </div>
              </div>
            </div>

            <!-- Links -->
            <div class="flex flex-wrap gap-2">
              <NuxtLink :to="`/ventas/ordenes`" class="text-xs text-primary hover:underline">→ Lista de ventas</NuxtLink>
              <NuxtLink :to="`/finanzas/gastos`" class="text-xs text-primary hover:underline">→ Gastos del día</NuxtLink>
              <NuxtLink :to="`/analitica`" class="text-xs text-primary hover:underline">→ Analítica</NuxtLink>
            </div>
          </div>

          <button
            @click="currentStep = 4"
            class="mt-6 min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Continuar →
          </button>
        </div>

        <!-- ── Step 4: Cerrar el día ── -->
        <div v-else-if="currentStep === 4" class="bg-surface border-2 border-border rounded-xl p-6">
          <h3 class="font-semibold text-text-primary mb-2">Paso 4 — Cerrar el día</h3>
          <p class="text-sm text-text-secondary mb-5">
            ¿Cerrar el día <strong>{{ formatPeriod(periodStart, periodEnd) }}</strong>?<br />
            <span class="text-xs text-text-tertiary">Esta acción no se puede deshacer.</span>
          </p>

          <div class="bg-background rounded-lg border border-border divide-y divide-border mb-6">
            <div class="flex justify-between px-4 py-2 text-sm">
              <span class="text-text-secondary">Total ventas</span>
              <span class="font-medium">{{ formatCurrency(previewData?.totalSales ?? 0) }}</span>
            </div>
            <div class="flex justify-between px-4 py-2 text-sm">
              <span class="text-text-secondary">Diferencia caja</span>
              <span class="font-semibold" :class="diffClass(cashDiff)">
                {{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}
              </span>
            </div>
          </div>

          <!-- Error -->
          <div v-if="submitError" class="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-4">
            <ExclamationTriangleIcon class="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p class="text-sm text-destructive">{{ submitError }}</p>
          </div>

          <div class="flex gap-3">
            <button
              @click="currentStep = 3"
              class="min-h-[44px] px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              @click="handleConfirmButton"
              :disabled="isSubmitting"
              class="min-h-[44px] px-6 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :class="confirmArmed
                ? 'bg-destructive text-white hover:bg-destructive/90 ring-2 ring-destructive/30'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'"
            >
              <span v-if="isSubmitting">Cerrando...</span>
              <span v-else-if="confirmArmed">¿Confirmar cierre?</span>
              <span v-else>Cerrar el día</span>
            </button>
          </div>
        </div>

      </div><!-- end wizard -->
    </template><!-- end cierre view -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  LockClosedIcon,
  ArrowLeftIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Cierre - Warocol' })

const { currentTenant } = useTenantReactive()

// ── Views ─────────────────────────────────────────────────────────────────
const views = [
  { key: 'cierre',    label: 'Cierre' },
  { key: 'historial', label: 'Historial' },
] as const
type View = typeof views[number]['key']
const activeView = ref<View>('cierre')

// ── Period ─────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]
const periodStart = ref(today)
const periodEnd   = ref(today)

// ── Wizard state ──────────────────────────────────────────────────────────
type CierreMode = null | 'preview' | 'wizard' | 'success'
const cierreMode    = ref<CierreMode>(null)
const currentStep   = ref(1)
const revealed      = ref(false)
const confirmArmed  = ref(false)
const managerOverride = ref(false)
const isSubmitting  = ref(false)
const submitError   = ref<string | null>(null)
const successData   = ref<Record<string, any> | null>(null)

// ── Denominations ────────────────────────────────────────────────────────
const denominations = [100000, 50000, 20000, 10000, 5000, 2000, 1000]
const counts = ref<Record<number, string>>(
  Object.fromEntries(denominations.map(d => [d, '0']))
)
const monedasAmount = ref('0')
const notes = ref('')
const denomRefs = ref<HTMLInputElement[]>([])

const totalCounted = computed(() =>
  denominations.reduce((sum, d) => sum + d * (parseInt(counts.value[d]) || 0), 0)
  + (parseInt(monedasAmount.value) || 0)
)

// ── Preview API ──────────────────────────────────────────────────────────
const previewEnabled = computed(() =>
  !!currentTenant.value && (cierreMode.value === 'preview' || cierreMode.value === 'wizard')
)

const { data: rawPreview, status: previewStatus, error: previewErr } = useQuery({
  key: () => ['cierre', 'preview', currentTenant.value?.id, periodStart.value, periodEnd.value],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/preview', {
    params: { period_start: periodStart.value, period_end: periodEnd.value },
  }),
  enabled: previewEnabled,
  staleTime: 60_000,
})

const previewData    = computed(() => rawPreview.value?.data ?? null)
const previewLoading = computed(() => previewStatus.value === 'pending' && !previewData.value)
const previewError   = computed(() => previewErr.value)

// ── Cash diff helpers ─────────────────────────────────────────────────────
const cashDiff = computed(() => totalCounted.value - (previewData.value?.cashExpected ?? 0))

const diffClass = (val: number) =>
  val >= 0 ? 'text-emerald-600' : Math.abs(val) < (previewData.value?.cashExpected ?? 1) * 0.02 ? 'text-amber-600' : 'text-destructive'

const diffResultClass = computed(() => {
  if (cashDiff.value >= 0)  return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (Math.abs(cashDiff.value) < (previewData.value?.cashExpected ?? 1) * 0.02) return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-destructive/30 bg-destructive/5 text-destructive'
})

// ── Historial API ──────────────────────────────────────────────────────────
const { data: rawHistorial, status: historialStatus } = useQuery({
  key: () => ['cierre', 'list', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/cierre'),
  enabled: () => !!currentTenant.value && activeView.value === 'historial',
  staleTime: 60_000,
})

const historialList    = computed(() => rawHistorial.value?.data ?? [])
const isLoadingHistorial = computed(() => historialStatus.value === 'pending' && !rawHistorial.value)
const monthlyDiff      = computed(() =>
  historialList.value.reduce((sum: number, r: any) => sum + (r.cashDifference ?? 0), 0)
)

const historialColumns = [
  { key: 'period',       label: 'Período',       sortable: false },
  { key: 'totalSales',   label: 'Ventas',         sortable: false },
  { key: 'cashDifference', label: 'Diferencia',   sortable: false },
  { key: 'closedAt',     label: 'Registrado',     sortable: false },
]

// ── Wizard actions ────────────────────────────────────────────────────────
const startPreview = () => { cierreMode.value = 'preview' }
const startWizard  = () => { cierreMode.value = 'wizard'; currentStep.value = 1; loadFromStorage() }

const goBackFromWizard = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  } else {
    cierreMode.value = null
  }
}

const resetAll = () => {
  cierreMode.value   = null
  currentStep.value  = 1
  revealed.value     = false
  confirmArmed.value = false
  managerOverride.value = false
  submitError.value  = null
  successData.value  = null
  counts.value = Object.fromEntries(denominations.map(d => [d, '0']))
  monedasAmount.value = '0'
  notes.value = ''
  clearStorage()
}

// ── Double confirm (500ms arm delay to prevent accidental tap) ────────────
let armTimeout: ReturnType<typeof setTimeout> | null = null

const handleConfirmButton = async () => {
  if (isSubmitting.value) return
  if (!confirmArmed.value) {
    armTimeout = setTimeout(() => { confirmArmed.value = true }, 500)
    return
  }
  await submitCierre()
}

// ── Submit ─────────────────────────────────────────────────────────────────
const submitCierre = async () => {
  isSubmitting.value = true
  submitError.value  = null
  try {
    const result = await $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre', {
      method: 'POST',
      body: {
        periodStart:     periodStart.value,
        periodEnd:       periodEnd.value,
        cashCounted:     totalCounted.value,
        notes:           notes.value || null,
        managerOverride: managerOverride.value,
      },
    })
    successData.value = result.data
    cierreMode.value  = 'success'
    clearStorage()
  } catch (err: any) {
    const msg = err?.data?.detail ?? err?.message ?? 'Error al registrar el cierre.'
    if (msg.includes('superpone') || msg.includes('409') || err?.status === 409) {
      submitError.value = 'Ya existe un cierre para este período.'
    } else {
      submitError.value = msg
    }
    confirmArmed.value = false
  } finally {
    isSubmitting.value = false
  }
}

// ── Input helpers ─────────────────────────────────────────────────────────
const sanitizeInt = (e: Event): string => {
  const v = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  ;(e.target as HTMLInputElement).value = v
  return v
}
const sanitizeIntStr = (e: Event): string => sanitizeInt(e)

const focusNext = (idx: number) => {
  nextTick(() => {
    const next = denomRefs.value[idx + 1]
    if (next) next.focus()
  })
}

// ── localStorage persistence ──────────────────────────────────────────────
const STORAGE_KEY = 'cierre_wizard_state'

const saveToStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    step:          currentStep.value,
    counts:        counts.value,
    monedasAmount: monedasAmount.value,
    notes:         notes.value,
    periodStart:   periodStart.value,
    periodEnd:     periodEnd.value,
    revealed:      revealed.value,
  }))
}

const loadFromStorage = () => {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const s = JSON.parse(raw)
    if (s.step)          currentStep.value    = s.step
    if (s.counts)        counts.value         = s.counts
    if (s.monedasAmount) monedasAmount.value  = s.monedasAmount
    if (s.notes)         notes.value          = s.notes
    if (s.periodStart)   periodStart.value    = s.periodStart
    if (s.periodEnd)     periodEnd.value      = s.periodEnd
    if (s.revealed)      revealed.value       = s.revealed
  } catch { /* ignore corrupted state */ }
}

const clearStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

// Save on wizard state changes
watch([currentStep, counts, monedasAmount, notes, revealed], saveToStorage, { deep: true })

// Check for saved state on mount
onMounted(() => {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    // Resume saved wizard
    cierreMode.value = 'wizard'
    loadFromStorage()
  }
})

// ── Formatters ────────────────────────────────────────────────────────────
const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'America/Bogota',
  }).format(new Date(iso))
}

const formatPeriod = (start: string, end: string) => {
  if (!start) return ''
  const s = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }).format(new Date(start + 'T12:00:00'))
  if (start === end) return s
  const e = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }).format(new Date(end + 'T12:00:00'))
  return `${s} – ${e}`
}
</script>
