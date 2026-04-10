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
                <p class="text-base font-semibold text-text-primary">Paso {{ currentStep }} de 4</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Stepper ──────────────────────────────────────────────────────── -->
      <div class="bg-surface border border-border rounded-lg mb-3 sm:mb-4">
        <div class="p-3 sm:p-4">
          <div class="flex items-center justify-between">
            <!-- Step 1 -->
            <div class="flex items-center flex-1">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 1,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 1,
                  'border-border text-text-secondary bg-transparent': currentStep < 1,
                }"
              >
                <svg v-if="currentStep > 1" class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">1</span>
              </div>
              <div class="hidden sm:block ml-3 flex-1 min-w-0">
                <p class="text-sm font-medium truncate" :class="currentStep >= 1 ? 'text-text-primary' : 'text-text-secondary'">Cuentas</p>
                <p class="text-xs text-text-secondary">Mesas abiertas</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-2 sm:mx-4" :class="currentStep > 1 ? 'bg-secondary' : 'bg-border'" />
            </div>

            <!-- Step 2 -->
            <div class="flex items-center flex-1">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 2,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 2,
                  'border-border text-text-secondary bg-transparent': currentStep < 2,
                }"
              >
                <svg v-if="currentStep > 2" class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">2</span>
              </div>
              <div class="hidden sm:block ml-3 flex-1 min-w-0">
                <p class="text-sm font-medium truncate" :class="currentStep >= 2 ? 'text-text-primary' : 'text-text-secondary'">Efectivo</p>
                <p class="text-xs text-text-secondary">Contar billetes</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-2 sm:mx-4" :class="currentStep > 2 ? 'bg-secondary' : 'bg-border'" />
            </div>

            <!-- Step 3 -->
            <div class="flex items-center flex-1">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 3,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 3,
                  'border-border text-text-secondary bg-transparent': currentStep < 3,
                }"
              >
                <svg v-if="currentStep > 3" class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">3</span>
              </div>
              <div class="hidden sm:block ml-3 flex-1 min-w-0">
                <p class="text-sm font-medium truncate" :class="currentStep >= 3 ? 'text-text-primary' : 'text-text-secondary'">Resumen</p>
                <p class="text-xs text-text-secondary">Revisar totales</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-2 sm:mx-4" :class="currentStep > 3 ? 'bg-secondary' : 'bg-border'" />
            </div>

            <!-- Step 4 -->
            <div class="flex items-center">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 4,
                  'border-border text-text-secondary bg-transparent': currentStep < 4,
                }"
              >
                <span class="font-semibold text-sm sm:text-base">4</span>
              </div>
              <div class="hidden sm:block ml-3 min-w-0">
                <p class="text-sm font-medium truncate" :class="currentStep >= 4 ? 'text-text-primary' : 'text-text-secondary'">Cerrar</p>
                <p class="text-xs text-text-secondary">Confirmar cierre</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Step content ─────────────────────────────────────────────────── -->

      <!-- Step 1: Cuentas abiertas -->
      <div v-if="currentStep === 1" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4">Paso 1 — Cuentas abiertas</h3>
        <div v-if="previewLoading" class="flex justify-center py-10">
          <CommonsTheCustomLoader size="large" />
        </div>
        <template v-else-if="previewData">
          <div v-if="previewData.openTablesCount === 0" class="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 mb-6">
            <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm text-emerald-700">No hay cuentas abiertas. Todo listo para continuar.</span>
          </div>
          <div v-else class="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 mb-6">
            <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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

      <!-- Step 2: Contar efectivo -->
      <div v-else-if="currentStep === 2" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-1">Paso 2 — Contar efectivo</h3>
        <p class="text-xs text-text-secondary mb-5">Cuenta los billetes que tienes en caja:</p>

        <div class="space-y-2 mb-4">
          <div v-for="(denom, idx) in denominations" :key="denom" class="flex items-center gap-3">
            <span class="text-sm text-text-secondary w-24 text-right flex-shrink-0">{{ formatCurrency(denom) }}</span>
            <span class="text-text-tertiary">×</span>
            <input
              :ref="el => setDenomRef(el, idx)"
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

        <div class="border-t border-border pt-4 mb-5 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="font-semibold text-text-primary">Total contado</span>
            <span class="font-bold text-lg text-text-primary">{{ formatCurrency(totalCounted) }}</span>
          </div>
          <div v-if="!revealed">
            <button @click="revealed = true" class="text-xs text-primary hover:underline">
              Ver efectivo esperado →
            </button>
          </div>
          <div v-if="revealed" class="p-3 rounded-lg border" :class="diffResultClass">
            <div class="flex justify-between text-sm mb-1">
              <span>Esperado en caja</span>
              <span class="font-medium">{{ formatCurrency(previewData?.cashExpected) }}</span>
            </div>
            <div class="flex justify-between text-sm font-semibold">
              <span>Diferencia</span>
              <span>{{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}</span>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button @click="currentStep = 1" class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors">
            ← Atrás
          </button>
          <button @click="currentStep = 3" class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Continuar →
          </button>
        </div>
      </div>

      <!-- Step 3: Resumen -->
      <div v-else-if="currentStep === 3" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4">Paso 3 — Resumen del día</h3>

        <div class="bg-background rounded-lg border border-border divide-y divide-border mb-4">
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
            <span class="text-text-secondary">Contado</span>
            <span class="font-medium">{{ formatCurrency(totalCounted) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm font-semibold">
            <span>Diferencia</span>
            <span :class="cashDiff >= 0 ? 'text-emerald-600' : 'text-destructive'">
              {{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}
            </span>
          </div>
        </div>

        <textarea
          v-model="notes"
          placeholder="Notas (opcional)"
          rows="2"
          class="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-4"
        />

        <div class="flex flex-wrap gap-2 mb-5 text-xs">
          <NuxtLink to="/ventas/ordenes" class="text-primary hover:underline">→ Lista de ventas</NuxtLink>
          <NuxtLink to="/finanzas/gastos" class="text-primary hover:underline">→ Gastos del día</NuxtLink>
          <NuxtLink to="/analitica" class="text-primary hover:underline">→ Analítica</NuxtLink>
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

      <!-- Step 4: Confirmar -->
      <div v-else-if="currentStep === 4" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-2">Paso 4 — Cerrar el día</h3>
        <p class="text-sm text-text-secondary mb-5">
          ¿Cerrar el día <strong>{{ formatPeriod(periodStart, periodEnd) }}</strong>?<br />
          <span class="text-xs text-text-tertiary">Esta acción no se puede deshacer.</span>
        </p>

        <div class="bg-background rounded-lg border border-border divide-y divide-border mb-6">
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
            @click="currentStep = 3"
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Cierre Z - Warocol' })

const { currentTenant } = useTenantReactive()
const route = useRoute()

const today       = new Date().toISOString().split('T')[0]
const periodStart = ref((route.query.start as string) || today)
const periodEnd   = ref((route.query.end   as string) || today)

// ── Wizard state ──────────────────────────────────────────────────────────
const currentStep     = ref(1)
const revealed        = ref(false)
const confirmArmed    = ref(false)
const managerOverride = ref(false)
const isSubmitting    = ref(false)
const submitError     = ref<string | null>(null)
const cierreSuccess   = ref(false)
const successData     = ref<Record<string, any> | null>(null)

// ── Denominations ─────────────────────────────────────────────────────────
const denominations = [100000, 50000, 20000, 10000, 5000, 2000, 1000]
const counts = ref<Record<number, string>>(
  Object.fromEntries(denominations.map(d => [d, '0']))
)
const monedasAmount = ref('0')
const notes         = ref('')
const denomRefs     = ref<HTMLInputElement[]>([])

const setDenomRef = (el: any, idx: number) => {
  if (el) denomRefs.value[idx] = el
}

const totalCounted = computed(() =>
  denominations.reduce((sum, d) => sum + d * (parseInt(counts.value[d]) || 0), 0)
  + (parseInt(monedasAmount.value) || 0)
)

// ── Preview data — shared from Cierre X page via useState (no API call here)
const sharedPreview  = useState<Record<string, any> | null>('cierrePreview', () => null)
const previewData    = computed(() => sharedPreview.value)
const previewLoading = computed(() => sharedPreview.value == null)

const cashDiff = computed(() => totalCounted.value - (previewData.value?.cashExpected ?? 0))

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
        managerOverride: managerOverride.value,
      },
    })
    successData.value = result.data
    cierreSuccess.value = true
    clearStorage()
  } catch (err: any) {
    const msg = err?.data?.detail ?? err?.message ?? 'Error al registrar el cierre.'
    submitError.value = msg.includes('superpone') || err?.status === 409
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
    monedasAmount: monedasAmount.value, notes: notes.value,
    periodStart: periodStart.value, periodEnd: periodEnd.value,
    revealed: revealed.value,
  }))
}

const loadFromStorage = () => {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const s = JSON.parse(raw)
    if (s.step)          currentStep.value   = s.step
    if (s.counts)        counts.value        = s.counts
    if (s.monedasAmount) monedasAmount.value = s.monedasAmount
    if (s.notes)         notes.value         = s.notes
    if (s.periodStart)   periodStart.value   = s.periodStart
    if (s.periodEnd)     periodEnd.value     = s.periodEnd
    if (s.revealed)      revealed.value      = s.revealed
  } catch { /* ignore */ }
}

const clearStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

watch([currentStep, counts, monedasAmount, notes, revealed], saveToStorage, { deep: true })

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
