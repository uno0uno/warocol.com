<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Registrando arqueo..."
      hint="Estamos guardando el cierre y consolidando el resumen del periodo."
      variant="glass"
      indicator="matrix"
    />

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="cierreSuccess"
          class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-overlay-backdrop-strong/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cierre-success-title"
        >
          <div class="my-auto w-full max-w-md rounded-2xl border border-border bg-surface p-5 text-center shadow-2xl">
            <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-state-success-bg">
              <svg class="h-7 w-7 text-state-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 id="cierre-success-title" class="text-xl font-bold leading-tight text-text-primary">
              Arqueo registrado
            </h2>
            <p class="mt-1 text-sm text-text-secondary">
              {{ formatPeriod(periodStart, periodEnd) }}
            </p>

            <div class="mt-4 rounded-lg border border-border bg-background p-3 text-left">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-text-secondary">Total ventas</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(successData?.totalSales) }}</span>
              </div>
              <div v-if="hasCapturedTips(successData)" class="mt-2 flex items-center justify-between gap-3 text-sm">
                <span class="text-text-secondary">Total cobrado</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(successData?.totalCharged) }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-3 text-sm">
                <span class="text-text-secondary">Efectivo contado</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(successData?.cashCounted) }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2 text-sm">
                <span class="text-text-secondary">Diferencia</span>
                <span class="font-bold" :class="(successData?.cashDifference ?? 0) >= 0 ? 'text-state-success-text' : 'text-destructive'">
                  {{ (successData?.cashDifference ?? 0) >= 0 ? '+' : '' }}{{ formatCurrency(successData?.cashDifference) }}
                </span>
              </div>
            </div>

            <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
              <NuxtLink
                to="/finanzas/arqueo"
                class="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary"
              >
                Ver historial
              </NuxtLink>
              <NuxtLink
                v-if="successData?.id"
                :to="`/finanzas/arqueo/${successData.id}`"
                class="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-action-primary-bg px-4 py-2.5 text-sm font-semibold text-action-primary-text transition-colors hover:bg-action-primary-hover-bg"
              >
                Ver detalle
              </NuxtLink>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── PASO 0: Seleccionar período ─────────────────────────────────── -->
    <template v-if="currentStep === 0">
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide mb-2">
          <button
            type="button"
            class="h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex-shrink-0"
            :class="arqueoWindowMode === 'template' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-text-secondary hover:border-primary/50'"
            @click="setArqueoMode('template')"
          >Plantilla</button>
          <button
            type="button"
            class="h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex-shrink-0"
            :class="arqueoWindowMode === 'custom' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-text-secondary hover:border-primary/50'"
            @click="setArqueoMode('custom')"
          >Personalizado</button>

          <select
            v-if="arqueoWindowMode === 'template'"
            v-model="selectedTemplateId"
            class="h-10 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 flex-shrink-0 max-w-[11rem] sm:max-w-[13rem]"
          >
            <option value="">Turno...</option>
            <option v-for="t in shiftTemplates" :key="t.id" :value="t.id">
              {{ t.name }} ({{ t.startTime }}-{{ t.endTime }})
            </option>
          </select>

          <button
            type="button"
            class="h-10 px-3 rounded-lg border-2 border-border text-sm text-text-secondary hover:border-primary/50 hover:text-text-primary transition-colors flex-shrink-0 whitespace-nowrap"
            :disabled="suggestedLoading"
            @click="applySuggestedWindow"
          >
            {{ suggestedLoading ? t('finanzas.common.loading') : t('finanzas.arqueo.sinceLast') }}
          </button>

          <p
            v-if="arqueoWindowMode === 'template' && shiftTemplates.length === 0 && !templatesLoading"
            class="text-xs text-state-warning-text whitespace-nowrap flex-shrink-0"
          >
            Sin turnos activos
          </p>
        <div class="h-10 w-px bg-border flex-shrink-0" aria-hidden="true" />

          <button
            v-for="p in visiblePresets" :key="p.key"
            class="h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex-shrink-0"
            :class="activePreset === p.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-text-secondary hover:border-primary/50 hover:text-text-primary'"
            @click="applyPreset(p)"
          >{{ p.label }}</button>

          <!-- Plantilla: un solo control — día (calendario) + horas del turno (solo lectura) -->
          <div
            v-if="arqueoWindowMode === 'template'"
            class="arqueo-template-period relative flex items-center h-10 w-fit rounded-lg border-2 border-border bg-background flex-shrink-0"
          >
            <VueDatePicker
              v-model="templateAnchorDate"
              :teleport="true"
              :enable-time-picker="false"
              :formats="dateOnlyFormats"
              :locale="es"
              auto-apply
              :timezone="timezone"
              :max-date="maxDate"
              :clearable="false"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
              class="arqueo-template-dp-trigger w-fit flex-shrink-0"
              @update:model-value="onTemplateAnchorPick"
            >
              <template #trigger>
                <button
                  type="button"
                  class="flex w-fit items-center gap-1.5 h-10 px-3 text-sm text-text-primary hover:bg-surface-secondary/60 transition-colors rounded-l-md"
                >
                  <svg class="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="font-medium tabular-nums whitespace-nowrap">{{ formatTemplateDateOnly() }}</span>
                </button>
              </template>
            </VueDatePicker>
            <span
              v-if="templateHoursLabel"
              class="flex items-center h-full px-2.5 text-sm font-mono text-text-secondary border-l border-border whitespace-nowrap"
              title="Horario definido por el turno"
            >
              {{ templateHoursLabel }}
            </span>
            <span
              v-else-if="selectedTemplateId && templateWindowStatus === 'pending'"
              class="flex items-center h-full px-2.5 text-xs text-text-secondary border-l border-border"
            >
              ...
            </span>
          </div>

          <div v-else class="w-[28rem] max-w-[min(28rem,calc(100vw-2rem))] flex-shrink-0">
            <VueDatePicker
              v-model="dateRangeDates"
              range
              :teleport="true"
              :preset-dates="dpPresets"
              :enable-time-picker="false"
              :locale="es"
              auto-apply
              :timezone="timezone"
              :max-date="maxDate"
              :formats="dateOnlyFormats"
              input-class-name="dp-custom-input"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
              @update:model-value="activePreset = null"
            />
          </div>

      </div>

      <p v-if="timeError" class="text-xs text-destructive">{{ timeError }}</p>

      <!-- X Preview -->
      <div v-if="xPreviewLoading" class="flex justify-center py-10"><CommonsTheCustomLoader size="large" /></div>
      <template v-else>
        <div v-if="xPreviewError" class="text-sm text-text-secondary py-4 px-2">
          No se pudo cargar el resumen del período. Verifica tu conexión e intenta de nuevo.
        </div>
        <div v-else-if="xPreviewData" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Ventas -->
          <div class="bg-surface border-2 border-border rounded-lg">
            <div class="p-3 border-b border-border"><h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Ventas del período</h3></div>
            <div class="divide-y divide-border">
              <div v-if="customInternalWindowLabel" class="flex justify-between px-4 py-2.5 text-sm">
                <span class="text-text-secondary">Ventana del período</span>
                <span class="font-medium text-text-primary">{{ customInternalWindowLabel }}</span>
              </div>
              <div class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">Total ventas</span><span class="font-bold text-text-primary">{{ formatCurrency(xPreviewData.totalSales) }}</span></div>
              <div v-if="hasCapturedTips(xPreviewData)" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">Propinas</span><span class="font-medium">{{ formatCurrency(xPreviewData.totalTips) }}</span></div>
              <div v-if="(xPreviewData.totalTipTax ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">Impuesto propina</span><span class="font-medium">{{ formatCurrency(xPreviewData.totalTipTax) }}</span></div>
              <div v-if="hasCapturedTips(xPreviewData)" class="flex justify-between px-4 py-2.5 text-sm font-semibold"><span class="text-text-primary">Total cobrado</span><span>{{ formatCurrency(xPreviewData.totalCharged) }}</span></div>
              <div class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">Órdenes</span><span class="font-medium">{{ xPreviewData.itemsSold }}</span></div>
            </div>
          </div>
          <!-- Caja -->
          <div class="bg-surface border-2 border-border rounded-lg">
            <div class="p-3 border-b border-border"><h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Estado de caja</h3></div>
            <div class="divide-y divide-border">
              <div v-if="customInternalWindowLabel" class="flex justify-between px-4 py-2.5 text-sm">
                <span class="text-text-secondary">Ventana del período</span>
                <span class="font-medium text-text-primary">{{ customInternalWindowLabel }}</span>
              </div>
              <div v-if="(xPreviewData.openingCash ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">Fondo inicial</span><span class="font-medium">+ {{ formatCurrency(xPreviewData.openingCash) }}</span></div>
              <div class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">Efectivo recibido</span><span class="font-medium">{{ formatCurrency(xPreviewData.totalCash) }}</span></div>
              <div v-if="(xPreviewData.cashTips ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">Propinas en efectivo</span><span class="font-medium">+ {{ formatCurrency(xPreviewData.cashTips) }}</span></div>
              <div class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">Gastos en efectivo</span><span class="font-medium text-destructive">− {{ formatCurrency(xPreviewData.gastosEfectivo) }}</span></div>
              <div v-if="(xPreviewData.cashPurchases ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">Compras directas efectivo</span><span class="font-medium text-destructive">− {{ formatCurrency(xPreviewData.cashPurchases) }}</span></div>
              <div class="flex justify-between px-4 py-2.5 text-sm font-semibold"><span class="text-text-primary">Esperado en caja</span><span>{{ formatCurrency(xPreviewData.cashExpected) }}</span></div>
              <div class="flex justify-between px-4 py-2.5 text-sm">
                <span class="text-text-secondary">{{ tablePlural }} abiertas</span>
                <span class="font-medium" :class="xPreviewData.openTablesCount > 0 ? 'text-state-warning-text font-semibold' : 'text-text-primary'">{{ xPreviewData.openTablesCount }}</span>
              </div>
            </div>
          </div>
          <!-- Movimiento neto por método -->
          <div v-if="(xPreviewData.breakdown ?? []).length > 0" class="sm:col-span-2 bg-surface border-2 border-border rounded-lg">
            <div class="p-3 border-b border-border"><h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Movimiento neto por método</h3></div>
            <div class="overflow-x-auto">
              <div class="grid min-w-[680px] grid-cols-[1.35fr_.95fr_1fr_1fr_1fr] border-b border-data-table-border bg-data-table-header-bg text-xs font-semibold uppercase tracking-wide text-data-table-header-text">
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Método</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Tipo</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Entró</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Salió</span>
                <span class="px-3 py-2 text-right">Neto</span>
              </div>
              <div
                v-for="(row, index) in (xPreviewData.breakdown ?? [])"
                :key="row.group_slug + row.method_name"
                class="grid min-w-[680px] grid-cols-[1.35fr_.95fr_1fr_1fr_1fr] items-center border-b border-data-table-border text-sm last:border-b-0"
                :class="index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'"
              >
                <span class="min-w-0 truncate border-r border-dashed border-data-table-border/60 px-3 py-2.5 font-semibold text-data-table-cell-text">{{ row.method_name }}</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-data-table-cell-muted">{{ GROUP_LABELS[row.group_slug] ?? row.group_slug }}</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-right text-data-table-cell-text tabular-nums">{{ formatCurrency(rowGrossInflows(row)) }}</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-right tabular-nums" :class="rowOutflows(row) > 0 ? 'text-destructive' : 'text-data-table-cell-muted'">
                  {{ rowOutflows(row) > 0 ? `− ${formatCurrency(rowOutflows(row))}` : formatCurrency(0) }}
                </span>
                <span class="px-3 py-2.5 text-right font-semibold tabular-nums" :class="amountToneClass(rowExpectedAmount(row))">
                  {{ formatCurrency(rowExpectedAmount(row)) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="requiresShiftOpen && !shiftOpenForWindow"
          class="rounded-lg border border-state-warning-border bg-state-warning-bg px-4 py-3 text-sm text-state-warning-text"
        >
          Debes abrir el turno y declarar el fondo de caja antes de cerrar.
          <NuxtLink :to="aperturaLink" class="font-semibold underline ml-1">Abrir turno</NuxtLink>
        </div>

        <!-- CTA — always visible once not loading -->
        <div class="flex gap-3">
          <button
            @click="goToStep1"
            class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            :disabled="requiresShiftOpen && !shiftOpenForWindow"
          >
            Continuar al cierre →
          </button>
        </div>
      </template>
    </template>

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
            {{ [t('finanzas.arqueo.accounts'),t('finanzas.common.cash'),'Otros métodos','Resumen',t('finanzas.common.close')][currentStep - 1] }}
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

      <!-- Step 1: Cuentas abiertas (bloqueador — solo visible si hay mesas abiertas) -->
      <div v-if="currentStep === 1" class="bg-surface border-2 border-state-warning-border rounded-lg p-3 sm:p-4">
        <div v-if="previewLoading" class="flex justify-center py-6">
          <CommonsTheCustomLoader size="large" />
        </div>
        <div v-else-if="previewData" class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-state-warning-bg border border-state-warning-border flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-state-warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-state-warning-text">
              {{ previewData.openTablesCount }} {{ previewData.openTablesCount === 1 ? tableSingular.toLowerCase() : tablePlural.toLowerCase() }} con cuenta abierta
            </p>
            <p class="text-xs text-state-warning-text/90 mt-0.5">Cierra todas las {{ tablePlural.toLowerCase() }} en el POS antes de registrar el arqueo.</p>
            <div class="flex flex-wrap gap-2 mt-3">
              <NuxtLink
                to="/pos"
                target="_blank"
                class="inline-flex items-center gap-1.5 min-h-[36px] px-4 py-1.5 rounded-lg bg-action-warning-bg text-action-warning-text text-xs font-semibold hover:bg-action-warning-hover-bg transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Ir al POS
              </NuxtLink>
              <button
                @click="refetchPreview()"
                class="inline-flex items-center gap-1.5 min-h-[36px] px-4 py-1.5 rounded-lg border border-state-warning-border bg-state-warning-bg text-state-warning-text text-xs font-medium hover:bg-state-warning-bg/80 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Verificar de nuevo
              </button>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-text-secondary py-2">No se pudo cargar el estado de las {{ tablePlural.toLowerCase() }}.</div>
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
                :class="parseMoneyInput(monedasAmount) > 0 ? 'bg-primary/5' : ''"
              >
                <span
                  class="text-sm w-24 text-right flex-shrink-0 transition-colors"
                  :class="parseMoneyInput(monedasAmount) > 0 ? 'font-semibold text-text-primary' : 'text-text-secondary'"
                >Monedas</span>
                <span class="text-transparent text-xs flex-shrink-0">×</span>
                <input
                  v-model="monedasAmount"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  @input="monedasAmount = formatMoneyInput($event)"
                  placeholder="0"
                  class="w-14 px-2 py-1 rounded-md border text-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  :class="parseMoneyInput(monedasAmount) > 0
                    ? 'border-primary/50 bg-primary/5 font-semibold'
                    : 'border-border bg-surface'"
                  aria-label="Monto total en monedas"
                />
                <span class="text-text-tertiary text-xs flex-shrink-0">=</span>
                <span
                  class="text-sm flex-1 text-right transition-colors"
                  :class="parseMoneyInput(monedasAmount) > 0 ? 'font-semibold text-text-primary' : 'text-text-tertiary'"
                >{{ formatCurrency(parseMoneyInput(monedasAmount)) }}</span>
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
                    :class="parseMoneyInput(monedasAmount) > 0 ? 'font-medium text-text-primary' : 'text-text-tertiary'"
                  >Monedas</span>
                  <span
                    class="text-xs"
                    :class="parseMoneyInput(monedasAmount) > 0 ? 'font-semibold text-text-primary' : 'text-text-tertiary'"
                  >{{ formatCurrency(parseMoneyInput(monedasAmount)) }}</span>
                </div>
              </div>
              <!-- Total row — accent strip -->
              <div class="px-3 py-2.5 bg-primary/10 border-t-2 border-primary/20 flex items-center justify-between">
                <span class="text-sm font-semibold text-primary">Total contado</span>
                <span class="text-base font-bold text-primary">{{ formatCurrency(totalCounted) }}</span>
              </div>
            </div>

            <div v-if="previewLoading" class="rounded-lg border border-border bg-background overflow-hidden">
              <div class="px-3 py-2 bg-surface border-b border-border">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Calculando caja</span>
              </div>
              <div class="divide-y divide-border animate-pulse">
                <div v-for="row in 3" :key="row" class="flex items-center justify-between px-3 py-2.5">
                  <span class="h-3 w-28 rounded bg-surface-secondary" />
                  <span class="h-3 w-20 rounded bg-surface-secondary" />
                </div>
              </div>
            </div>
            <!-- Diferencia — card con icono y monto grande -->
            <div v-else class="rounded-lg border-2 overflow-hidden" :class="diffResultClass">
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
          <button
            @click="currentStep = 3"
            :disabled="previewBusy"
            class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <svg v-if="previewBusy" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ previewBusy ? t('finanzas.common.updating') : t('finanzas.arqueo.continue') }}</span>
          </button>
        </div>
      </div>

      <!-- Step 3: Otros métodos -->
      <div v-else-if="currentStep === 3" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-semibold text-text-primary mb-1">Otros métodos de pago</h3>
        <p class="text-xs text-text-secondary mb-3">Ingresa el monto contado para cada método:</p>

        <div v-if="previewLoading" class="mb-3 overflow-x-auto rounded-lg border border-border bg-background">
          <div class="grid min-w-[620px] grid-cols-[1.2fr_.85fr_1fr_1fr_1fr] border-b border-data-table-border bg-data-table-header-bg text-xs font-semibold uppercase tracking-wide text-data-table-header-text">
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Método</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Tipo</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Neto</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Contado</span>
            <span class="px-3 py-2 text-right">Diferencia</span>
          </div>
          <div class="animate-pulse">
            <div
              v-for="row in 4"
              :key="row"
              class="grid min-w-[620px] grid-cols-[1.2fr_.85fr_1fr_1fr_1fr] border-b border-data-table-border last:border-b-0"
              :class="row % 2 === 0 ? 'bg-data-table-row-alt-bg' : 'bg-data-table-row-bg'"
            >
              <span class="border-r border-dashed border-data-table-border/60 px-3 py-3"><span class="block h-3 w-28 rounded bg-surface-secondary" /></span>
              <span class="border-r border-dashed border-data-table-border/60 px-3 py-3"><span class="block h-3 w-16 rounded bg-surface-secondary" /></span>
              <span class="border-r border-dashed border-data-table-border/60 px-3 py-3"><span class="ml-auto block h-3 w-20 rounded bg-surface-secondary" /></span>
              <span class="border-r border-dashed border-data-table-border/60 px-3 py-3"><span class="ml-auto block h-7 w-24 rounded bg-surface-secondary" /></span>
              <span class="px-3 py-3"><span class="ml-auto block h-3 w-16 rounded bg-surface-secondary" /></span>
            </div>
          </div>
        </div>
        <div v-else-if="nonCashMethods.length > 0" class="mb-3 overflow-x-auto rounded-lg border border-border bg-background">
          <div class="grid min-w-[820px] grid-cols-[1.2fr_.85fr_1fr_1fr_1fr_1fr] border-b border-data-table-border bg-data-table-header-bg text-xs font-semibold uppercase tracking-wide text-data-table-header-text">
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Método</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Tipo</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Entró</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Salió</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Neto</span>
            <span class="px-3 py-2 text-right">Contado</span>
          </div>
          <div
            v-for="(method, index) in nonCashMethods"
            :key="method.key"
            class="grid min-w-[820px] grid-cols-[1.2fr_.85fr_1fr_1fr_1fr_1fr] items-center border-b border-data-table-border text-sm last:border-b-0"
            :class="index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'"
          >
            <span class="min-w-0 truncate border-r border-dashed border-data-table-border/60 px-3 py-2.5 font-medium text-data-table-cell-text">{{ method.label }}</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-data-table-cell-muted">{{ method.groupLabel }}</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-right font-medium text-data-table-cell-text tabular-nums">{{ formatCurrency(method.grossInflowsAmount) }}</span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-right font-medium tabular-nums" :class="method.expenseOutflowsAmount + method.purchaseOutflowsAmount > 0 ? 'text-destructive' : 'text-data-table-cell-muted'">
              {{ method.expenseOutflowsAmount + method.purchaseOutflowsAmount > 0 ? `− ${formatCurrency(method.expenseOutflowsAmount + method.purchaseOutflowsAmount)}` : '—' }}
            </span>
            <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-right font-semibold tabular-nums" :class="amountToneClass(method.expectedAmount)">{{ formatCurrency(method.expectedAmount) }}</span>
            <div class="px-3 py-2 text-right">
              <input
                v-model="methodAmounts[method.key]"
                type="text"
                inputmode="numeric"
                pattern="-?[0-9]*"
                @input="methodAmounts[method.key] = formatSignedMoneyInput($event)"
                placeholder="0"
                class="ml-auto h-8 w-28 rounded-md border px-2 text-right text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                :class="hasMethodAmount(method)
                  ? 'border-border bg-surface font-semibold'
                  : 'border-border bg-background'"
                :aria-label="`Monto contado para ${method.label}`"
              />
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
          <button
            @click="currentStep = 4"
            :disabled="previewBusy"
            class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <svg v-if="previewBusy" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{{ previewBusy ? t('finanzas.common.updating') : t('finanzas.arqueo.continue') }}</span>
          </button>
        </div>
      </div>

      <!-- Step 4: Resumen -->
      <div v-else-if="currentStep === 4" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-semibold text-text-primary mb-3">Resumen del día</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">

          <!-- Ventas -->
          <div class="bg-background rounded-lg border border-border overflow-hidden">
            <div class="px-3 py-2 bg-surface border-b border-border">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Ventas</span>
            </div>
            <div class="divide-y divide-border">
              <div class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Período</span>
                <span class="font-medium text-text-primary">{{ formatPeriod(periodStart, periodEnd) }}</span>
              </div>
              <div class="flex justify-between items-center px-3 py-2.5">
                <span class="text-xs text-text-secondary">Total ventas</span>
                <span class="text-base font-bold text-text-primary">{{ formatCurrency(previewData?.totalSales) }}</span>
              </div>
              <div v-if="hasCapturedTips(previewData)" class="flex justify-between items-center px-3 py-2.5">
                <span class="text-xs text-text-secondary">Propinas</span>
                <span class="text-sm font-medium text-text-primary">{{ formatCurrency(previewData?.totalTips) }}</span>
              </div>
              <div v-if="(previewData?.totalTipTax ?? 0) > 0" class="flex justify-between items-center px-3 py-2.5">
                <span class="text-xs text-text-secondary">Impuesto propina</span>
                <span class="text-sm font-medium text-text-primary">{{ formatCurrency(previewData?.totalTipTax) }}</span>
              </div>
              <div v-if="hasCapturedTips(previewData)" class="flex justify-between items-center px-3 py-2.5">
                <span class="text-xs font-semibold text-text-primary">Total cobrado</span>
                <span class="text-sm font-bold text-text-primary">{{ formatCurrency(previewData?.totalCharged) }}</span>
              </div>
            </div>
          </div>

          <!-- Caja -->
          <div class="bg-background rounded-lg border border-border overflow-hidden">
            <div class="px-3 py-2 bg-surface border-b border-border">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Efectivo</span>
            </div>
            <div class="divide-y divide-border">
              <div v-if="(previewData?.openingCash ?? 0) > 0" class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Fondo inicial</span>
                <span class="font-medium text-text-primary">+ {{ formatCurrency(previewData?.openingCash) }}</span>
              </div>
              <div class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Recibido</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(previewData?.totalCash) }}</span>
              </div>
              <div v-if="(previewData?.cashTips ?? 0) > 0" class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Propinas en efectivo</span>
                <span class="font-medium text-text-primary">+ {{ formatCurrency(previewData?.cashTips) }}</span>
              </div>
              <div class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Gastos</span>
                <span class="font-medium text-destructive">− {{ formatCurrency(previewData?.gastosEfectivo) }}</span>
              </div>
              <div v-if="(previewData?.cashPurchases ?? 0) > 0" class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Compras directas</span>
                <span class="font-medium text-destructive">− {{ formatCurrency(previewData?.cashPurchases) }}</span>
              </div>
              <div class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Esperado</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(previewData?.cashExpected) }}</span>
              </div>
              <div class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Contado</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(totalCounted) }}</span>
              </div>
            </div>
            <!-- Diferencia — accent row -->
            <div
              class="px-3 py-2.5 border-t-2 flex items-center justify-between"
              :class="cashDiff >= 0 ? 'bg-state-success-bg border-state-success-border' : 'bg-destructive/5 border-destructive/20'"
            >
              <div class="flex items-center gap-1.5">
                <svg v-if="cashDiff >= 0" class="w-3.5 h-3.5 text-state-success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="w-3.5 h-3.5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span class="text-xs font-semibold" :class="cashDiff >= 0 ? 'text-state-success-text' : 'text-destructive'">Diferencia</span>
              </div>
              <span class="text-sm font-bold" :class="cashDiff >= 0 ? 'text-state-success-text' : 'text-destructive'">
                {{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}
              </span>
            </div>
          </div>

          <!-- Otros métodos (span full si hay) -->
          <div v-if="nonCashMethods.length > 0" class="sm:col-span-2 bg-background rounded-lg border border-border overflow-hidden">
            <div class="px-3 py-2 bg-surface border-b border-border">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Otros métodos</span>
            </div>
            <div class="overflow-x-auto">
              <div class="grid min-w-[760px] grid-cols-[1.2fr_.85fr_1fr_1fr_1fr] border-b border-data-table-border bg-data-table-header-bg text-xs font-semibold uppercase tracking-wide text-data-table-header-text">
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Método</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Tipo</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Esperado</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Reportado</span>
                <span class="px-3 py-2 text-right">Diferencia</span>
              </div>
              <div
                v-for="(method, index) in nonCashMethods"
                :key="method.key"
                class="grid min-w-[760px] grid-cols-[1.2fr_.85fr_1fr_1fr_1fr] border-b border-data-table-border text-sm last:border-b-0"
                :class="index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'"
              >
                <span class="min-w-0 truncate border-r border-dashed border-data-table-border/60 px-3 py-2.5 font-medium text-data-table-cell-text">{{ method.label }}</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-data-table-cell-muted">{{ method.groupLabel }}</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-right font-medium text-data-table-cell-text tabular-nums">{{ formatCurrency(method.expectedAmount) }}</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-right font-semibold tabular-nums" :class="hasMethodAmount(method) ? 'text-data-table-cell-text' : 'text-text-tertiary'">
                  {{ hasMethodAmount(method) ? formatCurrency(methodAmountValue(method)) : 'Sin ingresar' }}
                </span>
                <span class="px-3 py-2.5 text-right font-semibold tabular-nums" :class="hasMethodAmount(method) ? amountToneClass(methodDiff(method)) : 'text-text-tertiary'">
                  {{ hasMethodAmount(method) ? `${methodDiff(method) >= 0 ? '+' : ''}${formatCurrency(methodDiff(method))}` : '—' }}
                </span>
              </div>
            </div>
          </div>

        </div>

        <!-- Notas -->
        <div class="mb-3">
          <label class="text-xs font-medium text-text-secondary block mb-1">Notas <span class="font-normal">(opcional)</span></label>
          <textarea
            v-model="notes"
            placeholder="Ej: Se cerró tarde por evento especial…"
            rows="2"
            class="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <!-- Quick links -->
        <div class="flex flex-wrap gap-2 mb-3">
          <NuxtLink
            to="/ventas/ordenes" target="_blank"
            class="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-background border border-border text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Lista de ventas
          </NuxtLink>
          <NuxtLink
            to="/finanzas/gastos" target="_blank"
            class="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-background border border-border text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Gastos del día
          </NuxtLink>
          <NuxtLink
            to="/analitica" target="_blank"
            class="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-background border border-border text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Analítica
          </NuxtLink>
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

        <!-- Resumen compacto de lo que se va a cerrar -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <!-- Período -->
          <div class="bg-background rounded-lg border border-border px-3 py-2.5">
            <p class="text-xs text-text-secondary mb-0.5">{{ cierreWindowSummary.title }}</p>
            <p class="text-sm font-semibold text-text-primary">{{ cierreWindowSummary.period }}</p>
            <p v-if="cierreWindowSummary.detail" class="text-xs text-text-secondary mt-0.5">{{ cierreWindowSummary.detail }}</p>
          </div>
          <!-- Total ventas -->
          <div class="bg-background rounded-lg border border-border px-3 py-2.5">
            <p class="text-xs text-text-secondary mb-0.5">Total ventas</p>
            <p class="text-base font-bold text-text-primary">{{ formatCurrency(previewData?.totalSales ?? 0) }}</p>
          </div>
          <!-- Diferencia caja -->
          <div
            class="rounded-lg border-2 px-3 py-2.5"
            :class="cashDiff >= 0 ? 'bg-state-success-bg border-state-success-border' : 'bg-destructive/5 border-destructive/20'"
          >
            <p class="text-xs mb-0.5" :class="cashDiff >= 0 ? 'text-state-success-text' : 'text-destructive'">Diferencia caja</p>
            <p class="text-base font-bold" :class="cashDiff >= 0 ? 'text-state-success-text' : 'text-destructive'">
              {{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <div class="bg-background rounded-lg border border-border overflow-hidden">
            <div class="px-3 py-2 bg-surface border-b border-border">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Detalle de caja</span>
            </div>
            <div class="divide-y divide-border">
              <div v-if="(previewData?.openingCash ?? 0) > 0" class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Fondo inicial</span>
                <span class="font-medium text-text-primary">+ {{ formatCurrency(previewData?.openingCash) }}</span>
              </div>
              <div class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Efectivo recibido</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(previewData?.totalCash) }}</span>
              </div>
              <div class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Gastos efectivo</span>
                <span class="font-medium text-destructive">− {{ formatCurrency(previewData?.gastosEfectivo) }}</span>
              </div>
              <div v-if="(previewData?.cashPurchases ?? 0) > 0" class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Compras directas efectivo</span>
                <span class="font-medium text-destructive">− {{ formatCurrency(previewData?.cashPurchases) }}</span>
              </div>
              <div class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Esperado en caja</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(previewData?.cashExpected) }}</span>
              </div>
              <div class="flex justify-between px-3 py-2 text-xs">
                <span class="text-text-secondary">Contado</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(totalCounted) }}</span>
              </div>
            </div>
          </div>

          <div v-if="nonCashMethods.length > 0" class="bg-background rounded-lg border border-border overflow-hidden lg:col-span-1">
            <div class="px-3 py-2 bg-surface border-b border-border">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Detalle de otros métodos</span>
            </div>
            <div class="overflow-x-auto">
              <div class="grid min-w-[620px] grid-cols-[1.15fr_.8fr_1fr_1fr] border-b border-data-table-border bg-data-table-header-bg text-xs font-semibold uppercase tracking-wide text-data-table-header-text">
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Método</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">Tipo</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">Esperado</span>
                <span class="px-3 py-2 text-right">Reportado</span>
              </div>
              <div
                v-for="(method, index) in nonCashMethods"
                :key="method.key"
                class="grid min-w-[620px] grid-cols-[1.15fr_.8fr_1fr_1fr] border-b border-data-table-border text-sm last:border-b-0"
                :class="index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'"
              >
                <span class="min-w-0 truncate border-r border-dashed border-data-table-border/60 px-3 py-2.5 font-medium text-data-table-cell-text">{{ method.label }}</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-data-table-cell-muted">{{ method.groupLabel }}</span>
                <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-right font-medium text-data-table-cell-text tabular-nums">{{ formatCurrency(method.expectedAmount) }}</span>
                <span class="px-3 py-2.5 text-right font-semibold tabular-nums" :class="hasMethodAmount(method) ? 'text-data-table-cell-text' : 'text-text-tertiary'">
                  {{ hasMethodAmount(method) ? formatCurrency(methodAmountValue(method)) : 'Sin ingresar' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Efectivo que queda en caja -->
        <div class="bg-background rounded-lg border border-border p-3 mb-3">
          <label class="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Efectivo que queda en caja
          </label>
          <p class="text-xs text-text-secondary mt-0.5 mb-2">
            Declara cuánto efectivo dejas en el cajón para el próximo turno (fondo para cambio).
          </p>
          <input
            v-model="cashLeftInDrawer"
            type="text"
            inputmode="numeric"
            class="w-full max-w-xs h-10 px-3 rounded-lg border-2 border-border bg-surface text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            @input="cashLeftInDrawer = formatMoneyInput($event)"
          />
        </div>

        <!-- Banner de advertencia irreversible -->
        <div class="flex items-start gap-3 p-3 rounded-lg border mb-3 transition-colors"
          :class="confirmArmed
            ? 'bg-destructive/10 border-destructive/30'
            : 'bg-state-warning-bg border-state-warning-border'"
        >
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5 transition-colors"
            :class="confirmArmed ? 'text-destructive' : 'text-state-warning-icon'"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="text-sm font-semibold transition-colors" :class="confirmArmed ? 'text-destructive' : 'text-state-warning-text'">
              {{ confirmArmed ? t('finanzas.arqueo.confirmClose') : 'Esta acción no se puede deshacer' }}
            </p>
            <p class="text-xs mt-0.5 transition-colors" :class="confirmArmed ? 'text-destructive/80' : 'text-state-warning-text/90'">
              El cierre Z quedará registrado y el período se bloqueará.
            </p>
          </div>
        </div>

        <!-- Error de submit -->
        <div v-if="submitError" class="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-3">
          <svg class="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="text-sm text-destructive">{{ submitError }}</p>
        </div>

        <div class="flex gap-3">
          <button
            @click="currentStep = 4"
            :disabled="isSubmitting"
            class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Atrás
          </button>
          <button
            @click="handleConfirmButton"
            :disabled="isSubmitting"
            class="min-h-[44px] px-6 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            :class="confirmArmed
              ? 'bg-action-destructive-bg text-action-destructive-text hover:bg-action-destructive-hover-bg ring-2 ring-action-destructive-focus-ring/30'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'"
          >
            <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <svg v-else-if="confirmArmed" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span v-if="isSubmitting">Cerrando...</span>
            <span v-else-if="confirmArmed">¿Confirmar arqueo?</span>
            <span v-else>Cerrar el día</span>
          </button>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { ref, computed, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { es } from 'date-fns/locale'
import { formatDistanceStrict } from 'date-fns'
import { buildCierreWindowBody, buildCierreWindowParams, isShiftOpen } from '~/composables/useCierreShiftWindow'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
useHead({ title: () => t('finanzas.head.z') })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const cache = useQueryCache()
const { singular: tableSingular, plural: tablePlural } = useTableLabel()
const route = useRoute()
const {
  addDaysISO,
  combineDateAndTimeISO,
  dateAtNoon,
  isoFromDate,
  timezone,
  timeHHMMFromISO,
  todayISO,
  zonedParts,
} = useTenantTimezone()

type ArqueoWindowMode = 'template' | 'custom'
interface ShiftTemplateOption {
  id: string
  name: string
  startTime: string
  endTime: string
  crossesMidnight: boolean
}

const arqueoWindowMode = ref<ArqueoWindowMode>(
  (route.query.mode as string) === 'template' ? 'template' : 'custom',
)
const initTemplate = (route.query.template as string) || ''
const selectedTemplateId = ref<string>(initTemplate)
const suggestedLoading = ref(false)

const today = todayISO()
const maxDate = computed(() => dateAtNoon(todayISO()))
const formatIsoDateLong = (iso: string) => {
  const [year, month, day] = iso.split('-')
  return year && month && day ? `${day}/${month}/${year}` : iso
}

// ── Date picker state (paso 0) ─────────────────────────────────────────────
const initStart = (route.query.start as string) || today
const initEnd = arqueoWindowMode.value === 'template'
  ? initStart
  : ((route.query.end as string) || today)

const dateRangeDates = ref<Date[]>([
  dateAtNoon(initStart),
  dateAtNoon(initEnd),
])

interface Preset { key: string; label: string; start: Date; end: Date }
const buildPresets = (): Preset[] => {
  const todayNoon = dateAtNoon(today)
  const yesterdayNoon = dateAtNoon(addDaysISO(today, -1))
  const weekStartNoon = dateAtNoon(addDaysISO(today, -6))
  const [y, m] = today.split('-').map(Number)
  const monthStartNoon = dateAtNoon(`${y}-${String(m).padStart(2, '0')}-01`)
  return [
    { key: 'today',     label: 'Hoy',           start: todayNoon,           end: todayNoon },
    { key: 'yesterday', label: t('finanzas.common.yesterday'),           start: yesterdayNoon,       end: yesterdayNoon },
    { key: 'week',      label: 'Últimos 7 días', start: weekStartNoon,       end: todayNoon },
    { key: 'month',     label: 'Este mes',        start: monthStartNoon,      end: todayNoon },
  ]
}
const presets      = buildPresets()
const visiblePresets = computed(() =>
  arqueoWindowMode.value === 'template'
    ? presets.filter(p => p.key === 'today' || p.key === 'yesterday')
    : presets,
)
const activePreset = ref<string | null>(initStart === today && initEnd === today ? 'today' : null)
const dpPresets    = presets.map(p => ({ label: p.label, value: [p.start, p.end] }))

const applyPreset = (p: Preset) => {
  activePreset.value = p.key
  const anchor = p.start
  if (arqueoWindowMode.value === 'template') {
    dateRangeDates.value = [anchor, anchor]
  } else {
    dateRangeDates.value = [anchor, p.end]
  }
}

/** Vue Datepicker v12 — sin componente de hora en el input */
const dateOnlyFormats = { input: 'dd/MM/yyyy', preview: 'dd/MM/yyyy' }

const formatDateRange = (dates: Date[]) => {
  if (!dates?.[0]) return ''
  const from = formatIsoDateLong(isoFromDate(dates[0]))
  if (!dates[1]) return from
  const to = formatIsoDateLong(isoFromDate(dates[1]))
  if (from === to) return from
  return `${from} – ${to}`
}

// Time inputs
const initStartTimeQ = (route.query.startTime as string) || ''
const initEndTimeQ = (route.query.endTime as string) || ''
const enableTimePicker = ref(!!initStartTimeQ || !!(route.query.startTime))
const startTimeInput   = ref<string>(initStartTimeQ)
const endTimeInput     = ref<string>(initEndTimeQ)
const timeError        = ref<string | null>(null)

const DEFAULT_CUSTOM_START_TIME = '00:00'
const DEFAULT_CUSTOM_END_TIME = '23:59'
const ensureCustomTimeDefaults = () => {
  if (!startTimeInput.value) startTimeInput.value = DEFAULT_CUSTOM_START_TIME
  if (!endTimeInput.value) endTimeInput.value = DEFAULT_CUSTOM_END_TIME
}
if (enableTimePicker.value && arqueoWindowMode.value === 'custom') {
  ensureCustomTimeDefaults()
}

// Period computed from date picker (Bogotá calendar day for API)
const periodStart = computed(() => isoFromDate(dateRangeDates.value[0]))
const periodEnd   = computed(() => isoFromDate(dateRangeDates.value[1] ?? dateRangeDates.value[0]))
const isMultiDay  = computed(() => periodStart.value !== periodEnd.value)

const previewShiftTemplateId = computed(() =>
  arqueoWindowMode.value === 'template' && selectedTemplateId.value
    ? selectedTemplateId.value
    : null,
)

watch(isMultiDay, (multi) => {
  if (multi && arqueoWindowMode.value === 'custom') {
    enableTimePicker.value = true
    ensureCustomTimeDefaults()
  }
})

watch(dateRangeDates, (dates) => {
  if (arqueoWindowMode.value !== 'template' || !dates?.[0] || !dates?.[1]) return
  const a = isoFromDate(dates[0])
  const b = isoFromDate(dates[1])
  if (a !== b) dateRangeDates.value = [dates[0], dates[0]]
}, { deep: true })

const setArqueoMode = (mode: ArqueoWindowMode) => {
  arqueoWindowMode.value = mode
  timeError.value = null
  if (mode === 'template') {
    const d = dateRangeDates.value[0] ?? dateAtNoon(todayISO())
    dateRangeDates.value = [d, d]
    enableTimePicker.value = false
    startTimeInput.value = ''
    endTimeInput.value = ''
  }
}

const { data: rawShiftTemplates, status: templatesStatus } = useQuery({
  key: () => ['cierre', 'shift-templates', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: ShiftTemplateOption[] }>('/api/cierre/shift-templates'),
  enabled: () => !!currentTenant.value,
  staleTime: 120_000,
})
const shiftTemplates = computed(() => rawShiftTemplates.value?.data ?? [])
const templatesLoading = computed(() => templatesStatus.value === 'pending')

const templateAnchorDate = computed({
  get: () => dateRangeDates.value[0] ?? dateAtNoon(todayISO()),
  set: (d: Date) => {
    if (!d) return
    dateRangeDates.value = [d, d]
  },
})

const { data: rawTemplateWindow, status: templateWindowStatus } = useQuery({
  key: () => ['cierre', 'shift-window', currentTenant.value?.id, selectedTemplateId.value, periodStart.value],
  query: () => $fetch<{
    success: boolean
    data: { periodStartTime: string; periodEndTime: string; crossesMidnight?: boolean }
  }>('/api/cierre/shift-window', {
    params: { shift_template_id: selectedTemplateId.value, date: periodStart.value },
  }),
  enabled: () =>
    !!currentTenant.value
    && arqueoWindowMode.value === 'template'
    && !!selectedTemplateId.value,
  staleTime: 30_000,
})

const formatTemplateDateOnly = (date?: Date) =>
  formatIsoDateLong(isoFromDate(date ?? templateAnchorDate.value))

/** Horas del turno resueltas en servidor — no editables en plantilla */
const templateHoursLabel = computed(() => {
  const w = rawTemplateWindow.value?.data
  if (!w?.periodStartTime || !w?.periodEndTime) return null
  const startParts = zonedParts(new Date(w.periodStartTime))
  const endParts = zonedParts(new Date(w.periodEndTime))
  const startT = timeHHMMFromISO(w.periodStartTime)
  const endT = timeHHMMFromISO(w.periodEndTime)
  const endDay = `${endParts.day}/${endParts.month}`
  const anchorDay = `${startParts.day}/${startParts.month}`
  if (anchorDay === endDay) return `${startT} – ${endT}`
  return `${startT} – ${endDay} ${endT}`
})

const onTemplateAnchorPick = () => {
  const anchor = isoFromDate(templateAnchorDate.value)
  if (anchor === today) activePreset.value = 'today'
  else if (anchor === addDaysISO(today, -1)) activePreset.value = 'yesterday'
  else activePreset.value = null
}

const applySuggestedWindow = async () => {
  suggestedLoading.value = true
  timeError.value = null
  try {
    const res = await $fetch<{ success: boolean; data: {
      periodStart: string
      periodEnd: string
      periodStartTime: string
      periodEndTime: string
    } }>('/api/cierre/suggested-window', { params: { date: periodStart.value } })
    const d = res.data
    if (arqueoWindowMode.value === 'template') {
      const anchor = dateAtNoon(d.periodStart)
      dateRangeDates.value = [anchor, anchor]
    } else {
      dateRangeDates.value = [
        dateAtNoon(d.periodStart),
        dateAtNoon(d.periodEnd),
      ]
      enableTimePicker.value = true
      startTimeInput.value = timeHHMMFromISO(d.periodStartTime)
      endTimeInput.value = timeHHMMFromISO(d.periodEndTime)
    }
    activePreset.value = null
  } catch (err: any) {
    timeError.value = err?.data?.detail ?? err?.data?.message ?? 'No hay ventana sugerida desde el último arqueo.'
  } finally {
    suggestedLoading.value = false
  }
}

const periodStartTime = computed((): string | null => {
  if (arqueoWindowMode.value === 'template') return null
  if (!enableTimePicker.value) return null
  return combineDateAndTimeISO(periodStart.value, startTimeInput.value)
})
const periodEndTime = computed((): string | null => {
  if (arqueoWindowMode.value === 'template') return null
  if (!enableTimePicker.value) return null
  return combineDateAndTimeISO(periodEnd.value, endTimeInput.value)
})

const shiftWindowParams = computed(() =>
  buildCierreWindowParams({
    periodStart: periodStart.value,
    periodEnd: periodEnd.value,
    shiftTemplateId: previewShiftTemplateId.value,
    periodStartTime: periodStartTime.value,
    periodEndTime: periodEndTime.value,
  }),
)

const cierreWindowBody = computed(() =>
  buildCierreWindowBody({
    periodStart: periodStart.value,
    periodEnd: periodEnd.value,
    shiftTemplateId: previewShiftTemplateId.value,
    periodStartTime: periodStartTime.value,
    periodEndTime: periodEndTime.value,
  }),
)

const buildPreviewParams = (completedOnly: boolean) => {
  const base: Record<string, string | boolean> = { ...shiftWindowParams.value }
  if (completedOnly) base.completed_only = true
  return base
}

const requiresShiftOpen = computed(() => arqueoWindowMode.value === 'template' || arqueoWindowMode.value === 'custom')

const { data: rawShiftStatus } = useQuery({
  key: () => ['cierre', 'shift-status', currentTenant.value?.id, arqueoWindowMode.value, JSON.stringify(shiftWindowParams.value)],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/shift-status', {
    params: shiftWindowParams.value,
  }),
  enabled: () =>
    !!currentTenant.value
    && requiresShiftOpen.value
    && (arqueoWindowMode.value !== 'template' || !!selectedTemplateId.value),
  staleTime: 0,
})

const shiftOpenForWindow = computed(() => isShiftOpen(rawShiftStatus.value?.data))

const aperturaLink = computed(() => {
  if (arqueoWindowMode.value === 'template') {
    const q = new URLSearchParams({ start: periodStart.value })
    if (selectedTemplateId.value) q.set('template', selectedTemplateId.value)
    return `/finanzas/arqueo/apertura?${q.toString()}`
  }
  const q = new URLSearchParams({
    mode: 'custom',
    start: periodStart.value,
    end: periodEnd.value,
  })
  if (enableTimePicker.value && startTimeInput.value) q.set('startTime', startTimeInput.value)
  if (enableTimePicker.value && endTimeInput.value) q.set('endTime', endTimeInput.value)
  return `/finanzas/arqueo/apertura?${q.toString()}`
})

const customInternalWindowLabel = computed(() => {
  if (arqueoWindowMode.value !== 'custom' || !enableTimePicker.value) return null
  if (!enableTimePicker.value) return null
  const startIso = periodStartTime.value
  const endIso = periodEndTime.value
  if (!startIso || !endIso) return null
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (s >= e) return null
  const hours = `${timeHHMMFromISO(startIso)} – ${timeHHMMFromISO(endIso)}`
  try {
    return `${hours} · ${formatDistanceStrict(s, e, { locale: es })}`
  } catch {
    return hours
  }
})

// X preview (paso 0 — all orders, not completed_only)
const { data: rawXPreview, status: xPreviewStatus, error: xPreviewError } = useQuery({
  key: () => ['cierre', 'preview-x0', currentTenant.value?.id, arqueoWindowMode.value, previewShiftTemplateId.value, periodStart.value, periodEnd.value, periodStartTime.value, periodEndTime.value],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/preview', {
    params: buildPreviewParams(false),
  }),
  enabled: () => !!currentTenant.value && (arqueoWindowMode.value !== 'template' || !!selectedTemplateId.value),
  staleTime: 60_000,
})
const xPreviewData    = computed(() => rawXPreview.value?.data ?? null)
const xPreviewLoading = computed(() => xPreviewStatus.value === 'pending' && !xPreviewData.value)

// Navigate to step 1
const goToStep1 = () => {
  timeError.value = null
  if (arqueoWindowMode.value === 'template') {
    if (!selectedTemplateId.value) {
      timeError.value = 'Selecciona un turno para continuar'
      return
    }
    if (isMultiDay.value) {
      timeError.value = 'La plantilla de turno solo aplica a un solo día'
      return
    }
  } else if (isMultiDay.value && (!startTimeInput.value || !endTimeInput.value)) {
    timeError.value = 'Para períodos de varios días debes especificar hora de inicio y fin'
    return
  }
  if (requiresShiftOpen.value && !shiftOpenForWindow.value) {
    timeError.value = t('finanzas.arqueo.openShiftBeforeContinue')
    return
  }
  currentStep.value = 1
}

// ── Wizard state ──────────────────────────────────────────────────────────
const wizardSteps = [
  { n: 1, label: t('finanzas.arqueo.accounts') },
  { n: 2, label: t('finanzas.common.cash') },
  { n: 3, label: 'Otros métodos' },
  { n: 4, label: 'Resumen' },
  { n: 5, label: t('finanzas.common.close') },
]

const currentStep     = ref(0)
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
const cashLeftInDrawer = ref('0')
const denomRefs     = ref<HTMLInputElement[]>([])

const setDenomRef = (el: any, idx: number) => {
  if (el) denomRefs.value[idx] = el
}

const totalCounted = computed(() =>
  denominations.reduce((sum, d) => sum + d * (parseInt(counts.value[d]) || 0), 0)
  + parseMoneyInput(monedasAmount.value)
)

// ── Preview API (completed orders only — cash already in drawer) ───────────
const { data: rawPreview, status: previewStatus, asyncStatus: previewAsyncStatus, refetch: refetchPreview } = useQuery({
  key: () => ['cierre', 'preview-z', currentTenant.value?.id, arqueoWindowMode.value, previewShiftTemplateId.value, periodStart.value, periodEnd.value, periodStartTime.value, periodEndTime.value],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/preview', {
    params: buildPreviewParams(true),
  }),
  enabled: () => !!currentTenant.value && currentStep.value >= 1 && (arqueoWindowMode.value !== 'template' || !!selectedTemplateId.value),
  staleTime: 0,
})

const previewData    = computed(() => rawPreview.value?.data ?? null)
const previewLoading = computed(() => previewStatus.value === 'pending' && !previewData.value)
const isRefreshing   = computed(() => previewAsyncStatus.value === 'loading' && previewData.value != null)
const previewBusy    = computed(() => previewLoading.value || isRefreshing.value)

registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetchPreview) })
onUnmounted(() => { clearRefreshHandler(refetchPreview) })

const cashDiff = computed(() => totalCounted.value - (previewData.value?.cashExpected ?? 0))

// ── Breakdown groups (non-cash payment methods) ────────────────────────────
const GROUP_LABELS: Record<string, string> = {
  cash: t('finanzas.common.cash'), card: t('finanzas.common.card'), digital: t('finanzas.common.digital'), credit: t('finanzas.common.credit'),
}

const GROUP_COLORS: Record<string, { dot: string; badge: string }> = {
  cash:    { dot: 'bg-state-success-icon', badge: 'bg-state-success-bg text-state-success-text border border-state-success-border' },
  card:    { dot: 'bg-state-info-icon',    badge: 'bg-state-info-bg text-state-info-text border border-state-info-border'         },
  digital: { dot: 'bg-state-info-icon',  badge: 'bg-state-info-bg text-state-info-text border border-state-info-border'   },
  credit:  { dot: 'bg-state-warning-icon',   badge: 'bg-state-warning-bg text-state-warning-text border border-state-warning-border'      },
}

interface BreakdownRowRaw {
  group_slug: string
  method_name: string
  total: number
  grossInflowsAmount?: number
  gross_inflows_amount?: number
  expenseOutflowsAmount?: number
  expense_outflows_amount?: number
  purchaseOutflowsAmount?: number
  purchase_outflows_amount?: number
  expectedAmount?: number
  expected_amount?: number
}
interface BreakdownGroup  { slug: string; label: string; total: number }
const NON_COUNTABLE_BREAKDOWN_GROUPS = new Set(['untracked'])

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

const nonCashGroups = computed(() =>
  breakdownGroups.value.filter(g => g.slug !== 'cash' && !NON_COUNTABLE_BREAKDOWN_GROUPS.has(g.slug)),
)

interface BreakdownMethod {
  key: string
  groupSlug: string
  label: string
  groupLabel: string
  total: number
  grossInflowsAmount: number
  expenseOutflowsAmount: number
  purchaseOutflowsAmount: number
  expectedAmount: number
}

const nonCashMethods = computed<BreakdownMethod[]>(() => {
  const rows: BreakdownRowRaw[] = previewData.value?.breakdown ?? []
  const nonCashRows = rows.filter(r => r.group_slug !== 'cash' && !NON_COUNTABLE_BREAKDOWN_GROUPS.has(r.group_slug))
  if (nonCashRows.length > 0) {
    return [...nonCashRows]
      .sort((a, b) => b.total - a.total)
      .map(r => ({
        key:        `${r.group_slug}__${r.method_name}`,
        groupSlug:  r.group_slug,
        label:      r.method_name,
        groupLabel: GROUP_LABELS[r.group_slug] ?? r.group_slug,
        total:      r.total,
        grossInflowsAmount: r.grossInflowsAmount ?? r.gross_inflows_amount ?? r.total,
        expenseOutflowsAmount: r.expenseOutflowsAmount ?? r.expense_outflows_amount ?? 0,
        purchaseOutflowsAmount: r.purchaseOutflowsAmount ?? r.purchase_outflows_amount ?? 0,
        expectedAmount: r.expectedAmount ?? r.expected_amount ?? r.total,
      }))
  }
  // fallback: group-level totals when no individual methods are configured
  return nonCashGroups.value.map(g => ({
    key:        g.slug,
    groupSlug:  g.slug,
    label:      g.label,
    groupLabel: g.label,
    total:      g.total,
    grossInflowsAmount: g.total,
    expenseOutflowsAmount: 0,
    purchaseOutflowsAmount: 0,
    expectedAmount: g.total,
  }))
})

const methodDiff = (method: BreakdownMethod) =>
  methodAmountValue(method) - method.expectedAmount

const methodAmountValue = (method: BreakdownMethod) => {
  const value = parseSignedMoneyInput(methodAmounts.value[method.key] ?? '')
  return method.expectedAmount < 0 && value > 0 ? -value : value
}

const hasMethodAmount = (method: BreakdownMethod) =>
  Object.prototype.hasOwnProperty.call(methodAmounts.value, method.key)
  && methodAmounts.value[method.key] !== ''

const amountToneClass = (value: number | null | undefined) => {
  if ((value ?? 0) < 0) return 'text-destructive'
  if ((value ?? 0) > 0) return 'text-text-primary'
  return 'text-text-secondary'
}

const rowExpectedAmount = (row: BreakdownRowRaw) =>
  Number(row.expectedAmount ?? row.expected_amount ?? row.total ?? 0)

const rowGrossInflows = (row: BreakdownRowRaw) =>
  Number(row.grossInflowsAmount ?? row.gross_inflows_amount ?? row.total ?? 0)

const rowOutflows = (row: BreakdownRowRaw) =>
  Number(row.expenseOutflowsAmount ?? row.expense_outflows_amount ?? 0)
  + Number(row.purchaseOutflowsAmount ?? row.purchase_outflows_amount ?? 0)

const paymentBreakdownReported = computed(() =>
  nonCashMethods.value
    .filter(method => Object.prototype.hasOwnProperty.call(methodAmounts.value, method.key) && methodAmounts.value[method.key] !== '')
    .map(method => ({
      groupSlug: method.groupSlug,
      methodName: method.label,
      reportedAmount: methodAmountValue(method),
    })),
)

const diffResultClass = computed(() => {
  if (cashDiff.value >= 0) return 'border-state-success-border bg-state-success-bg text-state-success-text'
  if (Math.abs(cashDiff.value) < (previewData.value?.cashExpected ?? 1) * 0.02) return 'border-state-warning-border bg-state-warning-bg text-state-warning-text'
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
  if (requiresShiftOpen.value && !shiftOpenForWindow.value) {
    submitError.value = t('finanzas.arqueo.openShiftBeforeClose')
    return
  }
  isSubmitting.value = true
  submitError.value  = null
  try {
    const body: Record<string, unknown> = {
      ...cierreWindowBody.value,
      cashCounted: totalCounted.value,
      cashLeftInDrawer: parseMoneyInput(cashLeftInDrawer.value) || totalCounted.value,
      paymentBreakdownReported: paymentBreakdownReported.value.length ? paymentBreakdownReported.value : undefined,
      notes: notes.value || null,
    }
    const result = await $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre', {
      method: 'POST',
      body,
    })
    successData.value = result.data
    cierreSuccess.value = true
    cache.invalidateQueries({ key: ['cierre', 'list'] })
    clearStorage()
  } catch (err: any) {
    const msg = err?.data?.message ?? err?.data?.detail ?? err?.message ?? t('finanzas.arqueo.registerError')
    submitError.value = msg.includes('superpone')
      ? 'Ya existe un arqueo para este período.'
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
const parseMoneyInput = (value: string | number | null | undefined): number => {
  const raw = String(value ?? '').replace(/\D/g, '')
  return raw ? Number(raw) : 0
}
const parseSignedMoneyInput = (value: string | number | null | undefined): number => {
  const raw = String(value ?? '')
  const negative = raw.trim().startsWith('-')
  const numeric = parseMoneyInput(raw)
  return negative ? -numeric : numeric
}
const formatMoneyParts = (value: string, allowNegative = false): string => {
  const negative = allowNegative && value.trim().startsWith('-')
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (!digits) return negative ? '-' : ''
  const formatted = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(digits))
  return negative ? `-${formatted}` : formatted
}
const formatMoneyInput = (e: Event): string => {
  const input = e.target as HTMLInputElement
  const v = formatMoneyParts(input.value)
  input.value = v
  return v
}
const formatSignedMoneyInput = (e: Event): string => {
  const input = e.target as HTMLInputElement
  const v = formatMoneyParts(input.value.replace(/(?!^)-/g, ''), true)
  input.value = v
  return v
}

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
    periodStartTime: periodStartTime.value, periodEndTime: periodEndTime.value,
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
      if (s.periodStart) {
        const d0 = dateAtNoon(s.periodStart)
        const d1 = s.periodEnd ? dateAtNoon(s.periodEnd) : d0
        dateRangeDates.value = [d0, d1]
      }
      if (s.periodStartTime) { startTimeInput.value = s.periodStartTime; enableTimePicker.value = true }
      if (s.periodEndTime)   { endTimeInput.value   = s.periodEndTime;   enableTimePicker.value = true }
      // Never restore step from storage — always start at step 0 (X preview)
    }
    if (s.counts)         counts.value         = s.counts
    if (s.monedasAmount)  monedasAmount.value  = formatMoneyParts(String(s.monedasAmount))
    if (s.methodAmounts) {
      methodAmounts.value = Object.fromEntries(
        Object.entries(s.methodAmounts).map(([key, value]) => [key, formatMoneyParts(String(value), true)]),
      ) as Record<string, string>
    }
    if (s.notes)          notes.value          = s.notes
  } catch { /* ignore */ }
}

const clearStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

watch([currentStep, counts, monedasAmount, methodAmounts, notes], saveToStorage, { deep: true })

// Auto-advance past step 1 when there are no open tables
watch(previewData, (data) => {
  if (currentStep.value === 1 && data && data.openTablesCount === 0) {
    currentStep.value = 2
  }
}, { immediate: true })

watch(currentStep, (step) => {
  if (step === 5) {
    cashLeftInDrawer.value = formatMoneyParts(String(totalCounted.value || 0))
  }
})

onMounted(() => {
  if (typeof window === 'undefined') return
  loadFromStorage()
})

// ── Formatters ────────────────────────────────────────────────────────────
const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const hasCapturedTips = (data?: Record<string, any> | null) =>
  Number(data?.totalTips ?? 0) > 0 || Number(data?.totalTipTax ?? 0) > 0

const formatPeriod = (start: string, end: string) => {
  if (!start) return ''
  const fmt = (d: string) => formatIsoDateLong(d)
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}

const cierreWindowSummary = computed(() => {
  if (arqueoWindowMode.value === 'template') {
    const templateName = shiftTemplates.value.find(t => t.id === selectedTemplateId.value)?.name ?? t('finanzas.arqueo.shift')
    return {
      title: t('finanzas.arqueo.shift'),
      period: `${templateName} · ${formatPeriod(periodStart.value, periodEnd.value)}`,
      detail: templateHoursLabel.value,
    }
  }
  if (periodStartTime.value && periodEndTime.value) {
    return {
      title: 'Ventana',
      period: formatPeriod(periodStart.value, periodEnd.value),
      detail: `${timeHHMMFromISO(periodStartTime.value)} – ${timeHHMMFromISO(periodEndTime.value)}`,
    }
  }
  return {
    title: 'Día completo',
    period: formatPeriod(periodStart.value, periodEnd.value),
    detail: null,
  }
})
</script>

<style>
.arqueo-template-dp-trigger {
  display: inline-flex !important;
  width: fit-content !important;
  max-width: fit-content !important;
  height: 2.5rem !important;
  flex-shrink: 0;
}
.arqueo-template-dp-trigger :deep(.dp__input_wrap),
.arqueo-template-dp-trigger :deep(.dp__input),
.arqueo-template-dp-trigger :deep(.dp--clear-btn) {
  display: none !important;
}
.arqueo-template-dp-trigger :deep(.dp__main),
.arqueo-template-dp-trigger :deep(.dp__main > div) {
  display: inline-flex !important;
  align-items: stretch !important;
  width: fit-content !important;
  max-width: fit-content !important;
  height: 2.5rem !important;
  min-width: unset !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}
.arqueo-template-dp-trigger :deep(.dp__main > div > button) {
  width: fit-content !important;
  min-width: unset !important;
}
</style>
