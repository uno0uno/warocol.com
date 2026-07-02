<template>
  <div class="space-y-4 sm:space-y-6">

    <!-- First-load — block UI until critical queries resolve (issue #461) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <template v-else>
    <!-- ══════ COMANDAS Y COCINA — TOGGLES ══════ -->
    <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <div class="flex items-center gap-2 mb-5">
        <FireIcon class="w-5 h-5 text-primary flex-shrink-0" />
        <h3 class="text-base sm:text-lg font-semibold text-text-primary">Comandas y Cocina</h3>
      </div>

      <div
        v-if="businessProfile"
        class="rounded-xl border-2 border-border bg-surface transition-colors divide-y divide-border"
      >
        <!-- Activar comandas -->
        <div class="flex min-h-[64px] items-center justify-between gap-4 px-4 py-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-snug text-text-primary">Activar comandas</p>
          </div>
          <UiToggleSwitch
            :checked="businessProfile?.comandas_enabled"
            :loading="isTogglingComandas"
            aria-label="Activar comandas"
            @change="handleToggleComandas"
          />
        </div>

        <div v-if="showDisableComandasWarning" class="p-3">
          <!-- Inline disable-warning banner -->
          <div class="rounded-xl border border-state-warning-border bg-state-warning-bg p-3 flex items-start justify-between gap-3">
            <p class="text-xs text-state-warning-text leading-relaxed">
              Las comandas activas no serán afectadas. Los nuevos pedidos no generarán comandas mientras esté desactivado.
            </p>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button @click="showDisableComandasWarning = false" class="text-xs text-state-warning-text font-medium hover:underline">Cancelar</button>
              <button
                @click="confirmDisableComandas"
                class="text-xs font-bold text-state-warning-action-text bg-state-warning-action-bg hover:bg-state-warning-action-bg/90 px-3 py-1 rounded-lg transition-colors min-h-[32px]"
              >
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>

        <!-- Activar KDS (only when comandas ON) -->
        <div v-if="businessProfile?.comandas_enabled" class="flex min-h-[64px] items-center justify-between gap-4 px-4 py-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-snug text-text-primary">Activar pantallas KDS</p>
          </div>
          <UiToggleSwitch
            :checked="businessProfile?.kds_enabled"
            :loading="isTogglingKds"
            aria-label="Activar pantallas KDS"
            @change="handleToggleKds"
          />
        </div>

        <!-- Issue #537 — Expediter mode (waiter advances comanda state from POS) -->
        <div v-if="businessProfile?.comandas_enabled" class="flex min-h-[64px] items-center justify-between gap-4 px-4 py-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-snug text-text-primary">Mesero avanza estado desde POS</p>
          </div>
          <UiToggleSwitch
            :checked="businessProfile?.expediter_enabled"
            :loading="isTogglingExpediter"
            aria-label="Mesero avanza estado desde POS"
            @change="handleToggleExpediter"
          />
        </div>

        <div class="space-y-4 px-4 py-3">
          <div class="flex min-h-[40px] items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-semibold leading-snug text-text-primary">Consumo mínimo por mesa</p>
            </div>
            <UiToggleSwitch
              v-model:checked="draftMinimumConsumptionEnabled"
              :disabled="isSavingMinimumConsumption"
              :aria-label="draftMinimumConsumptionEnabled ? 'Desactivar consumo mínimo' : 'Activar consumo mínimo'"
            />
          </div>

          <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(180px,240px)_minmax(190px,230px)_auto] lg:items-end">
            <div class="space-y-1">
              <label for="minimum-consumption-amount" class="text-xs font-medium text-text-secondary">
                Monto COP
              </label>
              <input
                id="minimum-consumption-amount"
                v-model="draftMinimumConsumptionAmount"
                type="number"
                min="0"
                step="1000"
                inputmode="numeric"
                class="input-base w-full min-h-[44px] px-3 py-2 text-sm"
                :class="minimumConsumptionAmountInvalid ? 'border-state-danger-border' : ''"
                :disabled="isSavingMinimumConsumption || !draftMinimumConsumptionEnabled"
                placeholder="0"
              />
            </div>

            <label
              class="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:border-primary/40"
              :class="isSavingMinimumConsumption ? 'opacity-50 pointer-events-none' : ''"
            >
              <span class="text-sm font-medium text-text-primary">Modo restrictivo</span>
              <UiToggleSwitch
                v-model:checked="draftMinimumConsumptionRestrictive"
                :disabled="isSavingMinimumConsumption || !draftMinimumConsumptionEnabled"
                aria-label="Modo restrictivo"
              />
            </label>

            <button
              type="button"
              class="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-action-primary-bg px-4 py-2 text-sm font-semibold text-action-primary-text transition-colors hover:bg-action-primary-hover-bg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              :disabled="isSavingMinimumConsumption || !minimumConsumptionHasChanges || minimumConsumptionAmountInvalid"
              @click="saveMinimumConsumptionConfig"
            >
              <UiLoadingDots v-if="isSavingMinimumConsumption" size="8px" color="currentColor" />
              <span v-else>Guardar</span>
            </button>
          </div>

          <p v-if="minimumConsumptionAmountInvalid" class="text-xs text-state-danger-text">
            El monto debe ser un número mayor o igual a 0.
          </p>
        </div>

      </div>
    </div>

    <!-- ══════ ESTACIONES DE PREPARACIÓN (shown when comandas ON) ══════ -->
    <div v-if="businessProfile?.comandas_enabled" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2">
          <QueueListIcon class="w-5 h-5 text-primary flex-shrink-0" />
          <h3 class="text-base sm:text-lg font-semibold text-text-primary">Estaciones de preparación</h3>
        </div>
        <button
          type="button"
          @click="openCreateStation"
          :disabled="isActiveKitchenQuotaBlocked"
          :title="isActiveKitchenQuotaBlocked ? activeKitchenQuotaMessage : 'Crear estación'"
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg transition-colors min-h-[36px]"
          :class="isActiveKitchenQuotaBlocked ? 'opacity-50 cursor-not-allowed hover:bg-action-primary-bg' : ''"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          Nueva
        </button>
      </div>
      <p
        v-if="isActiveKitchenQuotaBlocked"
        class="mb-4 rounded-lg border border-state-warning-border bg-state-warning-bg px-3 py-2 text-xs text-state-warning-text"
      >
        {{ activeKitchenQuotaMessage }}
      </p>

      <UiResponsiveDataView
        :data="stations"
        :columns="stationColumns"
        empty-message="Sin estaciones configuradas"
        empty-sub-message="Crea la primera estación para empezar."
        item-key="id"
        row-size="sm"
      >
        <template #card="{ item: st }">
          <GestionCocinaStationCard
            :station="st"
            :is-toggling="togglingStationId === st.id"
            @edit="openEditStation"
            @toggle="handleToggleStation"
          >
            <template #kds="{ station: cardStation }">
              <div v-if="businessProfile?.kds_enabled && cardStation.is_active" class="flex items-center gap-1.5">
                <button
                  v-if="!kdsTokens[cardStation.id]"
                  @click="generateKdsToken(cardStation.id)"
                  :disabled="generatingToken === cardStation.id"
                  class="flex h-8 w-8 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text hover:bg-badge-primary-hover-bg transition-colors disabled:opacity-50"
                  aria-label="Generar QR KDS"
                  title="Generar QR"
                >
                  <UiLoadingDots v-if="generatingToken === cardStation.id" size="7px" color="currentColor" />
                  <QrCodeIcon v-else class="w-4 h-4" />
                </button>
                <template v-else>
                  <button
                    @click="copyKdsUrl(cardStation.id)"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text hover:bg-badge-primary-hover-bg transition-colors"
                    aria-label="Copiar enlace KDS"
                    title="Copiar enlace"
                  >
                    <ClipboardIcon class="w-4 h-4" />
                  </button>
                  <button
                    @click="revokeKdsToken(cardStation.id)"
                    :disabled="revokingToken === cardStation.id"
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-state-danger-text hover:bg-state-danger-bg transition-colors disabled:opacity-50"
                    aria-label="Revocar enlace KDS"
                    title="Revocar enlace"
                  >
                    <UiLoadingDots v-if="revokingToken === cardStation.id" size="7px" color="currentColor" />
                    <XMarkIcon v-else class="w-4 h-4" />
                  </button>
                  <button
                    @click="downloadKdsQrPng(cardStation.id, cardStation.name)"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text hover:bg-badge-primary-hover-bg transition-colors"
                    aria-label="Descargar QR KDS"
                    title="Descargar QR"
                  >
                    <ArrowDownTrayIcon class="w-4 h-4" />
                  </button>
                </template>
              </div>
            </template>
          </GestionCocinaStationCard>
        </template>
        <template #cell-name="{ item: st }">
          <div class="flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: st.color }" />
            <span class="text-sm font-medium text-text-primary">{{ st.name }}</span>
          </div>
        </template>
        <template #cell-monitor="{ item: st }">
          <span v-if="st.kitchen_name" class="text-sm text-text-secondary font-mono">{{ st.kitchen_name }}</span>
          <span v-else class="text-xs text-text-tertiary italic">—</span>
        </template>
        <template #cell-status="{ item: st }">
          <UiStatusBadge
            :variant="st.is_active ? 'success' : 'secondary'"
            :value="st.is_active ? 'Activa' : 'Inactiva'"
            format="text"
            size="sm"
          />
        </template>
        <template #cell-thresholds="{ item: st }">
          <span class="text-xs text-text-secondary">{{ st.alert_threshold_1_min }}m / {{ st.alert_threshold_2_min }}m</span>
        </template>
        <template #cell-kds="{ item: st }">
          <div v-if="businessProfile?.kds_enabled && st.is_active" class="flex items-center gap-1.5">
            <button
              v-if="!kdsTokens[st.id]"
              @click="generateKdsToken(st.id)"
              :disabled="generatingToken === st.id"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text hover:bg-badge-primary-hover-bg transition-colors disabled:opacity-50"
              aria-label="Generar QR KDS"
              title="Generar QR"
            >
              <UiLoadingDots v-if="generatingToken === st.id" size="7px" color="currentColor" />
              <QrCodeIcon v-else class="w-4 h-4" />
            </button>
            <template v-else>
              <button
                @click="copyKdsUrl(st.id)"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text hover:bg-badge-primary-hover-bg transition-colors"
                aria-label="Copiar enlace KDS"
                title="Copiar enlace"
              >
                <ClipboardIcon class="w-4 h-4" />
              </button>
              <button
                @click="revokeKdsToken(st.id)"
                :disabled="revokingToken === st.id"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-state-danger-text hover:bg-state-danger-bg transition-colors disabled:opacity-50"
                aria-label="Revocar enlace KDS"
                title="Revocar enlace"
              >
                <UiLoadingDots v-if="revokingToken === st.id" size="7px" color="currentColor" />
                <XMarkIcon v-else class="w-4 h-4" />
              </button>
              <button
                @click="downloadKdsQrPng(st.id, st.name)"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text hover:bg-badge-primary-hover-bg transition-colors"
                aria-label="Descargar QR KDS"
                title="Descargar QR"
              >
                <ArrowDownTrayIcon class="w-4 h-4" />
              </button>
            </template>
          </div>
          <span v-else class="text-xs text-text-tertiary">—</span>
        </template>
        <template #cell-actions="{ item: st }">
          <div class="flex items-center gap-1">
            <button
              @click="openEditStation(st)"
              class="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
              :aria-label="`Editar estación ${st.name}`"
            >
              <PencilSquareIcon class="w-4 h-4" />
            </button>
            <button
              @click="handleToggleStation(st)"
              :disabled="togglingStationId === st.id"
              class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              :class="st.is_active ? 'text-state-warning-text hover:bg-state-warning-bg border border-state-warning-border' : 'text-state-success-text hover:bg-state-success-bg border border-state-success-border'"
            >
              <UiLoadingDots v-if="togglingStationId === st.id" size="7px" color="currentColor" />
              <span v-else>{{ st.is_active ? 'Desactivar' : 'Activar' }}</span>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>

    <!-- ══════ ROUTING DE CATEGORÍAS (shown when comandas ON) ══════ -->
    <div v-if="businessProfile?.comandas_enabled" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <div class="flex items-center gap-2 mb-1">
        <ArrowsRightLeftIcon class="w-5 h-5 text-primary flex-shrink-0" />
        <h3 class="text-base sm:text-lg font-semibold text-text-primary">Routing de categorías</h3>
      </div>
      <p class="text-xs text-text-secondary mb-4">
        Define a qué estación deben enviarse los productos de cada categoría. Sin estación asignada = no genera comanda.
      </p>
      <UiResponsiveDataView
        :data="mappedCategories"
        :columns="categoryColumns"
        empty-message="Sin categorías"
        empty-sub-message="Crea categorías en el menú para asignarlas."
        item-key="id"
        row-size="sm"
      >
        <template #card="{ item: cat }">
          <GestionCocinaCategoryMappingRow
            :category="cat"
            :stations="stations"
            :loading="isAssigningCategoryId === cat.id"
            @assign="(stId) => handleAssignCategory(cat.id, stId)"
          />
        </template>
        <template #cell-name="{ item: cat }">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
              {{ cat.name.substring(0, 2).toUpperCase() }}
            </div>
            <span class="text-sm font-medium text-text-primary">{{ cat.name }}</span>
          </div>
        </template>
        <template #cell-station="{ item: cat }">
          <template v-if="stations.find((s: any) => s.id === cat.station_id)">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
              :style="{
                backgroundColor: `${stations.find((s: any) => s.id === cat.station_id)?.color}15`,
                color: stations.find((s: any) => s.id === cat.station_id)?.color,
                borderColor: `${stations.find((s: any) => s.id === cat.station_id)?.color}30`,
              }"
            >
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :style="{ backgroundColor: stations.find((s: any) => s.id === cat.station_id)?.color }"
              />
              {{ stations.find((s: any) => s.id === cat.station_id)?.name }}
            </span>
          </template>
          <span v-else class="text-xs text-text-tertiary italic">Sin asignar</span>
        </template>
        <template #cell-assign="{ item: cat }">
          <div class="flex justify-end">
            <select
              :value="cat.station_id || ''"
              @change="(e) => handleAssignCategory(cat.id, (e.target as HTMLSelectElement).value || null)"
              :disabled="isAssigningCategoryId === cat.id"
              class="min-w-[130px] px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-text-primary disabled:opacity-50"
            >
              <option value="">(Sin asignar)</option>
              <option v-for="st in stations" :key="st.id" :value="st.id">{{ st.name }}</option>
            </select>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>

    </template>

    <!-- Station Deactivate Confirmation Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="deactivateModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-backdrop/60 backdrop-blur-sm"
          @click.self="deactivateModalOpen = false"
        >
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
            appear
          >
            <div v-if="deactivateModalOpen" class="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div class="relative px-5 pt-5 pb-4 border-b border-border/60">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-state-warning-bg border border-state-warning-border">
                    <ExclamationTriangleIcon class="w-5 h-5 text-state-warning-icon" />
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <h3 class="text-base font-bold text-text-primary leading-tight">Desactivar estación</h3>
                    <div class="flex items-center gap-1.5 mt-1">
                      <span
                        class="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: deactivateModalStation?.color ?? '#6B7280' }"
                      />
                      <span class="text-sm text-text-secondary font-medium truncate">{{ deactivateModalStation?.name }}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  @click="deactivateModalOpen = false"
                  aria-label="Cerrar"
                  class="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors"
                >
                  <XMarkIcon class="w-4 h-4" />
                </button>
              </div>

              <div class="px-5 py-4 flex flex-col gap-4">
                <div v-if="isLoadingDeactivateInfo" class="flex flex-col items-center justify-center py-8 gap-3">
                  <UiLoadingDots size="10px" />
                  <p class="text-xs text-text-tertiary">Verificando estado...</p>
                </div>

                <template v-else-if="deactivateInfo">
                  <div v-if="deactivateInfo.active_comandas_count > 0" class="rounded-xl bg-state-danger-bg border border-state-danger-border p-4">
                    <div class="flex items-start gap-3">
                      <div class="w-8 h-8 rounded-lg bg-state-danger-bg flex items-center justify-center flex-shrink-0">
                        <ExclamationTriangleIcon class="w-4 h-4 text-state-danger-icon" />
                      </div>
                      <div>
                        <p class="text-sm font-semibold text-state-danger-text leading-snug">No se puede desactivar ahora</p>
                        <p class="text-xs text-state-danger-text/80 mt-1 leading-relaxed">
                          Hay <strong>{{ deactivateInfo.active_comandas_count }} comanda{{ deactivateInfo.active_comandas_count !== 1 ? 's' : '' }} activa{{ deactivateInfo.active_comandas_count !== 1 ? 's' : '' }}</strong> en esta estación. Resuélvelas antes de desactivarla.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div v-if="deactivateInfo.affected_categories.length > 0" class="rounded-xl bg-state-warning-bg border border-state-warning-border p-4">
                    <p class="text-xs font-bold text-state-warning-text uppercase tracking-wider mb-2">
                      {{ deactivateInfo.affected_categories.length }} categoría{{ deactivateInfo.affected_categories.length !== 1 ? 's' : '' }} afectada{{ deactivateInfo.affected_categories.length !== 1 ? 's' : '' }}
                    </p>
                    <p class="text-xs text-state-warning-text/80 leading-relaxed mb-3">
                      Sus productos dejarán de generar comandas mientras la estación esté inactiva.
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="cat in deactivateInfo.affected_categories"
                        :key="cat.id"
                        class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface border border-state-warning-border text-state-warning-text"
                      >{{ cat.name }}</span>
                    </div>
                  </div>

                  <div
                    v-if="deactivateInfo.affected_categories.length === 0 && deactivateInfo.active_comandas_count === 0"
                    class="flex items-center gap-3 rounded-xl bg-state-success-bg border border-state-success-border px-4 py-3"
                  >
                    <div class="w-7 h-7 rounded-full bg-state-success-bg flex items-center justify-center flex-shrink-0">
                      <svg class="w-3.5 h-3.5 text-state-success-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p class="text-sm text-state-success-text leading-snug">Sin impacto activo. Se puede desactivar de forma segura.</p>
                  </div>
                </template>
              </div>

              <div class="px-5 pb-5 flex gap-2.5">
                <button
                  type="button"
                  @click="deactivateModalOpen = false"
                  class="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary hover:border-border/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  v-if="deactivateInfo"
                  type="button"
                  :disabled="deactivateInfo.active_comandas_count > 0 || isConfirmingDeactivate"
                  class="flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-state-danger-action-bg text-state-danger-action-text hover:bg-state-danger-action-bg/90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                  @click="confirmDeactivateStation"
                >
                  <UiLoadingDots v-if="isConfirmingDeactivate" size="8px" color="currentColor" />
                  <template v-else>
                    <span>Desactivar</span>
                  </template>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Station Form Modal -->
    <GestionCocinaStationFormModal
      v-if="stationModalOpen"
      v-model="stationModalOpen"
      :initial-data="editingStation"
      :loading="isSavingStation"
      @close="stationModalOpen = false"
      @submit="handleSaveStation"
    />
  </div>
</template>

<script setup lang="ts">
import {
  FireIcon,
  QueueListIcon,
  PlusIcon,
  ClipboardIcon,
  QrCodeIcon,
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline'
import QRCode from 'qrcode'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Comandas & Cocina | Operaciones' })

const { currentTenant } = useTenantReactive()
const toast = useToast()
const { operationalQuotas, fetchBillingOverview } = useBilling()

// ─── Business profile (operaciones audience aggregator — gated under OPERACIONES) ───
const cache = useQueryCache()
const { data: profileData, asyncStatus: profileAsyncStatus, refetch: refreshProfile } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id ?? 'none'],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Toggle helper — invalidates BOTH audience caches so POS reflects operational
// changes immediately (POS reads kds_enabled / comandas_enabled / expediter_enabled
// from /api/pos/restaurant-context which shares no cache key with operaciones).
const invalidateContextCaches = async () => {
  await cache.invalidateQueries({ key: ['operaciones', 'restaurant-context'] })
  await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
}
const businessProfile = computed(() => profileData.value?.data ?? null)

// ─── Minimum consumption config (#1368) ───
const isSavingMinimumConsumption = ref(false)
const draftMinimumConsumptionEnabled = ref(false)
const draftMinimumConsumptionAmount = ref('0')
const draftMinimumConsumptionRestrictive = ref(false)

const normalizeAmountInput = (value: unknown) => {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0
}

watch(
  businessProfile,
  (profile) => {
    if (!profile) return
    draftMinimumConsumptionEnabled.value = profile.minimum_consumption_enabled === true
    draftMinimumConsumptionAmount.value = String(normalizeAmountInput(profile.minimum_consumption_amount))
    draftMinimumConsumptionRestrictive.value = profile.minimum_consumption_restrictive === true
  },
  { immediate: true },
)

const minimumConsumptionAmountNumber = computed(() => Number(draftMinimumConsumptionAmount.value || 0))
const minimumConsumptionAmountInvalid = computed(() => (
  !Number.isFinite(minimumConsumptionAmountNumber.value) ||
  minimumConsumptionAmountNumber.value < 0
))
const minimumConsumptionHasChanges = computed(() => {
  const profile = businessProfile.value
  if (!profile) return false
  return (
    draftMinimumConsumptionEnabled.value !== (profile.minimum_consumption_enabled === true) ||
    normalizeAmountInput(draftMinimumConsumptionAmount.value) !== normalizeAmountInput(profile.minimum_consumption_amount) ||
    draftMinimumConsumptionRestrictive.value !== (profile.minimum_consumption_restrictive === true)
  )
})

const saveMinimumConsumptionConfig = async () => {
  if (isSavingMinimumConsumption.value || minimumConsumptionAmountInvalid.value) return
  isSavingMinimumConsumption.value = true
  try {
    await $fetch('/api/operaciones/minimum-consumption/config', {
      method: 'PATCH',
      body: {
        enabled: draftMinimumConsumptionEnabled.value,
        amount: normalizeAmountInput(draftMinimumConsumptionAmount.value),
        restrictive: draftMinimumConsumptionRestrictive.value,
      },
    })
    await invalidateContextCaches()
    toast.success('Configuración de consumo mínimo guardada', { title: 'Guardado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al guardar consumo mínimo', { title: 'Error' })
  } finally {
    isSavingMinimumConsumption.value = false
  }
}

// ─── Stations & categories ───
const { data: stationsData, asyncStatus: stationsAsyncStatus, refetch: refetchStations } = useQuery({
  key: () => ['tenant', 'stations', currentTenant.value?.id ?? 'none'],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const stations = computed(() => stationsData.value?.data ?? [])
const activeKitchenQuota = computed(() => operationalQuotas.value.active_kitchens)
const isActiveKitchenQuotaBlocked = computed(() => activeKitchenQuota.value.blocked)
const activeKitchenQuotaMessage = computed(() => {
  const quota = activeKitchenQuota.value
  const metric = quota.metric

  if (!metric || metric.limit === null) return quota.message

  const used = metric.used.toLocaleString('es-CO')
  const limit = metric.limit.toLocaleString('es-CO')
  return `${quota.message} Uso actual: ${used} de ${limit} ${quota.unit}. Revisa Mi Plan para ampliar tu cupo.`
})

const { data: categoryStationsData, asyncStatus: categoryStationsAsyncStatus, refetch: refetchCategoryStations } = useQuery({
  key: () => ['tenant', 'category-stations', currentTenant.value?.id ?? 'none'],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const { data: categoriesData, asyncStatus: categoriesAsyncStatus, refetch: refetchCategories } = useQuery({
  key: () => ['tenant', 'menu-categories', currentTenant.value?.id ?? 'none'],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/menu/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

// KDS tokens — fetched per-active-station in parallel and merged into a single
// object keyed by station_id. Defined here (not next to the mutation handlers)
// so isRefreshing / refreshAll below can reference its asyncStatus + refetch.
const stationsForTokens = computed(() =>
  (stationsData.value?.data ?? []).filter((s: any) => s.is_active),
)
const {
  data: kdsTokensData,
  asyncStatus: kdsTokensAsyncStatus,
  refetch: refetchKdsTokens,
} = useQuery({
  key: () => ['tenant', 'kds-tokens', currentTenant.value?.id ?? 'none'],
  query: async () => {
    const list = stationsForTokens.value
    if (list.length === 0) return {} as Record<string, string>
    const entries = await Promise.all(
      list.map(async (st: any) => {
        try {
          const res = await $fetch<any>(`/api/api/stations/${st.id}/kds-token`)
          return [st.id, res?.data?.token ?? null] as const
        } catch {
          return [st.id, null] as const
        }
      }),
    )
    return Object.fromEntries(entries.filter(([, t]) => !!t)) as Record<string, string>
  },
  enabled: () => !!currentTenant.value && stationsForTokens.value.length > 0,
  staleTime: 60_000,
})

// ─── Layout-level loading orchestration (issue #461) ───
// First-load: block UI until the queries that drive the main listing have data.
// `stationsData` + `categoriesData` are the critical ones; profile and category-station
// mappings load alongside but their loading is non-blocking (rendered inline).
// kds-tokens also blocks so the persistent KDS URLs render immediately without
// flickering from "Generar enlace" → "Copiar" once tokens hydrate.
const isLoading = computed(() => (
  !stationsData.value
  || !categoriesData.value
  || (stationsForTokens.value.length > 0 && !kdsTokensData.value)
))

// Progressive refresh: any of the queries revalidating with data in place.
// OR-combined so any background refetch surfaces in the layout indicator.
const isRefreshing = computed(() => (
  (profileAsyncStatus.value === 'loading' && profileData.value != null) ||
  (stationsAsyncStatus.value === 'loading' && stationsData.value != null) ||
  (categoryStationsAsyncStatus.value === 'loading' && categoryStationsData.value != null) ||
  (categoriesAsyncStatus.value === 'loading' && categoriesData.value != null) ||
  (kdsTokensAsyncStatus.value === 'loading' && kdsTokensData.value != null)
))

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

const refreshAll = async () => {
  await Promise.all([
    refreshProfile(),
    refetchStations(),
    refetchCategoryStations(),
    refetchCategories(),
    refetchKdsTokens(),
  ])
}
const refreshStationsAndBilling = async () => {
  await Promise.all([
    refetchStations(),
    fetchBillingOverview(),
  ])
}
onMounted(() => setRefreshHandler(refreshAll))
onUnmounted(() => clearRefreshHandler(refreshAll))

const mappedCategories = computed(() => {
  const cats = categoriesData.value?.data ?? []
  const maps = categoryStationsData.value?.data ?? []
  return cats.map((cat: any) => {
    const m = maps.find((x: any) => x.category_id === cat.id)
    return { ...cat, station_id: m?.station_id ?? null }
  })
})

// ─── Comandas / KDS toggles ───
const isTogglingComandas = ref(false)
const isTogglingKds = ref(false)
const showDisableComandasWarning = ref(false)

const handleToggleComandas = async (event: Event) => {
  const newState = (event.target as HTMLInputElement).checked
  if (!newState) {
    ;(event.target as HTMLInputElement).checked = true
    showDisableComandasWarning.value = true
    return
  }
  if (isTogglingComandas.value) return
  isTogglingComandas.value = true
  try {
    await $fetch('/api/operaciones/toggles/comandas', { method: 'PATCH', body: { enabled: true } })
    await invalidateContextCaches()
    toast.success('Módulo de comandas activado', { title: 'Activado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al activar comandas', { title: 'Error' })
  } finally {
    isTogglingComandas.value = false
  }
}

const confirmDisableComandas = async () => {
  showDisableComandasWarning.value = false
  if (isTogglingComandas.value) return
  isTogglingComandas.value = true
  try {
    await $fetch('/api/operaciones/toggles/comandas', { method: 'PATCH', body: { enabled: false } })
    await invalidateContextCaches()
    toast.success('Módulo de comandas desactivado', { title: 'Desactivado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al desactivar comandas', { title: 'Error' })
  } finally {
    isTogglingComandas.value = false
  }
}

const handleToggleKds = async (event: Event) => {
  if (isTogglingKds.value) return
  const newState = (event.target as HTMLInputElement).checked
  isTogglingKds.value = true
  try {
    await $fetch('/api/operaciones/toggles/kds', { method: 'PATCH', body: { enabled: newState } })
    await invalidateContextCaches()
    toast.success(
      newState ? 'Pantallas KDS activadas' : 'Pantallas KDS desactivadas',
      { title: newState ? 'Activado' : 'Desactivado' }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al cambiar estado KDS', { title: 'Error' })
  } finally {
    isTogglingKds.value = false
  }
}

// Issue #537 — Expediter mode toggle (waiter advances comanda state from POS)
const isTogglingExpediter = ref(false)
const handleToggleExpediter = async (event: Event) => {
  if (isTogglingExpediter.value) return
  const newState = (event.target as HTMLInputElement).checked
  isTogglingExpediter.value = true
  try {
    await $fetch('/api/operaciones/toggles/expediter', { method: 'PATCH', body: { enabled: newState } })
    await invalidateContextCaches()
    toast.success(
      newState
        ? 'El mesero puede avanzar comandas desde el POS'
        : 'Solo cocina avanza comandas (desde KDS)',
      { title: newState ? 'Activado' : 'Desactivado' }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al cambiar modo expedidor', { title: 'Error' })
  } finally {
    isTogglingExpediter.value = false
  }
}

const kdsBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://warocol.com'

// Local writable mirror of the kds-tokens query above — kept so generate /
// revoke mutations can update the UI optimistically without an extra refetch.
const kdsTokens = ref<Record<string, string>>({})
const generatingToken = ref<string | null>(null)
const revokingToken = ref<string | null>(null)

// Hydrate the mirror whenever the query refreshes (initial load + manual
// refresh + tenant switch all flow through the same path).
watch(kdsTokensData, (data) => {
  if (data) kdsTokens.value = { ...data }
}, { immediate: true })

const generateKdsToken = async (stationId: string) => {
  generatingToken.value = stationId
  try {
    const res = await $fetch<any>(`/api/api/stations/${stationId}/kds-token`, { method: 'POST' })
    if (res.data?.token) {
      kdsTokens.value[stationId] = res.data.token
    }
    toast.success('Enlace KDS generado')
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al generar token')
  } finally {
    generatingToken.value = null
  }
}

const revokeKdsToken = async (stationId: string) => {
  revokingToken.value = stationId
  try {
    await $fetch(`/api/api/stations/${stationId}/kds-token`, { method: 'DELETE' })
    delete kdsTokens.value[stationId]
    toast.success('Enlace KDS revocado')
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al revocar token')
  } finally {
    revokingToken.value = null
  }
}

const buildKdsUrl = (stationId: string) => {
  const token = kdsTokens.value[stationId]
  return token
    ? `${kdsBaseUrl}/cocina/${stationId}?token=${token}`
    : `${kdsBaseUrl}/cocina/${stationId}`
}

const copyKdsUrl = (stationId: string) => {
  const url = buildKdsUrl(stationId)
  navigator.clipboard.writeText(url)
  toast.success('Enlace KDS copiado al portapapeles')
}

const downloadKdsQrPng = async (stationId: string, stationName: string) => {
  if (!kdsTokens.value[stationId]) {
    toast.error('Genera el enlace KDS primero', { title: 'Sin enlace' })
    return
  }

  try {
    const dataUrl = await QRCode.toDataURL(buildKdsUrl(stationId), { width: 512, margin: 2 })
    const anchor = document.createElement('a')
    const safeName = stationName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'estacion'
    anchor.href = dataUrl
    anchor.download = `qr-kds-${safeName}.png`
    anchor.click()
    toast.success('QR KDS descargado', { title: 'Listo' })
  } catch {
    toast.error('No se pudo generar el código QR', { title: 'Error' })
  }
}

// ─── Station CRUD ───
const stationColumns = [
  { key: 'name', title: 'Nombre', sortable: false },
  { key: 'monitor', title: 'Monitor', sortable: false },
  { key: 'status', title: 'Estado', sortable: false },
  { key: 'thresholds', title: 'Alertas', sortable: false },
  { key: 'kds', title: 'Enlace KDS', sortable: false },
  { key: 'actions', title: '', sortable: false },
]

const categoryColumns = [
  { key: 'name', title: 'Categoría', sortable: false },
  { key: 'station', title: 'Estación asignada', sortable: false },
  { key: 'assign', title: '', sortable: false },
]

const togglingStationId = ref<string | null>(null)
const stationModalOpen = ref(false)
const editingStation = ref<any>(null)
const isSavingStation = ref(false)
const isAssigningCategoryId = ref<string | null>(null)

const deactivateModalOpen = ref(false)
const deactivateModalStation = ref<any>(null)
const deactivateInfo = ref<{ active_comandas_count: number; affected_categories: { id: string; name: string }[] } | null>(null)
const isLoadingDeactivateInfo = ref(false)
const isConfirmingDeactivate = ref(false)

const openEditStation = (st: any) => { editingStation.value = st; stationModalOpen.value = true }

const showActiveKitchenQuotaBlocked = () => {
  toast.warning(activeKitchenQuotaMessage.value, { title: 'Cupo de cocinas agotado' })
}

const openCreateStation = () => {
  if (isActiveKitchenQuotaBlocked.value) {
    showActiveKitchenQuotaBlocked()
    return
  }

  editingStation.value = null
  stationModalOpen.value = true
}

const isQuotaExceededError = (err: any) => {
  const detail = err?.data?.detail
  return err?.status === 429 ||
    err?.statusCode === 429 ||
    err?.data?.code === 'quota_exceeded' ||
    err?.data?.error === 'quota_exceeded' ||
    detail?.code === 'quota_exceeded' ||
    detail?.error === 'quota_exceeded'
}

const quotaExceededMessageFromError = (err: any) => {
  const detail = err?.data?.detail ?? err?.data ?? {}
  const used = typeof detail.used === 'number' ? detail.used : null
  const limit = typeof detail.limit === 'number' ? detail.limit : null

  if (used !== null && limit !== null) {
    return `Alcanzaste el límite de cocinas activas de tu plan. Uso actual: ${used.toLocaleString('es-CO')} de ${limit.toLocaleString('es-CO')} cocinas. Revisa Mi Plan para ampliar tu cupo.`
  }

  return typeof detail === 'string' ? detail : activeKitchenQuotaMessage.value
}

const stationErrorMessage = (err: any, fallback: string) => {
  if (isQuotaExceededError(err)) return quotaExceededMessageFromError(err)
  return err?.data?.detail || err?.data?.message || err?.message || fallback
}

const handleSaveStation = async (formData: any) => {
  if (!editingStation.value && isActiveKitchenQuotaBlocked.value) {
    showActiveKitchenQuotaBlocked()
    return
  }

  isSavingStation.value = true
  try {
    if (editingStation.value) {
      await $fetch(`/api/api/stations/${editingStation.value.id}`, { method: 'PATCH', body: formData })
      toast.success('Estación actualizada', { title: 'Guardado' })
    } else {
      await $fetch('/api/api/stations', { method: 'POST', body: formData })
      toast.success('Estación creada', { title: 'Creado' })
    }
    stationModalOpen.value = false
    if (editingStation.value) {
      await refetchStations()
    } else {
      await refreshStationsAndBilling()
    }
  } catch (e: any) {
    toast.error(stationErrorMessage(e, 'Error al guardar la estación'), { title: 'Error' })
  } finally {
    isSavingStation.value = false
  }
}

const handleToggleStation = async (station: any) => {
  if (togglingStationId.value === station.id) return
  if (!station.is_active) {
    if (isActiveKitchenQuotaBlocked.value) {
      showActiveKitchenQuotaBlocked()
      return
    }

    togglingStationId.value = station.id
    try {
      await $fetch(`/api/api/stations/${station.id}/toggle`, { method: 'PATCH', body: { is_active: true } })
      toast.success('Estación activada')
      await refreshStationsAndBilling()
    } catch (e: any) {
      toast.error(stationErrorMessage(e, 'Error al activar la estación'), { title: 'Error' })
    } finally {
      togglingStationId.value = null
    }
    return
  }
  togglingStationId.value = station.id
  try {
    const res = await $fetch<{ success: boolean; data: any }>(`/api/api/stations/${station.id}/deactivate-info`)
    const info = res.data
    if (info.active_comandas_count > 0 || info.affected_categories.length > 0) {
      deactivateModalStation.value = station
      deactivateInfo.value = info
      deactivateModalOpen.value = true
      togglingStationId.value = null
      return
    }
    await $fetch(`/api/api/stations/${station.id}/toggle`, { method: 'PATCH', body: { is_active: false } })
    toast.success('Estación desactivada')
    await refreshStationsAndBilling()
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al desactivar la estación', { title: 'Error' })
  } finally {
    togglingStationId.value = null
  }
}

const confirmDeactivateStation = async () => {
  if (!deactivateModalStation.value) return
  isConfirmingDeactivate.value = true
  try {
    await $fetch(`/api/api/stations/${deactivateModalStation.value.id}/toggle`, {
      method: 'PATCH',
      body: { is_active: false },
    })
    toast.success('Estación desactivada')
    deactivateModalOpen.value = false
    await refreshStationsAndBilling()
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al desactivar la estación', { title: 'Error' })
  } finally {
    isConfirmingDeactivate.value = false
  }
}

const handleAssignCategory = async (categoryId: string, stationId: string | null) => {
  isAssigningCategoryId.value = categoryId
  try {
    await $fetch(`/api/api/stations/categories/${categoryId}`, {
      method: 'POST',
      body: { station_id: stationId },
    })
    toast.success('Asignación actualizada')
    await refetchCategoryStations()
  } catch (e: any) {
    const detail = e.data?.detail || e.message
    toast.error(`Error al asignar categoría: ${detail}`, { title: 'Error' })
  } finally {
    isAssigningCategoryId.value = null
  }
}
</script>
