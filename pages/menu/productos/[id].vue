<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError || !productData" />

    <!-- Venta libre shell — not editable as a normal product -->
    <div v-else-if="isOpenSaleShell" class="max-w-2xl mx-auto">
      <div class="bg-surface border-2 border-primary/30 rounded-xl p-6 md:p-8 shadow-sm space-y-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name="heroicons:shopping-bag" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-text-primary">
              {{ productData.data.name }} — {{ t('menu.productos.openSale') }}
            </h2>
            <p class="text-sm text-text-secondary mt-1">
              {{ t('menu.productos.openSaleDescription') }}
            </p>
          </div>
        </div>
        <ul class="text-sm text-text-secondary space-y-1 list-disc list-inside">
          <li>{{ t('menu.productos.openSaleToggleHelp') }}</li>
          <li>{{ t('menu.productos.openSaleGridHelp') }}</li>
          <li>{{ t('menu.productos.openSaleUnavailableHelp') }}</li>
        </ul>
        <div class="flex flex-col sm:flex-row gap-3 pt-2">
          <UiButton type="button" variant="default" class="flex-1 bg-shell-cta-bg text-shell-cta-text hover:bg-shell-cta-hover-bg focus-visible:ring-shell-cta-focus-ring" @click="goToOpenSaleSettings">
            {{ t('menu.productos.goToCustomize') }}
          </UiButton>
          <UiButton type="button" variant="default" class="flex-1 bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring" @click="router.push('/menu/productos')">
            {{ t('menu.productos.backToCatalog') }}
          </UiButton>
        </div>
      </div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <!-- Left Column: Form Content -->
      <div class="xl:col-span-2 space-y-6">
        <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
          <!-- Información Básica -->
          <UiFormSection :title="t('menu.productos.detailTitle')">
            <template #badge>
              <UiStatusBadge
                v-if="isResaleProduct"
                :value="t('menu.common.reventa')"
                format="text"
                variant="primary"
                size="sm"
                class="flex-shrink-0"
              />
            </template>
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-[1fr_7.5rem] gap-4 sm:gap-5 items-start">
                <div class="space-y-4 min-w-0">
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                      {{ t('menu.productos.nameRequired') }}
                    </label>
                    <input
                      v-model="form.name"
                      type="text"
                      required
                      class="input-base w-full px-4 py-2"
                      :placeholder="t('menu.productos.namePlaceholder')"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.productos.description') }} <span class="text-text-tertiary font-normal">{{ t('menu.recetas.form.optionalSuffix') }}</span>
                    </label>
                    <textarea
                      v-model="form.description"
                      rows="3"
                      class="input-base w-full px-4 py-2 resize-y min-h-[5.5rem] sm:min-h-[6.5rem]"
                      :placeholder="t('menu.productos.descriptionPlaceholder')"
                    ></textarea>
                  </div>
                </div>

                <div class="flex flex-col gap-2 sm:w-[7.5rem] flex-shrink-0">
                  <label class="text-sm font-medium text-text-primary">
                    {{ t('menu.productos.photo') }}
                  </label>
                  <div class="w-[5.5rem] h-[5.5rem] sm:w-full sm:aspect-square rounded-lg border border-dashed border-border/80 bg-surface-secondary/50 overflow-hidden flex items-center justify-center">
                    <img
                      v-if="form.image_url"
                      :src="form.image_url"
                      :alt="form.name || t('menu.productos.imageAlt')"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <svg v-else class="w-7 h-7 text-text-tertiary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <button
                      type="button"
                      @click="showImageModal = true"
                      class="min-h-[40px] px-3 py-1.5 text-sm font-medium rounded-lg bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring whitespace-nowrap"
                    >
                      {{ form.image_url ? t('menu.productos.changePhoto') : t('menu.productos.uploadPhoto') }}
                    </button>
                    <button
                      v-if="form.image_url"
                      type="button"
                      @click="form.image_url = ''"
                      class="min-h-[40px] px-3 py-1.5 text-sm font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/15 transition-all focus:outline-none focus:ring-2 focus:ring-destructive/30 whitespace-nowrap"
                    >
                      {{ t('common.delete') }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div :class="businessProfile?.comandas_enabled ? 'sm:col-span-2' : ''">
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.productos.categoryRequired') }}
                  </label>
                  <UiCategorySearchInput
                    :allow-create="true"
                    :initial-value="selectedCategoryName"
                    :placeholder="t('menu.productos.categorySearchPlaceholder')"
                    @select="onCategorySelected"
                    @create="onCategoryCreateRequested"
                  />
                </div>

                <!-- Inherited kitchen station (read-only, comandas only) -->
                <div v-if="businessProfile?.comandas_enabled">
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.productos.kitchen') }}
                  </label>
                  <div class="flex items-center gap-2 min-h-[42px] px-3 py-2 rounded-lg bg-surface-secondary/60 border border-border/60 text-sm">
                    <template v-if="inheritedStation">
                      <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: inheritedStation.color ?? '#94a3b8' }" />
                      <span class="font-medium text-text-primary truncate">{{ inheritedStation.name }}</span>
                      <span class="text-text-tertiary text-xs flex-shrink-0">{{ t('menu.productos.fromCategory') }}</span>
                    </template>
                    <template v-else>
                      <span class="text-text-tertiary text-xs leading-snug flex-1">{{ t('menu.productos.noKitchenCategory') }}</span>
                      <button
                        type="button"
                        @click="showNewStationModal = true"
                        class="min-h-[32px] px-2 py-1 text-xs font-medium rounded-md bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring flex-shrink-0"
                      >
                        {{ t('menu.productos.createStation') }}
                      </button>
                    </template>
                  </div>
                </div>

                <div v-if="!isResaleProduct">
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.productos.preparationTime') }}
                  </label>
                  <input
                    v-model.number="form.preparation_time"
                    type="number"
                    min="0"
                    class="input-base w-full px-4 py-2"
                    placeholder="15"
                  />
                </div>
              </div>
            </div>
          </UiFormSection>

          <!-- Precios -->
          <UiFormSection :title="t('menu.productos.priceSection')">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('menu.productos.salePriceRequired') }}
                </label>
                <div class="relative">
                  <span class="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary">{{ currencyCode }}</span>
                  <UiDecimalInput
                    v-model="form.price"
                    required
                    :precision="currencyMinorUnits"
                    :min="0"
                    class="input-base w-full ps-12 pe-4 py-2"
                    placeholder="15000"
                  />
                </div>
              </div>

              <div v-if="tracksInventory || isResaleProduct">
                <label class="block text-sm font-medium text-text-secondary mb-2">
                  {{ t('menu.productos.realCostSystem') }}
                </label>
                <div class="relative">
                  <input
                    :value="displayRealCost === null ? '—' : formatCurrency(displayRealCost)"
                    type="text"
                    disabled
                    class="input-base w-full px-4 py-2 bg-surface-secondary cursor-not-allowed"
                    placeholder="0"
                  />
                </div>
                <p v-if="showRecipeCostPreview" class="text-xs text-status-warning mt-1">
                  {{ t('menu.productos.recipeCostPreview', { amount: formatCurrency(calculatedCost!) }) }}
                </p>
                <p v-else class="text-xs text-text-tertiary mt-1">
                  {{ t('menu.productos.calculatedFromRecipePurchases') }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('menu.productos.dishCost') }}
                </label>
                <div class="relative">
                  <span class="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary">{{ currencyCode }}</span>
                  <UiDecimalInput
                    v-model="form.costo_percibido"
                    :precision="currencyMinorUnits"
                    :min="0"
                    class="input-base w-full ps-12 pe-4 py-2"
                    :placeholder="t('menu.productos.optional')"
                  />
                </div>
                <p class="text-xs text-text-tertiary mt-1">
                  {{ t('menu.productos.operationalCostHelp') }}
                </p>
              </div>
            </div>

            <!-- Dual margins -->
            <div
              v-if="form.price > 0 && (displayRealCost !== null || form.costo_percibido)"
              class="mt-4 p-3.5 bg-surface-secondary/70 rounded-lg border border-border/60 space-y-2.5"
            >
              <p class="text-xs text-text-secondary leading-snug">
                {{ t('menu.productos.marginsHelp') }}
              </p>
              <div v-if="displayRealCost !== null && displayRealCost > 0" class="flex items-center justify-between gap-3">
                <span class="text-xs font-medium text-text-secondary">{{ t('menu.productos.realMargin') }}</span>
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-sm font-semibold text-text-primary tabular-nums">
                    {{ marginRealValue === null ? '—' : formatCurrency(marginRealValue) }}
                  </span>
                  <UiStatusBadge
                    v-if="marginRealPct(marginPreview) !== null"
                    size="sm"
                    :variant="(marginRealPct(marginPreview) ?? 0) > 50 ? 'success' : 'warning'"
                  >
                    {{ marginRealPct(marginPreview)!.toFixed(1) }}%
                  </UiStatusBadge>
                </div>
              </div>
              <div
                v-if="form.costo_percibido != null && form.costo_percibido > 0"
                class="flex items-center justify-between gap-3"
              >
                <span class="text-xs font-medium text-text-secondary">{{ t('menu.productos.operatingMargin') }}</span>
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-sm font-semibold text-text-primary tabular-nums">
                    {{ marginOperativoValue === null ? '—' : formatCurrency(marginOperativoValue) }}
                  </span>
                  <UiStatusBadge
                    v-if="marginOperativoPct(marginPreview) !== null"
                    size="sm"
                    :variant="(marginOperativoPct(marginPreview) ?? 0) > 50 ? 'success' : 'warning'"
                  >
                    {{ marginOperativoPct(marginPreview)!.toFixed(1) }}%
                  </UiStatusBadge>
                </div>
              </div>
            </div>
          </UiFormSection>


          <UiFormSection
            v-if="hasTaxes"
            :title="usesMenuCategoryTaxUi ? t('menu.productos.taxResolution') : t('menu.productos.taxCategory')"
          >
            <template v-if="usesMenuCategoryTaxUi">
              <p
                v-if="form.tax_resolution === 'inherit'"
                class="mb-3 text-sm text-text-secondary"
              >
                {{ inheritedTaxSummary }}
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" :aria-label="t('menu.productos.taxResolution')">
                <button
                  type="button"
                  @click="setProductTaxResolution('inherit')"
                  :class="[
                    'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                    form.tax_resolution === 'inherit'
                      ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                      : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                  ]"
                >
                  <span class="text-sm font-semibold">{{ t('menu.productos.taxInherit') }}</span>
                  <span class="text-xs leading-snug">{{ t('menu.productos.taxInheritHint') }}</span>
                </button>
                <button
                  type="button"
                  @click="setProductTaxResolution('exempt')"
                  :class="[
                    'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                    form.tax_resolution === 'exempt'
                      ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                      : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                  ]"
                >
                  <span class="text-sm font-semibold">{{ t('menu.productos.exempt') }}</span>
                  <span class="text-xs leading-snug">{{ t('menu.productos.noTax') }}</span>
                </button>
                <button
                  type="button"
                  @click="setProductTaxResolution('line')"
                  :class="[
                    'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                    form.tax_resolution === 'line'
                      ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                      : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                  ]"
                >
                  <span class="text-sm font-semibold">{{ t('menu.productos.taxOverrideLine') }}</span>
                  <span class="text-xs leading-snug">{{ t('menu.productos.taxOverrideLineHint') }}</span>
                </button>
              </div>
              <div v-if="form.tax_resolution === 'line'" class="mt-3">
                <label class="block text-sm font-medium text-text-secondary mb-1.5" for="product-tax-line">
                  {{ t('menu.productos.taxSelectLine') }}
                </label>
                <select
                  id="product-tax-line"
                  v-model="form.tax_line_key"
                  class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option
                    v-for="line in commercialTaxLines"
                    :key="line.key"
                    :value="line.key"
                  >
                    {{ line.label }}
                  </option>
                </select>
              </div>
            </template>
            <div
              v-else
              class="grid grid-cols-1 sm:grid-cols-3 gap-3"
              role="group"
              :aria-label="t('menu.productos.taxCategory')"
            >
              <button
                v-if="taxCategories.includes('standard')"
                type="button"
                @click="form.tax_category = 'standard'"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                  form.tax_category === 'standard'
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <span class="text-sm font-semibold">{{ t('menu.productos.foodBeverage') }}</span>
                <span class="text-xs leading-snug">{{ standardTaxHint }}</span>
              </button>
              <button
                v-if="taxCategories.includes('liquor')"
                type="button"
                @click="form.tax_category = 'liquor'"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                  form.tax_category === 'liquor'
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <span class="text-sm font-semibold">{{ t('menu.productos.takeawayLiquor') }}</span>
                <span class="text-xs leading-snug">{{ liquorTaxHint }}</span>
              </button>
              <button
                v-if="taxCategories.includes('exempt')"
                type="button"
                @click="form.tax_category = 'exempt'"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                  form.tax_category === 'exempt'
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <span class="text-sm font-semibold">{{ t('menu.productos.exempt') }}</span>
                <span class="text-xs leading-snug">{{ t('menu.productos.noTax') }}</span>
              </button>
            </div>
          </UiFormSection>

          <!-- Reventa: equivalencia gr/ml + insumo vinculado (sin receta libre) -->
          <UiFormSection v-if="isResaleProduct" :title="t('menu.productos.inventoryPurchases')">
            <div class="space-y-4">
            <MenuProductResaleCreateForm
              v-model:unit-weight-gr="resaleUnitWeightGr"
              v-model:unit-weight-unit="resaleUnitWeightUnit"
              :linked-ingredient-id="linkedResaleIngredientId"
              :show-error="resaleWeightError"
              @clear-error="resaleWeightError = false"
            />
            <div class="p-4 rounded-xl border border-border bg-surface-secondary/40 space-y-2">
              <p class="text-sm font-medium text-text-primary">{{ t('menu.productos.inventoryPurchases') }}</p>
              <p class="text-xs text-text-secondary">
                {{ WAREHOUSE_COPY.resaleLinkedStockHelp }}
              </p>
              <div v-if="resaleLinkedLoading" class="text-xs text-text-tertiary flex items-center gap-2">
                <UiLoadingDots size="8px" color="var(--color-primary)" />
                {{ WAREHOUSE_COPY.linkedWarehouseItemLoading }}
              </div>
              <p
                v-else-if="linkedResaleIngredient"
                class="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
              >
                <Icon name="heroicons:cube" class="h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 truncate">{{ linkedResaleIngredient.name }}</span>
              </p>
              <p v-else class="text-xs text-text-tertiary">
                {{ WAREHOUSE_COPY.linkedWarehouseItemNotFoundCatalog }}
              </p>
            </div>
            </div>
          </UiFormSection>

          <!-- Toggle: ¿Controla inventario? (solo productos de menú con receta) -->
          <MenuCatalogInlineCreateBusyOverlay
            v-if="!isResaleProduct"
            :busy="inlineCatalogBusy"
            :label="inlineCatalogBusyLabel"
            :hint="inlineCatalogBusyHint"
          >
          <UiFormSection :title="t('menu.productos.inventoryPurchases')">
          <div class="flex items-start gap-3 p-4 bg-surface-secondary border border-border rounded-lg">
            <button
              type="button"
              role="switch"
              :aria-checked="tracksInventory"
              @click="tracksInventory = !tracksInventory"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                tracksInventory ? 'bg-primary' : 'bg-border'
              ]"
            >
              <span
                :class="[
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  tracksInventory ? 'translate-x-5' : 'translate-x-0.5'
                ]"
              />
            </button>
            <div class="flex-1">
              <p class="text-sm font-semibold text-text-primary">{{ t('menu.productos.controlsInventory') }}</p>
              <p class="text-xs text-text-secondary mt-1">
                <template v-if="tracksInventory">
                  {{ WAREHOUSE_COPY.defineRecipeInventoryHelp }}
                </template>
                <template v-else>
                  {{ t('menu.productos.noInventoryOnSale') }}
                </template>
              </p>
            </div>
          </div>

          <!-- Convertir a reventa (solo sin receta ni modificadores) -->
          <div
            v-if="canConvertToResale && !showConvertResalePanel"
            class="mt-4 p-4 rounded-xl border border-primary/25 bg-primary/5"
          >
            <p class="text-sm font-medium text-text-primary">{{ t('menu.productos.directSaleQuestion') }}</p>
            <p class="text-xs text-text-secondary mt-1 leading-relaxed">
              {{ t('menu.productos.directSaleDescription') }}
            </p>
            <UiButton
              type="button"
              variant="default"
              size="default"
              class="mt-3 bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
              @click="openConvertResalePanel"
            >
              {{ t('menu.productos.activateResale') }}
            </UiButton>
          </div>

          <div
            v-else-if="showConvertResalePanel && canConvertToResale"
            class="mt-4 p-4 rounded-xl border border-border bg-surface-secondary/40 space-y-4"
          >
            <div>
              <h4 class="text-sm font-semibold text-text-primary">{{ t('menu.productos.convertDirectSale') }}</h4>
              <p class="text-xs text-text-secondary mt-1">
                {{ t('menu.productos.convertDirectSaleHelp') }}
              </p>
            </div>
            <MenuProductResaleCreateForm
              v-model:unit-weight-gr="convertResaleUnitWeightGr"
              v-model:unit-weight-unit="convertResaleUnitWeightUnit"
              v-model:draft-units="convertResalePurchaseUnits"
              :show-error="convertResaleWeightError"
              embedded
              @clear-error="convertResaleWeightError = false"
            />
            <p v-if="convertResaleError" class="text-sm text-destructive">{{ convertResaleError }}</p>
            <div class="flex flex-col sm:flex-row gap-2">
              <UiButton
                type="button"
                variant="default"
                class="flex-1 bg-shell-cta-bg text-shell-cta-text hover:bg-shell-cta-hover-bg focus-visible:ring-shell-cta-focus-ring"
                :disabled="isConvertingToResale"
                @click="confirmConvertToResale"
              >
                <UiLoadingDots v-if="isConvertingToResale" size="8px" color="currentColor" class="me-2" />
                {{ isConvertingToResale ? t('menu.productos.converting') : t('menu.productos.confirmConversion') }}
              </UiButton>
              <UiButton
                type="button"
                variant="default"
                class="flex-1 bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
                :disabled="isConvertingToResale"
                @click="cancelConvertResalePanel"
              >
                {{ t('common.cancel') }}
              </UiButton>
            </div>
          </div>
          </UiFormSection>

          <!-- Recetas Base (Opcional) -->
          <template v-if="tracksInventory">
          <UiFormSection :title="t('menu.productos.baseRecipes')">
            <template #actions>
              <button
                type="button"
                @click="addRecipeBase"
                class="min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
              >
                + {{ t('common.add') }}
              </button>
            </template>
            <p v-if="duplicateRecipeBaseError" class="text-sm text-destructive flex items-center gap-1 mb-3">
              <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              {{ duplicateRecipeBaseError }}
            </p>

            <!-- Lista de recetas base seleccionadas -->
            <div v-if="form.recipe_bases.length > 0" class="space-y-3">
              <div
                v-for="(link, index) in form.recipe_bases"
                :key="index"
                class="flex items-start gap-3 p-3 bg-surface-secondary rounded-lg border border-border"
              >
                <div class="flex-1">
                  <div class="flex flex-col sm:flex-row gap-2">
                    <select
                      v-model="link.recipe_base_id"
                      class="input-base flex-1 min-h-[44px] px-3 py-2 text-sm"
                      @change="onRecipeBaseChange"
                      :aria-label="t('menu.productos.recipeQuantity', { index: index + 1 })"
                    >
                      <option value="">{{ t('menu.productos.selectBaseRecipe') }}</option>
                      <option v-for="recipe in recipeBases" :key="recipe.id" :value="recipe.id">
                        {{ recipe.name }}
                      </option>
                    </select>
                    <div class="flex items-center gap-1.5 sm:w-32">
                      <UiDecimalInput
                        v-model="link.quantity"
                        :min="0"
                        :precision="6"
                        class="input-base w-full min-h-[44px] px-3 py-2 text-sm"
                        :aria-label="t('menu.productos.recipeQuantity', { index: index + 1 })"
                        :title="t('menu.productos.recipeQuantityHelp')"
                      />
                      <span class="text-xs text-text-secondary whitespace-nowrap">{{ t('menu.productos.recipeUnit') }}</span>
                    </div>
                  </div>

                  <!-- Ingredientes de esta receta base -->
                  <div v-if="link.recipe_base_id && getRecipeBaseIngredients(link.recipe_base_id).length > 0" class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <div class="text-xs space-y-1">
                      <div
                        v-for="ing in getRecipeBaseIngredients(link.recipe_base_id)"
                        :key="ing.id"
                        class="flex justify-between text-text-secondary"
                      >
                        <span>{{ ing.ingredient_name }}</span>
                        <span>{{ formatDomainQuantity(Number(ing.base_quantity) * (Number(link.quantity) || 1), 6) }} {{ ing.unit }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeRecipeBase(index)"
                  class="min-h-[44px] min-w-[44px] p-2 bg-destructive/10 text-destructive hover:bg-destructive/15 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  :aria-label="t('menu.productos.removeRecipe', { index: index + 1 })"
                >
                  <Icon name="heroicons:trash" class="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <!-- Empty state -->
            <div v-else class="text-center py-5 text-text-secondary border border-dashed border-border/80 rounded-lg">
              <p class="text-sm">{{ t('menu.productos.noBaseRecipes') }}</p>
              <p class="text-xs mt-1">{{ t('menu.productos.linkBaseRecipe') }}</p>
            </div>
          </UiFormSection>

          <!-- Ingredientes y reventa adicionales -->
          <UiFormSection :title="WAREHOUSE_COPY.recipeCostLines">
            <MenuIngredientProductHint class="mb-3" />
            <p v-if="quantityError" class="text-sm text-destructive flex items-center gap-1 mb-3">
              <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              {{ quantityError }}
            </p>

            <WarehouseCategoryIngredientSelector
              v-if="!isResaleProduct"
              :key="`product-edit-category-ingredients-${productId}-${categorySelectorEpoch}`"
              class="mb-4"
              input-id="product-edit-category-ingredients"
              :existing-ingredient-ids="existingIngredientIds"
              :initial-categories="categorySelectorCategories"
              :initial-prepared-rows="categoryPreparedRows"
              :unit-options="getIngredientUnitOptions"
              :loading-unit-ids="loadingUnits"
              @update:prepared-rows="onCategoryPreparedRows"
            />

            <!-- Lista de ingredientes -->
            <div v-if="form.ingredients.length" class="space-y-3 mb-4">
              <div
                v-if="categoryPreparedRows.length && form.ingredients.length"
                class="flex items-center gap-3 pt-1"
              >
                <span class="h-px flex-1 bg-border" aria-hidden="true" />
                <h4 class="text-xs font-medium text-text-secondary">
                  {{ t('abastecimiento.glossary.categoryIngredientsManualLabel') }}
                </h4>
                <span class="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
              <div
                v-for="(ingredient, index) in form.ingredients"
                :key="index"
                class="flex items-start gap-3 p-3 bg-surface-secondary rounded-lg border border-border"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex flex-col sm:flex-row gap-2">
                    <div class="flex-1 min-w-0">
                      <UiIngredientSearchInput
                        :key="ingredient.ingredient_id || `new-${index}`"
                        :initial-value="ingredient.ingredient_name || ingredientCache[ingredient.ingredient_id]?.name || ''"
                        :allow-create="true"
                        :aria-label="WAREHOUSE_COPY.warehouseItemOrResaleRequired"
                        @select="(ing) => selectIngredient(ing, index)"
                        @create="(name) => openCustomIngModal(name, index)"
                      />
                    </div>
                    <UiDecimalInput
                      v-model="ingredient.quantity"
                      :min="0.01"
                      :precision="6"
                      :placeholder="t('menu.productos.quantity')"
                      required
                      class="input-base w-full sm:w-24 min-h-[44px] px-3 py-2 text-sm"
                      :aria-label="t('menu.productos.quantity')"
                    />
                    <div class="relative w-full sm:w-36">
                      <select
                        v-model="ingredient.unit"
                        :disabled="loadingUnits.has(ingredient.ingredient_id)"
                        class="input-base w-full min-h-[44px] py-2 pe-3 text-sm disabled:opacity-50"
                        :class="loadingUnits.has(ingredient.ingredient_id) ? 'ps-7' : 'ps-3'"
                        :aria-label="t('abastecimiento.glossary.categoryIngredientUnit')"
                      >
                        <option v-if="!ingredient.ingredient_id" value="" disabled>
                          {{ WAREHOUSE_COPY.selectWarehouseItem }}
                        </option>
                        <option
                          v-for="opt in getIngredientUnitOptions(ingredient.ingredient_id)"
                          :key="opt.value"
                          :value="opt.value"
                        >{{ opt.label }}</option>
                      </select>
                      <span v-if="loadingUnits.has(ingredient.ingredient_id)" class="absolute start-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeIngredient(index)"
                  class="min-h-[44px] min-w-[44px] p-2 bg-destructive/10 text-destructive hover:bg-destructive/15 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  :title="WAREHOUSE_COPY.removeWarehouseItemLine"
                  :aria-label="WAREHOUSE_COPY.removeWarehouseItemLine"
                >
                  <Icon name="heroicons:trash" class="h-5 w-5" />
                </button>
              </div>
            </div>

            <!-- Botón agregar ingrediente -->
            <UiButton
              type="button"
              variant="default"
              size="default"
              class="w-full bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
              @click="addIngredient"
            >
              <Icon name="heroicons:plus" class="h-5 w-5 me-2" />
              {{ t('menu.recetas.form.addLine') }}
            </UiButton>
          </UiFormSection>
          </template>
          </MenuCatalogInlineCreateBusyOverlay>

          <!-- Configuración -->
          <UiFormSection :title="t('menu.productos.configuration')">
            <div class="space-y-4">
              <!-- REMOVED: Controla Stock - ALL products now automatically control inventory -->

              <div class="flex items-start space-x-3">
                <input
                  v-model="form.is_available"
                  type="checkbox"
                  id="is_available"
                  class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <label for="is_available" class="text-sm font-medium text-text-primary block">
                    {{ t('menu.productos.available') }}
                  </label>
                  <p class="text-xs text-text-secondary mt-1">
                    {{ t('menu.productos.availableHelp') }}
                  </p>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <input
                  v-model="form.is_available_online"
                  type="checkbox"
                  id="is_available_online"
                  class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <label for="is_available_online" class="text-sm font-medium text-text-primary block">
                    {{ t('menu.productos.onlineAvailable') }}
                  </label>
                  <p class="text-xs text-text-secondary mt-1">
                    {{ t('menu.productos.onlineHelp') }}
                  </p>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <input
                  v-model="form.is_available_table_qr"
                  type="checkbox"
                  id="is_available_table_qr"
                  class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <label for="is_available_table_qr" class="text-sm font-medium text-text-primary block">
                    {{ t('menu.productos.tableQr') }}
                  </label>
                  <p class="text-xs text-text-secondary mt-1">
                    {{ t('menu.productos.tableQrHelp') }}
                  </p>
                </div>
              </div>

            </div>
          </UiFormSection>
        </div>
      </div>

      <!-- Right Column: Summary & Actions -->
      <div class="xl:col-span-1 space-y-6">
        <!-- Summary Card -->
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">{{ t('menu.productos.summary') }}</h3>

          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">{{ t('menu.productos.priceLabel') }}</span>
              <span class="font-semibold text-text-primary">{{ formatCurrency(form.price) }}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">{{ t('menu.productos.realCostLabel') }}</span>
              <span class="font-semibold text-text-primary">
                {{ displayRealCost === null ? '—' : formatCurrency(displayRealCost) }}
              </span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">{{ t('menu.productos.myCostSummary') }}</span>
              <span class="font-semibold text-text-primary">
                {{ form.costo_percibido != null && form.costo_percibido > 0 ? formatCurrency(form.costo_percibido) : '—' }}
              </span>
            </div>

            <div class="flex justify-between text-sm pt-3 border-t border-border">
              <span class="text-text-secondary">{{ t('menu.productos.realMarginLabel') }}</span>
              <span class="font-semibold text-primary">
                {{ marginRealValue === null ? '—' : formatCurrency(marginRealValue) }}
              </span>
            </div>

            <div class="flex justify-between text-sm gap-2">
              <span class="text-text-secondary flex-shrink-0">{{ isResaleProduct ? WAREHOUSE_COPY.resaleLineSummaryLabel : WAREHOUSE_COPY.recipeCompositionSummary }}</span>
              <span class="font-semibold text-text-primary text-end truncate">
                <template v-if="isResaleProduct">
                  {{ linkedResaleIngredient?.name ?? '—' }}
                </template>
                <template v-else>
                  {{ form.ingredients.length }}
                </template>
              </span>
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-border space-y-3">
            <p v-if="submitError" class="text-sm text-destructive flex items-center gap-1">
              <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              {{ submitError }}
            </p>
            <UiButton
              type="submit"
              variant="default"
              size="lg"
              class="w-full bg-shell-cta-bg text-shell-cta-text hover:bg-shell-cta-hover-bg focus-visible:ring-shell-cta-focus-ring"
              :disabled="isSubmitting"
            >
              <Icon v-if="!isSubmitting" name="heroicons:check" class="h-5 w-5 me-2" />
              <UiLoadingDots v-else size="8px" color="currentColor" class="me-2" />
              {{ isSubmitting ? t('menu.productos.saving') : t('menu.productos.updateProduct') }}
            </UiButton>

            <UiButton
              type="button"
              variant="default"
              size="default"
              class="w-full bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
              @click="cancel"
              :disabled="isSubmitting"
            >
              {{ t('common.cancel') }}
            </UiButton>

            <UiButton
              type="button"
              variant="default"
              size="default"
              class="w-full bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:ring-destructive/30"
              @click="deleteProduct"
              :disabled="isSubmitting"
            >
              <Icon name="heroicons:trash" class="h-5 w-5 me-2" />
              {{ t('menu.productos.deleteProduct') }}
            </UiButton>
          </div>
        </div>
      </div>
    </form>

    <!-- Delete confirmation modal -->
    <UiModal v-model="showDeleteModal" :title="t('menu.productos.deleteModalTitle')">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <Icon name="heroicons:trash" class="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p class="text-sm text-text-primary font-medium mb-1">{{ t('menu.productos.deleteQuestion') }}</p>
            <p class="text-sm text-text-secondary">{{ t('menu.productos.deleteDescription') }}</p>
          </div>
        </div>
        <div class="mt-4">
          <label class="block text-sm font-medium text-text-primary mb-1">{{ t('operaciones.bitacora.reason') }} *</label>
          <textarea v-model="deleteReason" rows="2" class="w-full px-3 py-2 border border-border rounded-lg text-sm" :placeholder="t('operaciones.promociones.deleteReasonPlaceholder')" />
        </div>
        <div v-if="deleteError" class="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {{ deleteError }}
        </div>
        <div class="flex gap-3 mt-6">
          <UiButton type="button" variant="default" class="flex-1 bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring" @click="showDeleteModal = false" :disabled="isSubmitting">
            {{ t('common.cancel') }}
          </UiButton>
          <UiButton type="button" variant="destructive" class="flex-1 flex items-center justify-center gap-2" @click="confirmDelete" :disabled="isSubmitting || !deleteReason.trim()">
            <UiLoadingDots v-if="isSubmitting" size="8px" color="currentColor" />
            <span>{{ isSubmitting ? t('menu.productos.deletingProduct') : t('menu.productos.confirmDeleteProduct') }}</span>
          </UiButton>
        </div>
      </div>
    </UiModal>

    <MenuInlineCatalogCreateShell
      ref="inlineCreateShell"
      v-model:busy="inlineCatalogBusy"
      v-model:busy-label="inlineCatalogBusyLabel"
      v-model:busy-hint="inlineCatalogBusyHint"
      context="product"
      :on-ingredient-saved="onCustomIngredientCreated"
      :on-product-saved="onInlineProductCreated"
    />

    <CategoriasCategoriaPanel
      v-model="showNewCategoryModal"
      :initial-name="newCategoryName"
      @saved="onCategoryCreated"
    />

    <UiConfirmActionModal
      v-model="categoriesLimitModalOpen"
      :title="t('billing.upgrade.quotaBlocked')"
      :message="categoriesLimitModalMessage"
      :confirm-label="t('nav.miPlan')"
      :cancel-label="t('billing.close')"
      @confirm="goToBillingFromCategoriesLimitModal"
      @cancel="closeCategoriesLimitModal"
    />

    <CocinaStationPanel
      v-model="showNewStationModal"
      @saved="onStationCreated"
    />

    <CommonsImageUploadModal
      v-if="showImageModal"
      image-type="product"
      upload-endpoint="/api/menu/products/upload-image"
      @upload="onImageUploaded"
      @close="showImageModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuery, useQueryCache } from '@pinia/colada'
import { useMenuIngredientsQuery } from '@/composables/queries/useMenuIngredients'
import { fetchResaleLinkedIngredient, resolveResaleIngredientId } from '@/composables/useResaleLinkedIngredient'
import {
  normalizeResaleProductName,
  patchResaleLinkedIngredient,
} from '@/composables/useResaleIngredientSync'
import {
  defaultUndPurchaseUnitsDraft,
  syncResalePurchaseUnitsDraft,
  type DraftPurchaseUnit,
} from '@/composables/useIngredientPurchaseUnitsDraft'
import { useActiveStationsQuery } from '@/composables/queries/useActiveStations'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'
import { recipeIngredientLineCost } from '~/utils/recipeIngredientLineCost'
import WarehouseCategoryIngredientSelector from '~/components/ingredientes/WarehouseCategoryIngredientSelector.vue'
import type { PreparedWarehouseCategoryIngredient } from '~/composables/useWarehouseCategoryIngredientSelector'
import type { WarehouseCategoryRow } from '~/composables/useWarehouseCategorySearch'
import { applyCategorySelectorLayout } from '~/composables/useMenuCategoryIngredientRows'
import { fetchIngredientPurchaseUnitsBatch } from '~/composables/useIngredientPurchaseUnitsBatch'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
  pageTransition: {
    name: 'fade',
    mode: 'out-in'
  },
  middleware: defineNuxtRouteMiddleware((to, from) => {
    const backButton = useState('backButton')
    const { $i18n } = useNuxtApp()
    backButton.value = {
      label: ($i18n as { t: (key: string) => string }).t('menu.productos.backToCatalog'),
      action: () => navigateTo('/menu/productos')
    }
  }),
  module: 'menu',
})

const route = useRoute()
const router = useRouter()
const cache = useQueryCache()
const toast = useToast()
const { t } = useI18n({ useScope: 'global' })
const { formatCurrency, currencyCode, currencyMinorUnits } = useFormatters()
const WAREHOUSE_COPY = useWarehouseCopy()
const { currentTenant, businessProfile } = useTenantReactive()
const {
  handleInlineCategoryCreate,
  handleAddProductRecipeLine,
  categoriesLimitModalOpen,
  categoriesLimitModalMessage,
  closeCategoriesLimitModal,
  goToBillingFromCategoriesLimitModal,
} = useMenuCatalogQuotaGate()

// Tax config — only show selector when tenant has taxes enabled
const { data: taxConfigData } = useQuery({
  key: () => ['tenant', 'tax-config', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/tax-config'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const taxConfig = computed(() => taxConfigData.value?.data ?? null)
const {
  taxConfigHasTaxes,
  taxCategoryOptions,
  taxLineForCategory,
  taxConfigUsesMenuCategoryTaxUi,
  inheritedTaxLineForMenuCategory,
  legacyTaxCategoryFromResolution,
  taxLinesForUi,
} = useTenantTaxProfile()
const hasTaxes = computed(() => taxConfigHasTaxes(taxConfig.value))
const usesMenuCategoryTaxUi = computed(() => taxConfigUsesMenuCategoryTaxUi(taxConfig.value))
const taxCategories = computed(() => taxCategoryOptions(taxConfig.value))
const commercialTaxLines = computed(() => taxLinesForUi(taxConfig.value))
const standardTaxHint = computed(() => {
  const line = taxLineForCategory(taxConfig.value, 'standard')
  if (line?.label) return line.label
  return t('menu.productos.incVatRates')
})
const liquorTaxHint = computed(() => {
  const line = taxLineForCategory(taxConfig.value, 'liquor')
  if (line?.label) return line.label
  return t('menu.productos.liquorVat')
})
const inheritedTaxSummary = computed(() => {
  if (!form.value.category_id) return t('menu.productos.taxNoCategory')
  const line = inheritedTaxLineForMenuCategory(taxConfig.value, form.value.category_id)
  if (!line) return t('menu.productos.taxInheritedExempt')
  return t('menu.productos.taxInheritedLabel', { label: line.label })
})

function setProductTaxResolution(mode: 'inherit' | 'exempt' | 'line') {
  form.value.tax_resolution = mode
  if (mode === 'line') {
    if (!form.value.tax_line_key) {
      form.value.tax_line_key = commercialTaxLines.value[0]?.key || null
    }
  } else {
    form.value.tax_line_key = null
  }
}

function taxFieldsForPayload() {
  if (!usesMenuCategoryTaxUi.value) {
    return {
      tax_category: form.value.tax_category,
      tax_resolution: 'inherit' as const,
      tax_line_key: null as string | null,
    }
  }
  const tax_resolution = form.value.tax_resolution
  const tax_line_key = tax_resolution === 'line' ? form.value.tax_line_key : null
  return {
    tax_resolution,
    tax_line_key,
    tax_category: legacyTaxCategoryFromResolution(taxConfig.value, {
      categoryId: form.value.category_id,
      tax_resolution,
      tax_line_key,
    }),
  }
}

// Get product ID from route
const productId = route.params.id as string

// Fetch product data from backend
const { data: productData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `product-${productId}`,
  () => $fetch(`/api/menu/products/${productId}`),
  {
    server: false,
    default: () => null
  }
)

const isOpenSaleShell = computed(() => !!productData.value?.data?.open_priced)
const isResaleProduct = computed(() => !!productData.value?.data?.is_resale)

const showConvertResalePanel = ref(false)
const isConvertingToResale = ref(false)
const convertResaleError = ref('')
const convertResaleWeightError = ref(false)
const convertResaleUnitWeightGr = ref<number | null>(null)
const convertResaleUnitWeightUnit = ref<'gr' | 'ml'>('gr')
const convertResalePurchaseUnits = ref<DraftPurchaseUnit[]>(defaultUndPurchaseUnitsDraft())

const canConvertToResale = computed(() => {
  if (isResaleProduct.value || isOpenSaleShell.value) return false
  if (form.value.is_combo) return false
  if (tracksInventory.value) return false
  if (productData.value?.data?.product_base_type_id) return false
  const hasRecipeBases = form.value.recipe_bases.some(l => !!l.recipe_base_id)
  const hasIngredients = form.value.ingredients.some(i => !!i.ingredient_id)
  if (hasRecipeBases || hasIngredients) return false
  const modGroups = productData.value?.data?.modifier_groups ?? []
  if (modGroups.length > 0) return false
  return true
})

const linkedResaleIngredient = ref<Record<string, unknown> | null>(null)
const linkedResaleIngredientId = computed(() => {
  const id = linkedResaleIngredient.value?.id
  return id != null ? String(id) : ''
})
const resaleUnitWeightGr = ref<number | null>(null)
const resaleUnitWeightUnit = ref<'gr' | 'ml'>('gr')
const resaleWeightError = ref(false)
const resaleLinkedLoading = ref(false)
const resaleWeightSnapshot = ref<{ gr: number | null; unit: 'gr' | 'ml' }>({ gr: null, unit: 'gr' })

async function loadResaleLinkedIngredient(product: Record<string, unknown>) {
  resaleLinkedLoading.value = true
  try {
    let ing = await fetchResaleLinkedIngredient(product)
    if (!ing) {
      const rows = Array.isArray(product.ingredients) ? product.ingredients : []
      const sole = rows.length === 1 ? rows[0] as Record<string, unknown> : null
      if (sole?.ingredient_id) {
        try {
          const res = await $fetch<{ data?: Record<string, unknown> }>(
            `/api/suppliers/ingredients/${sole.ingredient_id}`,
          )
          ing = res?.data ?? null
        } catch {
          ing = {
            id: sole.ingredient_id,
            name: sole.ingredient_name ?? product.name,
            unit: sole.unit ?? 'und',
          }
        }
      }
    }
    linkedResaleIngredient.value = ing
    if (ing) {
      const gr = ing.unit_weight_gr != null ? Number(ing.unit_weight_gr) : null
      const unit = (ing.unit_weight_unit === 'gr' || ing.unit_weight_unit === 'ml')
        ? ing.unit_weight_unit
        : 'gr'
      resaleUnitWeightGr.value = gr
      resaleUnitWeightUnit.value = unit
      resaleWeightSnapshot.value = { gr, unit }
    }
  } finally {
    resaleLinkedLoading.value = false
  }
}

const goToOpenSaleSettings = () => {
  router.push('/operaciones/personalizar')
}

// Fetch categories for dropdown
const { data: categoriesData } = useAsyncData(
  `categories-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/categories'),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Fetch recipe bases for dropdown
const { data: recipeBasesData } = useAsyncData(
  `recipe-bases-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/recipe-bases', {
    query: {
      limit: 250,
      is_active: true,
      include_ingredients: true
    }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Shared ingredients — kept only for recipe-base cost calculation
const { availableIngredients: ingredients } = useMenuIngredientsQuery()

// Ingredient cache: populated from API response on load or when user selects via UiIngredientSearchInput
const ingredientCache = ref<Record<string, any>>({})
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
const loadingUnits = ref<Set<string>>(new Set())
const categoryPreparedRows = ref<PreparedWarehouseCategoryIngredient[]>([])
const categorySelectorCategories = ref<WarehouseCategoryRow[]>([])
const categorySelectorEpoch = ref(0)

const { getIngredientUnitOptions: buildUnitOptions, defaultUnitForIngredient, mergeIngredientUnitFields, rehydrateIngredientCaches } = useIngredientUnitOptions()

function getIngredientUnitOptions(ingredientId: string) {
  return buildUnitOptions(ingredientId, {
    ingredientCache: ingredientCache.value,
    purchaseUnitsCache: purchaseUnitsCache.value,
  })
}

function cacheIngredientForUnits(ing: any, productFallback?: Record<string, unknown>) {
  const catalogRow = ingredients.value.find((i: any) => i.id === ing.id)
  let merged = mergeIngredientUnitFields(ing, catalogRow)
  if (productFallback) {
    merged = mergeIngredientUnitFields(merged, {
      unit_weight_gr: productFallback.resale_unit_weight_gr,
      unit_weight_unit: productFallback.resale_unit_weight_unit,
    })
  }
  if (merged.unit === 'und' && merged.unit_weight_gr && !merged.unit_weight_unit) {
    merged.unit_weight_unit = 'ml'
  }
  ingredientCache.value[ing.id] = merged
}

function syncCategorySelectorLayout() {
  if (!ingredients.value.length) return

  const sourceRows = [
    ...form.value.ingredients,
    ...categoryPreparedRows.value.map(row => ({
      ingredient_id: row.ingredient_id,
      ingredient_name: row.name,
      quantity: row.quantity,
      unit: row.unit,
    })),
  ]
  const layout = applyCategorySelectorLayout(sourceRows, ingredients.value)
  categorySelectorCategories.value = layout.categories
  categoryPreparedRows.value = layout.preparedRows
  form.value.ingredients = layout.manualRows as typeof form.value.ingredients
}

function rehydrateProductIngredientCaches() {
  if (!ingredients.value.length) return
  const entries = form.value.ingredients
    .filter(ing => ing.ingredient_id)
    .map(ing => ({
      id: ing.ingredient_id,
      name: ing.ingredient_name || ingredientCache.value[ing.ingredient_id]?.name,
      unit: ing.unit,
      ...ingredientCache.value[ing.ingredient_id],
    }))
  rehydrateIngredientCaches(entries, ingredients.value, ingredientCache.value)
}

async function loadPurchaseUnits(ingredientId: string) {
  if (!ingredientId || purchaseUnitsCache.value.has(ingredientId)) return
  loadingUnits.value = new Set([...loadingUnits.value, ingredientId])
  try {
    const res = await $fetch<any>(`/api/suppliers/ingredient-purchase-units/ingredient/${ingredientId}`)
    const updated = new Map(purchaseUnitsCache.value)
    updated.set(ingredientId, res.data || [])
    purchaseUnitsCache.value = updated
  } catch {
    const updated = new Map(purchaseUnitsCache.value)
    updated.set(ingredientId, [])
    purchaseUnitsCache.value = updated
  } finally {
    const next = new Set(loadingUnits.value)
    next.delete(ingredientId)
    loadingUnits.value = next
  }
}

async function loadPurchaseUnitsBatchTolerant(ids: string[]) {
  await fetchIngredientPurchaseUnitsBatch(
    ids,
    { purchaseUnitsCache: purchaseUnitsCache.value, loadingUnits: loadingUnits.value },
    (ids, add) => {
      const next = new Set(loadingUnits.value)
      ids.forEach(id => add ? next.add(id) : next.delete(id))
      loadingUnits.value = next
    },
    (updater) => { purchaseUnitsCache.value = updater(purchaseUnitsCache.value) },
  )
}

function onCategoryPreparedRows(rows: PreparedWarehouseCategoryIngredient[]) {
  categoryPreparedRows.value = rows
  const batchIds: string[] = []
  for (const row of rows) {
    cacheIngredientForUnits({
      id: row.ingredient_id,
      name: row.name,
      unit: ingredientCache.value[row.ingredient_id]?.unit || row.unit || undefined,
    })
    if (row.ingredient_id && !purchaseUnitsCache.value.has(row.ingredient_id)) batchIds.push(row.ingredient_id)
  }
  if (batchIds.length) void loadPurchaseUnitsBatchTolerant(batchIds)
}

function selectIngredient(ing: any, index: number, productFallback?: Record<string, unknown>) {
  form.value.ingredients[index].ingredient_id = ing.id
  form.value.ingredients[index].ingredient_name = ing.name
  cacheIngredientForUnits(ing, productFallback)
  form.value.ingredients[index].unit = defaultUnitForIngredient(ingredientCache.value[ing.id])
  form.value.ingredients = [...form.value.ingredients]
  return loadPurchaseUnits(ing.id)
}

const inlineCreateShell = ref<{ openFromSearch: (name: string) => void } | null>(null)
const customIngModalIndex = ref(-1)
const inlineCatalogBusy = ref(false)
const inlineCatalogBusyLabel = ref('')
const inlineCatalogBusyHint = ref('')

function openCustomIngModal(name: string, index: number) {
  customIngModalIndex.value = index
  inlineCreateShell.value?.openFromSearch(name)
}

async function onCustomIngredientCreated(ingredient: any) {
  const index = customIngModalIndex.value
  if (index < 0 || index >= form.value.ingredients.length) return
  await selectIngredient(ingredient, index)
  customIngModalIndex.value = -1
}

const { linkCreatedProductToRow } = useInlineCatalogProductLink()

async function onInlineProductCreated(product: Record<string, unknown>) {
  const index = customIngModalIndex.value
  if (index < 0 || index >= form.value.ingredients.length) return
  await linkCreatedProductToRow(product, async (ingredient) => {
    await selectIngredient(ingredient, index, product)
    customIngModalIndex.value = -1
  })
}

// ── Category search + create flow (issue #458) ────────────────────────────
const showNewCategoryModal = ref(false)
const newCategoryName = ref('')
const selectedCategoryName = ref('')

function onCategorySelected(cat: { id: string; name: string }) {
  form.value.category_id = cat.id
  selectedCategoryName.value = cat.name
}

function onCategoryCreateRequested(typedName: string) {
  void handleInlineCategoryCreate(typedName, (name) => {
    newCategoryName.value = name
    showNewCategoryModal.value = true
  })
}

function onCategoryCreated(cat: { id: string; name: string }) {
  form.value.category_id = cat.id
  selectedCategoryName.value = cat.name
}

// ── Image upload (issue #465) ─────────────────────────────────────────────
const showImageModal = ref(false)

function onImageUploaded(url: string) {
  form.value.image_url = url
  showImageModal.value = false
}

// ── Kitchen station inline create flow (issue #463) ───────────────────────
const showNewStationModal = ref(false)

function onStationCreated(station: { id: string; name: string }) {
  toast.success(
    `${t('menu.productos.stationCreated')}: ${station.name}`,
    { title: t('menu.productos.stationCreated') }
  )
  cache.invalidateQueries({ key: ['tenant', 'stations', currentTenant.value?.id] })
  cache.invalidateQueries({ key: ['tenant', 'category-stations', currentTenant.value?.id] })
}

const categories = computed(() => categoriesData.value?.data || [])
const recipeBases = computed(() => recipeBasesData.value?.data || [])

// Computed: Get all ingredients from all selected recipe bases
// Issue #517: each ingredient is multiplied by the per-product recipe quantity
// so the calculated cost preview matches what the backend will compute.
const selectedRecipeBaseIngredients = computed(() => {
  const allIngredients: any[] = []
  form.value.recipe_bases.forEach(link => {
    if (!link.recipe_base_id) return
    const selectedRecipe = recipeBases.value.find((r: any) => r.id === link.recipe_base_id)
    if (!selectedRecipe?.ingredients) return
    const multiplier = Number(link.quantity) || 1
    selectedRecipe.ingredients.forEach((ing: any) => {
      allIngredients.push({
        ...ing,
        base_quantity: Number(ing.base_quantity) * multiplier,
      })
    })
  })
  return allIngredients
})

// Form state
const form = ref({
  name: '',
  description: '',
  image_url: '',
  price: 0,
  category_id: '',
  preparation_time: 15,
  controla_stock: true,
  is_available: true,
  is_available_online: true,
  is_available_table_qr: false,
  is_combo: false,
  allow_modifiers: true,
  tax_category: 'standard' as 'standard' | 'liquor' | 'exempt',
  tax_resolution: 'inherit' as 'inherit' | 'exempt' | 'line',
  tax_line_key: null as string | null,
  recipe_bases: [] as Array<{ recipe_base_id: string; quantity: number }>,
  ingredients: [] as Array<{ ingredient_id: string, ingredient_name: string, quantity: number, unit: string }>,
  costo_percibido: null as number | null,
})

const existingIngredientIds = computed(() =>
  form.value.ingredients.map(row => row.ingredient_id).filter(Boolean),
)
const combinedIngredients = computed(() => [
  ...form.value.ingredients,
  ...mapPreparedRowsToProduct(categoryPreparedRows.value),
])

const isSubmitting = ref(false)
const submitError = ref('')
const duplicateRecipeBaseError = ref('')
const quantityError = ref('')
// Derived from product state on load: true if has any recipe rows.
// User can flip OFF to remove inventory tracking.
const tracksInventory = ref(true)

// Watch product data and populate form
watch(productData, (data) => {
  if (data?.data) {
    categoryPreparedRows.value = []
    categorySelectorCategories.value = []
    const product = data.data
    form.value = {
      name: product.name,
      description: product.description || '',
      image_url: product.image_url || '',
      price: Number(product.price),
      category_id: product.category_id,
      preparation_time: product.preparation_time || 15,
      controla_stock: product.controla_stock,
      is_available: product.is_available,
      is_available_online: product.is_available_online ?? true,
      is_available_table_qr: product.is_available_table_qr ?? false,
      is_combo: product.is_combo,
      allow_modifiers: product.allow_modifiers,
      tax_category: (product.tax_category || 'standard') as 'standard' | 'liquor' | 'exempt',
      tax_resolution: (['inherit', 'exempt', 'line'].includes(product.tax_resolution)
        ? product.tax_resolution
        : 'inherit') as 'inherit' | 'exempt' | 'line',
      tax_line_key: product.tax_line_key ? String(product.tax_line_key) : null,
      // Issue #517: hydrate from `recipe_bases` (new shape) when present;
      // fall back to legacy `recipe_base_ids` with quantity=1 per row.
      recipe_bases: (
        Array.isArray(product.recipe_bases) && product.recipe_bases.length > 0
          ? product.recipe_bases.map((b: any) => ({
              recipe_base_id: b.recipe_base_id ?? b.id ?? '',
              quantity: Number(b.quantity) || 1,
            }))
          : (product.recipe_base_ids || []).map((id: string) => ({ recipe_base_id: id, quantity: 1 }))
      ),
      ingredients: product.ingredients.map((ing: any) => {
        if (ing.ingredient_id) {
          cacheIngredientForUnits({ id: ing.ingredient_id, name: ing.ingredient_name || '', unit: ing.unit })
          loadPurchaseUnits(ing.ingredient_id)
        }
        return {
          ingredient_id: ing.ingredient_id,
          ingredient_name: ing.ingredient_name || '',
          quantity: Number(ing.quantity),
          unit: ing.unit
        }
      }),
      costo_percibido: product.costo_percibido != null ? Number(product.costo_percibido) : null,
    }
    if (product.is_resale) {
      void loadResaleLinkedIngredient(product as Record<string, unknown>)
    } else {
      linkedResaleIngredient.value = null
      resaleUnitWeightGr.value = null
      resaleUnitWeightUnit.value = 'gr'
      resaleWeightSnapshot.value = { gr: null, unit: 'gr' }
      // Derive toggle from existing data — product without any recipe row → OFF
      tracksInventory.value = (
        (product.recipe_bases?.length ?? product.recipe_base_ids?.length ?? 0) > 0 ||
        (product.ingredients?.length ?? 0) > 0
      )
    }
    // Pre-fill the category search input with the product's current category name
    selectedCategoryName.value = product.category_name || ''
    syncCategorySelectorLayout()
  }
}, { immediate: true })

watch(ingredients, (list) => {
  if (list.length && form.value.ingredients.some(ing => ing.ingredient_id)) {
    rehydrateProductIngredientCaches()
    syncCategorySelectorLayout()
  }
})

// Read-only: station inherited from the product's category (returned by backend)
const inheritedStation = computed(() => productData.value?.data?.station ?? null)

// Computed — null when product doesn't track inventory (UI renders "—")
const calculatedCost = computed<number | null>(() => {
  if (!tracksInventory.value) return null
  if (
    selectedRecipeBaseIngredients.value.length === 0 &&
    form.value.ingredients.length === 0
  ) {
    return null
  }

  let totalCost = 0

  form.value.recipe_bases.forEach((link) => {
    if (!link.recipe_base_id) return
    const selectedRecipe = recipeBases.value.find((r: any) => r.id === link.recipe_base_id)
    if (!selectedRecipe?.ingredients) return
    const multiplier = Number(link.quantity) || 1
    selectedRecipe.ingredients.forEach((ing: any) => {
      totalCost += recipeIngredientLineCost(ing, { multiplier })
    })
  })

  totalCost += form.value.ingredients.reduce((sum, ing) => {
    const ingredient = ingredientCache.value[ing.ingredient_id]
    if (!ingredient) return sum
    return sum + recipeIngredientLineCost({
      quantity: ing.quantity,
      unit: ing.unit,
      stock_unit: ingredient.unit,
      unit_weight_gr: ingredient.unit_weight_gr,
      costo_unitario: ingredient.costo_unitario ?? ingredient.price,
    })
  }, 0)

  return totalCost
})

const savedRealCost = computed<number | null>(() => {
  const raw = productData.value?.data?.costo_calculado
  if (raw === null || raw === undefined) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
})

const displayRealCost = computed<number | null>(() => {
  if (!tracksInventory.value) return null
  if (savedRealCost.value !== null && savedRealCost.value > 0) return savedRealCost.value
  return calculatedCost.value
})

const showRecipeCostPreview = computed(() => {
  if (!tracksInventory.value || calculatedCost.value === null) return false
  if (savedRealCost.value === null || savedRealCost.value <= 0) return calculatedCost.value > 0
  return Math.abs(savedRealCost.value - calculatedCost.value) > 0.01
})

const { marginRealPct, marginOperativoPct } = useProductMargins()

const marginPreview = computed(() => ({
  price: form.value.price,
  costo_calculado: displayRealCost.value,
  costo_percibido: form.value.costo_percibido,
}))

const marginRealValue = computed<number | null>(() => {
  const cost = displayRealCost.value
  if (cost === null || cost <= 0) return null
  return form.value.price - cost
})

const marginOperativoValue = computed<number | null>(() => {
  const perceived = form.value.costo_percibido
  if (perceived == null || perceived <= 0) return null
  return form.value.price - perceived
})

// Methods
function openConvertResalePanel() {
  convertResaleError.value = ''
  convertResaleWeightError.value = false
  showConvertResalePanel.value = true
}

function cancelConvertResalePanel() {
  showConvertResalePanel.value = false
  convertResaleError.value = ''
  convertResaleWeightError.value = false
  convertResaleUnitWeightGr.value = null
  convertResaleUnitWeightUnit.value = 'gr'
  convertResalePurchaseUnits.value = defaultUndPurchaseUnitsDraft()
}

async function confirmConvertToResale() {
  convertResaleError.value = ''
  convertResaleWeightError.value = false

  const weight = Number(convertResaleUnitWeightGr.value)
  if (!Number.isFinite(weight) || weight <= 0) {
    convertResaleWeightError.value = true
    return
  }

  isConvertingToResale.value = true
  try {
    const created = await $fetch<{ data?: Record<string, unknown> }>(
      `/api/menu/products/${productId}/convert-to-resale`,
      {
        method: 'POST',
        body: {
          resale_unit_weight_gr: weight,
          resale_unit_weight_unit: convertResaleUnitWeightUnit.value,
        },
      },
    )

    const payload = (created?.data ?? created) as Record<string, unknown>
    const ingredientId = await resolveResaleIngredientId(payload)
    if (ingredientId) {
      await syncResalePurchaseUnitsDraft(ingredientId, convertResalePurchaseUnits.value)
    }

    cancelConvertResalePanel()
    cache.invalidateQueries()
    await refresh()
    toast.success(t('menu.productos.conversionSuccess'), { title: t('menu.productos.resaleActivated') })
  } catch (err: unknown) {
    const e = err as { data?: { detail?: string }; message?: string }
    convertResaleError.value = e?.data?.detail ?? e?.message ?? t('menu.productos.conversionError')
  } finally {
    isConvertingToResale.value = false
  }
}

watch(tracksInventory, (on) => {
  if (on) {
    cancelConvertResalePanel()
  } else {
    categoryPreparedRows.value = []
  }
})

function addRecipeBase() {
  // Adding a recipe base implies the product tracks inventory.
  tracksInventory.value = true
  form.value.recipe_bases.push({ recipe_base_id: '', quantity: 1 })
}

function removeRecipeBase(index: number) {
  form.value.recipe_bases.splice(index, 1)
}

function getRecipeBaseIngredients(recipeBaseId: string) {
  if (!recipeBaseId) return []
  const recipe = recipeBases.value.find((r: any) => r.id === recipeBaseId)
  return recipe?.ingredients || []
}

const onRecipeBaseChange = () => {
  console.log('Recipe bases:', form.value.recipe_bases)
}

const addIngredient = () => {
  void handleAddProductRecipeLine(form.value.ingredients.length, () => {
    // Adding an ingredient implies the product tracks inventory.
    tracksInventory.value = true
    form.value.ingredients.push({
      ingredient_id: '',
      ingredient_name: '',
      quantity: 0,
      unit: 'g'
    })
  })
}

const removeIngredient = (index: number) => {
  form.value.ingredients.splice(index, 1)
}

const getIngredientName = (ingredientId: string) => {
  const ingredient = ingredientCache.value[ingredientId]
  return ingredient?.name || WAREHOUSE_COPY.selectWarehouseItemPrompt
}

const handleSubmit = async () => {
  if (isOpenSaleShell.value) {
    goToOpenSaleSettings()
    return
  }
  submitError.value = ''
  duplicateRecipeBaseError.value = ''
  quantityError.value = ''
  resaleWeightError.value = false

  if (isResaleProduct.value) {
    if (!resaleUnitWeightGr.value || resaleUnitWeightGr.value <= 0) {
      resaleWeightError.value = true
      return
    }
  }

  // Validate ingredient quantities > 0 (only when tracking inventory)
  if (!isResaleProduct.value && tracksInventory.value) {
    const validationError = validateMenuCompositionRows(
      combinedIngredients.value,
      ingredientId => getIngredientUnitOptions(ingredientId).map(option => option.value),
    )
    if (validationError === 'incomplete') {
      quantityError.value = WAREHOUSE_COPY.allRecipeCostLinesNeedQuantity
      return
    }
    if (validationError === 'duplicate') {
      quantityError.value = WAREHOUSE_COPY.duplicateWarehouseItemInList
      return
    }
    if (validationError === 'incompatible-unit') {
      quantityError.value = t('menu.common.incompatibleUnitError')
      return
    }
  }

  isSubmitting.value = true

  try {
    // Validate no duplicate recipe bases and positive quantity (Issue #517)
    const validLinks = form.value.recipe_bases.filter(l => l.recipe_base_id !== '')
    const seenIds = new Set<string>()
    for (const link of validLinks) {
      if (seenIds.has(link.recipe_base_id)) {
        duplicateRecipeBaseError.value = t('menu.productos.duplicateRecipeError')
        isSubmitting.value = false
        return
      }
      if (!Number.isFinite(Number(link.quantity)) || Number(link.quantity) <= 0) {
        quantityError.value = t('menu.productos.recipeQuantityError')
        isSubmitting.value = false
        return
      }
      seenIds.add(link.recipe_base_id)
    }

    // Resale: never send ingredients/recipe_bases — empty arrays DELETE product_recipes (#861).
    const {
      ingredients: _ingredients,
      recipe_bases: _recipeBases,
      ...formScalars
    } = form.value

    let cleanedForm: Record<string, unknown>
    if (isResaleProduct.value) {
      cleanedForm = {
        ...formScalars,
        ...taxFieldsForPayload(),
        allow_modifiers: false,
        image_url: form.value.image_url || null,
        costo_percibido: form.value.costo_percibido ?? null,
      }
    } else {
      const cleanedRecipeBases = tracksInventory.value
        ? validLinks.map(l => ({ recipe_base_id: l.recipe_base_id, quantity: Number(l.quantity) }))
        : []
      cleanedForm = {
        ...formScalars,
        ...taxFieldsForPayload(),
        recipe_bases: cleanedRecipeBases,
        recipe_base_ids: cleanedRecipeBases.map(l => l.recipe_base_id),
        ingredients: tracksInventory.value ? combinedIngredients.value : [],
        image_url: form.value.image_url || null,
        costo_percibido: form.value.costo_percibido ?? null,
      }
    }

    await $fetch(`/api/menu/products/${productId}`, {
      method: 'PUT',
      body: cleanedForm,
    })

    if (isResaleProduct.value && linkedResaleIngredient.value?.id) {
      const ingId = String(linkedResaleIngredient.value.id)
      const gr = resaleUnitWeightGr.value
      const unit = resaleUnitWeightUnit.value
      const snap = resaleWeightSnapshot.value
      const trimmedName = normalizeResaleProductName(form.value.name)
      const linkedName = linkedResaleIngredient.value.name != null
        ? normalizeResaleProductName(String(linkedResaleIngredient.value.name))
        : ''
      const patchBody: {
        name?: string
        unit_weight_gr?: number
        unit_weight_unit?: 'gr' | 'ml'
      } = {}
      if (trimmedName && trimmedName !== linkedName) {
        patchBody.name = trimmedName
      }
      if (gr != null && gr > 0 && (gr !== snap.gr || unit !== snap.unit)) {
        patchBody.unit_weight_gr = gr
        patchBody.unit_weight_unit = unit
      }
      if (Object.keys(patchBody).length > 0) {
        try {
          await patchResaleLinkedIngredient(ingId, patchBody)
          if (patchBody.unit_weight_gr != null) {
            resaleWeightSnapshot.value = { gr, unit }
          }
          if (patchBody.name) {
            linkedResaleIngredient.value = {
              ...linkedResaleIngredient.value,
              name: patchBody.name,
            }
          }
        } catch (ingErr: unknown) {
          const e = ingErr as { data?: { detail?: string }; message?: string }
          const detail = e?.data?.detail ?? e?.message
          toast.error(
            detail
              ? `${WAREHOUSE_COPY.linkedWarehouseItemUpdateFailedDetail} ${detail}`
              : WAREHOUSE_COPY.linkedWarehouseItemUpdateFailed,
            { title: WAREHOUSE_COPY.linkedWarehouseItemNotSynced },
          )
        }
      }
    }

    cache.invalidateQueries({ key: ['menu', 'products'] })
    cache.invalidateQueries({ key: ['menu', 'products-resale'] })
    await refresh()
    categorySelectorEpoch.value += 1
    toast.success(t('menu.productos.updatedToast'), { title: t('menu.productos.saved') })
  } catch (error: any) {
    console.error('❌ Error al actualizar producto:', error)
    submitError.value = t('menu.productos.updateErrorDetail', { detail: error.data?.detail || error.message })
  } finally {
    isSubmitting.value = false
  }
}

const showDeleteModal = ref(false)
const deleteError = ref('')
const deleteReason = ref('')

const deleteProduct = () => {
  deleteError.value = ''
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!deleteReason.value.trim()) { deleteError.value = t('operaciones.promociones.deleteReasonPlaceholder'); return }
  isSubmitting.value = true
  deleteError.value = ''
  try {
    const result = await $fetch<{ success: boolean; archived?: boolean; message?: string }>(
      `/api/menu/products/${productId}`,
      { method: 'DELETE', body: { reason: deleteReason.value.trim() } },
    )
    showDeleteModal.value = false
    cache.invalidateQueries()
    await router.push('/menu/productos')
    if (result?.archived) {
      console.info(result.message ?? 'Producto archivado')
    }
  } catch (error: any) {
    console.error('❌ Error al eliminar producto:', error)
    deleteError.value = error.data?.detail || error.message || t('menu.productos.deleteError')
  } finally {
    isSubmitting.value = false
  }
}

const cancel = () => {
  // clearNuxtData()
  router.push('/menu/productos')
}

useHead({
  title: computed(() => productData.value?.data
    ? `${t('menu.productos.editProductFor', { name: productData.value.data.name })} - ${t('menu.head.module')}`
    : t('menu.productos.editProduct'))
})

const { setRefreshHandler, clearRefreshHandler } = useLayoutActions()
onMounted(() => { setRefreshHandler(refresh) })
onUnmounted(() => { clearRefreshHandler(refresh) })
</script>
