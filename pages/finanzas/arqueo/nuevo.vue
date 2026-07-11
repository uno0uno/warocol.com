<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      :label="t('finanzas.arqueo.registeringClose')"
      :hint="t('finanzas.arqueo.registeringCloseHint')"
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
              {{ t('finanzas.arqueo.registeredSuccess') }}
            </h2>
            <p class="mt-1 text-sm text-text-secondary">
              {{ formatPeriod(periodStart, periodEnd) }}
            </p>

            <div class="mt-4 rounded-lg border border-border bg-background p-3 text-left">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-text-secondary">{{ t('finanzas.arqueo.totalSales') }}</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(successData?.totalSales) }}</span>
              </div>
              <div v-if="hasCapturedTips(successData)" class="mt-2 flex items-center justify-between gap-3 text-sm">
                <span class="text-text-secondary">{{ t('finanzas.arqueo.totalCharged') }}</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(successData?.totalCharged) }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-3 text-sm">
                <span class="text-text-secondary">{{ t('finanzas.arqueo.cashCounted') }}</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(successData?.cashCounted) }}</span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2 text-sm">
                <span class="text-text-secondary">{{ t('finanzas.common.difference') }}</span>
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
                {{ t('finanzas.arqueo.viewHistory') }}
              </NuxtLink>
              <NuxtLink
                v-if="successData?.id"
                :to="`/finanzas/arqueo/${successData.id}`"
                class="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-action-primary-bg px-4 py-2.5 text-sm font-semibold text-action-primary-text transition-colors hover:bg-action-primary-hover-bg"
              >
                {{ t('finanzas.common.viewDetail') }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <template v-if="!cierreSuccess">
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
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ t('finanzas.common.period') }}</p>
                <p class="text-base font-semibold text-text-primary">{{ formatPeriod(periodStart, periodEnd) }}</p>
                <p class="text-xs font-mono text-text-secondary mt-0.5">{{ dayWindowDisplayLabel }}</p>
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
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ t('finanzas.arqueo.restaurant') }}</p>
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
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ t('finanzas.common.status') }}</p>
                <p class="text-base font-semibold text-text-primary">{{ t('finanzas.arqueo.stepOf', { step: currentStep, total: 5 }) }}</p>
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
            {{ [t('finanzas.common.period'),t('finanzas.common.cash'),t('finanzas.arqueo.otherMethodsDetail'),t('finanzas.arqueo.breakdown'),t('finanzas.common.close')][currentStep - 1] }}
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

      <!-- Step 1: Período + X + validación mesas -->
      <template v-if="currentStep === 1">


        <!-- Selector de día -->
        <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide mb-3">
          <button
            v-for="p in presets" :key="p.key"
            class="h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex-shrink-0"
            :class="activePreset === p.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-text-secondary hover:border-primary/50 hover:text-text-primary'"
            @click="applyPreset(p)"
          >{{ p.label }}</button>
          <span
            v-if="activePreset === null"
            class="h-10 px-3 rounded-lg border-2 border-primary/30 bg-primary/5 text-sm font-medium text-primary flex items-center flex-shrink-0 tabular-nums"
          >
            {{ t('finanzas.arqueo.selectedPeriod', { date: formatSingleDate(selectedDate) }) }}
          </span>
          <ClientOnly>
            <div
              class="flex-shrink-0 rounded-lg border-2 transition-colors"
              :class="activePreset === null
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-transparent'"
            >
              <VueDatePicker
                v-model="selectedDate"
                :time-config="{ enableTimePicker: false }" :locale="locale"
                auto-apply :teleport="true" :timezone="timezone" :max-date="maxDate" :format="formatSingleDate"
                :placeholder="t('finanzas.arqueo.selectDate')"
                input-class-name="dp-custom-input" menu-class-name="dp-custom-menu" calendar-cell-class-name="dp-custom-cell"
                @update:model-value="onDatePicked"
              />
            </div>
          </ClientOnly>
        </div>

        <!-- X preview -->
        <div v-if="xPreviewLoading" class="flex justify-center py-10"><CommonsTheCustomLoader size="large" /></div>
        <template v-else-if="xPreviewData">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <!-- Ventas -->
            <div class="bg-surface border-2 border-border rounded-lg">
              <div class="p-3 border-b border-border"><h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">{{ t('finanzas.arqueo.closeSales') }}</h3></div>
              <div class="divide-y divide-border">
                <div class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">{{ t('finanzas.arqueo.totalSales') }}</span><span class="font-bold text-text-primary">{{ formatCurrency(xPreviewData.totalSales) }}</span></div>
                <div v-if="hasCapturedTips(xPreviewData)" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">{{ t('finanzas.common.tips') }}</span><span class="font-medium">{{ formatCurrency(xPreviewData.totalTips) }}</span></div>
                <div v-if="(xPreviewData.totalTipTax ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">{{ t('finanzas.arqueo.tipTax') }}</span><span class="font-medium">{{ formatCurrency(xPreviewData.totalTipTax) }}</span></div>
                <div v-if="hasCapturedTips(xPreviewData)" class="flex justify-between px-4 py-2.5 text-sm font-semibold"><span class="text-text-primary">{{ t('finanzas.arqueo.totalCharged') }}</span><span>{{ formatCurrency(xPreviewData.totalCharged) }}</span></div>
                <div class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">{{ t('finanzas.arqueo.closeOrders') }}</span><span class="font-medium">{{ xPreviewData.itemsSold }}</span></div>
              </div>
            </div>
            <!-- Caja -->
            <div class="bg-surface border-2 border-border rounded-lg">
              <div class="p-3 border-b border-border"><h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">{{ t('finanzas.arqueo.drawerState') }}</h3></div>
              <div class="divide-y divide-border">
                <div v-if="step1OpeningCash > 0" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">{{ t('finanzas.arqueo.openingFloat') }}</span><span class="font-medium">+ {{ formatCurrency(step1OpeningCash) }}</span></div>
                <div class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">{{ t('finanzas.arqueo.cashReceived') }}</span><span class="font-medium">{{ formatCurrency(xPreviewData.totalCash) }}</span></div>
                <div v-if="(xPreviewData.cashTips ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">{{ t('finanzas.arqueo.cashTips') }}</span><span class="font-medium">+ {{ formatCurrency(xPreviewData.cashTips) }}</span></div>
                <div class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">{{ t('finanzas.arqueo.cashExpensesLong') }}</span><span class="font-medium text-destructive">− {{ formatCurrency(xPreviewData.gastosEfectivo) }}</span></div>
                <div v-if="(xPreviewData.cashPurchases ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm"><span class="text-text-secondary">{{ t('finanzas.arqueo.cashPurchases') }}</span><span class="font-medium text-destructive">− {{ formatCurrency(xPreviewData.cashPurchases) }}</span></div>
                <div class="flex justify-between px-4 py-2.5 text-sm font-semibold"><span class="text-text-primary">{{ t('finanzas.arqueo.expectedInDrawer') }}</span><span>{{ formatCurrency(xPreviewData.cashExpected) }}</span></div>
              </div>
            </div>
            <!-- Desglose -->
            <div v-if="(xPreviewData.breakdown ?? []).length > 0" class="sm:col-span-2 bg-surface border-2 border-border rounded-lg">
              <div class="p-3 border-b border-border"><h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">{{ t('finanzas.arqueo.netMovementByMethod') }}</h3></div>
              <div class="overflow-x-auto">
                <div class="grid min-w-[680px] grid-cols-[1.35fr_.95fr_1fr_1fr_1fr] border-b border-data-table-border bg-data-table-header-bg text-xs font-semibold uppercase tracking-wide text-data-table-header-text">
                  <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">{{ t('finanzas.arqueo.method') }}</span>
                  <span class="border-r border-dashed border-data-table-border/60 px-3 py-2">{{ t('finanzas.common.type') }}</span>
                  <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">{{ t('finanzas.arqueo.inflow') }}</span>
                  <span class="border-r border-dashed border-data-table-border/60 px-3 py-2 text-right">{{ t('finanzas.arqueo.outflow') }}</span>
                  <span class="px-3 py-2 text-right">{{ t('finanzas.arqueo.net') }}</span>
                </div>
                <div
                  v-for="(row, index) in (xPreviewData.breakdown ?? [])"
                  :key="row.group_slug + row.method_name"
                  class="grid min-w-[680px] grid-cols-[1.35fr_.95fr_1fr_1fr_1fr] items-center border-b border-data-table-border text-sm last:border-b-0"
                  :class="index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'"
                >
                  <span class="min-w-0 truncate border-r border-dashed border-data-table-border/60 px-3 py-2.5 font-semibold text-data-table-cell-text">{{ methodDisplayName(row) }}</span>
                  <span class="border-r border-dashed border-data-table-border/60 px-3 py-2.5 text-data-table-cell-muted">{{ groupLabel(row.group_slug) }}</span>
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

          <!-- Mesas abiertas: bloquear o continuar -->
          <div v-if="xPreviewData.openTablesCount > 0" class="bg-surface border-2 border-state-warning-border rounded-lg p-4 flex items-start gap-3">
            <div class="w-10 h-10 rounded-lg bg-state-warning-bg border border-state-warning-border flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-state-warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-state-warning-text">{{ t('finanzas.arqueo.tableWithOpenAccount', { count: xPreviewData.openTablesCount, table: xPreviewData.openTablesCount === 1 ? tableSingular.toLowerCase() : tablePlural.toLowerCase() }) }}</p>
              <p class="text-xs text-state-warning-text/90 mt-0.5">{{ t('finanzas.arqueo.closeOpenTables', { tables: tablePlural.toLowerCase() }) }}</p>
              <div class="flex flex-wrap gap-2 mt-3">
                <NuxtLink to="/pos" target="_blank" class="inline-flex items-center gap-1.5 min-h-[36px] px-4 py-1.5 rounded-lg bg-action-warning-bg text-action-warning-text text-xs font-semibold hover:bg-action-warning-hover-bg transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  {{ t('finanzas.arqueo.goToPos') }}
                </NuxtLink>
                <button @click="refetchXPreview()" class="inline-flex items-center gap-1.5 min-h-[36px] px-4 py-1.5 rounded-lg border border-state-warning-border bg-state-warning-bg text-state-warning-text text-xs font-medium hover:bg-state-warning-bg/80 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  {{ t('finanzas.arqueo.verifyAgain') }}
                </button>
              </div>
            </div>
          </div>
          <div
            v-if="!shiftOpenForWindow"
            class="rounded-lg border border-state-warning-border bg-state-warning-bg px-4 py-3 text-sm text-state-warning-text mb-3"
          >
            Debes abrir el turno y declarar el fondo de caja antes de cerrar.
            <NuxtLink :to="aperturaLink" class="font-semibold underline ml-1">Abrir turno</NuxtLink>
          </div>
          <div v-if="xPreviewData.openTablesCount === 0" class="flex gap-3">
            <button
              @click="currentStep = 2"
              class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              :disabled="!shiftOpenForWindow"
            >
              Siguiente →
            </button>
          </div>
        </template>
        <div v-else-if="xPreviewError" class="text-sm text-text-secondary py-4">No se pudo cargar el resumen del período.</div>
        <div v-else class="flex justify-center py-10"><CommonsTheCustomLoader size="large" /></div>

      </template>

      <!-- Step 2: Conteo de caja -->
      <div v-else-if="currentStep === 2" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h3 class="text-sm font-semibold text-text-primary mb-1">{{ t('finanzas.arqueo.cashCount') }}</h3>
        <p class="text-xs text-text-secondary mb-3">{{ t('finanzas.arqueo.cashCountInstruction') }}</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

          <!-- Izquierda: denominaciones -->
          <div class="bg-background rounded-lg border border-border overflow-hidden">
            <div class="px-3 py-2 bg-surface border-b border-border">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">{{ t('finanzas.arqueo.billsCoins') }}</span>
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
                  :aria-label="t('finanzas.arqueo.denominationCountAria', { amount: formatCurrency(denom) })"
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
                >{{ t('finanzas.arqueo.coins') }}</span>
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
                  :aria-label="t('finanzas.arqueo.coinsAmountAria')"
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
                <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">{{ t('finanzas.arqueo.breakdown') }}</span>
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
                  >{{ t('finanzas.arqueo.coins') }}</span>
                  <span
                    class="text-xs"
                    :class="parseMoneyInput(monedasAmount) > 0 ? 'font-semibold text-text-primary' : 'text-text-tertiary'"
                  >{{ formatCurrency(parseMoneyInput(monedasAmount)) }}</span>
                </div>
              </div>
              <!-- Total row — accent strip -->
              <div class="px-3 py-2.5 bg-primary/10 border-t-2 border-primary/20 flex items-center justify-between">
                <span class="text-sm font-semibold text-primary">{{ t('finanzas.arqueo.cashCounted') }}</span>
                <span class="text-base font-bold text-primary">{{ formatCurrency(totalCounted) }}</span>
              </div>
            </div>

            <div v-if="previewLoading" class="rounded-lg border border-border bg-background overflow-hidden">
              <div class="px-3 py-2 bg-surface border-b border-border">
                <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">{{ t('finanzas.arqueo.calculating') }}</span>
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
                  <span class="text-sm font-semibold">{{ t('finanzas.common.difference') }}</span>
                </div>
                <span class="text-lg font-bold">{{ cashDiff >= 0 ? '+' : '' }}{{ formatCurrency(cashDiff) }}</span>
              </div>
              <div class="px-3 py-2 border-t border-black/10 flex justify-between text-xs opacity-80">
                <span>{{ t('finanzas.arqueo.expectedInDrawer') }}</span>
                <span class="font-medium">{{ formatCurrency(previewData?.cashExpected) }}</span>
              </div>
            </div>

          </div>
        </div>

        <div class="flex gap-3 mt-4">
          <button @click="currentStep = 1" class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors">
            ← {{ t('finanzas.common.back') }}
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
            <p class="text-xs text-text-secondary mb-0.5">{{ dayWindowDisplayLabel }}</p>
            <p class="text-sm font-semibold text-text-primary">{{ formatPeriod(periodStart, periodEnd) }}</p>
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
              {{ confirmArmed ? t('finanzas.arqueo.confirmClose') : t('finanzas.arqueo.irreversibilityWarning') }}
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
            :disabled="isSubmitting || !shiftOpenForWindow"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { useQueryCache } from '@pinia/colada'
import { buildCierreWindowBody, buildCierreWindowParams, cierrePreviewShiftCacheKey, isShiftOpen } from '~/composables/useCierreShiftWindow'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
const { t, locale } = useI18n({ useScope: 'global' })
useHead({ title: () => t('finanzas.head.z') })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const { singular: tableSingular, plural: tablePlural } = useTableLabel()
const cache = useQueryCache()
const route = useRoute()
const { addDaysISO, dateAtNoon, isoFromDate, timeHHMMFromISO, timezone, todayISO } = useTenantTimezone()

const today = todayISO()
const maxDate = computed(() => dateAtNoon(todayISO()))
const { formatCalendarDate, formatCurrency: formatMoneyValue, formatDateTime: _fmtDateTime, formatNumber } = useFormatters()
const formatIsoDateLong = (iso: string) => formatCalendarDate(iso)
const initStart = (route.query.start as string) || today

// ── Último cierre ──────────────────────────────────────────────────────────

interface UltimoCierre {
  id: string
  periodStart: string
  periodEnd: string
  closedAt: string
  totalSales: number
  cashCounted: number
  cashDifference: number
}

const { data: ultimoData, status: ultimoStatus, asyncStatus: ultimoAsyncStatus, refetch: refetchUltimo } = useQuery({
  key: () => ['cierre', 'ultimo', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: UltimoCierre | null }>('/api/cierre/ultimo'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const ultimoCierre  = computed(() => ultimoData.value?.data ?? null)
const ultimoLoading = computed(() => ultimoStatus.value === 'pending' && !ultimoData.value)
const isUltimoRefreshing = computed(() => ultimoAsyncStatus.value === 'loading' && !!ultimoData.value)

registerProgressiveLoading(isUltimoRefreshing)
onMounted(() => { setRefreshHandler(refetchUltimo) })
onUnmounted(() => { clearRefreshHandler(refetchUltimo) })

// Día sugerido: el día siguiente al último cierre (si es ≤ hoy)
const suggestedRange = computed(() => {
  if (!ultimoCierre.value) return null
  const afterIso = addDaysISO(ultimoCierre.value.periodEnd, 1)
  if (afterIso > today) return null
  return { start: afterIso, startDate: dateAtNoon(afterIso) }
})

const applySuggested = () => {
  if (!suggestedRange.value) return
  selectedDate.value = suggestedRange.value.startDate
  syncPresetFromDate(suggestedRange.value.start)
}

// ── Date picker state (paso 0) — solo un día ──────────────────────────────

interface Preset { key: string; label: string; date: Date }
const presets = computed<Preset[]>(() => {
  const todayNoon = dateAtNoon(today)
  const yesterdayNoon = dateAtNoon(addDaysISO(today, -1))
  return [
    { key: 'today',     label: t('finanzas.common.today'),  date: todayNoon },
    { key: 'yesterday', label: t('finanzas.common.yesterday'), date: yesterdayNoon },
  ]
})
const selectedDate = ref<Date>(dateAtNoon(initStart))
const activePreset = ref<string | null>(
  initStart === today ? 'today'
    : initStart === addDaysISO(today, -1) ? 'yesterday'
      : null,
)

const syncPresetFromDate = (iso: string) => {
  if (iso === today) activePreset.value = 'today'
  else if (iso === addDaysISO(today, -1)) activePreset.value = 'yesterday'
  else activePreset.value = null
}

const applyPreset = (p: Preset) => {
  activePreset.value = p.key
  selectedDate.value = p.date
}

const onDatePicked = (date: Date | null) => {
  if (!date) return
  syncPresetFromDate(isoFromDate(date))
}

const formatSingleDate = (date: Date) =>
  date ? formatIsoDateLong(isoFromDate(date)) : ''

// Period — siempre un solo día
const periodStart = computed(() => isoFromDate(selectedDate.value))
const periodEnd   = computed(() => periodStart.value)

const shiftWindowParams = computed(() =>
  buildCierreWindowParams({
    periodStart: periodStart.value,
    periodEnd: periodEnd.value,
  }),
)

const { data: rawShiftStatus } = useQuery({
  key: () => ['cierre', 'shift-status', currentTenant.value?.id, JSON.stringify(shiftWindowParams.value)],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/shift-status', {
    params: shiftWindowParams.value,
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 0,
})

const resolvedWindow = computed(() => rawShiftStatus.value?.data ?? null)
const dayWindowLoading = computed(() => !resolvedWindow.value)
const effectivePeriodStart = computed(() => resolvedWindow.value?.periodStart ?? periodStart.value)
const effectivePeriodEnd = computed(() => resolvedWindow.value?.periodEnd ?? periodEnd.value)
const effectivePeriodStartTime = computed(() => resolvedWindow.value?.periodStartTime ?? null)
const effectivePeriodEndTime = computed(() => resolvedWindow.value?.periodEndTime ?? null)
const resolvedWindowParams = computed(() =>
  buildCierreWindowParams({
    periodStart: effectivePeriodStart.value,
    periodEnd: effectivePeriodEnd.value,
    periodStartTime: effectivePeriodStartTime.value,
    periodEndTime: effectivePeriodEndTime.value,
  }),
)
const cierreWindowBody = computed(() =>
  buildCierreWindowBody({
    periodStart: effectivePeriodStart.value,
    periodEnd: effectivePeriodEnd.value,
    periodStartTime: effectivePeriodStartTime.value,
    periodEndTime: effectivePeriodEndTime.value,
  }),
)
const buildPreviewParams = (completedOnly: boolean) => ({
  ...resolvedWindowParams.value,
  ...(completedOnly ? { completed_only: true } : {}),
})
const dayWindowDisplayLabel = computed(() => {
  if (dayWindowLoading.value) return t('finanzas.arqueo.resolvingDay')
  if (effectivePeriodStartTime.value && effectivePeriodEndTime.value) {
    return t('finanzas.arqueo.remainingDayWindow', {
      time: `${timeHHMMFromISO(effectivePeriodStartTime.value)} – ${timeHHMMFromISO(effectivePeriodEndTime.value)}`,
    })
  }
  return t('finanzas.arqueo.fullDayWindow')
})

const shiftOpenForWindow = computed(() => isShiftOpen(rawShiftStatus.value?.data))
const aperturaLink = computed(() =>
  `/finanzas/arqueo/apertura?mode=day&start=${periodStart.value}&end=${periodEnd.value}`,
)

// Step 0 preview — aligned with the same completed-order semantics used by the close.
const { data: rawXPreview, status: xPreviewStatus, error: xPreviewError, refetch: refetchXPreview } = useQuery({
  key: () => [
    'cierre',
    'preview-x0',
    currentTenant.value?.id,
    periodStart.value,
    periodEnd.value,
    cierrePreviewShiftCacheKey(rawShiftStatus.value?.data),
  ],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/preview', {
    params: buildPreviewParams(true),
  }),
  enabled: () => !!currentTenant.value && !dayWindowLoading.value,
  staleTime: 0,
})
const xPreviewData    = computed(() => rawXPreview.value?.data ?? null)
const xPreviewLoading = computed(() => xPreviewStatus.value === 'pending' && !xPreviewData.value)

/** Preview or shift-status (Mañana/custom) when cached preview omits openingCash. */
const step1OpeningCash = computed(() => {
  const fromPreview = Number(xPreviewData.value?.openingCash ?? 0)
  if (fromPreview > 0) return fromPreview
  return Number(rawShiftStatus.value?.data?.openingCash ?? 0)
})

watch(shiftOpenForWindow, (isOpen, wasOpen) => {
  if (isOpen && !wasOpen) void refetchXPreview()
})

watch(
  () => [rawShiftStatus.value?.data?.openingCash, xPreviewData.value?.openingCash],
  () => {
    if (!shiftOpenForWindow.value) return
    if (Number(xPreviewData.value?.openingCash ?? 0) > 0) return
    if (Number(rawShiftStatus.value?.data?.openingCash ?? 0) <= 0) return
    void refetchXPreview()
  },
)

// ── Wizard state ──────────────────────────────────────────────────────────
const wizardSteps = computed(() => [
  { n: 1, label: t('finanzas.common.period') },
  { n: 2, label: t('finanzas.common.cash') },
  { n: 3, label: t('finanzas.arqueo.otherMethodsDetail') },
  { n: 4, label: t('finanzas.arqueo.breakdown') },
  { n: 5, label: t('finanzas.common.close') },
])

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
  + parseMoneyInput(monedasAmount.value)
)

// ── Preview API (completed orders only — cash already in drawer) ───────────
const { data: rawPreview, status: previewStatus, asyncStatus: previewAsyncStatus, refetch: refetchPreview } = useQuery({
  key: () => [
    'cierre',
    'preview',
    currentTenant.value?.id,
    periodStart.value,
    periodEnd.value,
    cierrePreviewShiftCacheKey(rawShiftStatus.value?.data),
  ],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/preview', {
    params: buildPreviewParams(true),
  }),
  enabled: () => !!currentTenant.value && currentStep.value > 1 && !dayWindowLoading.value,
  staleTime: 0,
})

const previewData    = computed(() => rawPreview.value?.data ?? null)
const previewLoading = computed(() => previewStatus.value === 'pending' && !previewData.value)
const isRefreshing   = computed(() => previewAsyncStatus.value === 'loading' && previewData.value != null)
const previewBusy    = computed(() => previewLoading.value || isRefreshing.value)

registerProgressiveLoading(isRefreshing)

const cashDiff = computed(() => totalCounted.value - (previewData.value?.cashExpected ?? 0))

// ── Breakdown groups (non-cash payment methods) ────────────────────────────
const groupLabel = (slug: string) => {
  const labels: Record<string, string> = {
    cash: t('finanzas.common.cash'),
    card: t('finanzas.common.card'),
    digital: t('finanzas.common.digital'),
    credit: t('finanzas.common.credit'),
    untracked: t('finanzas.arqueo.untrackedPaymentGroup'),
  }
  return labels[slug] ?? slug
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
        label: groupLabel(row.group_slug),
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
        groupLabel: groupLabel(r.group_slug),
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

const methodDisplayName = (row: BreakdownRowRaw) =>
  row.group_slug === 'untracked'
    ? t('finanzas.arqueo.untrackedPaymentGroup')
    : row.method_name

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
  if (!shiftOpenForWindow.value) return
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
        ...cierreWindowBody.value,
        cashCounted:  totalCounted.value,
        paymentBreakdownReported: paymentBreakdownReported.value.length ? paymentBreakdownReported.value : undefined,
        notes:        notes.value || null,
      },
    })
    successData.value = result.data
    cierreSuccess.value = true
    clearStorage()
    cache.invalidateQueries({ key: ['cierre', 'list'] })
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
  const formatted = formatNumber(Number(digits), { maximumFractionDigits: 0 })
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
    periodStart: periodStart.value,
  }))
}

const loadFromStorage = (restorePeriod = true) => {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const s = JSON.parse(raw)
    if (restorePeriod && s.periodStart) {
      selectedDate.value = dateAtNoon(s.periodStart)
      syncPresetFromDate(s.periodStart)
    }
    // Never restore step from storage — always start at step 0 (X preview)
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

// Auto-advance past step 1:
// - fires when previewData loads OR when currentStep changes to 1

onMounted(() => {
  if (typeof window === 'undefined') return
  const queryStart = route.query.start as string | undefined
  if (queryStart) {
    selectedDate.value = dateAtNoon(queryStart)
    syncPresetFromDate(queryStart)
    loadFromStorage(false)
  } else {
    loadFromStorage(true)
  }
})

// ── Formatters ────────────────────────────────────────────────────────────
const formatCurrency = (value?: number | null) => formatMoneyValue(value ?? 0)

const hasCapturedTips = (data?: Record<string, any> | null) =>
  Number(data?.totalTips ?? 0) > 0 || Number(data?.totalTipTax ?? 0) > 0

const formatPeriod = (start: string, end: string) => {
  if (!start) return ''
  const fmt = (d: string) => formatIsoDateLong(d)
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}

const formatClosedAt = (iso: string) => _fmtDateTime(iso)
</script>

<style>
.dp-custom-input {
  height: 40px !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  min-width: 160px;
}
.dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.dp-custom-input::placeholder { color: hsl(var(--muted-foreground)) !important; }
.dp__theme_light {
  --dp-primary-color: hsl(var(--primary));
  --dp-primary-text-color: hsl(var(--primary-foreground));
  --dp-background-color: hsl(var(--card));
  --dp-text-color: hsl(var(--foreground));
  --dp-border-color: hsl(var(--border));
  --dp-menu-border-color: hsl(var(--border));
  --dp-hover-color: hsl(var(--accent));
  --dp-hover-text-color: hsl(var(--foreground));
  --dp-secondary-color: hsl(var(--muted));
  --dp-border-color-hover: hsl(var(--primary));
}
.dp-custom-menu {
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
}
</style>
