<template>
  <div>
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      :label="t('menu.productos.createBusy')"
      :hint="t('menu.productos.createBusyHint')"
      variant="glass"
      indicator="matrix"
    />

    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <div v-else class="space-y-6">
      <!-- Tipo de producto — siempre visible -->
      <div class="bg-surface border-2 border-border rounded-xl shadow-sm p-4 sm:p-6">
        <h2 class="text-base sm:text-lg font-semibold text-text-primary mb-1">
          {{ t('menu.productos.productTypeQuestion') }}
        </h2>
        <p class="text-sm text-text-secondary leading-relaxed mb-4 sm:mb-5">
          {{ t('menu.productos.productTypeHelp') }}
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" :aria-label="t('menu.productos.productTypeQuestion')">
          <UiSelectionOptionCard
            :title="t('menu.productos.recipeMode')"
            :description="t('menu.productos.recipeModeDescription')"
            :selected="productCreateMode === 'recipe'"
            @click="setProductCreateMode('recipe')"
          >
            <template #icon>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </template>
          </UiSelectionOptionCard>
          <UiSelectionOptionCard
            :title="t('menu.productos.resaleMode')"
            :description="t('menu.productos.resaleModeDescription')"
            :selected="productCreateMode === 'resale-direct'"
            @click="setProductCreateMode('resale-direct')"
          >
            <template #icon>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </template>
          </UiSelectionOptionCard>
        </div>
      </div>

      <form @submit.prevent="submitProduct" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
        <div class="xl:col-span-2 space-y-6">
          <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
            <UiFormSection :title="t('menu.productos.detailTitle')">
              <template #badge>
                <UiStatusBadge
                  v-if="isResaleDirectMode"
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
                        :class="nameError ? 'border-destructive focus:ring-destructive' : ''"
                        :placeholder="t('menu.productos.namePlaceholder')"
                        @input="nameError = ''"
                      />
                      <p v-if="nameError" role="alert" class="text-xs text-destructive mt-1 flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                        {{ nameError }}
                      </p>
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
                      />
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

                  <div v-if="businessProfile?.comandas_enabled">
                    <label class="block text-sm font-medium text-text-primary mb-1">
                      {{ t('menu.productos.kitchen') }}
                    </label>
                    <div class="flex items-center gap-2 min-h-[42px] px-3 py-2 rounded-lg bg-surface-secondary/60 border border-border/60 text-sm">
                      <template v-if="isAssigningInheritedStation">
                        <UiLoadingDots size="8px" color="var(--color-primary)" />
                        <span class="text-text-secondary">{{ t('menu.productos.assigning') }}</span>
                      </template>
                      <template v-else-if="inheritedStation">
                        <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: inheritedStation.color ?? '#94a3b8' }" />
                        <span class="font-medium text-text-primary truncate">{{ inheritedStation.name }}</span>
                        <span class="text-text-tertiary text-xs flex-shrink-0">{{ t('menu.productos.fromCategory') }}</span>
                      </template>
                      <template v-else>
                        <span class="text-text-tertiary text-xs leading-snug flex-1">{{ t('menu.productos.noKitchenCategory') }}</span>
                        <button
                          type="button"
                          :disabled="isAssigningInheritedStation"
                          @click="showNewStationModal = true"
                          class="min-h-[32px] px-2 py-1 text-xs font-medium rounded-md bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring flex-shrink-0 disabled:opacity-50"
                        >
                          {{ t('menu.productos.createStation') }}
                        </button>
                      </template>
                    </div>
                  </div>

                  <div v-if="!isResaleDirectMode">
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

            <UiFormSection :title="t('menu.productos.priceSection')">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.productos.salePriceRequired') }}
                  </label>
                  <div class="relative">
                    <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                    <UiDecimalInput
                      v-model="form.price"
                      required
                      :precision="0"
                      :min="0"
                      class="input-base w-full ps-8 pe-4 py-2"
                      placeholder="15000"
                    />
                  </div>
                </div>

                <div v-if="!isResaleDirectMode">
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.productos.calculatedCost') }}
                  </label>
                  <div class="relative">
                    <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                    <input
                      :value="calculatedCost === null ? '—' : formatCurrency(calculatedCost)"
                      type="text"
                      disabled
                      class="input-base w-full ps-8 pe-4 py-2 bg-surface-secondary cursor-not-allowed"
                      placeholder="0"
                    />
                  </div>
                  <p class="text-xs text-text-tertiary mt-1">
                    {{ t('menu.productos.estimatedCostHelp') }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.productos.dishCost') }} <span class="text-text-tertiary font-normal">{{ t('menu.recetas.form.optionalSuffix') }}</span>
                  </label>
                  <div class="relative">
                    <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                    <UiDecimalInput
                      v-model="form.costo_percibido"
                      :precision="0"
                      :min="0"
                      class="input-base w-full ps-8 pe-4 py-2"
                      :placeholder="t('menu.productos.referenceInternal')"
                    />
                  </div>
                  <p class="text-xs text-text-tertiary mt-1">
                    {{ t('menu.productos.referenceHelp') }}
                  </p>
                </div>
              </div>

              <div
                v-if="form.price > 0 && calculatedCost !== null"
                class="mt-4 p-3.5 bg-surface-secondary/70 rounded-lg border border-border/60 space-y-2.5"
              >
                <div v-if="calculatedCost > 0" class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-text-primary">{{ t('menu.productos.realMargin') }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-text-primary tabular-nums">
                      {{ marginRealValue === null ? '—' : formatCurrency(marginRealValue) }}
                    </span>
                    <UiStatusBadge
                      v-if="marginRealPct(marginPreview) !== null"
                      :label="`${marginRealPct(marginPreview)!.toFixed(1)}%`"
                      :variant="(marginRealPct(marginPreview) ?? 0) > 50 ? 'success' : 'warning'"
                    />
                  </div>
                </div>
                <div
                  v-if="form.costo_percibido != null && form.costo_percibido > 0"
                  class="flex items-center justify-between gap-3"
                >
                  <span class="text-sm font-medium text-text-primary">{{ t('menu.productos.operatingMargin') }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-text-primary tabular-nums">
                      {{ marginOperativoValue === null ? '—' : formatCurrency(marginOperativoValue) }}
                    </span>
                    <UiStatusBadge
                      v-if="marginOperativoPct(marginPreview) !== null"
                      :label="`${marginOperativoPct(marginPreview)!.toFixed(1)}%`"
                      variant="secondary"
                    />
                  </div>
                </div>
              </div>
            </UiFormSection>

            <UiFormSection
              v-if="hasTaxes"
              :title="t('menu.productos.taxCategory')"
            >
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" :aria-label="t('menu.productos.taxCategory')">
                <button
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
                  <span class="text-xs leading-snug">{{ t('menu.productos.incVatRates') }}</span>
                </button>
                <button
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
                  <span class="text-xs leading-snug">{{ t('menu.productos.liquorVat') }}</span>
                </button>
                <button
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

            <UiFormSection
              v-if="isResaleDirectMode"
              :title="t('menu.productos.resaleInventory')"
            >
              <MenuProductResaleCreateForm
                v-model:unit-weight-gr="resaleUnitWeightGr"
                v-model:unit-weight-unit="resaleUnitWeightUnit"
                v-model:draft-units="resalePurchaseUnits"
                :show-error="resaleWeightError"
                embedded
                @clear-error="resaleWeightError = false"
              />
            </UiFormSection>

            <MenuCatalogInlineCreateBusyOverlay
              v-if="!isResaleDirectMode"
              :busy="inlineCatalogBusy"
              :label="inlineCatalogBusyLabel"
              :hint="inlineCatalogBusyHint"
            >
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
                          <option value="">{{ t('menu.productos.chooseRecipe') }}</option>
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
                            :title="'Cuántas unidades de esta receta consume el producto (ej. 2× = doble del rendimiento)'"
                          />
                            <span class="text-xs text-text-secondary whitespace-nowrap">{{ t('menu.productos.recipeUnit') }}</span>
                        </div>
                      </div>

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
                      :aria-label="`Eliminar receta base ${index + 1}`"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div v-else class="text-center py-5 text-text-secondary border border-dashed border-border/80 rounded-lg">
                    <p class="text-sm">{{ t('menu.productos.noBaseRecipes') }}</p>
                    <p class="text-xs mt-1">{{ t('menu.productos.linkBaseRecipe') }}</p>
                </div>
              </UiFormSection>

              <UiFormSection :title="WAREHOUSE_COPY.recipeCostLines">
                <MenuIngredientProductHint class="mb-3" />

                <WarehouseCategoryIngredientSelector
                  class="mb-4"
                  input-id="product-create-category-ingredients"
                  :existing-ingredient-ids="existingIngredientIds"
                  :unit-options="getIngredientUnitOptions"
                  :loading-unit-ids="loadingUnits"
                  @update:prepared-rows="onCategoryPreparedRows"
                />

                <div v-if="form.ingredients.length === 0 && categoryPreparedRows.length === 0" class="text-center py-8 text-text-secondary border border-dashed border-border/80 rounded-lg mb-4">
                    <p class="text-sm font-medium">{{ t('menu.productos.emptyAdditionalLines') }}</p>
                  <p class="text-xs mt-1">{{ WAREHOUSE_COPY.addRecipeCostLinesHelp }}</p>
                </div>

                <div v-else class="space-y-3 mb-4">
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
                    class="flex items-start gap-3 p-4 bg-surface-secondary rounded-lg border border-border"
                  >
                    <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <UiIngredientSearchInput
                          :key="ingredient.ingredient_id || `new-${index}`"
                          :initial-value="getIngredientSearchLabel(ingredient)"
                          :allow-create="true"
                          @select="(ing) => selectIngredient(ing, index)"
                          @create="(name) => openCustomIngModal(name, index)"
                        />
                      </div>
                      <div>
                        <UiDecimalInput
                          v-model="ingredient.quantity"
                          :min="0.01"
                          :placeholder="t('menu.productos.quantity')"
                          :precision="6"
                          class="input-base w-full px-3 py-2 text-sm"
                        />
                      </div>
                      <div class="relative">
                        <select
                          v-model="ingredient.unit"
                          :disabled="loadingUnits.has(ingredient.ingredient_id)"
                          class="input-base w-full py-2 pe-3 text-sm disabled:opacity-50"
                          :class="loadingUnits.has(ingredient.ingredient_id) ? 'ps-7' : 'ps-3'"
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
                        <span v-if="loadingUnits.has(ingredient.ingredient_id)" class="absolute start-2 top-2.5 pointer-events-none text-text-secondary">
                          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="removeIngredient(index)"
                      class="min-h-[44px] min-w-[44px] p-2 bg-destructive/10 text-destructive hover:bg-destructive/15 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-destructive/30"
                      :title="WAREHOUSE_COPY.removeWarehouseItemLine"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

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
            </MenuCatalogInlineCreateBusyOverlay>

            <UiFormSection :title="t('menu.productos.configuration')">
              <div class="space-y-3">
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

        <div class="xl:col-span-1 space-y-6">
          <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
            <h3 class="text-lg font-semibold text-text-primary mb-4">{{ t('menu.productos.summary') }}</h3>

            <div class="space-y-3">
              <div class="flex justify-between text-sm gap-2">
                <span class="text-text-secondary flex-shrink-0">{{ t('menu.productos.typeLabel') }}</span>
                <UiStatusBadge
                  :value="productTypeLabel"
                  format="text"
                  :variant="isResaleDirectMode ? 'primary' : 'secondary'"
                  size="sm"
                />
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">{{ t('menu.productos.priceLabel') }}</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(form.price) }}</span>
              </div>

              <div v-if="!isResaleDirectMode" class="flex justify-between text-sm">
                <span class="text-text-secondary">{{ t('menu.productos.realCostLabel') }}</span>
                <span class="font-semibold text-text-primary">
                  {{ calculatedCost === null ? '—' : formatCurrency(calculatedCost) }}
                </span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">{{ t('menu.productos.myCostSummary') }}</span>
                <span class="font-semibold text-text-primary">
                  {{ form.costo_percibido != null && form.costo_percibido > 0 ? formatCurrency(form.costo_percibido) : '—' }}
                </span>
              </div>

              <div
                v-if="!isResaleDirectMode && form.price > 0 && calculatedCost !== null && calculatedCost > 0"
                class="flex justify-between text-sm pt-3 border-t border-border"
              >
                <span class="text-text-secondary">{{ t('menu.productos.realMarginLabel') }}</span>
                <span class="font-semibold text-primary">
                  {{ marginRealValue === null ? '—' : formatCurrency(marginRealValue) }}
                </span>
              </div>

              <div class="flex justify-between text-sm gap-2">
                <span class="text-text-secondary flex-shrink-0">
                  {{ isResaleDirectMode ? `${t('menu.productos.equivalence')}:` : t('menu.productos.recipeLines') }}
                </span>
                <span class="font-semibold text-text-primary text-end truncate">
                  <template v-if="isResaleDirectMode">
                    {{ resaleEquivalencySummary }}
                  </template>
                  <template v-else>
                    {{ recipeLineCount }}
                  </template>
                </span>
              </div>
            </div>

            <div class="mt-6 pt-6 border-t border-border space-y-3">
              <p v-if="submitError" role="alert" class="text-sm text-destructive flex items-center gap-1">
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
                <Icon v-else name="heroicons:arrow-path" class="h-5 w-5 me-2 animate-spin" />
                {{ isSubmitting ? t('menu.productos.creatingProduct') : t('menu.productos.createProduct') }}
              </UiButton>

              <UiButton
                type="button"
                variant="default"
                size="default"
                class="w-full bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
                :disabled="isSubmitting"
                @click="router.push('/menu/productos')"
              >
                {{ t('common.cancel') }}
              </UiButton>
            </div>
          </div>
        </div>
      </form>
    </div>

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
import { ref, computed, watch } from 'vue'
import { useQuery, useQueryCache } from '@pinia/colada'
import { useMenuIngredientsQuery } from '@/composables/queries/useMenuIngredients'
import { useActiveStationsQuery } from '@/composables/queries/useActiveStations'
import { useTenantReactive } from '@/composables/useTenantReactive'
import {
  defaultUndPurchaseUnitsDraft,
  syncResalePurchaseUnitsDraft,
  type DraftPurchaseUnit,
} from '@/composables/useIngredientPurchaseUnitsDraft'
import { resolveResaleIngredientId } from '@/composables/useResaleLinkedIngredient'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'
import WarehouseCategoryIngredientSelector from '~/components/ingredientes/WarehouseCategoryIngredientSelector.vue'
import type { PreparedWarehouseCategoryIngredient } from '~/composables/useWarehouseCategoryIngredientSelector'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
  module: 'menu',
})

const { t, locale } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()

useHead({ title: t('menu.recetas.form.createTitle') })

const route = useRoute()
const router = useRouter()
const cache = useQueryCache()
const toast = useToast()
const { currentTenant, businessProfile } = useTenantReactive()

const { data: taxConfigData } = useQuery({
  key: () => ['tenant', 'tax-config', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/tax-config'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const taxConfig = computed(() => taxConfigData.value?.data ?? null)
const hasTaxes = computed(() =>
  !!(taxConfig.value?.inc_applicable || taxConfig.value?.iva_applicable || taxConfig.value?.liquor_tax_applicable)
)

const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const nameError = ref('')

type ProductCreateMode = 'recipe' | 'resale-direct'

const productCreateMode = ref<ProductCreateMode>(
  route.query.modo === 'venta-directa' ? 'resale-direct' : 'recipe',
)
const isResaleDirectMode = computed(() => productCreateMode.value === 'resale-direct')
const productTypeLabel = computed(() =>
  isResaleDirectMode.value ? t('menu.productos.resaleMode') : t('menu.productos.recipeMode'),
)

const resaleUnitWeightGr = ref<number | null>(null)
const resaleUnitWeightUnit = ref<'gr' | 'ml'>('gr')
const resaleWeightError = ref(false)
const resalePurchaseUnits = ref<DraftPurchaseUnit[]>(defaultUndPurchaseUnitsDraft())

function setProductCreateMode(mode: ProductCreateMode) {
  if (productCreateMode.value === mode) return
  productCreateMode.value = mode
  resaleWeightError.value = false
  if (mode === 'recipe') {
    resaleUnitWeightGr.value = null
    resaleUnitWeightUnit.value = 'gr'
    resalePurchaseUnits.value = defaultUndPurchaseUnitsDraft()
  } else {
    categoryPreparedRows.value = []
  }
}

const form = ref({
  name: '',
  description: '',
  image_url: '',
  price: 0,
  category_id: '',
  recipe_bases: [] as Array<{ recipe_base_id: string; quantity: number }>,
  preparation_time: null as number | null,
  controla_stock: true,
  is_available: true,
  is_available_online: true,
  is_available_table_qr: false,
  is_combo: false,
  allow_modifiers: true,
  tax_category: 'standard' as 'standard' | 'liquor' | 'exempt',
  ingredients: [] as Array<{
    ingredient_id: string
    ingredient_name?: string
    quantity: number
    unit: string
  }>,
  tenant_id: currentTenant.value?.id || '',
  costo_percibido: null as number | null,
})

const queryName = route.query.nombre
if (typeof queryName === 'string' && queryName.trim()) {
  form.value.name = queryName.trim()
}

watch(
  () => route.query.modo,
  (modo) => {
    if (modo === 'venta-directa') setProductCreateMode('resale-direct')
    else if (modo === undefined || modo === '') setProductCreateMode('recipe')
  },
)

watch(
  () => route.query.nombre,
  (nombre) => {
    if (typeof nombre === 'string' && nombre.trim()) form.value.name = nombre.trim()
  },
)

const { data: categoriesData } = useAsyncData(
  `categories-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/categories'),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

const { availableIngredients } = useMenuIngredientsQuery()

const { activeStations, refetch: refetchActiveStations } = useActiveStationsQuery()
const { data: categoryStationsData, refresh: refreshCategoryStations } = useAsyncData(
  'category-stations',
  () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations/categories'),
  { server: false, watch: [currentTenant] }
)
const categoryStations = computed(() => (categoryStationsData.value as any)?.data ?? [])
const inheritedStation = computed(() => {
  if (!form.value.category_id) return null
  const mapping = categoryStations.value.find((m: any) => m.category_id === form.value.category_id)
  if (!mapping?.station_id) return null
  const fromActive = activeStations.value.find((s: any) => s.id === mapping.station_id)
  if (fromActive) return fromActive
  if (mapping.station_name) {
    return {
      id: mapping.station_id,
      name: mapping.station_name,
      color: mapping.station_color ?? '#94a3b8',
    }
  }
  return null
})

const ingredientCache = ref<Record<string, any>>({})
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
const loadingUnits = ref<Set<string>>(new Set())
const categoryPreparedRows = ref<PreparedWarehouseCategoryIngredient[]>([])

const existingIngredientIds = computed(() =>
  form.value.ingredients.map(row => row.ingredient_id).filter(Boolean),
)
const combinedIngredients = computed(() => [
  ...form.value.ingredients,
  ...mapPreparedRowsToProduct(categoryPreparedRows.value),
])

const {
  getIngredientUnitOptions: buildUnitOptions,
  defaultUnitForIngredient,
  mergeIngredientUnitFields,
  rehydrateIngredientCaches,
} = useIngredientUnitOptions()

function getIngredientUnitOptions(ingredientId: string) {
  return buildUnitOptions(ingredientId, {
    ingredientCache: ingredientCache.value,
    purchaseUnitsCache: purchaseUnitsCache.value,
  })
}

function cacheIngredientForUnits(ing: any, productFallback?: Record<string, unknown>) {
  const catalogRow = availableIngredients.value.find((i: any) => i.id === ing.id)
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

function getIngredientSearchLabel(ingredient: { ingredient_id: string; ingredient_name?: string }) {
  if (ingredient.ingredient_name) return ingredient.ingredient_name
  const cached = ingredientCache.value[ingredient.ingredient_id]
  if (cached?.name) return cached.name
  const fromCatalog = availableIngredients.value.find((i: any) => i.id === ingredient.ingredient_id)
  return fromCatalog?.name ?? ''
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

function onCategoryPreparedRows(rows: PreparedWarehouseCategoryIngredient[]) {
  categoryPreparedRows.value = rows
  for (const row of rows) {
    cacheIngredientForUnits({
      id: row.ingredient_id,
      name: row.name,
      unit: ingredientCache.value[row.ingredient_id]?.unit || row.unit || undefined,
    })
    void loadPurchaseUnits(row.ingredient_id)
  }
}

function rehydrateProductIngredientCaches() {
  if (!availableIngredients.value.length) return
  const entries = form.value.ingredients
    .filter(ing => ing.ingredient_id)
    .map(ing => ({
      id: ing.ingredient_id,
      ...ingredientCache.value[ing.ingredient_id],
    }))
  rehydrateIngredientCaches(entries, availableIngredients.value, ingredientCache.value)
}

watch(availableIngredients, (list) => {
  if (list.length && form.value.ingredients.some(ing => ing.ingredient_id)) {
    rehydrateProductIngredientCaches()
  }
})

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

const categories = computed(() => categoriesData.value?.data || [])
const recipeBases = computed(() => recipeBasesData.value?.data || [])

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

const isLoadingData = computed(() => !categoriesData.value)

const calculatedCost = computed<number | null>(() => {
  if (
    selectedRecipeBaseIngredients.value.length === 0 &&
    form.value.ingredients.length === 0
  ) {
    return null
  }

  let totalCost = 0

  if (selectedRecipeBaseIngredients.value.length > 0) {
    totalCost += selectedRecipeBaseIngredients.value.reduce((sum: number, ing: any) => {
      const ingredient = availableIngredients.value.find((i: any) => i.id === ing.ingredient_id)
      return sum + (ing.base_quantity * Number(ingredient?.costo_unitario || ingredient?.price || 0))
    }, 0)
  }

  totalCost += form.value.ingredients.reduce((sum, ing) => {
    const cached = ingredientCache.value[ing.ingredient_id]
    const ingredient = cached || availableIngredients.value.find((i: any) => i.id === ing.ingredient_id)
    if (!ingredient) return sum
    return sum + (ing.quantity * Number(ingredient.costo_unitario || ingredient.price || 0))
  }, 0)

  return totalCost
})

const { marginRealPct, marginOperativoPct } = useProductMargins()

const marginPreview = computed(() => ({
  price: form.value.price,
  costo_calculado: calculatedCost.value,
  costo_percibido: form.value.costo_percibido,
}))

const marginRealValue = computed<number | null>(() => {
  if (calculatedCost.value === null) return null
  return form.value.price - calculatedCost.value
})

const marginOperativoValue = computed<number | null>(() => {
  const perceived = form.value.costo_percibido
  if (perceived == null || perceived <= 0) return null
  return form.value.price - perceived
})

const recipeLineCount = computed(() => {
  const bases = form.value.recipe_bases.filter(l => l.recipe_base_id).length
  return bases + form.value.ingredients.length
})

const resaleEquivalencySummary = computed(() => {
  const w = resaleUnitWeightGr.value
  if (w == null || Number(w) <= 0) return '—'
  return `${w} ${resaleUnitWeightUnit.value} / und`
})

async function validateForm(): Promise<boolean> {
  submitError.value = null
  nameError.value = ''
  resaleWeightError.value = false

  if (!form.value.name?.trim()) {
    nameError.value = t('menu.productos.nameRequiredError')
    return false
  }
  if (!form.value.category_id) {
    submitError.value = t('menu.productos.categoryRequiredError')
    return false
  }
  if (!form.value.price || form.value.price <= 0) {
    submitError.value = t('menu.productos.priceRequiredError')
    return false
  }

  const res = await $fetch<{ available: boolean }>(
    `/api/menu/check-name?entity=products&name=${encodeURIComponent(form.value.name.trim())}`,
  )
  if (!res.available) {
    nameError.value = t('menu.productos.nameExistsError')
    return false
  }

  if (isResaleDirectMode.value) {
    const w = resaleUnitWeightGr.value
    if (w == null || Number(w) <= 0) {
      resaleWeightError.value = true
      submitError.value = t('menu.productos.equivalenceRequiredError')
      return false
    }
    return true
  }

  const validationError = validateMenuCompositionRows(
    combinedIngredients.value,
    ingredientId => getIngredientUnitOptions(ingredientId).map(option => option.value),
  )
  if (validationError === 'incomplete') {
    submitError.value = WAREHOUSE_COPY.completeRecipeCostLinesError
    return false
  }
  if (validationError === 'duplicate') {
    submitError.value = WAREHOUSE_COPY.duplicateWarehouseItemInList
    return false
  }
  if (validationError === 'incompatible-unit') {
    submitError.value = t('menu.common.incompatibleUnitError')
    return false
  }

  return true
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

const showNewCategoryModal = ref(false)
const newCategoryName = ref('')
const selectedCategoryName = ref('')

function onCategorySelected(cat: { id: string; name: string }) {
  form.value.category_id = cat.id
  selectedCategoryName.value = cat.name
}

function onCategoryCreateRequested(typedName: string) {
  newCategoryName.value = typedName
  showNewCategoryModal.value = true
}

function onCategoryCreated(cat: { id: string; name: string }) {
  form.value.category_id = cat.id
  selectedCategoryName.value = cat.name
}

const showImageModal = ref(false)

function onImageUploaded(url: string) {
  form.value.image_url = url
  showImageModal.value = false
}

const showNewStationModal = ref(false)
const isAssigningInheritedStation = ref(false)

async function onStationCreated(station: { id: string; name: string }) {
  const categoryId = form.value.category_id
  const categoryName = categoryId ? getCategoryName(categoryId) : null

  cache.invalidateQueries({ key: ['tenant', 'stations', 'active', currentTenant.value?.id] })
  cache.invalidateQueries({ key: ['tenant', 'stations', currentTenant.value?.id] })

  if (!categoryId) {
    toast.success(
      `${t('menu.productos.stationCreated')}: ${station.name}`,
      { title: t('menu.productos.stationCreated') },
    )
    await refetchActiveStations()
    return
  }

  isAssigningInheritedStation.value = true
  try {
    await $fetch(`/api/api/stations/categories/${categoryId}`, {
      method: 'POST',
      body: { station_id: station.id },
    })
    await Promise.all([refreshCategoryStations(), refetchActiveStations()])
    toast.success(
      t('menu.productos.stationAssigned', { category: categoryName || t('menu.productos.categoryRequired') }),
      { title: t('menu.productos.stationReady') },
    )
  } catch (e: any) {
    await refetchActiveStations()
    toast.error(
      e?.data?.detail || e?.message || t('menu.productos.stationAssignmentError'),
      { title: t('menu.productos.stationCreatedUnassigned') },
    )
  } finally {
    isAssigningInheritedStation.value = false
  }
}

function getCategoryName(categoryId: string) {
  const category = categories.value.find((c: any) => c.id === categoryId)
  return category?.name || ''
}

function addIngredient() {
  form.value.ingredients.push({
    ingredient_id: '',
    ingredient_name: '',
    quantity: 0,
    unit: 'g',
  })
}

function removeIngredient(index: number) {
  form.value.ingredients.splice(index, 1)
}

function addRecipeBase() {
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

function onRecipeBaseChange() {
  console.log('Recipe bases:', form.value.recipe_bases)
}

async function submitProduct() {
  if (isSubmitting.value) return
  if (!(await validateForm())) return

  isSubmitting.value = true
  submitError.value = null

  try {
    const validLinks = form.value.recipe_bases.filter(l => l.recipe_base_id !== '')
    const seenIds = new Set<string>()
    for (const link of validLinks) {
      if (seenIds.has(link.recipe_base_id)) {
        submitError.value = 'No puedes agregar la misma receta base más de una vez.'
        isSubmitting.value = false
        return
      }
      if (!Number.isFinite(Number(link.quantity)) || Number(link.quantity) <= 0) {
        submitError.value = 'La cantidad de cada receta debe ser mayor que 0.'
        isSubmitting.value = false
        return
      }
      seenIds.add(link.recipe_base_id)
    }

    form.value.tenant_id = currentTenant.value?.id || ''

    if (isResaleDirectMode.value) {
      const weight = Number(resaleUnitWeightGr.value)
      if (!Number.isFinite(weight) || weight <= 0) {
        resaleWeightError.value = true
      submitError.value = t('menu.productos.equivalenceRequiredError')
        isSubmitting.value = false
        return
      }

      const resalePayload = {
        name: form.value.name,
        description: form.value.description,
        image_url: form.value.image_url || null,
        price: form.value.price,
        category_id: form.value.category_id,
        preparation_time: form.value.preparation_time,
        is_available: form.value.is_available,
        is_available_online: form.value.is_available_online,
        is_available_table_qr: form.value.is_available_table_qr,
        allow_modifiers: false,
        tax_category: form.value.tax_category,
        costo_percibido: form.value.costo_percibido ?? null,
        tenant_id: form.value.tenant_id,
        is_resale: true,
        auto_resale_ingredient: true,
        resale_unit_weight_gr: weight,
        resale_unit_weight_unit: resaleUnitWeightUnit.value,
        ingredients: [] as typeof form.value.ingredients,
        recipe_bases: [] as typeof form.value.recipe_bases,
        recipe_base_ids: [] as string[],
      }

      const created = await $fetch<{ data?: Record<string, unknown> }>('/api/menu/products', {
        method: 'POST',
        body: resalePayload,
      })

      const productData = (created?.data ?? created) as Record<string, unknown>
      const ingredientId = await resolveResaleIngredientId(productData)
      if (ingredientId) {
        await syncResalePurchaseUnitsDraft(ingredientId, resalePurchaseUnits.value)
      }

      cache.invalidateQueries()
      toast.success(t('menu.productos.directProductCreated'))
      await router.push('/menu/productos')
      return
    }

    const cleanedRecipeBases = validLinks.map(l => ({
      recipe_base_id: l.recipe_base_id,
      quantity: Number(l.quantity),
    }))
    const cleanedForm = {
      ...form.value,
      recipe_bases: cleanedRecipeBases,
      recipe_base_ids: cleanedRecipeBases.map(l => l.recipe_base_id),
      ingredients: combinedIngredients.value,
      image_url: form.value.image_url || null,
      costo_percibido: form.value.costo_percibido ?? null,
    }

    await $fetch('/api/menu/products', {
      method: 'POST',
      body: cleanedForm
    })

    cache.invalidateQueries()

    await router.push('/menu/productos')
  } catch (error: any) {
    console.error('Error creating product:', error)
    const detail = error.data?.detail
    if (Array.isArray(detail)) {
      submitError.value = t('menu.productos.validationError')
    } else {
      submitError.value = detail || error.message || t('menu.productos.createError')
    }
  } finally {
    isSubmitting.value = false
  }
}

function formatCurrency(value: number) {
  if (!value) return '$0'
  return new Intl.NumberFormat(toNumberLocaleTag(locale.value), {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}
</script>
