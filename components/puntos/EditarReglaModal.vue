<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-40 bg-black/40" @click="close" aria-hidden="true" />
    </Transition>

    <!-- Panel: bottom sheet on mobile, right slide-over on desktop -->
    <Transition name="panel">
      <div
        v-if="open"
        role="dialog"
        aria-modal="true"
        :aria-label="t('analitica.puntos.editRuleAria', { rule: meta.label })"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <!-- Icon + title -->
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <!-- bag -->
                <svg v-if="meta.icon === 'bag'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <!-- count -->
                <svg v-else-if="meta.icon === 'count'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <!-- calendar -->
                <svg v-else-if="meta.icon === 'calendar'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <!-- box: per_ticket_qty -->
                <svg v-else-if="meta.icon === 'box'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <!-- fallback -->
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">{{ meta.label }}</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">{{ meta.description }}</p>
              </div>
            </div>
            <!-- Close -->
            <button
              @click="close"
              type="button"
                :aria-label="t('analitica.customerDetail.closePanel')"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <!-- Toggle row -->
          <div class="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
            <span class="text-sm font-medium text-text-primary">{{ t('analitica.puntos.ruleStatus') }}</span>
            <div class="flex items-center gap-2">
              <span :class="['text-xs font-medium', localActive ? 'text-green-600' : 'text-slate-400']">
                {{ localActive ? t('analitica.puntos.active') : t('analitica.puntos.inactive') }}
              </span>
              <button
                role="switch"
                :aria-checked="localActive"
                :aria-label="t(localActive ? 'analitica.puntos.disableRule' : 'analitica.puntos.enableRule')"
                @click="localActive = !localActive"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  localActive ? 'bg-primary' : 'bg-slate-300'
                ]"
              >
                <span :class="['inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', localActive ? 'translate-x-6' : 'translate-x-1']" />
              </button>
            </div>
          </div>
        </div>

        <!-- Scrollable body -->
        <div v-if="rule" class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

      <!-- ── ticket_value ── -->
      <template v-if="rule.rule_type === 'ticket_value'">
        <div class="bg-surface-secondary/50 border border-primary/15 rounded-xl p-4 space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">Tasa base</p>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label for="field-base_waros" class="text-sm font-medium text-text-primary">{{ t('analitica.puntos.ruleEditor.warosToGrant') }}</label>
              <input
                id="field-base_waros"
                v-model.number="tvConfig.base_waros"
                type="number" min="1" step="1"
                placeholder="1"
                :class="inputClass"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="field-base_pesos" class="text-sm font-medium text-text-primary">Por cada (COP)</label>
              <input
                id="field-base_pesos"
                v-model.number="tvConfig.base_pesos"
                type="number" min="1" step="100"
                placeholder="1000"
                :class="inputClass"
              />
            </div>
          </div>
          <div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs text-amber-800">
              {{ t('analitica.puntos.ruleEditor.ticketValueExample', { amount: formatNumber(tvConfig.base_pesos * 10, { maximumFractionDigits: 0 }), waros: tvConfig.base_waros * 10 }) }}
            </p>
          </div>
        </div>

        <!-- Tiers -->
        <div class="bg-surface-secondary/50 rounded-xl p-4 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-text-secondary">Multiplicadores por monto</p>
              <p class="text-xs text-text-tertiary mt-0.5">Aumenta los Waros según el total de la compra</p>
            </div>
            <button
              @click="addTier"
              type="button"
              class="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/8 hover:bg-primary/15 px-2.5 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              {{ t('common.add') }}
            </button>
          </div>

          <div v-if="tierGapWarning" class="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span class="text-xs">{{ tierGapWarning }}</span>
          </div>

          <div v-if="tvConfig.tiers.length === 0" class="flex items-center gap-3 py-3 px-4 bg-white/50 rounded-lg border-2 border-dashed border-border">
            <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p class="text-xs text-text-secondary">Sin multiplicadores — se aplica la tasa base para todos los montos</p>
          </div>

          <div v-for="(tier, i) in tvConfig.tiers" :key="i" class="flex items-end gap-2 bg-white/70 rounded-lg p-3 border border-border/40">
            <div class="flex flex-col gap-1 flex-1">
              <label :for="`tier-from-${i}`" class="text-xs font-medium text-text-secondary">Desde (COP)</label>
              <input
                :id="`tier-from-${i}`"
                v-model.number="tier.from"
                type="number" min="0" step="1000"
                placeholder="0"
                :class="inputClass"
              />
            </div>
            <div class="flex flex-col gap-1 flex-1">
              <label :for="`tier-to-${i}`" class="text-xs font-medium text-text-secondary">Hasta (COP)</label>
              <input
                :id="`tier-to-${i}`"
                v-model.number="tier.to"
                type="number" min="0" step="1000"
                placeholder="Sin límite"
                :class="inputClass"
              />
            </div>
            <div class="flex flex-col gap-1 flex-1">
              <label :for="`tier-mult-${i}`" class="text-xs font-medium text-text-secondary">Multiplicador</label>
              <UiDecimalInput
                :id="`tier-mult-${i}`"
                v-model="tier.multiplier"
                :min="0.1"
                :precision="1"
                placeholder="1.0"
                :class="inputClass"
              />
            </div>
            <button
              @click="removeTier(i)"
              type="button"
              :aria-label="t('analitica.puntos.ruleEditor.removeTierAria', { index: i + 1 })"
              class="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </template>

      <!-- ── purchase_count ── -->
      <template v-else-if="rule.rule_type === 'purchase_count'">
        <div class="bg-surface-secondary/50 rounded-xl p-4 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-text-secondary">{{ t('analitica.puntos.ruleEditor.purchaseMilestones') }}</p>
              <p class="text-xs text-text-tertiary mt-0.5">{{ t('analitica.puntos.ruleEditor.purchaseMilestonesHelp') }}</p>
            </div>
            <button
              @click="addMilestone"
              type="button"
              class="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/8 hover:bg-primary/15 px-2.5 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              {{ t('common.add') }}
            </button>
          </div>

          <div v-if="milestoneDupWarning" class="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span class="text-xs">{{ milestoneDupWarning }}</span>
          </div>

          <div v-if="pcConfig.milestones.length === 0" class="flex items-center gap-3 py-3 px-4 bg-white/50 rounded-lg border-2 border-dashed border-border">
            <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-xs text-text-secondary">{{ t('analitica.puntos.ruleEditor.noMilestonesHelp') }}</p>
          </div>

          <div v-for="(m, i) in pcConfig.milestones" :key="i" class="flex items-end gap-2 bg-white/70 rounded-lg p-3 border border-border/40">
            <div class="flex flex-col gap-1 flex-1">
              <label :for="`m-num-${i}`" class="text-xs font-medium text-text-secondary">{{ t('analitica.puntos.ruleEditor.purchaseNumber') }}</label>
              <input
                :id="`m-num-${i}`"
                v-model.number="m.purchase_number"
                type="number" min="1" step="1"
                placeholder="1"
                :class="inputClass"
              />
            </div>
            <div class="flex flex-col gap-1 flex-1">
              <label :for="`m-bonus-${i}`" class="text-xs font-medium text-text-secondary">{{ t('analitica.puntos.ruleEditor.warosBonus') }}</label>
              <input
                :id="`m-bonus-${i}`"
                v-model.number="m.bonus"
                type="number" min="1" step="1"
                placeholder="50"
                :class="inputClass"
              />
            </div>
            <button
              @click="removeMilestone(i)"
              type="button"
              :aria-label="t('analitica.puntos.ruleEditor.removeMilestoneAria', { index: i + 1 })"
              class="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </template>

      <!-- ── frequency ── -->
      <template v-else-if="rule.rule_type === 'frequency'">
        <div class="bg-surface-secondary/50 border border-primary/15 rounded-xl p-4 space-y-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-text-secondary">Condición de frecuencia</p>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label for="field-purchases" class="text-sm font-medium text-text-primary">Compras requeridas</label>
              <input
                id="field-purchases"
                v-model.number="freqConfig.purchases"
                type="number" min="1" step="1"
                placeholder="2"
                :class="inputClass"
              />
              <p class="text-xs text-text-tertiary leading-snug">Nº de compras seguidas</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="field-within_days" class="text-sm font-medium text-text-primary">Ventana (días)</label>
              <input
                id="field-within_days"
                v-model.number="freqConfig.within_days"
                type="number" min="1" step="1"
                placeholder="60"
                :class="inputClass"
              />
              <p class="text-xs text-text-tertiary leading-snug">Período de tiempo</p>
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="field-freq-bonus" class="text-sm font-medium text-text-primary">{{ t('analitica.puntos.ruleEditor.warosBonus') }}</label>
            <input
              id="field-freq-bonus"
              v-model.number="freqConfig.bonus"
              type="number" min="1" step="1"
              placeholder="75"
              :class="inputClass"
            />
          </div>
          <div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs text-amber-800">
              {{ t('analitica.puntos.ruleEditor.frequencyExample', { purchases: freqConfig.purchases ?? 2, days: freqConfig.within_days ?? 60, bonus: freqConfig.bonus ?? 75 }) }}
            </p>
          </div>
        </div>
      </template>

      <!-- ── per_ticket_qty ── -->
      <template v-else-if="rule.rule_type === 'per_ticket_qty'">
        <div class="bg-surface-secondary/50 border border-primary/15 rounded-xl p-4 space-y-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-text-secondary">{{ t('analitica.puntos.ruleEditor.warosPerProductTitle') }}</p>
          <div class="flex flex-col gap-1.5">
            <label for="field-pti" class="text-sm font-medium text-text-primary">{{ t('analitica.puntos.ruleEditor.warosPerProduct') }}</label>
            <input
              id="field-pti"
              v-model.number="ptqConfig.points_per_item"
              type="number" min="1" step="1"
              placeholder="10"
              :class="inputClass"
            />
          </div>
          <div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs text-amber-800">
              Ej. pedido con 5 productos → <strong class="text-amber-900">{{ (ptqConfig.points_per_item ?? 10) * 5 }} Waros</strong>
            </p>
          </div>
        </div>

        <div class="bg-surface-secondary/50 rounded-xl p-4 space-y-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-text-secondary">Bonus por cantidad <span class="text-xs normal-case tracking-normal font-normal text-text-tertiary ms-1">(opcional)</span></p>
            <p class="text-xs text-text-tertiary mt-1">Puntos adicionales cuando el pedido supera cierta cantidad de productos</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label for="field-bonus_from_qty" class="text-sm font-medium text-text-primary">Desde # productos</label>
              <input
                id="field-bonus_from_qty"
                v-model.number="ptqConfig.bonus_from_qty"
                type="number" min="1" step="1"
                placeholder="4"
                :class="inputClass"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="field-bonus_extra" class="text-sm font-medium text-text-primary">Waros extra</label>
              <input
                id="field-bonus_extra"
                v-model.number="ptqConfig.bonus_extra_points"
                type="number" min="1" step="1"
                placeholder="50"
                :class="inputClass"
              />
            </div>
          </div>
          <div v-if="ptqConfig.bonus_from_qty" class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs text-amber-800">
              Ej. pedido con {{ ptqConfig.bonus_from_qty }}+ productos → <strong class="text-amber-900">{{ (ptqConfig.points_per_item ?? 10) * ptqConfig.bonus_from_qty + (ptqConfig.bonus_extra_points ?? 0) }} Waros</strong>
            </p>
          </div>
          <div v-else class="flex items-center gap-3 py-3 px-4 bg-white/50 rounded-lg border-2 border-dashed border-border">
            <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <p class="text-xs text-text-secondary">{{ t('analitica.puntos.ruleEditor.noQtyBonus') }}</p>
          </div>
        </div>
      </template>

      <!-- Validation errors -->
      <div v-if="validationError" class="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span class="text-xs">{{ validationError }}</span>
      </div>

        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-t border-border px-6 py-4 flex gap-3">
          <button
            @click="close"
            type="button"
            class="h-11 px-5 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="save"
            type="button"
            :disabled="isSaving || !!tierGapWarning || !!milestoneDupWarning"
            class="flex-1 h-11 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-primary/30"
          >
            <UiLoadingDots v-if="isSaving" size="9px" />
            <span v-else>{{ t('common.save') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { WaroRule, TicketValueTier, PurchaseCountMilestone } from '~/composables/warosConfigHelpers'
import { DEFAULT_CONFIGS, getRuleMeta } from '~/composables/warosConfigHelpers'
import { useWarosConfig } from '~/composables/useWarosConfig'

interface Props {
  modelValue: boolean
  rule: WaroRule | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n({ useScope: 'global' })
const { formatNumber } = useFormatters()

const { updateRule, isSaving } = useWarosConfig()

const inputClass = 'h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const meta = computed(() =>
  props.rule ? getRuleMeta(props.rule.rule_type, t) : { label: '', description: '', icon: '' }
)

// ── Local state ───────────────────────────────────────────────────────────

const localActive = ref(false)
const validationError = ref<string | null>(null)

// ticket_value
const tvConfig = ref({ base_waros: 1, base_pesos: 1000, tiers: [] as TicketValueTier[] })
// purchase_count
const pcConfig = ref({ milestones: [] as PurchaseCountMilestone[] })
// frequency
const freqConfig = ref({ purchases: 2, within_days: 60, bonus: 75 })
// per_ticket_qty
const ptqConfig = ref({ points_per_item: 10, bonus_from_qty: null as number | null, bonus_extra_points: null as number | null })

// ── Sync from prop ────────────────────────────────────────────────────────

watch(
  () => props.rule,
  (rule) => {
    if (!rule) return
    validationError.value = null
    localActive.value = rule.is_active
    const defaults = DEFAULT_CONFIGS[rule.rule_type] ?? {}
    const c = { ...defaults, ...rule.config }

    switch (rule.rule_type) {
      case 'ticket_value':
        tvConfig.value = {
          base_waros: c.base_waros ?? 1,
          base_pesos: c.base_pesos ?? 1000,
          tiers: (c.tiers ?? []).map((t: TicketValueTier) => ({ ...t })),
        }
        break
      case 'purchase_count':
        pcConfig.value = {
          milestones: (c.milestones ?? []).map((m: PurchaseCountMilestone) => ({ ...m })),
        }
        break
      case 'frequency':
        freqConfig.value = { purchases: c.purchases ?? 2, within_days: c.within_days ?? 60, bonus: c.bonus ?? 75 }
        break
      case 'per_ticket_qty':
        ptqConfig.value = {
          points_per_item: c.points_per_item ?? 10,
          bonus_from_qty: c.bonus_from_qty ?? null,
          bonus_extra_points: c.bonus_extra_points ?? null,
        }
        break
    }
  },
  { immediate: true }
)

// ── Tier helpers ──────────────────────────────────────────────────────────

const addTier = () => {
  const tiers = tvConfig.value.tiers
  const lastTo = tiers.length > 0 ? (tiers[tiers.length - 1].to ?? 0) : 0
  tiers.push({ from: lastTo, to: null, multiplier: 1 })
}

const removeTier = (i: number) => {
  tvConfig.value.tiers.splice(i, 1)
}

const tierGapWarning = computed(() => {
  const tiers = tvConfig.value.tiers
  if (tiers.length < 2) return null
  const sorted = [...tiers].sort((a, b) => a.from - b.from)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].to !== sorted[i + 1].from) {
      return `Gap o solapamiento entre tier ${i + 1} y ${i + 2} — el "Hasta" de un tier debe ser igual al "Desde" del siguiente`
    }
  }
  return null
})

// ── Milestone helpers ─────────────────────────────────────────────────────

const addMilestone = () => {
  const ms = pcConfig.value.milestones
  const next = ms.length > 0 ? Math.max(...ms.map(m => m.purchase_number)) + 1 : 1
  ms.push({ purchase_number: next, bonus: 50 })
}

const removeMilestone = (i: number) => {
  pcConfig.value.milestones.splice(i, 1)
}

const milestoneDupWarning = computed(() => {
  const nums = pcConfig.value.milestones.map(m => m.purchase_number)
  const dupes = nums.filter((n, i) => nums.indexOf(n) !== i)
  return dupes.length ? t('analitica.puntos.ruleEditor.duplicatePurchaseNumber', { numbers: [...new Set(dupes)].join(', ') }) : null
})

// ── Validation ────────────────────────────────────────────────────────────

const validate = (): boolean => {
  validationError.value = null
  if (!props.rule) return false

  switch (props.rule.rule_type) {
    case 'ticket_value':
      if (!tvConfig.value.base_waros || tvConfig.value.base_waros <= 0) {
        validationError.value = 'Los Waros base deben ser mayor a 0'
        return false
      }
      if (!tvConfig.value.base_pesos || tvConfig.value.base_pesos <= 0) {
        validationError.value = 'El valor en COP debe ser mayor a 0'
        return false
      }
      if (tvConfig.value.tiers.some(t => !t.multiplier || t.multiplier <= 0)) {
        validationError.value = 'Todos los multiplicadores de tiers deben ser mayor a 0'
        return false
      }
      break
    case 'purchase_count':
      if (pcConfig.value.milestones.some(m => !m.purchase_number || m.purchase_number <= 0 || !m.bonus || m.bonus <= 0)) {
        validationError.value = t('analitica.puntos.ruleEditor.positiveMilestones')
        return false
      }
      break
    case 'frequency':
      if (!freqConfig.value.purchases || freqConfig.value.purchases <= 0) {
        validationError.value = 'El número de compras debe ser mayor a 0'
        return false
      }
      if (!freqConfig.value.within_days || freqConfig.value.within_days <= 0) {
        validationError.value = 'La ventana de días debe ser mayor a 0'
        return false
      }
      if (!freqConfig.value.bonus || freqConfig.value.bonus <= 0) {
        validationError.value = 'El bonus debe ser mayor a 0'
        return false
      }
      break
    case 'per_ticket_qty':
      if (!ptqConfig.value.points_per_item || ptqConfig.value.points_per_item <= 0) {
        validationError.value = t('analitica.puntos.ruleEditor.positiveWarosPerProduct')
        return false
      }
      if (ptqConfig.value.bonus_from_qty && (!ptqConfig.value.bonus_extra_points || ptqConfig.value.bonus_extra_points <= 0)) {
        validationError.value = 'Si defines un bonus por cantidad, los Waros extra deben ser mayor a 0'
        return false
      }
      break
  }
  return true
}

// ── Build config payload ──────────────────────────────────────────────────

const buildConfig = (): Record<string, any> => {
  switch (props.rule!.rule_type) {
    case 'ticket_value':
      return { ...tvConfig.value }
    case 'purchase_count':
      return { ...pcConfig.value }
    case 'frequency':
      return { ...freqConfig.value }
    case 'per_ticket_qty':
      return { ...ptqConfig.value }
    default:
      return {}
  }
}

// ── Actions ───────────────────────────────────────────────────────────────

const close = () => {
  open.value = false
}

const save = async () => {
  if (!props.rule) return
  if (!validate()) return
  try {
    await updateRule(props.rule.rule_type, {
      is_active: localActive.value,
      config: buildConfig(),
    })
    emit('saved')
    close()
  } catch (e: any) {
    validationError.value = e?.data?.detail || e?.message || t('analitica.puntos.ruleEditor.saveError')
  }
}
</script>

<style scoped>
/* Mobile: slide up from bottom */
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.3s ease;
}
.panel-enter-from,
.panel-leave-to {
  transform: translateY(100%);
}

/* Desktop: slide in from right */
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
