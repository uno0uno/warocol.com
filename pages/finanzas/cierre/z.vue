<template>
  <div class="page-layout">

    <!-- Loading overlay durante submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-background rounded-xl p-6 flex flex-col items-center gap-3 shadow-xl">
        <CommonsTheCustomLoader size="large" />
        <p class="text-base font-semibold text-text-primary">Registrando cierre...</p>
      </div>
    </div>

    <!-- ── SUCCESS ────────────────────────────────────────────────────────── -->
    <div v-if="cierreSuccess" class="flex flex-col items-center justify-center py-16 gap-6 text-center">
      <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <svg class="w-9 h-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
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
          <span class="font-semibold" :class="(successData?.cashDifference ?? 0) >= 0 ? 'text-emerald-600' : 'text-destructive'">
            {{ (successData?.cashDifference ?? 0) >= 0 ? '+' : '' }}{{ formatCurrency(successData?.cashDifference) }}
          </span>
        </div>
      </div>
      <div class="flex gap-3">
        <NuxtLink
          to="/finanzas/cierre"
          class="min-h-[44px] px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center"
        >
          Ver historial
        </NuxtLink>
        <NuxtLink
          v-if="successData?.id"
          :to="`/finanzas/cierre/${successData.id}`"
          class="min-h-[44px] px-5 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex items-center"
        >
          Ver detalle
        </NuxtLink>
      </div>
    </div>

    <template v-else>
      <!-- ── Header info card ─────────────────────────────────────────────── -->
      <div class="bg-surface border-2 border-border rounded-lg mb-3 sm:mb-4">
        <div class="p-3 sm:p-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <!-- Período -->
            <div class="flex items-center gap-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Período</p>
                <p class="text-base font-semibold text-text-primary">{{ formatPeriod(periodStart, periodEnd) }}</p>
              </div>
            </div>

            <!-- Restaurante -->
            <div class="flex items-center gap-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Restaurante</p>
                <p class="text-base font-semibold text-text-primary">{{ currentTenant?.name ?? '—' }}</p>
              </div>
            </div>

            <!-- Estado -->
            <div class="flex items-center gap-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Estado</p>
                <p class="text-base font-semibold text-text-primary">Paso {{ currentStep }} de 5</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Stepper ──────────────────────────────────────────────────────── -->
      <div class="bg-surface border border-border rounded-lg mb-3 sm:mb-4 px-3 py-2.5 sm:px-4 sm:py-3">

        <!-- Mobile: barra de progreso + etiqueta del paso actual -->
        <div class="flex items-center gap-3 sm:hidden">
          <span class="text-xs font-semibold text-text-secondary tabular-nums flex-shrink-0">{{ currentStep }}/5</span>
          <div class="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              class="h-full bg-primary rounded-full transition-all duration-300"
              :style="`width: ${(currentStep / 5) * 100}%`"
            />
          </div>
          <span class="text-xs font-semibold text-text-primary flex-shrink-0">
            {{ ['Cuentas','Efectivo','Otros métodos','Resumen','Cerrar'][currentStep - 1] }}
          </span>
        </div>

        <!-- Desktop: dots compactos -->
        <div class="hidden sm:flex items-center">
          <div
            v-for="(step, idx) in wizardSteps"
            :key="step.n"
            class="flex items-center"
            :class="idx < wizardSteps.length - 1 ? 'flex-1' : ''"
          >
            <!-- Dot + label -->
            <div class="flex flex-col items-center flex-shrink-0">
              <div
                class="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                :class="{
                  'bg-primary border-primary text-primary-foreground shadow-sm': currentStep === step.n,
                  'bg-primary/15 border-primary/40 text-primary': currentStep > step.n,
                  'bg-background border-border text-text-secondary': currentStep < step.n,
                }"
              >
                <svg v-if="currentStep > step.n" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="text-xs font-bold">{{ step.n }}</span>
              </div>
              <span
                class="mt-1 text-xs whitespace-nowrap transition-colors"
                :class="currentStep === step.n
                  ? 'font-semibold text-text-primary'
                  : currentStep > step.n
                    ? 'font-medium text-primary/70'
                    : 'text-text-secondary'"
              >{{ step.label }}</span>
            </div>
            <!-- Conector (todos menos el último) -->
            <div
              v-if="idx < wizardSteps.length - 1"
              class="flex-1 h-px mx-2 mb-4 transition-colors duration-200"
              :class="currentStep > step.n ? 'bg-primary/30' : 'bg-border'"
            />
          </div>
        </div>

      </div>

      <!-- ── Step content ─────────────────────────────────────────────────── -->

      <!-- Step 1: Cuentas abiertas -->
      <div v-if="currentStep === 1" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-semibold text-text-primary mb-3">Cuentas abiertas</h3>
        <div v-if="previewLoading" class="flex justify-center py-6">
          <CommonsTheCustomLoader size="large" />
        </div>
        <template v-else-if="previewData">
          <div v-if="previewData.openTablesCount === 0 || isPastPeriod" class="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-3">
            <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm text-emerald-700">
              <template v-if="isPastPeriod && previewData.openTablesCount > 0">
                Período pasado — las {{ previewData.openTablesCount }} mesa(s) abiertas no corresponden a este período.
              </template>
              <template v-else>
                No hay cuentas abiertas. Todo listo para continuar.
              </template>
            </span>
          </div>
          <div v-else class="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
            <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-amber-800">
                Hay {{ previewData.openTablesCount }} mesa(s) con cuenta abierta
              </p>
              <p class="text-xs text-amber-600 mt-0.5">Debes cerrar todas las mesas antes de continuar con el cierre.</p>
              <NuxtLink to="/pos" target="_blank" class="inline-block mt-2 text-xs font-medium text-amber-700 underline hover:no-underline">
                Ir al POS →
              </NuxtLink>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <button
              v-if="previewData.openTablesCount === 0 || isPastPeriod"
              @click="currentStep = 2"
              class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Continuar →
            </button>
            <button
              v-else
              disabled
              class="min-h-[44px] px-6 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed opacity-50"
            >
              Cierra las mesas para continuar
            </button>
          </div>
        </template>
        <div v-else class="text-sm text-text-secondary py-4">No se pudo cargar el estado de las mesas.</div>
      </div>

      <!-- Step 2: Conteo de caja -->
      <div v-else-if="currentStep === 2" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-semibold text-text-primary mb-1">Conteo de caja</h3>
        <p class="text-xs text-text-secondary mb-3">Ingresa los billetes y monedas en caja:</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

          <!-- Izquierda: denominaciones -->
          <div class="bg-background rounded-lg border border-border overflow-hidden">
            <div class="px-3 py-2 bg-surface border-b border-border">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Billetes y monedas</span>
            </div>
            <div class="divide-y divide-border">
              <div
                v-for="(denom, idx) in denominations"
                :key="denom"
                class="flex items-center gap-2 px-3 py-2 transition-colors"
                :class="(parseInt(counts[denom]) || 0) > 0 ? 'bg-primary/5' : ''"
              >
                <span
                  class="text-sm w-24 text-right flex-shrink-0 transition-colors"
                  :class="(parseInt(counts[denom]) || 0) > 0 ? 'font-semibold text-text-primary' : 'text-text-secondary'"
                >{{ formatCurrency(denom) }}</span>
                <span class="text-text-tertiary text-xs flex-shrink-0">×</span>
                <input
                  :ref="el => setDenomRef(el, idx)"
                  v-model="counts[denom]"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  @input="counts[denom] = sanitizeInt($event)"
                  @keydown.enter.prevent="focusNext(idx)"
                  class="w-14 px-2 py-1 rounded-md border text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  :class="(parseInt(counts[denom]) || 0) > 0
                    ? 'border-primary/50 bg-primary/5 font-semibold'
                    : 'border-border bg-surface'"
                  :aria-label="`Cantidad de billetes de ${formatCurrency(denom)}`"
                />
                <span class="text-text-tertiary text-xs flex-shrink-0">=</span>
                <span
                  class="text-sm flex-1 text-right transition-colors"
                  :class="(parseInt(counts[denom]) || 0) > 0 ? 'font-semibold text-text-primary' : 'text-text-tertiary'"
                >{{ formatCurrency(denom * (parseInt(counts[denom]) || 0)) }}</span>
              </div>
              <!-- Monedas -->
              <div
                class="flex items-center gap-2 px-3 py-2 transition-colors"
                :class="(parseInt(monedasAmount) || 0) > 0 ? 'bg-primary/5' : ''"
              >
                <span
                  class="text-sm w-24 text-right flex-shrink-0 transition-colors"
                  :class="(parseInt(monedasAmount) || 0) > 0 ? 'font-semibold text-text-primary' : 'text-text-secondary'"
                >Monedas</span>
                <span class="text-transparent text-xs flex-shrink-0">×</span>
                <input
                  v-model="monedasAmount"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  @input="monedasAmount = sanitizeIntStr($event)"
                  placeholder="0"
                  class="w-14 px-2 py-1 rounded-md border text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  :class="(parseInt(monedasAmount) || 0) > 0
                    ? 'border-primary/50 bg-primary/5 font-semibold'
                    : 'border-border bg-surface'"
                  aria-label="Monto total en monedas"
                />
                <span class="text-text-tertiary text-xs flex-shrink-0">=</span>
                <span
                  class="text-sm flex-1 text-right transition-colors"
                  :class="(parseInt(monedasAmount) || 0) > 0 ? 'font-semibold text-text-primary' : 'text-text-tertiary'"
                >{{ formatCurrency(parseInt(monedasAmount) || 0) }}</span>
              </div>
            </div>
          </div>

          <!-- Derecha: resumen -->
          <div class="flex flex-col gap-3">

            <!-- Desglose + total elevado -->
            <div class="bg-background rounded-lg border border-border overflow-hidden">
              <div class="px-3 py-2 bg-surface border-b border-border">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Desglose</span>
              </div>
              <div class="divide-y divide-border">
                <div v-for="denom in denominations" :key="denom" class="flex justify-between px-3 py-1.5">
                  <span
                    class="text-xs"
                    :class="(parseInt(counts[denom]) || 0) > 0 ? 'font-medium text-text-primary' : 'text-text-tertiary'"
                  >{{ formatCurrency(denom) }} × {{ parseInt(counts[denom]) || 0 }}</span>
                  <span
                    class="text-xs"
                    :class="(parseInt(counts[denom]) || 0) > 0 ? 'font-semibold text-text-primary' : 'text-text-tertiary'"
                  >{{ formatCurrency(denom * (parseInt(counts[denom]) || 0)) }}</span>
                </div>
                <div class="flex justify-between px-3 py-1.5">
                  <span
                    class="text-xs"
                    :class="(parseInt(monedasAmount) || 0) > 0 ? 'font-medium text-text-primary' : 'text-text-tertiary'"
                  >Monedas</span>
                  <span
                    class="text-xs"
                    :class="(parseInt(monedasAmount) || 0) > 0 ? 'font-semibold text-text-primary' : 'text-text-tertiary'"
                  >{{ formatCurrency(parseInt(monedasAmount) || 0) }}</span>
                </div>
              </div>
              <!-- Total row — accent strip -->
              <div class="px-3 py-2.5 bg-primary/10 border-t-2 border-primary/20 flex items-center justify-between">
                <span class="text-sm font-semibold text-primary">Total contado</span>
                <span class="text-base font-bold text-primary">{{ formatCurrency(totalCounted) }}</span>
              </div>
            </div>

            <!-- Diferencia — card con icono y monto grande -->
            <div class="rounded-lg border-2 overflow-hidden" :class="diffResultClass">
              <div class="px-3 py-2.5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg v-if="cashDiff >= 0" class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span class="text-sm font-semibold">Diferencia</span>
                </div>
                <span class="text-lg font-bold">{{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}</span>
              </div>
              <div class="px-3 py-2 border-t border-black/10 flex justify-between text-xs opacity-80">
                <span>Esperado en caja</span>
                <span class="font-medium">{{ formatCurrency(previewData?.cashExpected) }}</span>
              </div>
            </div>

          </div>
        </div>

        <div class="flex gap-3 mt-4">
          <button @click="currentStep = 1" class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors">
            ← Atrás
          </button>
          <button @click="currentStep = 3" class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Continuar →
          </button>
        </div>
      </div>

      <!-- Step 3: Otros métodos -->
      <div v-else-if="currentStep === 3" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-semibold text-text-primary mb-1">Otros métodos de pago</h3>
        <p class="text-xs text-text-secondary mb-3">Ingresa el monto contado para cada método:</p>

        <div v-if="nonCashMethods.length > 0" class="flex flex-col gap-2 mb-3">
          <div
            v-for="method in nonCashMethods"
            :key="method.key"
            class="bg-background rounded-lg border border-border overflow-hidden transition-colors"
            :class="(parseInt(methodAmounts[method.key]) || 0) > 0 ? 'border-border' : ''"
          >
            <!-- Row header: dot + name + badge + expected -->
            <div
              class="flex items-center gap-3 px-3 py-2.5 transition-colors"
              :class="(parseInt(methodAmounts[method.key]) || 0) > 0 ? 'bg-surface' : 'bg-background'"
            >
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :class="GROUP_COLORS[method.groupSlug]?.dot ?? 'bg-primary'"
              />
              <div class="flex-1 min-w-0">
                <span class="text-sm font-semibold text-text-primary capitalize">{{ method.label }}</span>
                <span
                  class="ml-2 text-xs font-medium px-1.5 py-0.5 rounded"
                  :class="GROUP_COLORS[method.groupSlug]?.badge ?? 'bg-primary/10 text-primary'"
                >{{ method.groupLabel }}</span>
              </div>
              <span class="text-xs text-text-secondary flex-shrink-0">
                Esp. <span class="font-medium text-text-primary">{{ formatCurrency(method.total) }}</span>
              </span>
            </div>

            <!-- Input row -->
            <div class="flex items-center gap-3 px-3 py-2 border-t border-border bg-surface/50">
              <span class="text-xs text-text-secondary flex-shrink-0">Contado</span>
              <input
                v-model="methodAmounts[method.key]"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                @input="methodAmounts[method.key] = sanitizeIntStr($event)"
                placeholder="0"
                class="w-32 px-3 py-1.5 rounded-md border text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                :class="(parseInt(methodAmounts[method.key]) || 0) > 0
                  ? 'border-primary/50 bg-primary/5 font-semibold'
                  : 'border-border bg-background'"
                :aria-label="`Monto contado para ${method.label}`"
              />
              <!-- Diff — solo cuando se ingresó un valor -->
              <div v-if="(parseInt(methodAmounts[method.key]) || 0) > 0" class="flex items-center gap-1.5 flex-shrink-0">
                <span class="text-text-tertiary text-xs">=</span>
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  :class="methodDiff(method) >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'"
                >
                  {{ methodDiff(method) >= 0 ? '+' : '' }}{{ formatCurrency(methodDiff(method)) }}
                </span>
              </div>
              <span v-else class="text-xs text-text-tertiary italic flex-shrink-0">Sin ingresar</span>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-text-secondary mb-3 py-6 text-center bg-background rounded-lg border border-border">
          No hay otros métodos de pago registrados para este período.
        </div>

        <div class="flex gap-3">
          <button @click="currentStep = 2" class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors">
            ← Atrás
          </button>
          <button @click="currentStep = 4" class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Continuar →
          </button>
        </div>
      </div>

      <!-- Step 4: Resumen -->
      <div v-else-if="currentStep === 4" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-semibold text-text-primary mb-2">Resumen del día</h3>

        <div class="bg-background rounded-lg border border-border divide-y divide-border mb-3">
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Período</span>
            <span class="font-medium">{{ formatPeriod(periodStart, periodEnd) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Total ventas</span>
            <span class="font-semibold text-text-primary">{{ formatCurrency(previewData?.totalSales) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Efectivo recibido</span>
            <span class="font-medium">{{ formatCurrency(previewData?.totalCash) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Gastos efectivo</span>
            <span class="font-medium">{{ formatCurrency(previewData?.gastosEfectivo) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Esperado en caja</span>
            <span class="font-medium">{{ formatCurrency(previewData?.cashExpected) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Efectivo contado</span>
            <span class="font-medium">{{ formatCurrency(totalCounted) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm font-semibold">
            <span>Diferencia efectivo</span>
            <span :class="cashDiff >= 0 ? 'text-emerald-600' : 'text-destructive'">
              {{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}
            </span>
          </div>
          <template v-if="nonCashMethods.length > 0">
            <div v-for="method in nonCashMethods" :key="method.key" class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">{{ method.label }} contado</span>
              <span class="font-medium">{{ formatCurrency(parseInt(methodAmounts[method.key]) || 0) }}</span>
            </div>
          </template>
        </div>

        <textarea
          v-model="notes"
          placeholder="Notas (opcional)"
          rows="2"
          class="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-2"
        />

        <div class="flex flex-wrap gap-2 mb-3 text-xs">
          <NuxtLink to="/ventas/ordenes" target="_blank" class="text-primary hover:underline">→ Lista de ventas</NuxtLink>
          <NuxtLink to="/finanzas/gastos" target="_blank" class="text-primary hover:underline">→ Gastos del día</NuxtLink>
          <NuxtLink to="/analitica" target="_blank" class="text-primary hover:underline">→ Analítica</NuxtLink>
        </div>

        <div class="flex gap-3">
          <button @click="currentStep = 3" class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors">
            ← Atrás
          </button>
          <button @click="currentStep = 5" class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Continuar →
          </button>
        </div>
      </div>

      <!-- Step 5: Confirmar -->
      <div v-else-if="currentStep === 5" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-semibold text-text-primary mb-1">Cerrar el día</h3>
        <p class="text-xs text-text-secondary mb-3">
          ¿Cerrar el día <strong>{{ formatPeriod(periodStart, periodEnd) }}</strong>?<br />
          <span class="text-xs text-text-tertiary">Esta acción no se puede deshacer.</span>
        </p>

        <div class="bg-background rounded-lg border border-border divide-y divide-border mb-3">
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Total ventas</span>
            <span class="font-medium">{{ formatCurrency(previewData?.totalSales ?? 0) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm font-semibold">
            <span>Diferencia caja</span>
            <span :class="cashDiff >= 0 ? 'text-emerald-600' : 'text-destructive'">
              {{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}
            </span>
          </div>
        </div>

        <div v-if="submitError" class="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-4">
          <svg class="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="text-sm text-destructive">{{ submitError }}</p>
        </div>

        <div class="flex gap-3">
          <button
            @click="currentStep = 4"
            class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          >
            ← Atrás
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
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Cierre Z - Warocol' })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const route = useRoute()

const today       = new Date().toISOString().split('T')[0]
const periodStart = ref((route.query.start as string) || today)
const periodEnd   = ref((route.query.end   as string) || today)
const isPastPeriod = computed(() => periodEnd.value < today)

// ── Wizard state ──────────────────────────────────────────────────────────
const wizardSteps = [
  { n: 1, label: 'Cuentas' },
  { n: 2, label: 'Efectivo' },
  { n: 3, label: 'Otros métodos' },
  { n: 4, label: 'Resumen' },
  { n: 5, label: 'Cerrar' },
]

const currentStep     = ref(1)
const confirmArmed    = ref(false)
const isSubmitting    = ref(false)
const submitError     = ref<string | null>(null)
const cierreSuccess   = ref(false)
const successData     = ref<Record<string, any> | null>(null)

// ── Denominations ─────────────────────────────────────────────────────────
const denominations = [100000, 50000, 20000, 10000, 5000, 2000, 1000]
const counts = ref<Record<number, string>>(
  Object.fromEntries(denominations.map(d => [d, '0']))
)
const monedasAmount  = ref('0')
const methodAmounts  = ref<Record<string, string>>({})
const notes          = ref('')
const denomRefs     = ref<HTMLInputElement[]>([])

const setDenomRef = (el: any, idx: number) => {
  if (el) denomRefs.value[idx] = el
}

const totalCounted = computed(() =>
  denominations.reduce((sum, d) => sum + d * (parseInt(counts.value[d]) || 0), 0)
  + (parseInt(monedasAmount.value) || 0)
)

// ── Preview API (completed orders only — cash already in drawer) ───────────
const { data: rawPreview, status: previewStatus, asyncStatus: previewAsyncStatus, refetch: refetchPreview } = useQuery({
  key: () => ['cierre', 'preview-z', currentTenant.value?.id, periodStart.value, periodEnd.value],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/preview', {
    params: { period_start: periodStart.value, period_end: periodEnd.value, completed_only: true },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 0,
})

const previewData    = computed(() => rawPreview.value?.data ?? null)
const previewLoading = computed(() => previewStatus.value === 'pending' && !previewData.value)
const isRefreshing   = computed(() => previewAsyncStatus.value === 'loading' && previewData.value != null)

registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetchPreview) })
onUnmounted(() => { clearRefreshHandler(refetchPreview) })

const cashDiff = computed(() => totalCounted.value - (previewData.value?.cashExpected ?? 0))

// ── Breakdown groups (non-cash payment methods) ────────────────────────────
const GROUP_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', digital: 'Digital', credit: 'Crédito',
}

const GROUP_COLORS: Record<string, { dot: string; badge: string }> = {
  cash:    { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  card:    { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border border-blue-200'         },
  digital: { dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 border border-violet-200'   },
  credit:  { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border border-amber-200'      },
}

interface BreakdownRowRaw { group_slug: string; method_name: string; total: number }
interface BreakdownGroup  { slug: string; label: string; total: number }

const breakdownGroups = computed<BreakdownGroup[]>(() => {
  const rows: BreakdownRowRaw[] = previewData.value?.breakdown ?? []
  const map = new Map<string, BreakdownGroup>()
  for (const row of rows) {
    if (!map.has(row.group_slug)) {
      map.set(row.group_slug, {
        slug:  row.group_slug,
        label: GROUP_LABELS[row.group_slug] ?? row.group_slug,
        total: 0,
      })
    }
    map.get(row.group_slug)!.total += row.total
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
})

const nonCashGroups = computed(() => breakdownGroups.value.filter(g => g.slug !== 'cash'))

interface BreakdownMethod {
  key: string
  groupSlug: string
  label: string
  groupLabel: string
  total: number
}

const nonCashMethods = computed<BreakdownMethod[]>(() => {
  const rows: BreakdownRowRaw[] = previewData.value?.breakdown ?? []
  const nonCashRows = rows.filter(r => r.group_slug !== 'cash')
  if (nonCashRows.length > 0) {
    return [...nonCashRows]
      .sort((a, b) => b.total - a.total)
      .map(r => ({
        key:        `${r.group_slug}__${r.method_name}`,
        groupSlug:  r.group_slug,
        label:      r.method_name,
        groupLabel: GROUP_LABELS[r.group_slug] ?? r.group_slug,
        total:      r.total,
      }))
  }
  // fallback: group-level totals when no individual methods are configured
  return nonCashGroups.value.map(g => ({
    key:        g.slug,
    groupSlug:  g.slug,
    label:      g.label,
    groupLabel: g.label,
    total:      g.total,
  }))
})

const methodDiff = (method: BreakdownMethod) =>
  (parseInt(methodAmounts.value[method.key]) || 0) - method.total

const diffResultClass = computed(() => {
  if (cashDiff.value >= 0) return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (Math.abs(cashDiff.value) < (previewData.value?.cashExpected ?? 1) * 0.02) return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-destructive/30 bg-destructive/5 text-destructive'
})

// ── Double confirm ─────────────────────────────────────────────────────────
let armTimeout: ReturnType<typeof setTimeout> | null = null

const handleConfirmButton = async () => {
  if (isSubmitting.value) return
  if (!confirmArmed.value) {
    armTimeout = setTimeout(() => { confirmArmed.value = true }, 500)
    return
  }
  await submitCierre()
}

// ── Submit ────────────────────────────────────────────────────────────────
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
      },
    })
    successData.value = result.data
    cierreSuccess.value = true
    clearStorage()
  } catch (err: any) {
    const msg = err?.data?.message ?? err?.data?.detail ?? err?.message ?? 'Error al registrar el cierre.'
    submitError.value = msg.includes('superpone')
      ? 'Ya existe un cierre para este período.'
      : msg
    confirmArmed.value = false
  } finally {
    isSubmitting.value = false
  }
}

// ── Input helpers ──────────────────────────────────────────────────────────
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

// ── localStorage ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'cierre_wizard_state'

const saveToStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    step: currentStep.value, counts: counts.value,
    monedasAmount: monedasAmount.value, methodAmounts: methodAmounts.value,
    notes: notes.value,
    periodStart: periodStart.value, periodEnd: periodEnd.value,
  }))
}

const loadFromStorage = () => {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const s = JSON.parse(raw)
    // Query params always win over localStorage — only restore period if not in URL
    const hasQueryParams = !!route.query.start || !!route.query.end
    if (!hasQueryParams) {
      if (s.periodStart) periodStart.value = s.periodStart
      if (s.periodEnd)   periodEnd.value   = s.periodEnd
      if (s.step)        currentStep.value = s.step
    }
    if (s.counts)         counts.value         = s.counts
    if (s.monedasAmount)  monedasAmount.value  = s.monedasAmount
    if (s.methodAmounts)  methodAmounts.value  = s.methodAmounts
    if (s.notes)          notes.value          = s.notes
  } catch { /* ignore */ }
}

const clearStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

watch([currentStep, counts, monedasAmount, methodAmounts, notes], saveToStorage, { deep: true })

onMounted(() => {
  if (typeof window === 'undefined') return
  loadFromStorage()
})

// ── Formatters ────────────────────────────────────────────────────────────
const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const formatPeriod = (start: string, end: string) => {
  if (!start) return ''
  const fmt = (d: string) => new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
  }).format(new Date(d + 'T12:00:00'))
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}
</script>
