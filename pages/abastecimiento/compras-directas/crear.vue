<template>
  <div class="page-layout">
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Registrando compra directa...</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else>
      <!-- Order Information Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-3 sm:p-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <!-- Purchase Number -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Numero de Compra
                </p>
                <p class="text-lg font-semibold text-text-primary">
                  {{ nextPurchaseNumber }}
                </p>
              </div>
            </div>

            <!-- Date -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Fecha de Compra
                </p>
                <p class="text-sm sm:text-lg font-semibold text-text-primary">
                  {{ form.purchase_date ? fnsFormat(form.purchase_date, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha' }}
                </p>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Estado
                </p>
                <div class="pt-1">
                  <UiStatusBadge
                    value="Stock Inmediato"
                    format="text"
                    variant="success"
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="bg-surface border-border border rounded-lg mb-2 sm:mb-3">
        <div class="p-3 sm:p-4">
          <div class="flex items-center justify-between">
            <!-- Step 1 -->
            <div class="flex items-center flex-1">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 1,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 1,
                  'border-border text-text-secondary bg-transparent': currentStep < 1
                }"
              >
                <svg v-if="currentStep > 1" class="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">1</span>
              </div>
              <div class="ml-1 sm:ml-3 flex-1 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 1 ? 'text-text-primary' : 'text-text-secondary'">
                  <span class="hidden sm:inline">Proveedor</span>
                  <span class="sm:hidden">Prov.</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Seleccionar proveedor</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 1 ? 'bg-secondary' : 'bg-border'"></div>
            </div>

            <!-- Step 2 -->
            <div class="flex items-center flex-1">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 2,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 2,
                  'border-border text-text-secondary bg-transparent': currentStep < 2
                }"
              >
                <svg v-if="currentStep > 2" class="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">2</span>
              </div>
              <div class="ml-1 sm:ml-3 flex-1 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 2 ? 'text-text-primary' : 'text-text-secondary'">
                  Items
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Productos y precios</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 2 ? 'bg-secondary' : 'bg-border'"></div>
            </div>

            <!-- Step 3 -->
            <div class="flex items-center flex-1">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 3,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 3,
                  'border-border text-text-secondary bg-transparent': currentStep < 3
                }"
              >
                <svg v-if="currentStep > 3" class="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">3</span>
              </div>
              <div class="ml-1 sm:ml-3 flex-1 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 3 ? 'text-text-primary' : 'text-text-secondary'">
                  <span class="hidden sm:inline">Documentos</span>
                  <span class="sm:hidden">Docs</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Factura y pago (opcional)</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 3 ? 'bg-secondary' : 'bg-border'"></div>
            </div>

            <!-- Step 4 -->
            <div class="flex items-center">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 4,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 4,
                  'border-border text-text-secondary bg-transparent': currentStep < 4
                }"
              >
                <span class="font-semibold text-sm sm:text-base">4</span>
              </div>
              <div class="ml-1 sm:ml-3 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 4 ? 'text-text-primary' : 'text-text-secondary'">
                  <span class="hidden sm:inline">Confirmar</span>
                  <span class="sm:hidden">OK</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Revisar y guardar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="handleNext">
        <!-- Step 1: Proveedor -->
        <Transition name="fade" mode="out-in">
        <div v-if="currentStep === 1" key="step-1" class="bg-surface border-border border rounded-lg">
          <div class="p-3 sm:p-4">
            <div class="flex items-center justify-between mb-2 sm:mb-3">
              <h3 class="text-base sm:text-lg font-semibold text-text-primary">Seleccionar Proveedor</h3>
              <div>
                <!-- Hidden scan input (moved here from Step 2) -->
                <input
                  ref="scanFileInput"
                  type="file"
                  class="hidden"
                  accept="image/*"
                  capture="environment"
                  @change="handleScanFileSelect"
                />
                <button
                  type="button"
                  :disabled="isScanning"
                  @click="scanFileInput?.click()"
                  class="px-3 py-2 bg-primary/10 text-primary border-2 border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg v-if="!isScanning" class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <UiLoadingDots v-else size="9px" />
                  {{ isScanning ? currentPhrase : 'Leer Factura con IA' }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">Proveedor *</label>
                <div class="flex items-stretch gap-3">
                  <div class="flex-1 min-w-0">
                    <UiSearchableSelect
                      v-model="form.supplier_id"
                      :options="supplierOptions"
                      placeholder="Buscar proveedor..."
                      required
                      @update:model-value="onSupplierChange"
                    />
                  </div>
                  <div v-if="supplierScanStatus === 'matched'" class="flex items-center gap-1.5 text-xs text-success bg-success/10 border border-success/20 px-2.5 rounded-lg shrink-0">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <span>Proveedor detectado: <strong>{{ similarSupplier?.name }}</strong></span>
                  </div>
                </div>
                <p class="text-xs text-text-secondary mt-2">
                  Si no encuentras el proveedor, <NuxtLink to="/abastecimiento/proveedores" class="text-primary hover:underline">crealo primero aqui</NuxtLink>
                </p>
                <div v-if="supplierScanStatus === 'similar'" class="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
                  <p class="font-medium text-warning mb-1">¿Es este tu proveedor?</p>
                  <p class="text-text-secondary mb-3">Encontramos "<strong>{{ similarSupplier?.name }}</strong>", similar a "<em>{{ ocrSupplierName }}</em>" en la factura.</p>
                  <div class="flex gap-2">
                    <button type="button" @click="selectSimilarSupplier" class="px-3 py-1.5 bg-warning text-white rounded-lg text-xs font-medium hover:bg-warning/90 transition-colors">
                      Sí, usar ese
                    </button>
                    <button type="button" @click="supplierScanStatus = 'not_found'; similarSupplier = null" class="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium hover:bg-background transition-colors">
                      No, es diferente
                    </button>
                  </div>
                </div>
                <div v-else-if="supplierScanStatus === 'not_found'" class="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                  <p class="text-text-secondary mb-2">Factura de: <strong>"{{ ocrSupplierName }}"</strong> — no está en tu lista.</p>
                  <button
                    type="button"
                    @click="createSupplierFromOcr"
                    :disabled="isCreatingSupplier"
                    class="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {{ isCreatingSupplier ? 'Creando...' : `+ Crear "${ocrSupplierName}"` }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Tipo de Pago
                </label>
                <select
                  v-model="form.payment_type"
                  class="input-base w-full px-4 py-2"
                >
                  <option value="contado">Contado - Pago Inmediato</option>
                  <option value="credito">Credito - Pago Diferido</option>
                  <option value="contraentrega">Contraentrega</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Fecha de compra
                </label>
                <ClientOnly>
                  <VueDatePicker
                    v-model="form.purchase_date"
                    :enable-time-picker="false"
                    :locale="es"
                    auto-apply
                    :teleport="true"
                    :max-date="new Date()"
                    :format="formatPurchaseDate"
                    input-class-name="dp-custom-input"
                    menu-class-name="dp-custom-menu"
                    calendar-cell-class-name="dp-custom-cell"
                    placeholder="Seleccionar fecha..."
                  />
                </ClientOnly>
              </div>

              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Notas Generales
                </label>
                <textarea
                  v-model="form.notes"
                  class="input-base w-full px-4 py-2"
                  rows="3"
                  placeholder="Observaciones adicionales sobre la compra..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Items -->
        <div v-else-if="currentStep === 2" key="step-2" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-2 sm:mb-3">
              <h3 class="text-base sm:text-lg font-semibold text-text-primary">Items de la Compra</h3>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="addItem"
                  class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  + Agregar Item
                </button>
              </div>
            </div>

            <!-- OCR banner -->
            <div v-if="ocrItemsLoaded" class="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-2 text-sm text-primary">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="font-medium">Items cargados. La IA puede cometer errores, por favor verifica todos los datos.</span>
            </div>

            <!-- Tabs de Filtro por Tipo de Ingrediente -->
            <div class="flex flex-wrap gap-2 mb-2 sm:mb-3 p-1 bg-background rounded-lg border border-border">
              <button
                v-for="typeOption in ingredientTypeOptions"
                :key="typeOption.value"
                type="button"
                @click="selectedIngredientType = typeOption.value"
                class="flex-1 min-w-[100px] px-3 py-2 text-sm font-medium rounded-md transition-all"
                :class="selectedIngredientType === typeOption.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'"
              >
                {{ typeOption.label }}
              </button>
            </div>

          <div class="relative">
             <!-- AI Loading Overlay -->
            <div v-if="isScanning" class="w-full py-6 flex flex-row items-center justify-center gap-3 bg-white rounded-lg border border-dashed border-gray-200">
              <CommonsTheCustomLoader size="small" />
              <p class="text-sm font-medium text-text-primary animate-pulse flex items-center gap-2 m-0">
                <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {{ currentPhrase }}
              </p>
            </div>

            <!-- Items List (grouped by type) -->
            <div v-else class="space-y-4">

              <!-- Section: Alimentos -->
              <div v-if="itemsByType.food.length > 0 || selectedIngredientType === 'food'">
                <div class="flex items-center gap-2 mb-2">
                  <svg class="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  <span class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Alimentos</span>
                  <span class="text-xs text-text-secondary bg-background px-1.5 py-0.5 rounded border border-border">{{ itemsByType.food.length }}</span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="item in itemsByType.food"
                    :key="form.items.indexOf(item)"
                    class="border border-border rounded-lg p-3 bg-background relative"
                    :class="{ 'z-20': item.showResults }"
                  >
                    <div class="flex justify-between items-start mb-2">
                      <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Item #{{ form.items.indexOf(item) + 1 }}</h4>
                      <button
                        type="button"
                        @click="removeItem(form.items.indexOf(item))"
                        :disabled="form.items.length === 1"
                        class="text-destructive hover:text-destructive/80 disabled:opacity-50 p-2"
                      >
                        <TrashIcon class="w-4 h-4" />
                      </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      <!-- Ingredient Search (lg: 4 cols) -->
                      <div class="sm:col-span-12 lg:col-span-4 relative z-10">
                        <label class="block text-xs font-medium text-text-primary mb-1">
                          Ítem / Ingrediente *
                        </label>
                        <div class="relative">
                          <input
                            type="text"
                            v-model="item.searchTerm"
                            @input="(e) => searchIngredients(e.target.value, form.items.indexOf(item))"
                            @focus="() => { if (item.searchTerm) searchIngredients(item.searchTerm, form.items.indexOf(item)) }"
                            @blur="() => hideResults(item)"
                            class="input-base w-full pl-8 pr-3 py-1.5 text-sm"
                            placeholder="Buscar ingrediente..."
                          />
                          <span class="absolute left-2.5 top-2 text-text-secondary">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
                            </svg>
                          </span>
                          <!-- Search Results Dropdown -->
                          <div
                            v-if="item.showResults && ingredientResults[form.items.indexOf(item)]?.length"
                            class="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                          >
                            <ul class="py-1">
                              <li
                                v-for="ing in ingredientResults[form.items.indexOf(item)]"
                                :key="ing.id"
                                @click="selectIngredient(ing, form.items.indexOf(item))"
                                class="px-3 py-2 hover:bg-surface-secondary cursor-pointer text-sm text-text-primary"
                              >
                                {{ ing.name }}
                              </li>
                            </ul>
                          </div>
                        </div>
                        <!-- OCR hint -->
                        <p v-if="item.ocr_description" class="mt-1 text-xs leading-tight flex items-center gap-1" :class="item.ingredient_id ? 'text-success' : 'text-amber-600'">
                          <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path v-if="item.ingredient_id" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span class="truncate">Fac: "{{ item.ocr_description }}"</span>
                        </p>
                      </div>

                      <!-- Wrapper for Unit and Financials (lg: 8 cols) -->
                      <div class="sm:col-span-12 lg:col-span-8 flex flex-col gap-2">
                        <!-- Top Row: Financials -->
                        <div class="grid grid-cols-3 gap-3">
                          <!-- Quantity -->
                          <div>
                            <label class="block text-xs font-medium text-text-primary mb-1">Cant. *</label>
                            <input
                              v-model.number="item.purchase_quantity"
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              class="input-base w-full px-2 py-1.5 text-sm"
                              @input="() => updateItemTotal(form.items.indexOf(item))"
                              placeholder="0"
                            />
                          </div>
                          <!-- Unit Price -->
                          <div>
                            <label class="block text-xs font-medium text-text-primary mb-1 whitespace-nowrap">
                              P. Unit *
                              <span
                                v-if="item.suggested_price"
                                class="text-[10px] text-success cursor-pointer ml-0.5"
                                @click="item.unit_cost = item.suggested_price; updateItemTotal(form.items.indexOf(item))"
                                title="Usar precio sugerido"
                              >
                                (Sug: {{ formatPrice(item.suggested_price) }})
                              </span>
                            </label>
                            <div class="relative">
                              <span class="absolute left-2 top-1.5 text-text-secondary text-xs">$</span>
                              <input
                                v-model.number="item.unit_cost"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                class="input-base w-full pl-5 pr-2 py-1.5 text-sm"
                                @input="() => updateItemTotal(form.items.indexOf(item))"
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <!-- Total -->
                          <div>
                            <label class="block text-xs font-medium text-text-primary mb-1">Total</label>
                            <div class="input-base w-full px-2 py-1.5 text-sm bg-surface-secondary font-medium text-text-primary flex items-center h-[34px]">
                              ${{ formatPrice(item.total_cost) }}
                            </div>
                          </div>
                        </div>
                        <!-- Bottom Row: Unit Section -->
                        <div class="w-full">
                          <div class="flex items-center gap-2 mb-1">
                            <label class="text-xs font-medium text-text-primary">Unidad *</label>
                            <button
                              v-if="item.ingredient_id && !newUnitForms[form.items.indexOf(item)]?.show"
                              type="button"
                              class="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                              @click="initNewUnitForm(form.items.indexOf(item))"
                            >
                              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                              </svg>
                              Nueva
                            </button>
                          </div>
                          <div class="flex items-start gap-2">
                            <!-- Unit Select -->
                            <div class="flex-1 min-w-[120px]">
                              <select
                                v-model="item.purchase_unit"
                                required
                                :disabled="!item.ingredient_id"
                                class="input-base w-full px-2 py-1.5 text-sm h-[34px]"
                                :class="{ 'bg-surface-secondary cursor-not-allowed': !item.ingredient_id }"
                                @change="() => onUnitChange(form.items.indexOf(item))"
                              >
                                <option value="">{{ item.ingredient_id ? 'Seleccionar' : '...' }}</option>
                                <option
                                  v-for="unitOpt in getPurchaseUnitOptions(item.ingredient_id)"
                                  :key="unitOpt.value"
                                  :value="unitOpt.value"
                                >
                                  {{ unitOpt.label }}
                                </option>
                              </select>
                              <p v-if="item.ingredient_id && item.purchase_unit" class="text-[10px] text-text-secondary mt-0.5">
                                = {{ getConvertedQuantity(form.items.indexOf(item)) }} {{ getIngredientUnit(item.ingredient_id) }}
                              </p>
                            </div>
                            <!-- Peso por unidad -->
                            <div
                              v-if="needsGramsPerUnit(item.ingredient_id)"
                              class="rounded-md p-1 transition-colors"
                              :class="getExistingGramsPerUnit(item.ingredient_id) ? 'bg-success/8 border border-success/25' : ''"
                            >
                              <label class="block text-[10px] font-semibold text-text-primary mb-0.5">
                                Peso(gr){{ getExistingGramsPerUnit(item.ingredient_id) ? ' ✓' : '' }}
                              </label>
                              <input
                                v-model.number="item.grams_per_unit"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="0"
                                class="input-base w-20 px-1 py-1.5 text-xs text-center h-[34px]"
                              />
                              <p class="text-[10px] mt-0.5 text-text-secondary font-medium">
                                {{ getExistingGramsPerUnit(item.ingredient_id) ? 'Guardado' : 'Solo esta vez' }}
                              </p>
                            </div>
                            <!-- New Unit Form Fields -->
                            <template v-if="newUnitForms[form.items.indexOf(item)]?.show">
                              <div>
                                <label class="block text-[10px] font-medium text-text-secondary mb-0.5">Nombre</label>
                                <input
                                  v-model="newUnitForms[form.items.indexOf(item)].label"
                                  type="text"
                                  placeholder="Ej: Caja"
                                  class="input-base w-24 px-1.5 py-1.5 text-[10px] h-[34px]"
                                />
                              </div>
                              <div>
                                <label class="block text-[10px] font-medium text-text-secondary mb-0.5 text-center">Cant.</label>
                                <input
                                  v-model.number="newUnitForms[form.items.indexOf(item)].factor"
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  class="input-base w-16 px-1 py-1.5 text-[10px] text-center h-[34px]"
                                />
                              </div>
                              <div class="flex gap-0.5 h-[34px] items-center">
                                <button
                                  type="button"
                                  class="p-1 bg-primary text-white rounded hover:bg-primary/90 transition-colors h-7 w-7 flex items-center justify-center"
                                  title="Guardar"
                                  @click="saveNewUnit(form.items.indexOf(item))"
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  class="p-1 border border-border text-text-secondary rounded hover:bg-surface-secondary transition-colors h-7 w-7 flex items-center justify-center"
                                  title="Cancelar"
                                  @click="newUnitForms[form.items.indexOf(item)] = { ...newUnitForms[form.items.indexOf(item)], show: false }"
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                  </svg>
                                </button>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Notes Row (Full width) -->
                    <div class="mt-2">
                      <input
                        v-model="item.notes"
                        type="text"
                        class="input-base w-full px-2 py-1.5 text-xs text-text-secondary border-dashed bg-transparent focus:bg-background focus:border-solid transition-colors"
                        placeholder="+ Agregar notas u observaciones del item (opcional)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section: Servicios -->
              <div v-if="itemsByType.service.length > 0 || selectedIngredientType === 'service'">
                <div class="flex items-center gap-2 mb-2">
                  <svg class="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <span class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Servicios</span>
                  <span class="text-xs text-text-secondary bg-background px-1.5 py-0.5 rounded border border-border">{{ itemsByType.service.length }}</span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="item in itemsByType.service"
                    :key="form.items.indexOf(item)"
                    class="border border-border rounded-lg p-3 bg-background relative"
                    :class="{ 'z-20': item.showResults }"
                  >
                    <div class="flex justify-between items-start mb-2">
                      <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Item #{{ form.items.indexOf(item) + 1 }}</h4>
                      <button
                        type="button"
                        @click="removeItem(form.items.indexOf(item))"
                        :disabled="form.items.length === 1"
                        class="text-destructive hover:text-destructive/80 disabled:opacity-50 p-2"
                      >
                        <TrashIcon class="w-4 h-4" />
                      </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      <!-- Ingredient Search (lg: 4 cols) -->
                      <div class="sm:col-span-12 lg:col-span-4 relative z-10">
                        <label class="block text-xs font-medium text-text-primary mb-1">
                          Ítem / Ingrediente *
                        </label>
                        <div class="relative">
                          <input
                            type="text"
                            v-model="item.searchTerm"
                            @input="(e) => searchIngredients(e.target.value, form.items.indexOf(item))"
                            @focus="() => { if (item.searchTerm) searchIngredients(item.searchTerm, form.items.indexOf(item)) }"
                            @blur="() => hideResults(item)"
                            class="input-base w-full pl-8 pr-3 py-1.5 text-sm"
                            placeholder="Buscar ingrediente..."
                          />
                          <span class="absolute left-2.5 top-2 text-text-secondary">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
                            </svg>
                          </span>
                          <!-- Search Results Dropdown -->
                          <div
                            v-if="item.showResults && ingredientResults[form.items.indexOf(item)]?.length"
                            class="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                          >
                            <ul class="py-1">
                              <li
                                v-for="ing in ingredientResults[form.items.indexOf(item)]"
                                :key="ing.id"
                                @click="selectIngredient(ing, form.items.indexOf(item))"
                                class="px-3 py-2 hover:bg-surface-secondary cursor-pointer text-sm text-text-primary"
                              >
                                {{ ing.name }}
                              </li>
                            </ul>
                          </div>
                        </div>
                        <!-- OCR hint -->
                        <p v-if="item.ocr_description" class="mt-1 text-xs leading-tight flex items-center gap-1" :class="item.ingredient_id ? 'text-success' : 'text-amber-600'">
                          <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path v-if="item.ingredient_id" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span class="truncate">Fac: "{{ item.ocr_description }}"</span>
                        </p>
                      </div>

                      <!-- Wrapper for Unit and Financials (lg: 8 cols) -->
                      <div class="sm:col-span-12 lg:col-span-8 flex flex-col gap-2">
                        <!-- Top Row: Financials -->
                        <div class="grid grid-cols-3 gap-3">
                          <div>
                            <label class="block text-xs font-medium text-text-primary mb-1">Cant. *</label>
                            <input
                              v-model.number="item.purchase_quantity"
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              class="input-base w-full px-2 py-1.5 text-sm"
                              @input="() => updateItemTotal(form.items.indexOf(item))"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-text-primary mb-1 whitespace-nowrap">
                              P. Unit *
                              <span
                                v-if="item.suggested_price"
                                class="text-[10px] text-success cursor-pointer ml-0.5"
                                @click="item.unit_cost = item.suggested_price; updateItemTotal(form.items.indexOf(item))"
                                title="Usar precio sugerido"
                              >
                                (Sug: {{ formatPrice(item.suggested_price) }})
                              </span>
                            </label>
                            <div class="relative">
                              <span class="absolute left-2 top-1.5 text-text-secondary text-xs">$</span>
                              <input
                                v-model.number="item.unit_cost"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                class="input-base w-full pl-5 pr-2 py-1.5 text-sm"
                                @input="() => updateItemTotal(form.items.indexOf(item))"
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-text-primary mb-1">Total</label>
                            <div class="input-base w-full px-2 py-1.5 text-sm bg-surface-secondary font-medium text-text-primary flex items-center h-[34px]">
                              ${{ formatPrice(item.total_cost) }}
                            </div>
                          </div>
                        </div>
                        <!-- Bottom Row: Unit Section -->
                        <div class="w-full">
                          <div class="flex items-center gap-2 mb-1">
                            <label class="text-xs font-medium text-text-primary">Unidad *</label>
                            <button
                              v-if="item.ingredient_id && !newUnitForms[form.items.indexOf(item)]?.show"
                              type="button"
                              class="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                              @click="initNewUnitForm(form.items.indexOf(item))"
                            >
                              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                              </svg>
                              Nueva
                            </button>
                          </div>
                          <div class="flex items-start gap-2">
                            <div class="flex-1 min-w-[120px]">
                              <select
                                v-model="item.purchase_unit"
                                required
                                :disabled="!item.ingredient_id"
                                class="input-base w-full px-2 py-1.5 text-sm h-[34px]"
                                :class="{ 'bg-surface-secondary cursor-not-allowed': !item.ingredient_id }"
                                @change="() => onUnitChange(form.items.indexOf(item))"
                              >
                                <option value="">{{ item.ingredient_id ? 'Seleccionar' : '...' }}</option>
                                <option
                                  v-for="unitOpt in getPurchaseUnitOptions(item.ingredient_id)"
                                  :key="unitOpt.value"
                                  :value="unitOpt.value"
                                >
                                  {{ unitOpt.label }}
                                </option>
                              </select>
                              <p v-if="item.ingredient_id && item.purchase_unit" class="text-[10px] text-text-secondary mt-0.5">
                                = {{ getConvertedQuantity(form.items.indexOf(item)) }} {{ getIngredientUnit(item.ingredient_id) }}
                              </p>
                            </div>
                            <div
                              v-if="needsGramsPerUnit(item.ingredient_id)"
                              class="rounded-md p-1 transition-colors"
                              :class="getExistingGramsPerUnit(item.ingredient_id) ? 'bg-success/8 border border-success/25' : ''"
                            >
                              <label class="block text-[10px] font-semibold text-text-primary mb-0.5">
                                Peso(gr){{ getExistingGramsPerUnit(item.ingredient_id) ? ' ✓' : '' }}
                              </label>
                              <input
                                v-model.number="item.grams_per_unit"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="0"
                                class="input-base w-20 px-1 py-1.5 text-xs text-center h-[34px]"
                              />
                              <p class="text-[10px] mt-0.5 text-text-secondary font-medium">
                                {{ getExistingGramsPerUnit(item.ingredient_id) ? 'Guardado' : 'Solo esta vez' }}
                              </p>
                            </div>
                            <template v-if="newUnitForms[form.items.indexOf(item)]?.show">
                              <div>
                                <label class="block text-[10px] font-medium text-text-secondary mb-0.5">Nombre</label>
                                <input
                                  v-model="newUnitForms[form.items.indexOf(item)].label"
                                  type="text"
                                  placeholder="Ej: Caja"
                                  class="input-base w-24 px-1.5 py-1.5 text-[10px] h-[34px]"
                                />
                              </div>
                              <div>
                                <label class="block text-[10px] font-medium text-text-secondary mb-0.5 text-center">Cant.</label>
                                <input
                                  v-model.number="newUnitForms[form.items.indexOf(item)].factor"
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  class="input-base w-16 px-1 py-1.5 text-[10px] text-center h-[34px]"
                                />
                              </div>
                              <div class="flex gap-0.5 h-[34px] items-center">
                                <button
                                  type="button"
                                  class="p-1 bg-primary text-white rounded hover:bg-primary/90 transition-colors h-7 w-7 flex items-center justify-center"
                                  title="Guardar"
                                  @click="saveNewUnit(form.items.indexOf(item))"
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  class="p-1 border border-border text-text-secondary rounded hover:bg-surface-secondary transition-colors h-7 w-7 flex items-center justify-center"
                                  title="Cancelar"
                                  @click="newUnitForms[form.items.indexOf(item)] = { ...newUnitForms[form.items.indexOf(item)], show: false }"
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                  </svg>
                                </button>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Notes Row (Full width) -->
                    <div class="mt-2">
                      <input
                        v-model="item.notes"
                        type="text"
                        class="input-base w-full px-2 py-1.5 text-xs text-text-secondary border-dashed bg-transparent focus:bg-background focus:border-solid transition-colors"
                        placeholder="+ Agregar notas u observaciones del item (opcional)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section: Insumos -->
              <div v-if="itemsByType.supply.length > 0 || selectedIngredientType === 'supply'">
                <div class="flex items-center gap-2 mb-2">
                  <svg class="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  <span class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Insumos</span>
                  <span class="text-xs text-text-secondary bg-background px-1.5 py-0.5 rounded border border-border">{{ itemsByType.supply.length }}</span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="item in itemsByType.supply"
                    :key="form.items.indexOf(item)"
                    class="border border-border rounded-lg p-3 bg-background relative"
                    :class="{ 'z-20': item.showResults }"
                  >
                    <div class="flex justify-between items-start mb-2">
                      <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Item #{{ form.items.indexOf(item) + 1 }}</h4>
                      <button
                        type="button"
                        @click="removeItem(form.items.indexOf(item))"
                        :disabled="form.items.length === 1"
                        class="text-destructive hover:text-destructive/80 disabled:opacity-50 p-2"
                      >
                        <TrashIcon class="w-4 h-4" />
                      </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      <!-- Ingredient Search (lg: 4 cols) -->
                      <div class="sm:col-span-12 lg:col-span-4 relative z-10">
                        <label class="block text-xs font-medium text-text-primary mb-1">
                          Ítem / Ingrediente *
                        </label>
                        <div class="relative">
                          <input
                            type="text"
                            v-model="item.searchTerm"
                            @input="(e) => searchIngredients(e.target.value, form.items.indexOf(item))"
                            @focus="() => { if (item.searchTerm) searchIngredients(item.searchTerm, form.items.indexOf(item)) }"
                            @blur="() => hideResults(item)"
                            class="input-base w-full pl-8 pr-3 py-1.5 text-sm"
                            placeholder="Buscar ingrediente..."
                          />
                          <span class="absolute left-2.5 top-2 text-text-secondary">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
                            </svg>
                          </span>
                          <!-- Search Results Dropdown -->
                          <div
                            v-if="item.showResults && ingredientResults[form.items.indexOf(item)]?.length"
                            class="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                          >
                            <ul class="py-1">
                              <li
                                v-for="ing in ingredientResults[form.items.indexOf(item)]"
                                :key="ing.id"
                                @click="selectIngredient(ing, form.items.indexOf(item))"
                                class="px-3 py-2 hover:bg-surface-secondary cursor-pointer text-sm text-text-primary"
                              >
                                {{ ing.name }}
                              </li>
                            </ul>
                          </div>
                        </div>
                        <!-- OCR hint -->
                        <p v-if="item.ocr_description" class="mt-1 text-xs leading-tight flex items-center gap-1" :class="item.ingredient_id ? 'text-success' : 'text-amber-600'">
                          <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path v-if="item.ingredient_id" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span class="truncate">Fac: "{{ item.ocr_description }}"</span>
                        </p>
                      </div>

                      <!-- Wrapper for Unit and Financials (lg: 8 cols) -->
                      <div class="sm:col-span-12 lg:col-span-8 flex flex-col gap-2">
                        <!-- Top Row: Financials -->
                        <div class="grid grid-cols-3 gap-3">
                          <div>
                            <label class="block text-xs font-medium text-text-primary mb-1">Cant. *</label>
                            <input
                              v-model.number="item.purchase_quantity"
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              class="input-base w-full px-2 py-1.5 text-sm"
                              @input="() => updateItemTotal(form.items.indexOf(item))"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-text-primary mb-1 whitespace-nowrap">
                              P. Unit *
                              <span
                                v-if="item.suggested_price"
                                class="text-[10px] text-success cursor-pointer ml-0.5"
                                @click="item.unit_cost = item.suggested_price; updateItemTotal(form.items.indexOf(item))"
                                title="Usar precio sugerido"
                              >
                                (Sug: {{ formatPrice(item.suggested_price) }})
                              </span>
                            </label>
                            <div class="relative">
                              <span class="absolute left-2 top-1.5 text-text-secondary text-xs">$</span>
                              <input
                                v-model.number="item.unit_cost"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                class="input-base w-full pl-5 pr-2 py-1.5 text-sm"
                                @input="() => updateItemTotal(form.items.indexOf(item))"
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-text-primary mb-1">Total</label>
                            <div class="input-base w-full px-2 py-1.5 text-sm bg-surface-secondary font-medium text-text-primary flex items-center h-[34px]">
                              ${{ formatPrice(item.total_cost) }}
                            </div>
                          </div>
                        </div>
                        <!-- Bottom Row: Unit Section -->
                        <div class="w-full">
                          <div class="flex items-center gap-2 mb-1">
                            <label class="text-xs font-medium text-text-primary">Unidad *</label>
                            <button
                              v-if="item.ingredient_id && !newUnitForms[form.items.indexOf(item)]?.show"
                              type="button"
                              class="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                              @click="initNewUnitForm(form.items.indexOf(item))"
                            >
                              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                              </svg>
                              Nueva
                            </button>
                          </div>
                          <div class="flex items-start gap-2">
                            <div class="flex-1 min-w-[120px]">
                              <select
                                v-model="item.purchase_unit"
                                required
                                :disabled="!item.ingredient_id"
                                class="input-base w-full px-2 py-1.5 text-sm h-[34px]"
                                :class="{ 'bg-surface-secondary cursor-not-allowed': !item.ingredient_id }"
                                @change="() => onUnitChange(form.items.indexOf(item))"
                              >
                                <option value="">{{ item.ingredient_id ? 'Seleccionar' : '...' }}</option>
                                <option
                                  v-for="unitOpt in getPurchaseUnitOptions(item.ingredient_id)"
                                  :key="unitOpt.value"
                                  :value="unitOpt.value"
                                >
                                  {{ unitOpt.label }}
                                </option>
                              </select>
                              <p v-if="item.ingredient_id && item.purchase_unit" class="text-[10px] text-text-secondary mt-0.5">
                                = {{ getConvertedQuantity(form.items.indexOf(item)) }} {{ getIngredientUnit(item.ingredient_id) }}
                              </p>
                            </div>
                            <div
                              v-if="needsGramsPerUnit(item.ingredient_id)"
                              class="rounded-md p-1 transition-colors"
                              :class="getExistingGramsPerUnit(item.ingredient_id) ? 'bg-success/8 border border-success/25' : ''"
                            >
                              <label class="block text-[10px] font-semibold text-text-primary mb-0.5">
                                Peso(gr){{ getExistingGramsPerUnit(item.ingredient_id) ? ' ✓' : '' }}
                              </label>
                              <input
                                v-model.number="item.grams_per_unit"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="0"
                                class="input-base w-20 px-1 py-1.5 text-xs text-center h-[34px]"
                              />
                              <p class="text-[10px] mt-0.5 text-text-secondary font-medium">
                                {{ getExistingGramsPerUnit(item.ingredient_id) ? 'Guardado' : 'Solo esta vez' }}
                              </p>
                            </div>
                            <template v-if="newUnitForms[form.items.indexOf(item)]?.show">
                              <div>
                                <label class="block text-[10px] font-medium text-text-secondary mb-0.5">Nombre</label>
                                <input
                                  v-model="newUnitForms[form.items.indexOf(item)].label"
                                  type="text"
                                  placeholder="Ej: Caja"
                                  class="input-base w-24 px-1.5 py-1.5 text-[10px] h-[34px]"
                                />
                              </div>
                              <div>
                                <label class="block text-[10px] font-medium text-text-secondary mb-0.5 text-center">Cant.</label>
                                <input
                                  v-model.number="newUnitForms[form.items.indexOf(item)].factor"
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  class="input-base w-16 px-1 py-1.5 text-[10px] text-center h-[34px]"
                                />
                              </div>
                              <div class="flex gap-0.5 h-[34px] items-center">
                                <button
                                  type="button"
                                  class="p-1 bg-primary text-white rounded hover:bg-primary/90 transition-colors h-7 w-7 flex items-center justify-center"
                                  title="Guardar"
                                  @click="saveNewUnit(form.items.indexOf(item))"
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  class="p-1 border border-border text-text-secondary rounded hover:bg-surface-secondary transition-colors h-7 w-7 flex items-center justify-center"
                                  title="Cancelar"
                                  @click="newUnitForms[form.items.indexOf(item)] = { ...newUnitForms[form.items.indexOf(item)], show: false }"
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                  </svg>
                                </button>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Notes Row (Full width) -->
                    <div class="mt-2">
                      <input
                        v-model="item.notes"
                        type="text"
                        class="input-base w-full px-2 py-1.5 text-xs text-text-secondary border-dashed bg-transparent focus:bg-background focus:border-solid transition-colors"
                        placeholder="+ Agregar notas u observaciones del item (opcional)"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
          </div>
        </div>

        <!-- Step 3: Documentos -->
        <div v-else-if="currentStep === 3" key="step-3" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-2">Documentos (Opcional)</h3>
            <p class="text-sm text-text-secondary mb-4">Puedes agregar la factura y comprobante de pago ahora o despues</p>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Factura Section -->
              <div class="border-2 border-border rounded-lg p-4 bg-background/50">
                <h4 class="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <DocumentTextIcon class="w-5 h-5 text-primary" />
                  Factura
                </h4>

                <div class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      Numero de Factura
                    </label>
                    <input
                      v-model="form.invoice_number"
                      type="text"
                      class="input-base w-full px-4 py-2"
                      placeholder="Ej: FV-12345"
                    />
                  </div>

                  <!-- Attachment Uploader Style -->
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      Adjuntar Factura
                    </label>
                    <div class="space-y-3">
                      <div class="flex items-center space-x-2">
                        <input
                          ref="invoiceFileInput"
                          type="file"
                          class="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          @change="handleInvoiceFileSelect"
                        />
                        <button
                          type="button"
                          @click="($refs.invoiceFileInput as HTMLInputElement).click()"
                          class="px-4 py-2 bg-primary/10 text-primary border-2 border-primary/30 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                        >
                          <svg class="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Seleccionar Archivo
                        </button>
                        <span class="text-xs text-text-secondary">PDF o imagen (max. 10MB)</span>
                      </div>

                      <!-- Selected File Preview -->
                      <div v-if="form.invoice_file" class="flex items-center justify-between p-2 bg-surface border border-border rounded-lg">
                        <div class="flex items-center space-x-2 flex-1 min-w-0">
                          <svg class="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span class="text-xs text-text-primary truncate">{{ form.invoice_file.name }}</span>
                          <span class="text-xs text-text-secondary">({{ formatFileSize(form.invoice_file.size) }})</span>
                        </div>
                        <button
                          type="button"
                          @click="form.invoice_file = null"
                          class="text-destructive hover:bg-destructive/10 p-1 rounded"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Comprobante de Pago Section -->
              <div class="border-2 border-border rounded-lg p-4 bg-background/50">
                <h4 class="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <CreditCardIcon class="w-5 h-5 text-primary" />
                  Comprobante de Pago
                </h4>

                <div class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      Metodo de Pago
                    </label>
                    <select
                      v-model="form.payment_method"
                      class="input-base w-full px-4 py-2"
                    >
                      <option value="">Sin pago aun</option>
                      <option value="transfer">Transferencia</option>
                      <option value="cash">Efectivo</option>
                      <option value="check">Cheque</option>
                      <option value="credit_card">Tarjeta de Credito</option>
                    </select>
                  </div>

                  <div v-if="form.payment_method">
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      Referencia de Pago
                    </label>
                    <input
                      v-model="form.payment_reference"
                      type="text"
                      class="input-base w-full px-4 py-2"
                      placeholder="Numero de transferencia, etc."
                    />
                  </div>

                  <!-- Attachment Uploader Style -->
                  <div v-if="form.payment_method">
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      Adjuntar Comprobante
                    </label>
                    <div class="space-y-3">
                      <div class="flex items-center space-x-2">
                        <input
                          ref="paymentFileInput"
                          type="file"
                          class="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          @change="handlePaymentFileSelect"
                        />
                        <button
                          type="button"
                          @click="($refs.paymentFileInput as HTMLInputElement).click()"
                          class="px-4 py-2 bg-primary/10 text-primary border-2 border-primary/30 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                        >
                          <svg class="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Seleccionar Archivo
                        </button>
                        <span class="text-xs text-text-secondary">PDF o imagen (max. 10MB)</span>
                      </div>

                      <!-- Selected File Preview -->
                      <div v-if="form.payment_file" class="flex items-center justify-between p-2 bg-surface border border-border rounded-lg">
                        <div class="flex items-center space-x-2 flex-1 min-w-0">
                          <svg class="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span class="text-xs text-text-primary truncate">{{ form.payment_file.name }}</span>
                          <span class="text-xs text-text-secondary">({{ formatFileSize(form.payment_file.size) }})</span>
                        </div>
                        <button
                          type="button"
                          @click="form.payment_file = null"
                          class="text-destructive hover:bg-destructive/10 p-1 rounded"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Revision -->
        <div v-else-if="currentStep === 4" key="step-4">
          <!-- Header compacto -->
          <div class="bg-surface border border-border rounded-lg px-4 sm:px-6 py-3 mb-3 flex items-center justify-between">
            <div>
              <p class="text-xs text-text-secondary uppercase tracking-wide font-semibold">Compra Directa · Resumen</p>
              <p class="text-base font-bold text-text-primary">{{ nextPurchaseNumber }}</p>
            </div>
            <p class="text-xs text-text-secondary">{{ new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) }}</p>
          </div>

          <!-- Layout: items (izq) + panel resumen (der) -->
          <div class="flex flex-col lg:flex-row gap-4 items-start">

            <!-- ── Columna izquierda: items ── -->
            <div class="w-full lg:flex-1">
              <div class="bg-surface border border-border rounded-lg p-4">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  {{ form.items.length }} {{ form.items.length === 1 ? 'producto' : 'productos' }}
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    v-for="(item, index) in form.items"
                    :key="index"
                    class="flex items-start gap-3 p-3 rounded-lg border border-border bg-background"
                  >
                    <!-- Ícono inicial -->
                    <div class="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary text-xs font-bold">
                      {{ getIngredientName(item.ingredient_id).charAt(0) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-text-primary text-sm truncate">{{ getIngredientName(item.ingredient_id) }}</p>
                      <p v-if="item.notes" class="text-xs text-text-secondary truncate">{{ item.notes }}</p>
                      <div class="mt-1.5 flex items-center justify-between gap-2">
                        <span class="text-xs bg-surface-secondary px-2 py-0.5 rounded font-medium text-text-secondary">
                          {{ item.purchase_quantity }} × {{ getItemUnitLabel(item) }}
                        </span>
                        <span class="text-sm font-bold text-primary">${{ formatPrice(item.total_cost) }}</span>
                      </div>
                      <p v-if="item.grams_per_unit" class="text-xs text-text-secondary mt-0.5">{{ item.grams_per_unit }} gr/und</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Columna derecha: panel sticky ── -->
            <div class="w-full lg:w-72 xl:w-80 lg:sticky lg:top-4">
              <div class="bg-surface border border-border rounded-lg divide-y divide-border overflow-hidden">

                <!-- Proveedor + pago -->
                <div class="p-4 space-y-2">
                  <div class="flex justify-between items-start">
                    <p class="text-xs text-text-secondary">Proveedor</p>
                    <p class="text-sm font-semibold text-text-primary text-right max-w-[60%] leading-tight">{{ getSupplierName(form.supplier_id) }}</p>
                  </div>
                  <div class="flex justify-between items-center">
                    <p class="text-xs text-text-secondary">Fecha de compra</p>
                    <p class="text-xs font-medium text-text-primary">
                      {{ form.purchase_date ? fnsFormat(form.purchase_date, 'dd/MM/yyyy', { locale: es }) : '-' }}
                    </p>
                  </div>
                  <div class="flex justify-between items-center">
                    <p class="text-xs text-text-secondary">Pago</p>
                    <p class="text-xs font-medium text-text-primary">{{ getPaymentTypeText(form.payment_type) }}</p>
                  </div>
                  <div v-if="form.payment_method" class="flex justify-between items-center">
                    <p class="text-xs text-text-secondary">Método</p>
                    <p class="text-xs font-medium text-text-primary">{{ getPaymentMethodText(form.payment_method) }}</p>
                  </div>
                </div>

                <!-- Documentos -->
                <div v-if="form.invoice_number || form.invoice_file || form.payment_file" class="p-4 space-y-1.5">
                  <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Documentos</p>
                  <div v-if="form.invoice_number" class="flex items-center gap-2 text-xs">
                    <svg class="w-3.5 h-3.5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="text-text-primary font-medium">{{ form.invoice_number }}</span>
                    <span v-if="form.invoice_file" class="text-success">· PDF adjunto</span>
                  </div>
                  <div v-if="form.payment_reference" class="flex items-center gap-2 text-xs">
                    <svg class="w-3.5 h-3.5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                    <span class="text-text-primary font-medium">Ref: {{ form.payment_reference }}</span>
                    <span v-if="form.payment_file" class="text-success">· Comprobante</span>
                  </div>
                  <div v-if="form.notes" class="flex items-start gap-2 text-xs mt-1">
                    <span class="text-text-secondary">Nota:</span>
                    <span class="text-text-primary">{{ form.notes }}</span>
                  </div>
                </div>

                <!-- Total -->
                <div class="p-4 bg-primary/5">
                  <div class="flex justify-between items-center mb-1">
                    <p class="text-xs text-text-secondary">Subtotal ({{ form.items.length }} ítems)</p>
                    <p class="text-sm text-text-primary">${{ formatPrice(totalAmount) }}</p>
                  </div>
                  <div class="flex justify-between items-center pt-2 border-t border-primary/20">
                    <p class="font-bold text-text-primary">Total</p>
                    <p class="text-xl font-bold text-primary">${{ formatPrice(totalAmount) }}</p>
                  </div>
                </div>

                <!-- Aviso stock + CTA -->
                <div class="p-4 space-y-3">
                  <div class="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
                    <CheckCircleIcon class="w-4 h-4 flex-shrink-0" />
                    <span>El stock se actualizará al instante</span>
                  </div>
                  <button
                    type="button"
                    @click="handleSubmit"
                    :disabled="isSubmitting"
                    class="w-full py-3 rounded-lg font-semibold text-sm bg-success text-white hover:bg-success/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg v-if="!isSubmitting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    {{ isSubmitting ? 'Guardando...' : 'Confirmar y Guardar' }}
                  </button>
                  <button
                    type="button"
                    @click="previousStep"
                    class="w-full py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                  >
                    ← Editar compra
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
        </Transition>
      </form>

      <!-- Navigation Buttons -->
      <div class="bg-surface border-t border-border shadow-lg mt-6">
        <div class="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
          <div class="flex justify-between items-center gap-3">
            <button
              v-if="currentStep > 1"
              type="button"
              @click="previousStep"
              class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
            >
              <span class="hidden sm:inline">← Anterior</span>
              <span class="sm:hidden">←</span>
            </button>
            <NuxtLink
              v-else
              to="/abastecimiento/compras-directas"
              class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
            >
              Cancelar
            </NuxtLink>

            <button
              v-if="currentStep < 4"
              type="button"
              @click="handleNext"
              :disabled="!isStepValid"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg transition-opacity text-sm sm:text-base"
              :class="{ 'opacity-50 cursor-not-allowed': !isStepValid }"
            >
              <span class="hidden sm:inline">Siguiente →</span>
              <span class="sm:hidden">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TrashIcon, DocumentTextIcon, CreditCardIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import { useIngredientSearch } from '@/composables/useIngredientSearch'

const formatPurchaseDate = (date: Date) => fnsFormat(date, 'dd/MM/yyyy', { locale: es })

useHead({
  title: 'Nueva Compra Directa - Abastecimiento'
})

interface PurchaseItem {
  ingredient_id: string
  purchase_quantity: number
  purchase_unit: string
  unit_cost: number
  total_cost: number
  notes: string
  suggested_price: number | null
  item_type?: string // 'food' | 'service' | 'supply'
  ocr_description?: string // texto libre de la factura, solo para UI
  grams_per_unit?: number | null // solo para ingredientes und: peso en gr por unidad
  searchTerm?: string // para el input de busqueda
  showResults?: boolean // controla visibilidad del dropdown de búsqueda
}

interface NewUnitForm {
  show: boolean
  label: string      // nombre de la presentación ej: "Bloque x100 tajadas"
  factor: number     // cuántas unidades base contiene
  saving: boolean
}

// Wizard state
const currentStep = ref(1)

// State
const isSubmitting = ref(false)
const supplierCatalog = ref<any[]>([])
const newUnitForms = ref<Record<number, NewUnitForm>>({})
const ingredientResults = ref<Record<number, any[]>>({})

interface LocalPurchaseUnit {
  ingredient_id: string
  purchase_unit: string
  purchase_unit_label: string
  conversion_factor: number
}
const localPurchaseUnits = ref<LocalPurchaseUnit[]>([])

// Form
const form = ref({
  supplier_id: '',
  payment_type: 'contado',
  purchase_date: new Date() as Date | null,
  notes: '',
  invoice_number: '',
  invoice_file: null as File | null,
  payment_method: '',
  payment_reference: '',
  payment_file: null as File | null,
  items: [createEmptyItem()] as PurchaseItem[]
})

function createEmptyItem(itemType: string = 'food'): PurchaseItem {
  return {
    ingredient_id: '',
    searchTerm: '',
    purchase_quantity: 1,
    purchase_unit: '',
    unit_cost: 0,
    total_cost: 0,
    notes: '',
    suggested_price: null,
    item_type: itemType,
    grams_per_unit: null,
    showResults: false
  }
}

// Fetch next purchase number
const { data: nextNumberData } = useFetch('/api/suppliers/purchases/direct/next-number', {
  server: false
})
const nextPurchaseNumber = computed(() => nextNumberData.value?.next_number || 'WR-CD-2025-0001')

// Fetch suppliers
const { data: suppliersData, pending: loadingSuppliers, refresh: refreshSuppliers } = useFetch('/api/suppliers/providers', {
  server: false,
  query: { limit: 250 }
})

const suppliers = computed(() => suppliersData.value?.data || [])
const supplierOptions = computed(() => suppliers.value.map((s: any) => ({
  value: s.id,
  label: s.name
})))

// Per-index server-side ingredient search (replaces full catalog fetch)
// Plain object (not ref) to avoid Vue deep-unwrapping inner refs from useIngredientSearch()
const ingredientSearches: Record<number, ReturnType<typeof useIngredientSearch>> = {}

const getIngredientSearch = (index: number) => {
  if (!ingredientSearches[index]) {
    ingredientSearches[index] = useIngredientSearch()
  }
  return ingredientSearches[index]
}

// Cache of ingredient details keyed by ingredient_id (populated on select + OCR match)
const ingredientCache = ref<Record<string, { id: string, name: string, unit: string, unit_weight_gr?: number | null, type?: string }>>({})

const cacheIngredient = (ing: any) => {
  if (ing?.id) {
    ingredientCache.value[ing.id] = {
      id: ing.id,
      name: ing.name,
      unit: ing.unit,
      unit_weight_gr: ing.unit_weight_gr ?? null,
      type: ing.type
    }
  }
}

// Estado para filtro de tipo de ingrediente
const selectedIngredientType = ref('food')

// Opciones de tipo de ingrediente
const ingredientTypeOptions = [
  { value: 'food', label: 'Alimentos' },
  { value: 'service', label: 'Servicios' },
  { value: 'supply', label: 'Insumos' }
]

// Conversiones legacy (fallback cuando no hay unidades configuradas)
const unitConversions: Record<string, number> = {
  'gr-gr': 1,
  'kg-gr': 1000,
  'lb-gr': 453.592,
  'oz-gr': 28.3495,
  'ml-ml': 1,
  'lt-ml': 1000,
  'gal-ml': 3785.41,
  'und-und': 1
}

// Items agrupados por tipo
const itemsByType = computed(() => ({
  food: form.value.items.filter(item => (item.item_type || 'food') === 'food'),
  service: form.value.items.filter(item => item.item_type === 'service'),
  supply: form.value.items.filter(item => item.item_type === 'supply')
}))

// Fetch purchase units
const { data: purchaseUnitsData, pending: loadingPurchaseUnits, refresh: refreshPurchaseUnits } = useFetch('/api/suppliers/ingredient-purchase-units', {
  server: false,
  query: { limit: 10000, active_only: true }
})

const purchaseUnits = computed(() => purchaseUnitsData.value?.data || [])

// Loading state
const isLoadingData = computed(() =>
  loadingSuppliers.value || loadingPurchaseUnits.value
)

// Computed
const totalAmount = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (item.total_cost || 0), 0)
})

// Step validation
const isStepValid = computed(() => {
  if (currentStep.value === 1) {
    return !!form.value.supplier_id
  }
  if (currentStep.value === 2) {
    return form.value.items.length > 0 && form.value.items.every(item =>
      item.ingredient_id &&
      item.purchase_quantity > 0 &&
      item.purchase_unit &&
      item.unit_cost >= 0
    )
  }
  // Step 3 (documents) is always valid (optional)
  return true
})

// Methods
const formatPrice = (price: number) => {
  if (!price) return '0'
  return price.toLocaleString('es-CO', { minimumFractionDigits: 0 })
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getSupplierName = (id: string) => {
  const supplier = suppliers.value.find((s: any) => s.id === id)
  return supplier?.name || ''
}

const getIngredientName = (id: string) => {
  return ingredientCache.value[id]?.name || ''
}

const getPaymentTypeText = (type: string) => {
  const types: Record<string, string> = {
    'contado': 'Contado - Pago Inmediato',
    'credito': 'Credito - Pago Diferido',
    'contraentrega': 'Contraentrega'
  }
  return types[type] || type
}

const getPaymentMethodText = (method: string) => {
  const methods: Record<string, string> = {
    'transfer': 'Transferencia',
    'cash': 'Efectivo',
    'check': 'Cheque',
    'credit_card': 'Tarjeta de Credito'
  }
  return methods[method] || method
}

const getPurchaseUnitOptions = (ingredientId: string) => {
  if (!ingredientId) return []

  const ingredient = ingredientCache.value[ingredientId]
  const baseUnit = ingredient?.unit || ''

  const units = purchaseUnits.value.filter((u: any) => u.ingredient_id === ingredientId)
  const pendingUnits = localPurchaseUnits.value.filter(u => u.ingredient_id === ingredientId)

  if (units.length === 0 && pendingUnits.length === 0) {
    if (ingredient) {
      return [{
        value: ingredient.unit,
        label: ingredient.unit,
        conversion_factor: 1,
        is_default: true
      }]
    }
    return []
  }

  const serverOptions = units.map((u: any) => {
    let label = u.purchase_unit_label
    if (u.conversion_factor && u.conversion_factor !== 1) {
      label = `${u.purchase_unit_label} (${u.conversion_factor} ${baseUnit})`
    }
    return {
      value: u.purchase_unit_label,
      label: label,
      conversion_factor: u.conversion_factor,
      is_default: u.is_default,
      unit_cost: u.unit_cost
    }
  })

  const localOptions = pendingUnits.map(u => ({
    value: u.purchase_unit_label,
    label: u.conversion_factor !== 1
      ? `${u.purchase_unit_label} (${u.conversion_factor} ${baseUnit})`
      : u.purchase_unit_label,
    conversion_factor: u.conversion_factor,
    is_default: false,
    unit_cost: undefined
  }))

  return [...serverOptions, ...localOptions]
}

// Label completo para el resumen: "4 × 1 Kilogramo (1000 gr)"
const getItemUnitLabel = (item: PurchaseItem): string => {
  if (!item.purchase_unit) return ''
  const opts = getPurchaseUnitOptions(item.ingredient_id)
  const opt = opts.find((o: any) => o.value === item.purchase_unit)
  return opt?.label || item.purchase_unit
}

// Obtener la unidad base del ingrediente
const getIngredientUnit = (ingredientId: string) => {
  if (!ingredientId) return ''
  return ingredientCache.value[ingredientId]?.unit || ''
}

// Detecta si el ingrediente es 'und' — siempre se pide el peso
const needsGramsPerUnit = (ingredientId: string) => {
  if (!ingredientId) return false
  return ingredientCache.value[ingredientId]?.unit === 'und'
}

// Obtiene el peso existente desde ingredientCache.unit_weight_gr
const getExistingGramsPerUnit = (ingredientId: string): number | null => {
  return ingredientCache.value[ingredientId]?.unit_weight_gr || null
}

// Obtener el factor de conversión para una unidad de compra
const getConversionFactor = (purchaseUnitLabel: string, ingredientId: string) => {
  // Buscar en unidades locales pendientes primero
  const localUnit = localPurchaseUnits.value.find(u =>
    u.ingredient_id === ingredientId &&
    u.purchase_unit_label === purchaseUnitLabel
  )
  if (localUnit) return localUnit.conversion_factor

  // Buscar en unidades configuradas del servidor
  const unit = purchaseUnits.value.find((u: any) =>
    u.ingredient_id === ingredientId &&
    u.purchase_unit_label === purchaseUnitLabel
  )
  if (unit) return unit.conversion_factor

  // Fallback: buscar en conversiones legacy
  const ingredient = ingredientCache.value[ingredientId]
  if (ingredient) {
    const key = `${purchaseUnitLabel}-${ingredient.unit}`
    return unitConversions[key] || 1
  }
  return 1
}

// Calcular la cantidad convertida a unidades base
const getConvertedQuantity = (index: number) => {
  const item = form.value.items[index]
  if (!item.purchase_quantity || !item.purchase_unit || !item.ingredient_id) return '0'

  const factor = getConversionFactor(item.purchase_unit, item.ingredient_id)
  const converted = item.purchase_quantity * factor

  return converted.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// --- Nueva presentación de compra inline ---
const initNewUnitForm = (index: number) => {
  newUnitForms.value[index] = { show: true, label: '', factor: 1, saving: false }
}

const saveNewUnit = (index: number) => {
  const entry = newUnitForms.value[index]
  if (!entry?.label || entry.factor < 1) return

  const item = form.value.items[index]
  if (!item.ingredient_id) return

  const purchaseUnitKey = entry.label.toLowerCase().replace(/\s+/g, '_').slice(0, 50)

  // Check if this unit already exists (server or local)
  const alreadyExists = localPurchaseUnits.value.some(
    u => u.ingredient_id === item.ingredient_id && u.purchase_unit_label === entry.label
  )
  if (!alreadyExists) {
    localPurchaseUnits.value.push({
      ingredient_id: item.ingredient_id,
      purchase_unit: purchaseUnitKey,
      purchase_unit_label: entry.label,
      conversion_factor: entry.factor
    })
  }

  // Auto-select the new unit and update totals
  item.purchase_unit = entry.label
  onUnitChange(index)
  newUnitForms.value[index] = { ...entry, show: false }
}

// Fetch supplier catalog when supplier changes
const onSupplierChange = async (supplierId: string) => {
  if (!supplierId) {
    supplierCatalog.value = []
    return
  }

  try {
    const response = await $fetch(`/api/suppliers/purchases/suppliers/${supplierId}/catalog`)
    supplierCatalog.value = (response as any).data || []

    // Update suggested prices for existing items
    form.value.items.forEach((item, index) => {
      if (item.ingredient_id) {
        updateSuggestedPrice(index)
      }
    })
  } catch (e) {
    console.error('Error fetching catalog:', e)
    supplierCatalog.value = []
  }
}

const onIngredientChange = (index: number) => {
  const item = form.value.items[index]
  const ingredient = ingredientCache.value[item.ingredient_id]

  if (ingredient) {
    // Set default unit
    const units = getPurchaseUnitOptions(item.ingredient_id)
    const defaultUnit = units.find((u: any) => u.is_default) || units[0]
    if (defaultUnit) {
      item.purchase_unit = defaultUnit.value
    }

    // Pre-populate grams_per_unit for 'und' ingredients
    if (ingredient.unit === 'und') {
      item.grams_per_unit = getExistingGramsPerUnit(item.ingredient_id)
    }

    // Update suggested price from catalog
    updateSuggestedPrice(index)
  }
}

const onUnitChange = (index: number) => {
  updateSuggestedPrice(index)
  updateItemTotal(index)
}

const updateSuggestedPrice = (index: number) => {
  const item = form.value.items[index]

  // Find in supplier catalog
  const catalogItem = supplierCatalog.value.find((c: any) => c.ingredient_id === item.ingredient_id)

  if (catalogItem) {
    // Check if there's a specific price for the selected unit
    const unitInfo = catalogItem.purchase_units?.find((u: any) => u.label === item.purchase_unit)

    if (unitInfo?.unit_cost) {
      item.suggested_price = unitInfo.unit_cost
    } else {
      item.suggested_price = catalogItem.default_price
    }
  } else {
    item.suggested_price = null
  }
}

const updateItemTotal = (index: number) => {
  const item = form.value.items[index]
  item.total_cost = (item.purchase_quantity || 0) * (item.unit_cost || 0)
}

const addItem = () => {
  form.value.items.push(createEmptyItem(selectedIngredientType.value))
}

const removeItem = (index: number) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

const handleInvoiceFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (file && file.size > 10 * 1024 * 1024) {
    alert('El archivo excede el tamaño máximo de 10MB')
    return
  }
  form.value.invoice_file = file
  input.value = ''
}

const handlePaymentFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (file && file.size > 10 * 1024 * 1024) {
    alert('El archivo excede el tamaño máximo de 10MB')
    return
  }
  form.value.payment_file = file
  input.value = ''
}

// --- OCR scan functionality ---
const scanFileInput = ref<HTMLInputElement | null>(null)
const isScanning = ref(false)
const ocrItemsLoaded = ref(false)

// Supplier detection from OCR
const ocrSupplierName = ref('')
const ocrNit = ref('')
const supplierScanStatus = ref<null | 'matched' | 'similar' | 'not_found'>(null)
const similarSupplier = ref<{ id: string, name: string, score: number } | null>(null)
const isCreatingSupplier = ref(false)

// UI Phrases
const loadingPhrases = [
  'Analizando imagen...',
  'Extrayendo productos...',
  'Identificando precios...',
  'Calculando unidades...',
  'Organizando items...',
  'Casi listo...'
]
const currentPhraseIndex = ref(0)
const currentPhrase = computed(() => loadingPhrases[currentPhraseIndex.value])
let phraseInterval: any = null

const startPhraseRotation = () => {
  currentPhraseIndex.value = 0
  phraseInterval = setInterval(() => {
    currentPhraseIndex.value = (currentPhraseIndex.value + 1) % loadingPhrases.length
  }, 2000)
}

const stopPhraseRotation = () => {
  if (phraseInterval) clearInterval(phraseInterval)
  phraseInterval = null
}

const optimizeImageForOcr = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      let width = img.width
      let height = img.height
      const maxSize = 1024
      if (width > height) {
        if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize }
      } else {
        if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize }
      }
      canvas.width = width
      canvas.height = height
      ctx.filter = 'grayscale(100%)'
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas conversion failed'))
      }, 'image/jpeg', 0.7)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

const normalizeForMatch = (text: string) =>
  text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()

const findSupplierMatch = (name: string): { id: string, name: string, score: number } | null => {
  if (!name || suppliers.value.length === 0) return null
  const normalized = normalizeForMatch(name)
  const words = normalized.split(' ').filter(w => w.length > 2)
  if (words.length === 0) return null

  let best: { id: string, name: string, score: number } | null = null

  for (const s of suppliers.value) {
    const sNorm = normalizeForMatch(s.name)
    const sWords = sNorm.split(' ').filter(w => w.length > 2)
    // Match if any word from OCR is contained in a supplier word or vice versa
    const overlap = words.filter(w => sWords.some(sw => sw.includes(w) || w.includes(sw))).length
    const score = overlap / Math.max(words.length, sWords.length, 1)
    if (!best || score > best.score) {
      best = { id: s.id, name: s.name, score }
    }
  }
  return best && best.score > 0 ? best : null
}

const selectSimilarSupplier = async () => {
  if (!similarSupplier.value) return
  form.value.supplier_id = similarSupplier.value.id
  await onSupplierChange(similarSupplier.value.id)
  supplierScanStatus.value = 'matched'
}

const createSupplierFromOcr = async () => {
  if (!ocrSupplierName.value) return
  isCreatingSupplier.value = true
  try {
    const response = await $fetch<any>('/api/suppliers/providers', {
      method: 'POST',
      body: {
        name: ocrSupplierName.value,
        ...(ocrNit.value ? { tax_id: ocrNit.value } : {}),
        is_active: true
      }
    })
    const created = response.data || response
    if (created?.id) {
      await refreshSuppliers()
      form.value.supplier_id = created.id
      await onSupplierChange(created.id)
      similarSupplier.value = { id: created.id, name: created.name || ocrSupplierName.value, score: 1 }
      supplierScanStatus.value = 'matched'
    }
  } catch (e: any) {
    alert(`Error al crear el proveedor: ${e.response?._data?.detail || e.message}`)
  } finally {
    isCreatingSupplier.value = false
  }
}

const searchIngredients = async (term: string, index: number) => {
  const item = form.value.items[index]
  item.ingredient_id = ''
  if (!term || term.trim().length < 1) {
    ingredientResults.value[index] = []
    item.showResults = false
    return
  }
  const search = getIngredientSearch(index)
  search.query.value = term
  // results are reactive — watch them to update ingredientResults
  watch(
    () => search.results.value,
    (results) => {
      ingredientResults.value[index] = results
      item.showResults = results.length > 0
    },
    { immediate: true }
  )
}

const hideResults = (item: any) => {
  setTimeout(() => { item.showResults = false }, 150)
}

const selectIngredient = (ingredient: any, index: number) => {
  const item = form.value.items[index]
  item.ingredient_id = ingredient.id
  item.searchTerm = ingredient.name
  item.showResults = false
  if (ingredient.type) item.item_type = ingredient.type
  ingredientResults.value[index] = []
  cacheIngredient(ingredient)
  onIngredientChange(index)
}


const handleScanFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  isScanning.value = true
  ocrItemsLoaded.value = false
  startPhraseRotation()
  const startTime = Date.now()
  console.log('Starting OCR scan...')
  try {
    const optimizedBlob = await optimizeImageForOcr(file)
    const optimizedFile = new File([optimizedBlob], file.name, {
      type: 'image/jpeg',
      lastModified: Date.now()
    })
    const formData = new FormData()
    formData.append('file', optimizedFile)
    const response = await $fetch<any>('/api/suppliers/purchases/extract-invoice', {
      method: 'POST',
      body: formData
    })
    if (response.success && response.data) {
      const data = response.data

      // 1. Detect and match supplier from invoice
      if (data.proveedor) {
        ocrSupplierName.value = data.proveedor
        ocrNit.value = data.nit || ''
        const match = findSupplierMatch(data.proveedor)
        if (match && match.score >= 0.6) {
          form.value.supplier_id = match.id
          await onSupplierChange(match.id)
          supplierScanStatus.value = 'matched'
          similarSupplier.value = match
        } else if (match && match.score >= 0.3) {
          supplierScanStatus.value = 'similar'
          similarSupplier.value = match
        } else {
          supplierScanStatus.value = 'not_found'
          similarSupplier.value = null
        }
      }

      // 2. Pre-fill items from OCR
      if (data.items && data.items.length > 0) {
        // Resolve ingredient matches in parallel via backend pg_trgm endpoint
        const matchedIngredients = await Promise.all(
          data.items.map(async (ocrItem: any) => {
            // Priority 1: backend already resolved the ingredient_id — fetch full details to populate cache
            if (ocrItem.detected_ingredient_id) {
              const nameToFetch = ocrItem.detected_ingredient || ocrItem.descripcion || ''
              if (!nameToFetch) return null
              try {
                const res = await $fetch<any>('/api/suppliers/ingredients/match', {
                  query: { name: nameToFetch, threshold: 0.8 }
                })
                if (res?.data) return { ...res.data, id: ocrItem.detected_ingredient_id }
              } catch { /* fall through */ }
              return null
            }

            // Priority 2: call /ingredients/match for the Gemini-detected name or raw description
            const nameToMatch = ocrItem.detected_ingredient || ocrItem.descripcion || ''
            if (!nameToMatch) return null

            try {
              const res = await useNuxtApp().$fetch<any>('/api/suppliers/ingredients/match', {
                query: { name: nameToMatch, threshold: 0.35 }
              })
              return res?.data ?? null
            } catch {
              return null
            }
          })
        )

        // Cache all resolved ingredients
        matchedIngredients.forEach(ing => { if (ing) cacheIngredient(ing) })

        form.value.items = data.items.map((ocrItem: any, index: number) => {
          let matchedId = ''
          let ingredientName = ''

          // Priority 1: backend-resolved id from Gemini (invoice scan service)
          if (ocrItem.detected_ingredient_id) {
            matchedId = ocrItem.detected_ingredient_id
            ingredientName = ocrItem.detected_ingredient || ocrItem.descripcion || ''
          } else if (matchedIngredients[index]) {
            // Priority 2: pg_trgm server-side match
            matchedId = matchedIngredients[index].id
            ingredientName = matchedIngredients[index].name
          } else {
            ingredientName = ocrItem.detected_ingredient || ocrItem.descripcion || ''
          }

          const item: PurchaseItem = {
            ingredient_id: matchedId,
            searchTerm: ingredientName,
            purchase_quantity: ocrItem.cantidad || 1,
            purchase_unit: '',
            unit_cost: ocrItem.precio_unitario || 0,
            total_cost: ocrItem.total || 0,
            notes: '',
            suggested_price: null,
            item_type: 'food',
            ocr_description: ocrItem.descripcion || ''
          }
          return item
        })

        // Auto-set default purchase unit for matched items
        form.value.items.forEach((item, index) => {
          if (item.ingredient_id) onIngredientChange(index)
        })

        // Aplicar peso_unidad_gr del OCR: auto-seleccionar unidad de compra y/o pre-llenar peso
        data.items.forEach((ocrItem: any, index: number) => {
          const item = form.value.items[index]
          if (!ocrItem.peso_unidad_gr || !item.ingredient_id) return

          const ingredient = ingredientCache.value[item.ingredient_id]
          if (!ingredient) return

          const pesoGr = ocrItem.peso_unidad_gr

          if (ingredient.unit === 'gr' || ingredient.unit === 'ml') {
            // Ingrediente en gramos: buscar purchase unit cuyo conversion_factor ≈ pesoGr
            const opts = getPurchaseUnitOptions(item.ingredient_id)
            const THRESHOLD = 0.12 // 12% de tolerancia
            const match = opts.find((o: any) => {
              const diff = Math.abs(o.conversion_factor - pesoGr) / pesoGr
              return diff <= THRESHOLD
            })
            if (match) {
              item.purchase_unit = match.value
              onUnitChange(index)
            }
          } else if (ingredient.unit === 'und' && !item.grams_per_unit) {
            // Ingrediente en und: guardar peso como referencia para recetas
            item.grams_per_unit = pesoGr
          }
        })
        ocrItemsLoaded.value = true
      }
      // Pre-fill purchase date from extracted invoice date
      if (data.fecha) {
        const parsed = new Date(data.fecha + 'T12:00:00')
        if (!isNaN(parsed.getTime())) form.value.purchase_date = parsed
      }
      // Pre-fill invoice fields for Step 3
      if (data.numero_factura) form.value.invoice_number = data.numero_factura
      form.value.invoice_file = optimizedFile
    }
  } catch (e) {
    console.error('OCR scan error:', e)
  } finally {
    const elapsed = Date.now() - startTime
    if (elapsed < 2500) {
      await new Promise(resolve => setTimeout(resolve, 2500 - elapsed))
    }
    isScanning.value = false
    stopPhraseRotation()
  }
}

// Wizard navigation
const handleNext = () => {
  if (!isStepValid.value) return

  if (currentStep.value < 4) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Submit
const handleSubmit = async () => {
  if (!isStepValid.value) return

  isSubmitting.value = true

  try {
    // Guardar unit_weight_gr en ingredients para items und con peso definido
    const gramsItems = form.value.items.filter(item => item.ingredient_id && item.grams_per_unit && item.grams_per_unit > 0)
    for (const item of gramsItems) {
      try {
        await $fetch(`/api/suppliers/ingredients/${item.ingredient_id}/unit-weight`, {
          method: 'PATCH',
          body: { unit_weight_gr: item.grams_per_unit }
        })
      } catch (_) {
        // No bloqueamos el flujo si falla el guardado del peso
      }
    }

    // Build JSON payload
    const payload: Record<string, any> = {
      supplier_id: form.value.supplier_id,
      items_data: JSON.stringify(form.value.items.map(item => ({
        ingredient_id: item.ingredient_id,
        quantity: item.purchase_quantity,
        purchase_quantity: item.purchase_quantity,
        purchase_unit: item.purchase_unit,
        unit_cost: item.unit_cost,
        notes: item.notes
      }))),
      payment_type: form.value.payment_type
    }

    // Include pending new purchase units to be created on the backend
    if (localPurchaseUnits.value.length > 0) {
      payload.new_units_data = JSON.stringify(localPurchaseUnits.value)
    }

    if (form.value.purchase_date) payload.purchase_date = form.value.purchase_date.toISOString()
    if (form.value.notes) payload.notes = form.value.notes
    if (form.value.invoice_number) payload.invoice_number = form.value.invoice_number
    if (form.value.payment_method) {
      payload.payment_method = form.value.payment_method
      payload.payment_amount = totalAmount.value
      payload.payment_date = new Date().toISOString()
    }
    if (form.value.payment_reference) payload.payment_reference = form.value.payment_reference

    const response = await $fetch('/api/suppliers/purchases/direct', {
      method: 'POST',
      body: payload
    })

    if (response.success) {
      // Upload files if present
      if ((form.value.invoice_file || form.value.payment_file) && response.data?.id) {
        try {
          const formData = new FormData()
          if (form.value.invoice_file) formData.append('invoice_files', form.value.invoice_file)
          if (form.value.payment_file) formData.append('payment_files', form.value.payment_file)

          await $fetch(`/api/suppliers/purchases/direct/${response.data.id}/attachments`, {
            method: 'POST',
            body: formData
          })
        } catch (fileError) {
          console.error('Error uploading files:', fileError)
          alert('Compra creada, pero hubo un error al subir los archivos')
        }
      }

      // Navigate to the created purchase
      await navigateTo(`/abastecimiento/compras-directas/${response.data.id}`)
    }
  } catch (error: any) {
    console.error('Error creating direct purchase:', error)
    alert(`Error: ${error.response?._data?.detail || error.message || 'Error al crear la compra'}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* Fade transition for wizard steps */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
