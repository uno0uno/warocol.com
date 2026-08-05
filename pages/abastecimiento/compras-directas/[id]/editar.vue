<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Guardando cambios..."
      hint="Estamos actualizando la compra directa y sus datos asociados."
      variant="glass"
      indicator="matrix"
    />

    <!-- Loading State -->
    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

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
                  {{ originalPurchase?.purchase_number }}
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
                  {{ formatDate(originalPurchase?.purchase_date) }}
                </p>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Modo
                </p>
                <div class="pt-1">
                  <UiStatusBadge
                    value="Editando"
                    format="text"
                    variant="warning"
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
                  'bg-action-primary-bg text-action-primary-text border-primary': currentStep === 1,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 1,
                  'border-border text-text-secondary bg-transparent': currentStep < 1
                }"
              >
                <svg v-if="currentStep > 1" class="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">1</span>
              </div>
              <div class="ms-1 sm:ms-3 flex-1 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 1 ? 'text-text-primary' : 'text-text-secondary'">
                  Items
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Productos y precios</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 1 ? 'bg-secondary' : 'bg-border'"></div>
            </div>

            <!-- Step 2 -->
            <div class="flex items-center flex-1">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-action-primary-bg text-action-primary-text border-primary': currentStep === 2,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 2,
                  'border-border text-text-secondary bg-transparent': currentStep < 2
                }"
              >
                <svg v-if="currentStep > 2" class="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">2</span>
              </div>
              <div class="ms-1 sm:ms-3 flex-1 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 2 ? 'text-text-primary' : 'text-text-secondary'">
                  <span class="hidden sm:inline">Documentos</span>
                  <span class="sm:hidden">Docs</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Factura y pago</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 2 ? 'bg-secondary' : 'bg-border'"></div>
            </div>

            <!-- Step 3 -->
            <div class="flex items-center">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-action-primary-bg text-action-primary-text border-primary': currentStep === 3,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 3,
                  'border-border text-text-secondary bg-transparent': currentStep < 3
                }"
              >
                <span class="font-semibold text-sm sm:text-base">3</span>
              </div>
              <div class="ms-1 sm:ms-3 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 3 ? 'text-text-primary' : 'text-text-secondary'">
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
        <!-- Step 1: Items -->
        <Transition name="fade" mode="out-in">
        <div v-if="currentStep === 1" key="step-1" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <div class="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h3 class="text-base sm:text-lg font-semibold text-text-primary">Items de la Compra</h3>
                <p class="text-sm text-text-secondary">Proveedor: {{ originalPurchase?.supplier_name }}</p>
              </div>
              <button
                type="button"
                @click="addItem"
                class="px-4 py-2 bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg transition-colors text-sm"
              >
                + Agregar Item
              </button>
            </div>

            <div class="mb-4 sm:mb-6">
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
                  :max-date="maxPurchaseDate"
                  :format="formatPurchaseDate"
                  input-class-name="dp-custom-input"
                  menu-class-name="dp-custom-menu"
                  calendar-cell-class-name="dp-custom-cell"
                  placeholder="Seleccionar fecha..."
                />
              </ClientOnly>
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
                  <!-- Artículo de bodega -->
                  <div class="sm:col-span-2">
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      {{ WAREHOUSE_COPY.purchaseLineRequired }}
                    </label>
                    <UiSearchableSelect
                      v-model="item.ingredient_id"
                      :options="ingredientOptions"
                      :placeholder="WAREHOUSE_COPY.purchaseSearchPlaceholder"
                      required
                      @update:model-value="() => onIngredientChange(index)"
                    />
                  </div>

                  <!-- Unidad -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Unidad *
                    </label>
                    <select
                      v-model="item.purchase_unit"
                      required
                      :disabled="!item.ingredient_id"
                      class="input-base w-full px-4 py-2"
                      @change="() => onUnitChange(index)"
                    >
                      <option value="">Seleccionar</option>
                      <option
                        v-for="unit in getPurchaseUnitOptions(item.ingredient_id)"
                        :key="unit.value"
                        :value="unit.value"
                      >
                        {{ unit.label }}
                      </option>
                    </select>
                  </div>

                  <!-- Cantidad -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Cantidad *
                    </label>
                    <UiDecimalInput
                      v-model="item.purchase_quantity"
                      :min="0.000001"
                      :precision="QUANTITY_PRECISION"
                      required
                      class="w-full px-4 py-2"
                      @update:model-value="updateItemTotal(index)"
                    />
                  </div>

                  <!-- Precio Unitario -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Precio Unit. *
                    </label>
                    <div class="relative">
                      <span class="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary pointer-events-none">{{ currencyCode }}</span>
                      <UiDecimalInput
                        v-model="item.unit_cost"
                        :min="0"
                        :precision="UNIT_COST_PRECISION"
                        required
                        class="w-full ps-12 pe-4 py-2"
                        @update:model-value="updateItemTotal(index)"
                      />
                    </div>
                  </div>

                  <!-- Total -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Total
                    </label>
                    <div class="px-4 py-2 bg-surface-secondary rounded-lg font-semibold text-text-primary border border-border">
                      {{ formatPrice(item.total_cost) }}
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

        <!-- Step 2: Documentos -->
        <div v-else-if="currentStep === 2" key="step-2" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6 space-y-6">
            <div>
              <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-1">Documentos</h3>
              <p class="text-sm text-text-secondary">
                {{ form.payment_type === 'credito'
                  ? 'Actualiza la factura; el pago se registra después en Pagos'
                  : 'Agrega o actualiza factura y comprobante de pago' }}
              </p>
            </div>

            <div>
              <span class="block text-sm font-medium text-text-primary mb-2">
                Tipo de pago
              </span>
              <div
                class="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Tipo de pago"
              >
                <button
                  v-for="option in paymentTypeOptions"
                  :key="option.value"
                  type="button"
                  role="radio"
                  :aria-checked="form.payment_type === option.value"
                  class="h-10 min-h-[40px] rounded-lg border px-2 text-sm font-medium text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  :class="form.payment_type === option.value
                    ? 'border-primary bg-primary/8'
                    : 'border-border bg-background hover:border-primary/40'"
                  @click="form.payment_type = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
              <p v-if="form.payment_type === 'contado' && !hasPaymentSelected" class="mt-1.5 text-xs text-warning">
                Elige un método en Comprobante de pago, o cambia a Crédito.
              </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Factura Section -->
              <div class="border border-border rounded-xl p-4 bg-background space-y-4">
                <h4 class="font-semibold text-text-primary flex items-center gap-2">
                  <DocumentTextIcon class="w-5 h-5 text-primary" />
                  Factura
                </h4>

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

                  <!-- Existing Attachments -->
                  <div v-if="existingInvoiceAttachments.length > 0">
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      Archivos Existentes
                    </label>
                    <div class="space-y-2">
                      <div
                        v-for="attachment in existingInvoiceAttachments"
                        :key="attachment.id"
                        class="flex items-center justify-between p-2 bg-surface border border-border rounded-lg"
                      >
                        <div class="flex items-center space-x-2 flex-1 min-w-0">
                          <svg class="w-4 h-4 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span class="text-xs text-text-primary truncate">{{ attachment.file_name }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Attachment Uploader -->
                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      {{ existingInvoiceAttachments.length > 0 ? 'Agregar Mas Archivos' : 'Adjuntar Factura' }}
                    </label>
                    <div class="space-y-3">
                      <div class="flex items-center space-x-2">
                        <input
                          ref="invoiceFileInput"
                          type="file"
                          class="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          multiple
                          @change="handleInvoiceFileSelect"
                        />
                        <button
                          type="button"
                          @click="($refs.invoiceFileInput as HTMLInputElement).click()"
                          class="px-4 py-2 bg-primary/10 text-primary border-2 border-primary/30 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                        >
                          <svg class="w-4 h-4 inline-block me-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Seleccionar Archivo
                        </button>
                        <span class="text-xs text-text-secondary">PDF o imagen (max. 10MB)</span>
                      </div>

                      <!-- Selected Files Preview -->
                      <div v-if="form.invoice_files.length > 0" class="space-y-2">
                        <div
                          v-for="(file, index) in form.invoice_files"
                          :key="index"
                          class="flex items-center justify-between p-2 bg-surface border border-border rounded-lg"
                        >
                          <div class="flex items-center space-x-2 flex-1 min-w-0">
                            <svg class="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span class="text-xs text-text-primary truncate">{{ file.name }}</span>
                            <span class="text-xs text-text-secondary">({{ formatFileSize(file.size) }})</span>
                          </div>
                          <button
                            type="button"
                            @click="removeInvoiceFile(index)"
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

              <!-- Crédito: deferred pay panel -->
              <div
                v-if="form.payment_type === 'credito'"
                class="border border-dashed border-border rounded-xl p-4 bg-surface-secondary/40 flex flex-col justify-center gap-2 min-h-[140px]"
              >
                <div class="flex items-center gap-2 text-text-secondary">
                  <CreditCardIcon class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <h4 class="font-semibold text-text-primary">Pago diferido</h4>
                </div>
                <p class="text-sm text-text-secondary leading-relaxed">
                  Esta compra quedará pendiente. Registra el pago después en <span class="font-medium text-text-primary">Finanzas → Pagos</span>.
                </p>
              </div>

              <!-- Contado: proof (crédito pays later in Pagos) -->
              <div
                v-else
                class="border border-border rounded-xl p-4 bg-background space-y-4"
              >
                  <h4 class="font-semibold text-text-primary flex items-center gap-2">
                    <CreditCardIcon class="w-5 h-5 text-primary" />
                    Comprobante de pago
                    <span
                      v-if="form.payment_type === 'contado'"
                      class="text-xs font-medium text-destructive"
                    >*</span>
                    <span
                      v-else
                      class="ms-auto text-xs font-normal text-text-tertiary"
                    >Opcional</span>
                  </h4>

                  <div>
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      Metodo de Pago
                      <span v-if="form.payment_type === 'contado'" class="text-destructive">*</span>
                    </label>
                    <select
                      v-model="paymentSelectValue"
                      class="input-base w-full px-4 py-2"
                    >
                      <option value="">Sin pago aun</option>
                      <template v-for="group in paymentGroups" :key="group.slug">
                        <option :value="`${group.slug}:`">{{ group.name }}</option>
                        <optgroup v-if="group.methods.length > 0" :label="group.name">
                          <option
                            v-for="method in group.methods"
                            :key="method.id"
                            :value="`${group.slug}:${method.id}`"
                          >
                            {{ group.name }} · {{ method.name }}
                          </option>
                        </optgroup>
                      </template>
                    </select>
                  </div>

                  <div v-if="hasPaymentSelected && isCashPaymentSelected" class="space-y-1.5">
                    <label class="block text-sm font-medium text-text-secondary">
                      {{ t('abastecimiento.compraDirectaDetalle.fromCashDrawerLabel') }}
                    </label>
                    <div class="flex flex-col gap-2 sm:flex-row sm:gap-4">
                      <label class="inline-flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                        <input v-model="form.from_cash_drawer" type="radio" :value="true" class="text-primary" />
                        {{ t('abastecimiento.compraDirectaDetalle.fromCashDrawerYes') }}
                      </label>
                      <label class="inline-flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                        <input v-model="form.from_cash_drawer" type="radio" :value="false" class="text-primary" />
                        {{ t('abastecimiento.compraDirectaDetalle.fromCashDrawerNo') }}
                      </label>
                    </div>
                    <p class="text-xs text-text-secondary">
                      {{ t('abastecimiento.compraDirectaDetalle.fromCashDrawerHelp') }}
                    </p>
                  </div>

                  <div v-if="hasPaymentSelected">
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

                  <!-- Existing Attachments -->
                  <div v-if="existingPaymentAttachments.length > 0">
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      Comprobantes Existentes
                    </label>
                    <div class="space-y-2">
                      <div
                        v-for="attachment in existingPaymentAttachments"
                        :key="attachment.id"
                        class="flex items-center justify-between p-2 bg-surface border border-border rounded-lg"
                      >
                        <div class="flex items-center space-x-2 flex-1 min-w-0">
                          <svg class="w-4 h-4 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span class="text-xs text-text-primary truncate">{{ attachment.file_name }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Attachment Uploader -->
                  <div v-if="hasPaymentSelected">
                    <label class="block text-sm font-medium text-text-secondary mb-2">
                      {{ existingPaymentAttachments.length > 0 ? 'Agregar Mas Comprobantes' : 'Adjuntar Comprobante' }}
                    </label>
                    <div class="space-y-3">
                      <div class="flex items-center space-x-2">
                        <input
                          ref="paymentFileInput"
                          type="file"
                          class="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          multiple
                          @change="handlePaymentFileSelect"
                        />
                        <button
                          type="button"
                          @click="($refs.paymentFileInput as HTMLInputElement).click()"
                          class="px-4 py-2 bg-primary/10 text-primary border-2 border-primary/30 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                        >
                          <svg class="w-4 h-4 inline-block me-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Seleccionar Archivo
                        </button>
                        <span class="text-xs text-text-secondary">PDF o imagen (max. 10MB)</span>
                      </div>

                      <!-- Selected Files Preview -->
                      <div v-if="form.payment_files.length > 0" class="space-y-2">
                        <div
                          v-for="(file, index) in form.payment_files"
                          :key="index"
                          class="flex items-center justify-between p-2 bg-surface border border-border rounded-lg"
                        >
                          <div class="flex items-center space-x-2 flex-1 min-w-0">
                            <svg class="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span class="text-xs text-text-primary truncate">{{ file.name }}</span>
                            <span class="text-xs text-text-secondary">({{ formatFileSize(file.size) }})</span>
                          </div>
                          <button
                            type="button"
                            @click="removePaymentFile(index)"
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

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Notas Generales
              </label>
              <textarea
                v-model="form.notes"
                class="input-base w-full px-4 py-2"
                rows="3"
                placeholder="Observaciones adicionales..."
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Step 3: Revision -->
        <div v-else-if="currentStep === 3" key="step-3" class="bg-surface border border-border rounded-lg">
          <!-- Header -->
          <div class="border-b border-border p-4 sm:p-6 md:p-8">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary mb-2">RESUMEN DE CAMBIOS</h1>
                <p class="text-xs sm:text-sm text-text-secondary">Revisa los cambios antes de guardar</p>
              </div>
              <div class="text-start sm:text-end w-full sm:w-auto">
                <div class="border-2 border-border px-3 sm:px-4 py-2 rounded-lg inline-block mb-2 bg-surface-secondary">
                  <p class="text-xs font-medium text-text-secondary">COMPRA N°</p>
                  <p class="text-lg sm:text-xl font-bold text-text-primary">{{ originalPurchase?.purchase_number }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Supplier Info -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Proveedor</p>
                <p class="text-lg font-bold text-text-primary">{{ originalPurchase?.supplier_name }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Estado</p>
                <p class="text-base font-medium text-text-primary">{{ getStatusText(originalPurchase?.status) }}</p>
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
                    <p class="font-semibold">{{ formatUnitCost(item.unit_cost) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-text-secondary">Total</p>
                    <p class="font-bold text-primary">{{ formatPrice(item.total_cost) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop: Table View -->
            <table class="w-full hidden md:table">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-start py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">{{ WAREHOUSE_COPY.warehouseItemColumn }}</th>
                  <th class="text-end py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Cantidad</th>
                  <th class="text-end py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Precio Unit.</th>
                  <th class="text-end py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Total</th>
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
                  <td class="text-end py-4 text-text-primary">
                    {{ item.purchase_quantity }} {{ item.purchase_unit }}
                  </td>
                  <td class="text-end py-4 text-text-primary">
                    {{ formatUnitCost(item.unit_cost) }}
                  </td>
                  <td class="text-end py-4 font-bold text-primary">
                    {{ formatPrice(item.total_cost) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-primary/5">
                  <td colspan="3" class="py-4 text-end font-bold text-text-primary">Total:</td>
                  <td class="py-4 text-end text-xl font-bold text-primary">{{ formatPrice(totalAmount) }}</td>
                </tr>
              </tfoot>
            </table>

            <!-- Mobile Total -->
            <div class="md:hidden mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div class="flex justify-between items-center">
                <span class="font-bold text-text-primary">Total:</span>
                <span class="text-xl font-bold text-primary">{{ formatPrice(totalAmount) }}</span>
              </div>
            </div>
          </div>

          <!-- Documents Summary -->
          <div
            v-if="form.invoice_number || form.invoice_files.length || (form.payment_type !== 'credito' && (hasPaymentSelected || form.payment_files.length))"
            class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-t border-border bg-background/50"
          >
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Documentos</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-if="form.invoice_number || form.invoice_files.length">
                <p class="text-sm text-text-secondary">Factura:</p>
                <p v-if="form.invoice_number" class="font-medium text-text-primary">{{ form.invoice_number }}</p>
                <p v-if="existingInvoiceAttachments.length" class="text-xs text-success mt-1">{{ existingInvoiceAttachments.length }} archivo(s) existente(s)</p>
                <p v-if="form.invoice_files.length" class="text-xs text-primary mt-1">+ {{ form.invoice_files.length }} archivo(s) nuevo(s)</p>
              </div>
              <div v-if="form.payment_type !== 'credito' && (hasPaymentSelected || form.payment_files.length)">
                <p class="text-sm text-text-secondary">Pago:</p>
                <p v-if="hasPaymentSelected" class="font-medium text-text-primary">{{ resolvePaymentLabel(form.payment_method, form.payment_method_id) }}</p>
                <p
                  v-if="hasPaymentSelected && isCashPaymentSelected"
                  class="text-xs text-text-secondary"
                >
                  {{ form.from_cash_drawer
                    ? t('abastecimiento.compraDirectaDetalle.fromCashDrawerYes')
                    : t('abastecimiento.compraDirectaDetalle.fromCashDrawerNo') }}
                </p>
                <p v-if="form.payment_reference" class="text-xs text-text-secondary">Ref: {{ form.payment_reference }}</p>
                <p v-if="existingPaymentAttachments.length" class="text-xs text-success mt-1">{{ existingPaymentAttachments.length }} comprobante(s) existente(s)</p>
                <p v-if="form.payment_files.length" class="text-xs text-primary mt-1">+ {{ form.payment_files.length }} comprobante(s) nuevo(s)</p>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="form.notes" class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-t border-border">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Notas</p>
            <p class="text-sm text-text-primary">{{ form.notes }}</p>
          </div>

          <!-- Warning Message -->
          <div class="px-4 sm:px-6 md:px-8 py-4 bg-warning/10 border-t border-warning/20">
            <div class="flex items-center gap-3">
              <ExclamationTriangleIcon class="w-6 h-6 text-warning flex-shrink-0" />
              <div>
                <p class="font-medium text-warning">Los cambios en items pueden afectar el inventario</p>
                <p class="text-xs text-warning/80">Verifica que los datos sean correctos antes de guardar</p>
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
              :to="`/abastecimiento/compras-directas/${purchaseId}`"
              class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
            >
              Cancelar
            </NuxtLink>

            <button
              v-if="currentStep < 3"
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
              :disabled="!isStepValid || isSubmitting"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg disabled:opacity-50 text-sm sm:text-base"
            >
              <span class="hidden sm:inline">{{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}</span>
              <span class="sm:hidden">{{ isSubmitting ? '...' : 'Guardar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { localeToNumberFormatTag, normalizeCurrencyCode } from '~/utils/currencyDisplay'
import { TrashIcon, DocumentTextIcon, CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'
import { WAREHOUSE_COPY } from '~/constants/warehouseCopy'
import { usePaymentLabel } from '~/composables/usePaymentLabel'
import { usePaymentSelectValue } from '~/composables/usePaymentSelectValue'
import { mergePosPaymentGroupsFromApi, isCashPaymentSlug, readFromCashDrawer } from '~/utils/paymentDefaults'

const { todayISO, dateAtNoon, isoFromDate, timeHHMMFromISO, combineDateAndTimeISO } = useTenantTimezone()
const {
  formatCurrency,
  formatDate,
  currencyCode,
  uiLocale,
} = useFormatters()

const formatPurchaseDate = (date: Date) => fnsFormat(date, 'dd/MM/yy', { locale: es })
const tenantNowISO = () => combineDateAndTimeISO(todayISO(), timeHHMMFromISO(new Date().toISOString())) ?? new Date().toISOString()
const localDateAtNoon = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}
const localISOFromDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const purchaseDatePayloadISO = (date: Date) => dateAtNoon(localISOFromDate(date)).toISOString()
const maxPurchaseDate = computed(() => localDateAtNoon(todayISO()))

const route = useRoute()
const purchaseId = route.params.id as string

useHead({
  title: 'Editar Compra Directa - Abastecimiento'
})

interface PurchaseItem {
  id?: string
  ingredient_id: string
  purchase_quantity: number
  purchase_unit: string
  unit_cost: number
  total_cost: number
  notes: string
}

// Wizard state
const currentStep = ref(1)

// State
const isSubmitting = ref(false)

// Form
const form = ref({
  purchase_date: null as Date | null,
  notes: '',
  invoice_number: '',
  invoice_files: [] as File[],
  payment_type: 'credito' as string,
  payment_method: '',
  payment_method_id: null as string | null,
  payment_reference: '',
  from_cash_drawer: true,
  payment_files: [] as File[],
  items: [] as PurchaseItem[]
})

const paymentTypeOptions = [
  { value: 'credito', label: 'Crédito' },
  { value: 'contado', label: 'Contado' },
] as const

// Payment methods
const { data: paymentMethodsData } = useFetch<{ success: boolean; data: import('~/utils/paymentDefaults').PosPaymentGroup[] }>(
  '/api/pos/payment-methods',
  { server: false },
)
const paymentGroups = computed(() =>
  mergePosPaymentGroupsFromApi(paymentMethodsData.value?.data ?? []),
)
const { resolveLabel: resolvePaymentLabel } = usePaymentLabel(paymentGroups)
const { paymentSelectValue, hasPaymentSelected } = usePaymentSelectValue(form, paymentGroups)
const isCashPaymentSelected = computed(() => isCashPaymentSlug(form.value.payment_method))

watch(isCashPaymentSelected, (isCash) => {
  if (!isCash) form.value.from_cash_drawer = true
})

const clearPaymentProof = () => {
  form.value.payment_method = ''
  form.value.payment_method_id = null
  form.value.payment_reference = ''
  form.value.from_cash_drawer = true
  form.value.payment_files = []
}

watch(
  () => form.value.payment_type,
  (type) => {
    if (type === 'credito') clearPaymentProof()
  },
)

watch(hasPaymentSelected, (selected) => {
  if (selected) return
  form.value.payment_reference = ''
  if (form.value.payment_type === 'contado') {
    form.value.payment_type = 'credito'
  }
})

// Fetch existing purchase
// (payment helpers above — originalPurchase watch fills form)

const { data: purchaseResponse, pending: loadingPurchase, error: fetchError } = useFetch(`/api/suppliers/purchases/direct/${purchaseId}`, {
  server: false
})

const originalPurchase = computed(() => (purchaseResponse.value as any)?.data || null)

// Existing attachments
const existingInvoiceAttachments = computed(() =>
  originalPurchase.value?.attachments?.filter((a: any) => a.attachment_type === 'invoice') || []
)
const existingPaymentAttachments = computed(() =>
  originalPurchase.value?.attachments?.filter((a: any) => a.attachment_type === 'payment_proof') || []
)

// Initialize form when purchase loads
watch(originalPurchase, (purchase) => {
  if (purchase) {
    form.value.purchase_date = purchase.purchase_date
      ? localDateAtNoon(isoFromDate(new Date(purchase.purchase_date)))
      : localDateAtNoon(todayISO())
    form.value.notes = purchase.notes || ''
    form.value.invoice_number = purchase.invoice_number || ''
    form.value.payment_type = purchase.payment_type || 'credito'
    form.value.payment_method = purchase.payment_method || ''
    form.value.payment_method_id = purchase.payment_method_id || null
    form.value.payment_reference = purchase.payment_reference || ''
    form.value.from_cash_drawer = readFromCashDrawer(purchase)
    // Contado without method is invalid on load — normalize to crédito
    if (form.value.payment_type === 'contado' && !form.value.payment_method && !form.value.payment_method_id) {
      form.value.payment_type = 'credito'
    }
    // Contraentrega duplicates crédito on direct purchases — fold into crédito
    if (form.value.payment_type === 'contraentrega') {
      form.value.payment_type = 'credito'
    }
    // Crédito must not keep a leftover method (marks paid / wrong GL)
    if (form.value.payment_type === 'credito') {
      clearPaymentProof()
    }
    form.value.items = (purchase.items || []).map((item: any) => {
      const purchaseQty = item.purchase_quantity || item.quantity || 1
      const totalCost = item.total_cost || 0
      // unit_cost in DB is per base unit; recover per-purchase-unit cost from total
      const unitCostPerPurchaseUnit = purchaseQty > 0 ? roundUnitCost(totalCost / purchaseQty) : roundUnitCost(item.unit_cost || 0)
      return {
        id: item.id,
        ingredient_id: item.ingredient_id,
        purchase_quantity: purchaseQty,
        purchase_unit: item.purchase_unit || item.unit,
        unit_cost: unitCostPerPurchaseUnit,
        total_cost: totalCost,
        notes: item.notes || ''
      }
    })
  }
}, { immediate: true })

// Fetch ingredients
const { data: ingredientsData, pending: loadingIngredients } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: INGREDIENTS_FETCH_LIMIT }
})

const ingredients = computed(() => ingredientsData.value?.data || [])
const ingredientOptions = computed(() => ingredients.value.map((i: any) => ({
  value: i.id,
  label: i.name,
  unit: i.unit
})))

// Fetch purchase units
const { data: purchaseUnitsData, pending: loadingPurchaseUnits } = useFetch('/api/suppliers/ingredient-purchase-units', {
  server: false,
  query: { limit: 10000, active_only: true }
})

const purchaseUnits = computed(() => purchaseUnitsData.value?.data || [])

// Loading state
const isLoadingData = computed(() =>
  loadingPurchase.value || loadingIngredients.value || loadingPurchaseUnits.value
)

// Computed
const totalAmount = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (item.total_cost || 0), 0)
})

// Step validation
const isStepValid = computed(() => {
  if (currentStep.value === 1) {
    return form.value.items.length > 0 && form.value.items.every(item =>
      item.ingredient_id &&
      item.purchase_quantity > 0 &&
      item.purchase_unit &&
      item.unit_cost >= 0
    )
  }
  if (currentStep.value === 2 || currentStep.value === 3) {
    if (form.value.payment_type === 'contado' && !hasPaymentSelected.value) {
      return false
    }
  }
  return true
})

// Methods
const formatPrice = (price: number) => formatCurrency(price)

const MONEY_PRECISION = 0
const UNIT_COST_PRECISION = 6
const QUANTITY_PRECISION = 6

const roundMoney = (value: number) => roundDecimal(value, MONEY_PRECISION)
const roundUnitCost = (value: number) => roundDecimal(value, UNIT_COST_PRECISION)

const formatUnitCost = (price: number) => {
  const numeric = Number.isFinite(price) ? price : 0
  return new Intl.NumberFormat(localeToNumberFormatTag(uiLocale.value), {
    style: 'currency',
    currency: normalizeCurrencyCode(currencyCode.value),
    minimumFractionDigits: 0,
    maximumFractionDigits: UNIT_COST_PRECISION,
  }).format(numeric)
}

function roundDecimal(value: number, precision: number) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** precision
  return Math.round((value + Number.EPSILON) * factor) / factor
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getIngredientName = (id: string) => {
  const ingredient = ingredients.value.find((i: any) => i.id === id)
  return ingredient?.name || ''
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'received': 'Recibida',
    'invoiced': 'Facturada',
    'paid': 'Pagada'
  }
  return statusMap[status] || status
}



const getPurchaseUnitOptions = (ingredientId: string) => {
  if (!ingredientId) return []

  const units = purchaseUnits.value.filter((u: any) => u.ingredient_id === ingredientId)

  if (units.length === 0) {
    const ingredient = ingredients.value.find((i: any) => i.id === ingredientId)
    if (ingredient) {
      return [{ value: ingredient.unit, label: ingredient.unit }]
    }
    return []
  }

  return units.map((u: any) => ({
    value: u.purchase_unit_label,
    label: u.purchase_unit_label,
    conversion_factor: u.conversion_factor
  }))
}

const onIngredientChange = (index: number) => {
  const item = form.value.items[index]
  const ingredient = ingredients.value.find((i: any) => i.id === item.ingredient_id)

  if (ingredient) {
    const units = getPurchaseUnitOptions(item.ingredient_id)
    const defaultUnit = units.find((u: any) => u.is_default) || units[0]
    if (defaultUnit) {
      item.purchase_unit = defaultUnit.value
    }
  }
}

const onUnitChange = (index: number) => {
  updateItemTotal(index)
}

const updateItemTotal = (index: number) => {
  const item = form.value.items[index]
  item.total_cost = roundMoney((item.purchase_quantity || 0) * (item.unit_cost || 0))
}

const addItem = () => {
  form.value.items.push({
    ingredient_id: '',
    purchase_quantity: 1,
    purchase_unit: '',
    unit_cost: 0,
    total_cost: 0,
    notes: ''
  })
}

const removeItem = (index: number) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

const handleInvoiceFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const validFiles = files.filter(file => {
    if (file.size > 10 * 1024 * 1024) {
      alert(`${file.name} excede el tamaño máximo de 10MB`)
      return false
    }
    return true
  })
  form.value.invoice_files.push(...validFiles)
  input.value = ''
}

const handlePaymentFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const validFiles = files.filter(file => {
    if (file.size > 10 * 1024 * 1024) {
      alert(`${file.name} excede el tamaño máximo de 10MB`)
      return false
    }
    return true
  })
  form.value.payment_files.push(...validFiles)
  input.value = ''
}

const removeInvoiceFile = (index: number) => {
  form.value.invoice_files.splice(index, 1)
}

const removePaymentFile = (index: number) => {
  form.value.payment_files.splice(index, 1)
}

// Wizard navigation
const handleNext = () => {
  if (!isStepValid.value) return

  if (currentStep.value < 3) {
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
// Submit
const handleSubmit = async () => {
  if (!isStepValid.value) {
    if (form.value.payment_type === 'contado' && !hasPaymentSelected.value) {
      alert('Contado requiere un método de pago. Elige uno o cambia a Crédito.')
    }
    return
  }

  isSubmitting.value = true

  try {
    const isCredit = form.value.payment_type === 'credito'
    if (isCredit) clearPaymentProof()

    // 1. Prepare JSON payload for update
    const payload = {
      items_data: JSON.stringify(form.value.items.map(item => ({
        id: item.id,
        ingredient_id: item.ingredient_id,
        quantity: item.purchase_quantity,
        purchase_quantity: item.purchase_quantity,
        purchase_unit: item.purchase_unit,
        unit_cost: item.unit_cost,
        notes: item.notes
      }))),
      purchase_date: form.value.purchase_date ? purchaseDatePayloadISO(form.value.purchase_date) : null,
      notes: form.value.notes,
      invoice_number: form.value.invoice_number,
      payment_type: form.value.payment_type,
      payment_method: isCredit ? null : (form.value.payment_method || null),
      payment_method_id: isCredit ? null : (form.value.payment_method_id || null),
      payment_reference: isCredit ? null : (form.value.payment_reference || null),
      payment_amount: !isCredit && form.value.payment_method ? Number(totalAmount.value) : null,
      payment_date: !isCredit && form.value.payment_method ? tenantNowISO() : null,
      ...(!isCredit && isCashPaymentSelected.value
        ? { fromCashDrawer: form.value.from_cash_drawer }
        : {}),
    }

    // 2. Update Direct Purchase (PUT - JSON)
    const response = await $fetch(`/api/suppliers/purchases/direct/${purchaseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    })

    // 3. Upload files if present (POST - Multipart)
    if ((form.value.invoice_files?.length > 0 || (!isCredit && form.value.payment_files?.length > 0)) && response.data?.id) {
      try {
        const formData = new FormData()
        
        if (form.value.invoice_files?.length) {
          form.value.invoice_files.forEach(file => formData.append('invoice_files', file))
        }
        
        if (!isCredit && form.value.payment_files?.length) {
          form.value.payment_files.forEach(file => formData.append('payment_files', file))
        }

        await $fetch(`/api/suppliers/purchases/direct/${response.data.id}/attachments`, {
          method: 'POST',
          body: formData
        })
      } catch (fileError) {
        console.error('Error uploading files:', fileError)
        const msg = fileError.response?._data?.detail || fileError.message || 'Error desconocido'
        alert(`Compra actualizada, pero error subiendo archivos: ${msg}`)
      }
    }

    if (response.success) {
      await navigateTo(`/abastecimiento/compras-directas/${purchaseId}`)
    }
  } catch (error: any) {
    console.error('Error updating direct purchase:', error)
    alert(`Error: ${error.response?._data?.detail || error.message || 'Error al actualizar la compra'}`)
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
