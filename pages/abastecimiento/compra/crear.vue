<template>
  <div class="page-layout">
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Creando cotización...</p>
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
                  Número de Orden
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
                  Fecha de Orden
                </p>
                <p class="text-sm sm:text-lg font-semibold text-text-primary">
                  Al momento de crear
                </p>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Estado
                </p>
                <div class="pt-1">
                  <UiStatusBadge
                    value="Creado"
                    format="text"
                    variant="info"
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
                  <span class="hidden sm:inline">Información General</span>
                  <span class="sm:hidden">Info</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Proveedor y detalles</p>
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
                  Alimentos
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Productos e ingredientes</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 2 ? 'bg-secondary' : 'bg-border'"></div>
            </div>

            <!-- Step 3 -->
            <div class="flex items-center">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 3,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 3,
                  'border-border text-text-secondary bg-transparent': currentStep < 3
                }"
              >
                <span class="font-semibold text-sm sm:text-base">3</span>
              </div>
              <div class="ml-1 sm:ml-3 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 3 ? 'text-text-primary' : 'text-text-secondary'">
                  <span class="hidden sm:inline">Revisión y Confirmación</span>
                  <span class="sm:hidden">Revisar</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Verificar y crear</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="handleNext">
        <!-- Step 1: Información General -->
        <Transition name="fade" mode="out-in">
        <div v-if="currentStep === 1" key="step-1" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6">Información General</h3>

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
                />
              </div>

              <div>
                <!-- Loading State -->
                <div v-if="loadingAgreements" class="h-[74px] flex items-center">
                  <div class="flex items-center space-x-2 text-text-secondary">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="text-sm">Buscando acuerdos...</span>
                  </div>
                </div>

                <!-- Payment Selection -->
                <div v-else>
                  <div class="flex justify-between items-center mb-2">
                    <label class="block text-sm font-medium text-text-primary">
                      {{ usePaymentAgreement ? 'Acuerdo de Pago *' : 'Tipo de Pago *' }}
                    </label>
                    
                    <!-- Toggle -->
                    <label v-if="paymentAgreements.length > 0" class="flex items-center space-x-2 cursor-pointer">
                      <span class="text-xs text-text-secondary">Usar acuerdo</span>
                      <div class="relative inline-flex items-center cursor-pointer">
                        <input 
                          v-model="usePaymentAgreement" 
                          type="checkbox" 
                          class="sr-only peer"
                        >
                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </div>
                    </label>
                  </div>

                  <!-- Agreement Select -->
                  <div v-if="usePaymentAgreement">
                    <select
                      v-model="selectedAgreementId"
                      required
                      class="input-base w-full px-4 py-2"
                    >
                      <option value="">Seleccionar acuerdo</option>
                      <option
                        v-for="agreement in paymentAgreements"
                        :key="agreement.id"
                        :value="agreement.id"
                      >
                        {{ agreement.name }}
                      </option>
                    </select>
                    <p v-if="selectedAgreementId" class="text-xs text-text-secondary mt-1 truncate">
                      {{ paymentAgreements.find(a => a.id === selectedAgreementId)?.description }}
                    </p>
                  </div>

                  <!-- Manual Payment Type Select -->
                  <div v-else>
                    <select
                      v-model="form.payment_type"
                      required
                      class="input-base w-full px-4 py-2"
                    >
                      <option value="">Seleccionar tipo de pago</option>
                      <option value="contado">Contado - Pago Inmediato</option>
                      <option value="credito">Crédito - Pago Diferido</option>
                      <option value="contraentrega">Contraentrega - Pago al Recibir</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Conditional fields for credito (Manual) -->
              <template v-if="!usePaymentAgreement && form.payment_type === 'credito'">
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    Días de Crédito *
                  </label>
                  <input
                    v-model.number="form.credit_days"
                    type="number"
                    min="1"
                    max="180"
                    step="1"
                    required
                    class="input-base w-full px-4 py-2"
                    placeholder="Ej: 30, 60, 90"
                  />
                  <p class="text-xs text-text-secondary mt-1">
                    El vencimiento se calculará automáticamente al facturar
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    Términos de Pago
                  </label>
                  <input
                    v-model="form.payment_terms"
                    type="text"
                    class="input-base w-full px-4 py-2"
                    placeholder="Ej: 30 días neto, 2/10 neto 30"
                  />
                </div>
              </template>

              <!-- Conditional field for contraentrega -->
              <div v-if="form.payment_type === 'contraentrega'" class="md:col-span-2">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input
                    v-model="form.requires_advance_payment"
                    type="checkbox"
                    class="rounded border-border text-primary focus:ring-primary"
                  />
                  <span class="text-sm text-text-primary">Requiere anticipo</span>
                </label>
              </div>

              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Observaciones
                </label>
                <textarea
                  v-model="form.notes"
                  class="input-base w-full px-4 py-2"
                  rows="3"
                  placeholder="Observaciones adicionales sobre la orden..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Items -->
        <div v-else-if="currentStep === 2" key="step-2" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6">Alimentos</h3>

            <div class="space-y-3 sm:space-y-4">
              <div
                v-for="(item, index) in form.items"
                :key="index"
                class="p-3 sm:p-4 border-2 border-border rounded-lg"
              >
                <div class="flex justify-between items-start mb-3 sm:mb-4">
                  <h4 class="text-sm sm:text-base font-medium text-text-primary">Alimento #{{ index + 1 }}</h4>
                  <button
                    type="button"
                    @click="removeItem(index)"
                    :disabled="form.items.length === 1"
                    class="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                  >
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">Ingrediente *</label>
                    <UiSearchableSelect
                      v-model="item.ingredient_id"
                      :options="ingredientOptions"
                      placeholder="Buscar ingrediente..."
                      required
                      @update:model-value="onIngredientChange(index)"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">Unidad de Compra *</label>
                    <select
                      v-model="item.purchase_unit"
                      required
                      :disabled="!item.ingredient_id"
                      class="input-base w-full px-4 py-2"
                      :class="{ 'bg-surface-secondary cursor-not-allowed': !item.ingredient_id }"
                      @change="onPurchaseUnitChange(index)"
                    >
                      <option value="">{{ item.ingredient_id ? 'Seleccionar unidad' : 'Seleccione ingrediente primero' }}</option>
                      <option
                        v-for="option in getUnitOptionsForIngredient(item.ingredient_id)"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                    <p v-if="item.ingredient_id && item.purchase_unit" class="text-xs text-text-secondary mt-1">
                      Se convertirá a: {{ getIngredientUnit(item.ingredient_id) }}
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">Cantidad *</label>
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      class="input-base w-full px-4 py-2"
                      @input="updateItemTotal(index)"
                    />
                  </div>
                </div>

                <!-- Notas del Item -->
                <div class="mt-3 sm:mt-4">
                  <label class="block text-sm font-medium text-text-primary mb-2">Notas del Item</label>
                  <input
                    v-model="item.notes"
                    type="text"
                    class="input-base w-full px-3 sm:px-4 py-2"
                    placeholder="Observaciones opcionales"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              @click="addItem"
              class="btn-secondary px-3 sm:px-4 py-2 rounded-lg text-sm mt-3 sm:mt-4 w-full sm:w-auto"
            >
              + Agregar Item
            </button>
          </div>
        </div>

        <!-- Step 3: Review - Quotation Summary -->
        <div v-else-if="currentStep === 3" key="step-3" class="bg-surface border border-border rounded-lg">
          <!-- Quotation Header -->
          <div class="border-b border-border p-4 sm:p-6 md:p-8">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary mb-2">COTIZACIÓN</h1>
                <p class="text-xs sm:text-sm text-text-secondary">Resumen de solicitud de cotización</p>
              </div>
              <div class="text-left sm:text-right w-full sm:w-auto">
                <div class="border-2 border-border px-3 sm:px-4 py-2 rounded-lg inline-block mb-2 bg-surface-secondary">
                  <p class="text-xs font-medium text-text-secondary">COTIZACIÓN N°</p>
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
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Estado</p>
                <UiStatusBadge
                  value="Cotización"
                  format="text"
                  variant="info"
                  size="md"
                />
                <p v-if="form.notes" class="text-sm text-text-secondary mt-2">{{ form.notes }}</p>
              </div>
            </div>
          </div>

          <!-- Payment Information -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border bg-background/50">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 sm:mb-4">
              Condiciones de Pago
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p class="text-sm text-text-secondary mb-1">
                  {{ usePaymentAgreement ? 'Acuerdo de Pago' : 'Tipo de Pago' }}
                </p>
                <p class="text-base font-semibold text-text-primary">
                  {{ usePaymentAgreement ? getAgreementName(selectedAgreementId) : getPaymentTypeText(form.payment_type) }}
                </p>
              </div>
              <div v-if="form.credit_days">
                <p class="text-sm text-text-secondary mb-1">Plazo de Crédito</p>
                <p class="text-base font-semibold text-text-primary">{{ form.credit_days }} días</p>
              </div>
              <div v-if="form.payment_terms" class="col-span-2">
                <p class="text-sm text-text-secondary mb-1">Términos de Pago</p>
                <p class="text-sm text-text-primary">{{ form.payment_terms }}</p>
              </div>
              <div v-if="form.consolidation_group" class="col-span-2">
                <p class="text-sm text-text-secondary mb-1">Grupo de Consolidación</p>
                <p class="text-sm text-text-primary">{{ form.consolidation_group }}</p>
                <p class="text-xs text-text-secondary mt-1">
                  Esta orden se facturará de forma consolidada con otras del mismo grupo
                </p>
              </div>
              <div v-if="form.requires_advance_payment" class="col-span-2">
                <div class="flex items-center space-x-2 p-3 bg-warning/10 border border-warning rounded-lg">
                  <svg class="w-5 h-5 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span class="text-sm text-warning font-medium">Requiere pago anticipado</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Items Table - Desktop -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <!-- Mobile: Cards View -->
            <div class="md:hidden space-y-3">
              <div
                v-for="(item, index) in form.items"
                :key="index"
                class="border border-border rounded-lg p-3 bg-background"
              >
                <div class="mb-2">
                  <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Alimento</p>
                  <p class="font-medium text-text-primary text-sm">{{ getIngredientName(item.ingredient_id) }}</p>
                  <p v-if="item.notes" class="text-xs text-text-secondary mt-1">{{ item.notes }}</p>
                </div>
                <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                  <div>
                    <p class="text-xs text-text-secondary mb-1">Cantidad Solicitada</p>
                    <p class="text-sm text-text-primary font-semibold">
                      {{ item.quantity }} {{ item.purchase_unit }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-text-secondary mb-1">Equivalente</p>
                    <p class="text-sm text-text-secondary">
                      {{ getConvertedQuantity(index) }} {{ getIngredientUnit(item.ingredient_id) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop: Table View -->
            <table class="w-full hidden md:table">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Alimento
                  </th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Cantidad Solicitada
                  </th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Equivalente
                  </th>
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
                  <td class="text-right py-4 text-text-primary font-semibold">
                    {{ item.quantity }} {{ item.purchase_unit }}
                  </td>
                  <td class="text-right py-4 text-text-secondary text-sm">
                    {{ getConvertedQuantity(index) }} {{ getIngredientUnit(item.ingredient_id) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer Note -->
          <div class="px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-surface-secondary border-t border-border">
            <p class="text-xs text-text-secondary text-center">
              Al crear esta cotización, se registrará en el sistema con el número {{ nextPurchaseNumber }}
            </p>
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
            <div v-else></div>

            <button
              v-if="currentStep < 3"
              type="submit"
              @click="handleNext"
              :disabled="(currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid)"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg transition-opacity text-sm sm:text-base"
              :class="{ 'opacity-50 cursor-not-allowed': (currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid) }"
            >
              <span class="hidden sm:inline">Siguiente →</span>
              <span class="sm:hidden">→</span>
            </button>
            <button
              v-else
              type="button"
              @click="handleSubmit"
              :disabled="isSubmitting"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg disabled:opacity-50 text-sm sm:text-base"
            >
              <span class="hidden sm:inline">{{ isSubmitting ? 'Creando...' : 'Crear y Enviar Cotización' }}</span>
              <span class="sm:hidden">{{ isSubmitting ? 'Creando...' : 'Crear' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Crear Cotización - Abastecimiento'
})

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Wizard state
const currentStep = ref(1)

// Fetch suppliers
const { data: suppliersData, pending: loadingSuppliers } = useFetch('/api/suppliers/providers', {
  server: false,
  query: { limit: 250 }
})

const suppliers = computed(() => suppliersData.value?.data || [])

const supplierOptions = computed(() =>
  suppliers.value.map(supplier => ({
    value: supplier.id,
    label: supplier.name
  }))
)

// Fetch ingredients
const { data: ingredientsData, pending: loadingIngredients } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: 250 }
})

const ingredients = computed(() => ingredientsData.value?.data || [])

const ingredientOptions = computed(() =>
  ingredients.value.map(ingredient => ({
    value: ingredient.id,
    label: ingredient.name
  }))
)

// Fetch next purchase number
const { data: nextNumberData, pending: loadingNextNumber } = useFetch('/api/suppliers/purchases/next-number', {
  server: false
})

const nextPurchaseNumber = computed(() => nextNumberData.value?.next_number || 'WR-2025-XXXX')

// Loading state
const isLoadingData = computed(() => loadingSuppliers.value || loadingIngredients.value || loadingNextNumber.value)

// Get current date and time
const getCurrentDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Unit conversion factors
const unitConversions = {
  'gr-gr': 1,
  'kg-gr': 1000,
  'lb-gr': 453.592,
  'oz-gr': 28.3495,
  'ml-ml': 1,
  'lt-ml': 1000,
  'gal-ml': 3785.41,
  'und-und': 1
}

const getConversionFactor = (fromUnit, toUnit) => {
  const key = `${fromUnit}-${toUnit}`
  return unitConversions[key] || 1
}

// Payment Agreements State
const paymentAgreements = ref([])
const loadingAgreements = ref(false)
const usePaymentAgreement = ref(false)
const selectedAgreementId = ref('')

// Form state
const form = ref({
  supplier_id: '',
  delivery_date: '',
  status: 'pending',
  invoice_number: '',
  tax_amount: 0,
  total_amount: 0,
  notes: '',

  // Payment type fields
  payment_type: '',
  payment_terms: '',
  credit_days: null,
  requires_advance_payment: false,
  consolidation_group: '',
  
  // New field for agreement
  payment_agreement_id: null,

  items: [
    {
      ingredient_id: '',
      quantity: 1,
      purchase_unit: '',
      purchase_price: 0,
      unit: '',
      unit_cost: 0,
      total_cost: 0,
      expiry_date: null,
      batch_number: '',
      notes: ''
    }
  ]
})

const isSubmitting = ref(false)

// Watch for supplier change to fetch agreements
watch(() => form.value.supplier_id, async (newSupplierId) => {
  if (!newSupplierId) {
    paymentAgreements.value = []
    return
  }

  loadingAgreements.value = true
  try {
    const response = await $fetch(`/api/suppliers/providers/${newSupplierId}/payment-agreements`)
    paymentAgreements.value = response.data || []
    
    // Reset selection if supplier changes
    selectedAgreementId.value = ''
    usePaymentAgreement.value = false
  } catch (error) {
    console.error('Error fetching payment agreements:', error)
    paymentAgreements.value = []
  } finally {
    loadingAgreements.value = false
  }
})

// Watch for agreement selection to populate form
watch(selectedAgreementId, (newId) => {
  if (!newId) return

  const agreement = paymentAgreements.value.find(a => a.id === newId)
  if (agreement) {
    console.log('Selected agreement:', agreement)
  }
})

// Computed totals
const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0)
})

const totalAmount = computed(() => {
  return subtotal.value + (parseFloat(form.value.tax_amount) || 0)
})

// Helper functions
const formatPrice = (price) => {
  if (!price) return '0.00'
  return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getIngredientUnit = (ingredientId) => {
  if (!ingredientId) return ''
  const ingredient = ingredients.value.find(ing => ing.id === ingredientId)
  return ingredient?.unit || ''
}

const getIngredientName = (ingredientId) => {
  if (!ingredientId) return ''
  const ingredient = ingredients.value.find(ing => ing.id === ingredientId)
  return ingredient?.name || ''
}

const getSupplierName = (supplierId) => {
  if (!supplierId) return ''
  const supplier = suppliers.value.find(sup => sup.id === supplierId)
  return supplier?.name || ''
}

const getUnitOptionsForIngredient = (ingredientId) => {
  if (!ingredientId) return []

  const baseUnit = getIngredientUnit(ingredientId)

  if (baseUnit === 'gr') {
    return [
      { value: 'gr', label: 'Gramos (gr)' },
      { value: 'kg', label: 'Kilogramos (kg)' },
      { value: 'lb', label: 'Libras (lb)' },
      { value: 'oz', label: 'Onzas (oz)' }
    ]
  } else if (baseUnit === 'ml') {
    return [
      { value: 'ml', label: 'Mililitros (ml)' },
      { value: 'lt', label: 'Litros (lt)' },
      { value: 'gal', label: 'Galones (gal)' }
    ]
  } else if (baseUnit === 'und') {
    return [
      { value: 'und', label: 'Unidad' }
    ]
  }

  return []
}

const getConvertedQuantity = (index) => {
  const item = form.value.items[index]
  if (!item.quantity || !item.purchase_unit || !item.ingredient_id) return '0'

  const baseUnit = getIngredientUnit(item.ingredient_id)
  const factor = getConversionFactor(item.purchase_unit, baseUnit)
  const converted = item.quantity * factor

  return converted.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getPaymentTypeText = (type) => {
  const types = {
    'contado': 'Contado - Pago Inmediato',
    'credito': 'Crédito - Pago Diferido',
    'contraentrega': 'Contraentrega - Pago al Recibir'
  }
  return types[type] || type
}

const getAgreementName = (id) => {
  const agreement = paymentAgreements.value.find(a => a.id === id)
  return agreement ? agreement.name : 'Acuerdo no encontrado'
}

// Methods
const onIngredientChange = (index) => {
  const selectedIngredient = ingredients.value.find(
    ing => ing.id === form.value.items[index].ingredient_id
  )
  if (selectedIngredient) {
    form.value.items[index].unit = selectedIngredient.unit
    form.value.items[index].purchase_unit = selectedIngredient.unit
  }
}

const onPurchaseUnitChange = (index) => {
  onPurchasePriceChange(index)
}

const onPurchasePriceChange = (index) => {
  const item = form.value.items[index]
  if (!item.purchase_unit || !item.ingredient_id) return

  const baseUnit = getIngredientUnit(item.ingredient_id)
  const factor = getConversionFactor(item.purchase_unit, baseUnit)

  item.unit_cost = (item.purchase_price || 0) / factor
  updateItemTotal(index)
}

const updateItemTotal = (index) => {
  const item = form.value.items[index]

  if (!item.purchase_unit || !item.ingredient_id) {
    item.total_cost = 0
    updateTotal()
    return
  }

  item.total_cost = (parseFloat(item.quantity) || 0) * (parseFloat(item.purchase_price) || 0)
  updateTotal()
}

const updateTotal = () => {
  form.value.total_amount = totalAmount.value
}

const addItem = () => {
  form.value.items.push({
    ingredient_id: '',
    quantity: 1,
    purchase_unit: '',
    purchase_price: 0,
    unit: '',
    unit_cost: 0,
    total_cost: 0,
    expiry_date: null,
    batch_number: '',
    notes: ''
  })
}

const removeItem = (index) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
    updateTotal()
  }
}

// Wizard navigation - Computed properties for button states
const isStep1Valid = computed(() => {
  if (!form.value.supplier_id) return false

  // If using agreement, check if selected
  if (usePaymentAgreement.value) {
    return !!selectedAgreementId.value
  }

  // Otherwise check manual payment type
  if (!form.value.payment_type) return false

  // If credit, credit_days is required
  if (form.value.payment_type === 'credito' && !form.value.credit_days) {
    return false
  }

  return true
})

const isStep2Valid = computed(() => {
  if (form.value.items.length === 0) return false

  // For quotations, we only need ingredient, quantity, and unit (no prices)
  return form.value.items.every(item => {
    return item.ingredient_id &&
           item.quantity > 0 &&
           item.purchase_unit
  })
})

const validateStep1 = () => {
  if (!form.value.supplier_id) {
    alert('Por favor seleccione un proveedor')
    return false
  }

  if (usePaymentAgreement.value) {
    if (!selectedAgreementId.value) {
      alert('Por favor seleccione un acuerdo de pago')
      return false
    }
    return true
  }

  if (!form.value.payment_type) {
    alert('Por favor seleccione el tipo de pago')
    return false
  }
  if (form.value.payment_type === 'credito' && !form.value.credit_days) {
    alert('Por favor ingrese los días de crédito')
    return false
  }
  return true
}

const validateStep2 = () => {
  // Validate all items have required fields (quotations don't need prices yet)
  for (let i = 0; i < form.value.items.length; i++) {
    const item = form.value.items[i]
    if (!item.ingredient_id) {
      alert(`Por favor seleccione un ingrediente para el alimento #${i + 1}`)
      return false
    }
    if (!item.quantity || item.quantity <= 0) {
      alert(`Por favor ingrese una cantidad válida para el alimento #${i + 1}`)
      return false
    }
    if (!item.purchase_unit) {
      alert(`Por favor seleccione una unidad para el alimento #${i + 1}`)
      return false
    }
  }
  return true
}

const handleNext = (event) => {


  if (currentStep.value === 1) {
    if (validateStep1()) {

      currentStep.value = 2
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {

    }
  } else if (currentStep.value === 2) {
    if (validateStep2()) {

      currentStep.value = 3
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {

    }
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Handle form submission
const handleSubmit = async () => {
  try {
    isSubmitting.value = true

    // Convert items to base units for database (quotation without prices)
    const convertedItems = form.value.items.map(item => {
      const baseUnit = getIngredientUnit(item.ingredient_id)
      const factor = getConversionFactor(item.purchase_unit, baseUnit)
      const convertedQuantity = item.quantity * factor

      return {
        ingredient_id: item.ingredient_id,
        quantity: convertedQuantity,  // Base unit quantity (for inventory)
        unit: baseUnit,  // Base unit (for inventory)
        purchase_quantity: item.quantity,  // Original purchase quantity (for display)
        purchase_unit: item.purchase_unit,  // Original purchase unit (for display)
        unit_cost: null,  // Quotation: no prices yet
        total_cost: 0,    // Quotation: no totals yet
        expiry_date: item.expiry_date || null,
        batch_number: item.batch_number || null,
        notes: item.notes || null
      }
    })

    // Prepare payload
    const payload = {
      supplier_id: form.value.supplier_id,
      purchase_date: getCurrentDateTime(),
      delivery_date: form.value.delivery_date || null,
      status: 'quotation',
      invoice_number: form.value.invoice_number || null,
      tax_amount: 0,
      total_amount: 0,
      notes: form.value.notes || null,
      
      // Payment fields
      payment_type: usePaymentAgreement.value ? null : form.value.payment_type,
      payment_terms: usePaymentAgreement.value ? null : form.value.payment_terms,
      credit_days: usePaymentAgreement.value ? null : form.value.credit_days,
      requires_advance_payment: usePaymentAgreement.value ? false : form.value.requires_advance_payment,
      consolidation_group: form.value.consolidation_group || null,
      
      // Agreement field
      payment_agreement_id: usePaymentAgreement.value ? selectedAgreementId.value : null,

      items: convertedItems
    }

    console.log('Submitting purchase:', payload)

    const response = await $fetch('/api/suppliers/purchases', {
      method: 'POST',
      body: payload
    })

    if (response.data) {
      // Success
      navigateTo('/abastecimiento/compras')
    }
  } catch (error) {
    console.error('Error creating purchase:', error)
    // TODO: Show error notification
    alert(`Error al crear la cotización: ${error.response?._data?.detail || error.message || 'Por favor intente nuevamente.'}`)
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
