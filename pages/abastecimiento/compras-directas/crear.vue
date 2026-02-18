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
        <div class="p-4 sm:p-6">
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
                  Al momento de crear
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
      <div class="bg-surface border-border border rounded-lg mb-4 sm:mb-6">
        <div class="p-3 sm:p-6">
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
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6">Seleccionar Proveedor</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Proveedor *
                </label>
                <UiSearchableSelect
                  v-model="form.supplier_id"
                  :options="supplierOptions"
                  placeholder="Buscar proveedor..."
                  required
                  @update:model-value="onSupplierChange"
                />
                <p class="text-xs text-text-secondary mt-2">
                  Si no encuentras el proveedor, <NuxtLink to="/abastecimiento/proveedores" class="text-primary hover:underline">crealo primero aqui</NuxtLink>
                </p>
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
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
              <h3 class="text-base sm:text-lg font-semibold text-text-primary">Items de la Compra</h3>
              <div class="flex items-center gap-2">
                <!-- Hidden scan input -->
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
                  class="px-3 py-2 bg-amber-500/10 text-amber-700 border-2 border-amber-400/30 rounded-lg hover:bg-amber-500/20 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg v-if="!isScanning" class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <svg v-else class="w-4 h-4 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {{ isScanning ? 'Leyendo factura...' : 'Leer Factura con IA' }}
                </button>
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
            <div v-if="ocrItemsLoaded" class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-sm text-amber-800">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Items cargados desde la factura. Selecciona el ingrediente y la unidad para cada uno. La cantidad y precio vienen del OCR.</span>
            </div>

            <!-- Tabs de Filtro por Tipo de Ingrediente -->
            <div class="flex flex-wrap gap-2 mb-4 sm:mb-6 p-1 bg-background rounded-lg border border-border">
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

            <div class="space-y-4">
              <div
                v-for="(item, index) in form.items"
                :key="index"
                class="border-2 border-border rounded-lg p-4 bg-background"
              >
                <div class="flex justify-between items-start mb-4">
                  <h4 class="text-sm font-medium text-text-primary">Item #{{ index + 1 }}</h4>
                  <button
                    type="button"
                    @click="removeItem(index)"
                    :disabled="form.items.length === 1"
                    class="text-destructive hover:text-destructive/80 disabled:opacity-50 p-1"
                  >
                    <TrashIcon class="w-5 h-5" />
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <!-- Ingrediente -->
                  <div class="sm:col-span-2">
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Ingrediente *
                    </label>
                    <UiSearchableSelect
                      v-model="item.ingredient_id"
                      :options="ingredientOptions"
                      placeholder="Buscar ingrediente..."
                      required
                      @update:model-value="() => onIngredientChange(index)"
                    />
                    <!-- OCR hint: texto de la factura -->
                    <p v-if="item.ocr_description" class="mt-1 text-xs flex items-center gap-1" :class="item.ingredient_id ? 'text-success' : 'text-amber-600'">
                      <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path v-if="item.ingredient_id" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Factura: "{{ item.ocr_description }}"</span>
                    </p>
                  </div>

                  <!-- Unidad de Compra -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Unidad de Compra *
                    </label>
                    <select
                      v-model="item.purchase_unit"
                      required
                      :disabled="!item.ingredient_id"
                      class="input-base w-full px-4 py-2"
                      :class="{ 'bg-surface-secondary cursor-not-allowed': !item.ingredient_id }"
                      @change="() => onUnitChange(index)"
                    >
                      <option value="">{{ item.ingredient_id ? 'Seleccionar unidad' : 'Seleccione ingrediente primero' }}</option>
                      <option
                        v-for="unitOpt in getPurchaseUnitOptions(item.ingredient_id)"
                        :key="unitOpt.value"
                        :value="unitOpt.value"
                      >
                        {{ unitOpt.label }}
                      </option>
                    </select>
                    <p v-if="item.ingredient_id && item.purchase_unit" class="text-xs text-text-secondary mt-1">
                      Se convertirá a: {{ getConvertedQuantity(index) }} {{ getIngredientUnit(item.ingredient_id) }}
                    </p>
                  </div>

                  <!-- Peso por unidad (solo para ingredientes 'und' sin conversión configurada) -->
                  <div v-if="needsGramsPerUnit(item.ingredient_id)">
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Peso por unidad (gr)
                      <span class="text-xs font-normal text-text-secondary ml-1">opcional</span>
                    </label>
                    <input
                      v-model.number="item.grams_per_unit"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Ej: 500"
                      class="input-base w-full px-4 py-2"
                    />
                    <p class="text-xs text-text-secondary mt-1">
                      ¿Cuántos gramos pesa esta unidad? Se guardará para futuras compras.
                    </p>
                  </div>

                  <!-- Cantidad -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Cantidad *
                    </label>
                    <input
                      v-model.number="item.purchase_quantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      class="input-base w-full px-4 py-2"
                      @input="() => updateItemTotal(index)"
                    />
                  </div>

                  <!-- Precio Unitario -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Precio Unit. *
                      <span
                        v-if="item.suggested_price"
                        class="text-xs text-success cursor-pointer ml-1"
                        @click="item.unit_cost = item.suggested_price; updateItemTotal(index)"
                      >
                        (Sugerido: ${{ formatPrice(item.suggested_price) }})
                      </span>
                    </label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                      <input
                        v-model.number="item.unit_cost"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        class="input-base w-full pl-8 pr-4 py-2"
                        @input="() => updateItemTotal(index)"
                      />
                    </div>
                  </div>

                  <!-- Total -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Total
                    </label>
                    <div class="px-4 py-2 bg-surface-secondary rounded-lg font-semibold text-text-primary border border-border">
                      ${{ formatPrice(item.total_cost) }}
                    </div>
                  </div>

                  <!-- Notas -->
                  <div class="sm:col-span-2">
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Notas del item
                    </label>
                    <input
                      v-model="item.notes"
                      type="text"
                      class="input-base w-full px-4 py-2"
                      placeholder="Observaciones opcionales"
                    />
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
            <p class="text-sm text-text-secondary mb-6">Puedes agregar la factura y comprobante de pago ahora o despues</p>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Factura Section -->
              <div class="border-2 border-border rounded-lg p-4 bg-background/50">
                <h4 class="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <DocumentTextIcon class="w-5 h-5 text-primary" />
                  Factura
                </h4>

                <div class="space-y-4">
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
                <h4 class="font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <CreditCardIcon class="w-5 h-5 text-primary" />
                  Comprobante de Pago
                </h4>

                <div class="space-y-4">
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
        <div v-else-if="currentStep === 4" key="step-4" class="bg-surface border border-border rounded-lg">
          <!-- Header -->
          <div class="border-b border-border p-4 sm:p-6 md:p-8">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary mb-2">COMPRA DIRECTA</h1>
                <p class="text-xs sm:text-sm text-text-secondary">Resumen antes de guardar</p>
              </div>
              <div class="text-left sm:text-right w-full sm:w-auto">
                <div class="border-2 border-border px-3 sm:px-4 py-2 rounded-lg inline-block mb-2 bg-surface-secondary">
                  <p class="text-xs font-medium text-text-secondary">COMPRA N°</p>
                  <p class="text-lg sm:text-xl font-bold text-text-primary">{{ nextPurchaseNumber }}</p>
                </div>
                <p class="text-xs text-text-secondary mt-2">
                  Fecha: {{ new Date().toLocaleDateString('es-CO') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Supplier Info -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Proveedor</p>
                <p class="text-lg font-bold text-text-primary">{{ getSupplierName(form.supplier_id) }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Tipo de Pago</p>
                <p class="text-base font-medium text-text-primary">{{ getPaymentTypeText(form.payment_type) }}</p>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <!-- Mobile: Cards View -->
            <div class="md:hidden space-y-3">
              <div
                v-for="(item, index) in form.items"
                :key="index"
                class="border border-border rounded-lg p-3 bg-background"
              >
                <div class="mb-2">
                  <p class="font-medium text-text-primary text-sm">{{ getIngredientName(item.ingredient_id) }}</p>
                  <p v-if="item.notes" class="text-xs text-text-secondary mt-1">{{ item.notes }}</p>
                </div>
                <div class="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p class="text-xs text-text-secondary">Cantidad</p>
                    <p class="font-semibold">{{ item.purchase_quantity }} {{ item.purchase_unit }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-text-secondary">Precio Unit.</p>
                    <p class="font-semibold">${{ formatPrice(item.unit_cost) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-text-secondary">Total</p>
                    <p class="font-bold text-primary">${{ formatPrice(item.total_cost) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop: Table View -->
            <table class="w-full hidden md:table">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Ingrediente</th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Cantidad</th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Precio Unit.</th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in form.items"
                  :key="index"
                  class="border-b border-border"
                >
                  <td class="py-4">
                    <p class="font-medium text-text-primary">{{ getIngredientName(item.ingredient_id) }}</p>
                    <p v-if="item.notes" class="text-xs text-text-secondary mt-1">{{ item.notes }}</p>
                  </td>
                  <td class="text-right py-4 text-text-primary">
                    {{ item.purchase_quantity }} {{ item.purchase_unit }}
                  </td>
                  <td class="text-right py-4 text-text-primary">
                    ${{ formatPrice(item.unit_cost) }}
                  </td>
                  <td class="text-right py-4 font-bold text-primary">
                    ${{ formatPrice(item.total_cost) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-primary/5">
                  <td colspan="3" class="py-4 text-right font-bold text-text-primary">Total:</td>
                  <td class="py-4 text-right text-xl font-bold text-primary">${{ formatPrice(totalAmount) }}</td>
                </tr>
              </tfoot>
            </table>

            <!-- Mobile Total -->
            <div class="md:hidden mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div class="flex justify-between items-center">
                <span class="font-bold text-text-primary">Total:</span>
                <span class="text-xl font-bold text-primary">${{ formatPrice(totalAmount) }}</span>
              </div>
            </div>
          </div>

          <!-- Documents Summary -->
          <div v-if="form.invoice_number || form.payment_method" class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-t border-border bg-background/50">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Documentos</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-if="form.invoice_number">
                <p class="text-sm text-text-secondary">Factura:</p>
                <p class="font-medium text-text-primary">{{ form.invoice_number }}</p>
                <p v-if="form.invoice_file" class="text-xs text-success mt-1">Archivo adjunto</p>
              </div>
              <div v-if="form.payment_method">
                <p class="text-sm text-text-secondary">Pago:</p>
                <p class="font-medium text-text-primary">{{ getPaymentMethodText(form.payment_method) }}</p>
                <p v-if="form.payment_reference" class="text-xs text-text-secondary">Ref: {{ form.payment_reference }}</p>
                <p v-if="form.payment_file" class="text-xs text-success mt-1">Comprobante adjunto</p>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="form.notes" class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-t border-border">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Notas</p>
            <p class="text-sm text-text-primary">{{ form.notes }}</p>
          </div>

          <!-- Success Message -->
          <div class="px-4 sm:px-6 md:px-8 py-4 bg-success/10 border-t border-success/20">
            <div class="flex items-center gap-3">
              <CheckCircleIcon class="w-6 h-6 text-success flex-shrink-0" />
              <div>
                <p class="font-medium text-success">El inventario se actualizara inmediatamente</p>
                <p class="text-xs text-success/80">Los items se agregaran al stock al guardar esta compra</p>
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
            <button
              v-else
              type="button"
              @click="handleSubmit"
              :disabled="isSubmitting"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg disabled:opacity-50 text-sm sm:text-base bg-success hover:bg-success/90"
            >
              <span class="hidden sm:inline">{{ isSubmitting ? 'Guardando...' : 'Guardar y Actualizar Stock' }}</span>
              <span class="sm:hidden">{{ isSubmitting ? '...' : 'Guardar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TrashIcon, DocumentTextIcon, CreditCardIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

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
  ocr_description?: string // texto libre de la factura, solo para UI
  grams_per_unit?: number | null // solo para ingredientes und: peso en gr por unidad
}

// Wizard state
const currentStep = ref(1)

// State
const isSubmitting = ref(false)
const supplierCatalog = ref<any[]>([])

// Form
const form = ref({
  supplier_id: '',
  payment_type: 'contado',
  notes: '',
  invoice_number: '',
  invoice_file: null as File | null,
  payment_method: '',
  payment_reference: '',
  payment_file: null as File | null,
  items: [createEmptyItem()] as PurchaseItem[]
})

function createEmptyItem(): PurchaseItem {
  return {
    ingredient_id: '',
    purchase_quantity: 1,
    purchase_unit: '',
    unit_cost: 0,
    total_cost: 0,
    notes: '',
    suggested_price: null,
    grams_per_unit: null
  }
}

// Fetch next purchase number
const { data: nextNumberData } = useFetch('/api/suppliers/purchases/direct/next-number', {
  server: false
})
const nextPurchaseNumber = computed(() => nextNumberData.value?.next_number || 'WR-CD-2025-0001')

// Fetch suppliers
const { data: suppliersData, pending: loadingSuppliers } = useFetch('/api/suppliers/providers', {
  server: false,
  query: { limit: 250 }
})

const suppliers = computed(() => suppliersData.value?.data || [])
const supplierOptions = computed(() => suppliers.value.map((s: any) => ({
  value: s.id,
  label: s.name
})))

// Fetch ingredients
const { data: ingredientsData, pending: loadingIngredients } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: 500 }
})

const ingredients = computed(() => ingredientsData.value?.data || [])

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

// Ingredientes filtrados por tipo
const filteredIngredients = computed(() =>
  ingredients.value.filter((i: any) =>
    !selectedIngredientType.value || i.type === selectedIngredientType.value
  )
)

// Opciones de ingredientes (usando los filtrados)
const ingredientOptions = computed(() =>
  filteredIngredients.value.map((i: any) => ({
    value: i.id,
    label: i.name,
    unit: i.unit,
    type: i.type
  }))
)

// Fetch purchase units
const { data: purchaseUnitsData, pending: loadingPurchaseUnits } = useFetch('/api/suppliers/ingredient-purchase-units', {
  server: false,
  query: { limit: 10000, active_only: true }
})

const purchaseUnits = computed(() => purchaseUnitsData.value?.data || [])

// Loading state
const isLoadingData = computed(() =>
  loadingSuppliers.value || loadingIngredients.value || loadingPurchaseUnits.value
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
  const ingredient = ingredients.value.find((i: any) => i.id === id)
  return ingredient?.name || ''
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

  const ingredient = ingredients.value.find((i: any) => i.id === ingredientId)
  const baseUnit = ingredient?.unit || ''

  const units = purchaseUnits.value.filter((u: any) => u.ingredient_id === ingredientId)

  if (units.length === 0) {
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

  return units.map((u: any) => {
    // Construir label con factor de conversión si aplica
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
}

// Obtener la unidad base del ingrediente
const getIngredientUnit = (ingredientId: string) => {
  if (!ingredientId) return ''
  const ingredient = ingredients.value.find((i: any) => i.id === ingredientId)
  return ingredient?.unit || ''
}

// Detecta si el ingrediente es 'und' y no tiene purchase_units con peso configurado
const needsGramsPerUnit = (ingredientId: string) => {
  if (!ingredientId) return false
  const ingredient = ingredients.value.find((i: any) => i.id === ingredientId)
  if (ingredient?.unit !== 'und') return false
  const units = purchaseUnits.value.filter((u: any) => u.ingredient_id === ingredientId)
  // Solo muestra el campo si no hay purchase_units configuradas (o solo tiene 'und' con factor 1)
  return units.length === 0
}

// Obtener el factor de conversión para una unidad de compra
const getConversionFactor = (purchaseUnitLabel: string, ingredientId: string) => {
  // Buscar en unidades configuradas
  const unit = purchaseUnits.value.find((u: any) =>
    u.ingredient_id === ingredientId &&
    u.purchase_unit_label === purchaseUnitLabel
  )
  if (unit) return unit.conversion_factor

  // Fallback: buscar en conversiones legacy
  const ingredient = ingredients.value.find((i: any) => i.id === ingredientId)
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
  const ingredient = ingredients.value.find((i: any) => i.id === item.ingredient_id)

  if (ingredient) {
    // Set default unit
    const units = getPurchaseUnitOptions(item.ingredient_id)
    const defaultUnit = units.find((u: any) => u.is_default) || units[0]
    if (defaultUnit) {
      item.purchase_unit = defaultUnit.value
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
  form.value.items.push(createEmptyItem())
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

const findIngredientMatch = (ocrDescription: string): string => {
  const normalized = normalizeForMatch(ocrDescription)
  const words = normalized.split(' ').filter(w => w.length > 2)
  let bestMatch: any = null
  let bestScore = 0
  for (const ing of ingredients.value) {
    const ingNorm = normalizeForMatch(ing.name)
    // Score: how many words from the OCR description appear in the ingredient name
    const score = words.filter(w => ingNorm.includes(w)).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = ing
    }
  }
  // Only accept if at least one meaningful word matched
  return bestScore > 0 ? bestMatch.id : ''
}

const handleScanFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  isScanning.value = true
  ocrItemsLoaded.value = false
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
      // Pre-fill items from OCR
      if (data.items && data.items.length > 0) {
        form.value.items = data.items.map((ocrItem: any, index: number) => {
          const matchedId = findIngredientMatch(ocrItem.descripcion || '')
          const item: PurchaseItem = {
            ingredient_id: matchedId,
            purchase_quantity: ocrItem.cantidad || 1,
            purchase_unit: '',
            unit_cost: ocrItem.precio_unitario || 0,
            total_cost: ocrItem.total || 0,
            notes: '',
            suggested_price: null,
            ocr_description: ocrItem.descripcion || ''
          }
          return item
        })
        // Auto-set default purchase unit for matched items
        form.value.items.forEach((item, index) => {
          if (item.ingredient_id) onIngredientChange(index)
        })
        ocrItemsLoaded.value = true
      }
      // Pre-fill invoice fields for Step 3
      if (data.numero_factura) form.value.invoice_number = data.numero_factura
      form.value.invoice_file = optimizedFile
    }
  } catch (e) {
    console.error('OCR scan error:', e)
  } finally {
    isScanning.value = false
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
    // Guardar grams_per_unit en ingredient_purchase_units para items und sin conversión
    const gramsItems = form.value.items.filter(item => item.ingredient_id && item.grams_per_unit && item.grams_per_unit > 0)
    for (const item of gramsItems) {
      try {
        await $fetch('/api/suppliers/ingredient-purchase-units', {
          method: 'POST',
          body: {
            ingredient_id: item.ingredient_id,
            purchase_unit: 'und',
            purchase_unit_label: `und (${item.grams_per_unit}gr)`,
            conversion_factor: item.grams_per_unit,
            is_default: true
          }
        })
      } catch (_) {
        // Si ya existe no bloqueamos el flujo
      }
    }

    // Build JSON payload
    const payload = {
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
