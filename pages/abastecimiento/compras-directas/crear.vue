<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Registrando compra directa..."
      hint="Estamos guardando la compra, actualizando inventario y adjuntando documentos."
      variant="glass"
      indicator="matrix"
    />

    <!-- Loading State -->
    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else>
      <!-- Order Information Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-3 sm:mb-5">
        <div class="p-3 sm:p-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            <!-- Purchase Number -->
            <div class="flex items-center gap-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-text-secondary">Número de compra</p>
                <p class="text-base font-semibold text-text-primary">{{ nextPurchaseNumber }}</p>
              </div>
            </div>

            <!-- Date -->
            <div class="flex items-center gap-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-text-secondary">Fecha de compra</p>
                <p class="text-base font-semibold text-text-primary">
                  {{ form.purchase_date ? fnsFormat(form.purchase_date, 'dd/MM/yy', { locale: es }) : 'Seleccionar fecha' }}
                </p>
              </div>
            </div>

            <!-- Status -->
            <div class="flex items-center gap-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-text-secondary">Estado</p>
                <div class="mt-0.5">
                  <UiStatusBadge value="Stock Inmediato" format="text" variant="success" size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
        <div class="xl:col-span-2 space-y-6">
          <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
            <UiFormSection title="Proveedor y fecha">
              <template #actions>
                <div>
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
                    :disabled="isScanning || isQuotaExceeded || isScanBlocked"
                    @click="scanFileInput?.click()"
                    class="px-2.5 py-2 sm:px-3 bg-primary/10 text-primary border-2 border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0 min-h-[44px]"
                    :aria-label="isScanBlocked ? 'Escaneo deshabilitado — suscripción inactiva' : isQuotaExceeded ? 'Escaneo deshabilitado — cuota agotada' : isScanning ? currentPhrase : 'Leer factura con IA'"
                    :title="isScanBlocked ? 'Suscripción inactiva — renueva tu plan para escanear' : isQuotaExceeded ? 'Cuota de escaneos agotada — actualiza tu plan' : undefined"
                  >
                    <svg v-if="!isScanning" class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <UiLoadingDots v-else size="9px" />
                    <span class="hidden sm:inline">{{ isScanning ? currentPhrase : 'Leer factura con IA' }}</span>
                    <span class="inline sm:hidden">{{ isScanning ? '...' : 'IA' }}</span>
                  </button>
                </div>
              </template>

            <UiScanUsageBar
              v-if="quota"
              :quota="quota"
              :warning-level="warningLevel"
              :scans-remaining="scansRemaining"
              class="mb-3 sm:mb-4"
            />

            <div
              v-if="isScanBlocked"
              role="alert"
              class="mb-3 sm:mb-4 p-3 rounded-lg border border-warning/30 bg-warning/10 text-sm"
            >
              <p class="font-medium text-warning">Escaneo IA suspendido por suscripción</p>
              <p class="text-text-secondary mt-1 text-xs leading-relaxed">
                {{ accessStatus?.message || 'Tu suscripción requiere atención.' }}
                La cuota de escaneos (p. ej. {{ quota?.scans_used ?? 0 }} / {{ quota?.scans_limit ?? 0 }}) es independiente: puedes tener escaneos disponibles y aun así estar bloqueado por pago pendiente.
              </p>
              <NuxtLink to="/gestion/billing" class="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary hover:underline">
                Ir a Mi plan
              </NuxtLink>
            </div>

            <p class="text-xs text-text-secondary mb-3 sm:mb-4">
              Sube una <strong>foto o imagen</strong> de la factura de compra (OCR). No importa archivos XML/ZIP de factura electrónica DIAN.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">Proveedor *</label>
                <UiSearchableSelect
                  v-model="form.supplier_id"
                  :options="supplierOptions"
                  placeholder="Buscar proveedor..."
                  required
                  :class="supplierError ? 'ring-2 ring-destructive rounded-lg' : ''"
                  @update:model-value="onSupplierChange; supplierError = ''"
                />
                <p v-if="supplierError" role="alert" class="text-xs text-destructive mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                  {{ supplierError }}
                </p>
                <div v-if="supplierScanStatus === 'matched'" class="mt-2 flex items-center gap-1.5 text-xs text-success bg-success/10 border border-success/20 px-2.5 py-1.5 rounded-lg">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <span>Proveedor detectado: <strong>{{ similarSupplier?.name }}</strong></span>
                </div>
                <p class="text-xs text-text-secondary mt-2">
                  Si no encuentras el proveedor, <NuxtLink to="/abastecimiento/proveedores" class="text-primary hover:underline">crealo primero aqui</NuxtLink>
                </p>
                <div v-if="supplierScanStatus === 'similar'" class="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm">
                  <p class="font-medium text-warning mb-1">¿Es este tu proveedor?</p>
                  <p class="text-text-secondary mb-3">Encontramos "<strong>{{ similarSupplier?.name }}</strong>", similar a "<em>{{ ocrSupplierName }}</em>" en la factura.</p>
                  <div class="flex gap-2">
                    <button type="button" @click="selectSimilarSupplier" class="px-3 py-1.5 bg-action-warning-bg text-action-warning-text rounded-lg text-xs font-medium hover:bg-action-warning-hover-bg transition-colors">
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
                    class="px-3 py-1.5 bg-action-primary-bg text-action-primary-text rounded-lg text-xs font-medium hover:bg-action-primary-hover-bg disabled:opacity-50 transition-colors"
                  >
                    {{ isCreatingSupplier ? 'Creando...' : `+ Crear "${ocrSupplierName}"` }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Tipo de pago
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
                    :max-date="maxPurchaseDate"
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
                  Notas generales
                </label>
                <textarea
                  v-model="form.notes"
                  class="input-base w-full px-4 py-2"
                  rows="3"
                  placeholder="Observaciones adicionales sobre la compra..."
                ></textarea>
              </div>
            </div>

            </UiFormSection>

            <UiFormSection title="Ítems">
              <template #actions>
                <button
                  type="button"
                  @click="addItem"
                  class="px-4 py-2 bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg transition-colors text-sm min-h-[44px]"
                >
                  + Agregar ítem
                </button>
              </template>
            <!-- OCR banner -->
            <div v-if="ocrItemsLoaded" class="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-2 text-sm text-primary">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="font-medium">Items cargados. La IA puede cometer errores, por favor verifica todos los datos.</span>
            </div>

            <p class="text-xs text-text-tertiary mb-2 leading-relaxed">
              En cada línea elige el tipo (alimento, servicio o insumo) y vincula el ítem de bodega.
            </p>

          <MenuCatalogInlineCreateBusyOverlay
            :busy="inlineCatalogBusy"
            :label="inlineCatalogBusyLabel"
            :hint="inlineCatalogBusyHint"
          >
             <!-- AI Loading Overlay -->
            <div v-if="isScanning" class="w-full py-4 flex flex-col items-center justify-center gap-2 bg-surface rounded-lg border border-dashed border-border">
              <UiLoadingDots size="9px" />
              <p class="text-xs font-medium text-text-secondary animate-pulse">{{ currentPhrase }}</p>
            </div>

            <!-- Items List -->
            <div v-else class="space-y-2">
              <div
                v-for="(item, index) in form.items"
                :key="index"
                class="border-2 border-border rounded-lg p-3 bg-background relative z-10"
              >
                <div class="flex justify-between items-center gap-2 mb-2 flex-wrap">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex-shrink-0">{{ index + 1 }}</span>
                    <label :for="`item-type-${index}`" class="sr-only">Tipo de ítem</label>
                    <select
                      :id="`item-type-${index}`"
                      v-model="item.item_type"
                      class="input-base text-xs py-1.5 pl-2 pr-7 max-w-[11rem] h-[30px]"
                      @change="onLineTypeChange(index)"
                    >
                      <option
                        v-for="typeOption in ingredientTypeOptions"
                        :key="typeOption.value"
                        :value="typeOption.value"
                      >
                        {{ typeOption.label }}
                      </option>
                    </select>
                  </div>
                  <button
                    type="button"
                    @click="removeItem(index)"
                    :disabled="form.items.length === 1"
                    class="text-destructive hover:text-destructive/80 hover:bg-destructive/10 disabled:opacity-30 p-1.5 rounded-md transition-colors"
                    aria-label="Eliminar item"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div class="sm:col-span-12 lg:col-span-4 relative z-10">
                    <label class="block text-xs font-medium text-text-primary mb-1">
                      {{ WAREHOUSE_COPY.purchaseItemLineRequired }}
                    </label>
                    <UiIngredientSearchInput
                      :key="`${index}-${normalizeItemType(item.item_type)}`"
                      :initial-value="item.searchTerm ?? ''"
                      :allow-create="true"
                      :type="normalizeItemType(item.item_type)"
                      :placeholder="WAREHOUSE_COPY.purchaseSearchPlaceholder"
                      @select="(ing) => selectIngredient(ing, index)"
                      @create="(name) => openCreateModal(index, name)"
                    />
                    <div v-if="item.ocr_description" class="mt-1 flex items-center gap-1 flex-wrap">
                      <p class="text-xs leading-tight flex items-center gap-1" :class="item.ingredient_id ? 'text-success' : 'text-warning'">
                        <svg class="w-3 h-3 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path v-if="item.ingredient_id" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="truncate">Fac: "{{ item.ocr_description }}"</span>
                      </p>
                      <button
                        v-if="!item.ingredient_id"
                        type="button"
                        @click="openCreateModal(index, item.searchTerm || item.ocr_description)"
                        class="text-xs text-primary hover:underline font-medium whitespace-nowrap flex-shrink-0 min-h-[28px] flex items-center"
                      >
                        {{ WAREHOUSE_COPY.createWarehouseItem }}
                      </button>
                    </div>
                  </div>

                  <div class="sm:col-span-12 lg:col-span-8 flex flex-col gap-2">
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs font-medium text-text-primary mb-1">Cant. *</label>
                        <UiDecimalInput
                          v-model="item.purchase_quantity"
                          :min="0.000001"
                          :precision="QUANTITY_PRECISION"
                          required
                          class="input-base w-full px-2 py-1.5 text-sm"
                          @update:model-value="() => onQuantityChange(index)"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-text-primary mb-1 whitespace-nowrap">
                          P. Unit *
                          <span
                            v-if="item.suggested_price"
                            class="text-[10px] text-success cursor-pointer ml-0.5"
                            @click="item.unit_cost = item.suggested_price; onUnitCostChange(index)"
                            title="Usar precio sugerido"
                          >
                            (Sug: {{ formatUnitCost(item.suggested_price) }})
                          </span>
                        </label>
                        <div class="relative">
                          <span class="absolute left-2 top-1.5 text-text-secondary text-xs">$</span>
                          <UiDecimalInput
                            v-model="item.unit_cost"
                            :min="0"
                            :precision="UNIT_COST_PRECISION"
                            required
                            class="input-base w-full pl-5 pr-2 py-1.5 text-sm"
                            @update:model-value="() => onUnitCostChange(index)"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label class="block text-xs font-medium text-text-primary mb-1">Total *</label>
                        <div class="relative">
                          <span class="absolute left-2 top-1.5 text-text-secondary text-xs">$</span>
                          <UiDecimalInput
                            v-model="item.total_cost"
                            :min="0"
                            :precision="MONEY_PRECISION"
                            required
                            class="input-base w-full pl-5 pr-2 py-1.5 text-sm"
                            @update:model-value="() => onTotalCostChange(index)"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    <div class="w-full">
                      <label class="text-xs font-medium text-text-primary mb-1 block">Unidad *</label>
                      <div class="flex items-start gap-2">
                        <div class="flex-1 min-w-[120px]">
                          <div class="relative">
                            <select
                              v-model="item.purchase_unit"
                              required
                              :disabled="!item.ingredient_id || loadingUnitsFor.has(item.ingredient_id)"
                              class="input-base w-full pr-2 py-1.5 text-sm h-[34px]"
                              :class="[
                                { 'bg-surface-secondary cursor-not-allowed': !item.ingredient_id || loadingUnitsFor.has(item.ingredient_id) },
                                loadingUnitsFor.has(item.ingredient_id) ? 'pl-7' : 'pl-2'
                              ]"
                              @change="() => onUnitChange(index)"
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
                            <span v-if="loadingUnitsFor.has(item.ingredient_id)" class="absolute left-2 top-2.5 pointer-events-none text-text-secondary">
                              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                              </svg>
                            </span>
                          </div>
                          <p v-if="item.ingredient_id && item.purchase_unit" class="text-[10px] text-text-secondary mt-0.5">
                            = {{ getConvertedQuantity(index) }} {{ getIngredientUnit(item.ingredient_id) }}
                          </p>
                        </div>
                        <div
                          v-if="item.ingredient_id && getPurchaseUnitOptions(item.ingredient_id).length === 0"
                          class="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-state-warning-bg border border-state-warning-border text-xs text-state-warning-text flex-1"
                        >
                          <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                          </svg>
                          <span>Sin unidades de compra. <a :href="`/abastecimiento/ingredientes-propios?highlight=${item.ingredient_id}`" class="underline font-medium">{{ WAREHOUSE_COPY.purchaseUnitsPanelHint }}</a></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
          </MenuCatalogInlineCreateBusyOverlay>
            </UiFormSection>

            <UiFormSection
              title="Documentos"
              description="Opcional — puedes agregar la factura y comprobante ahora o después"
            >
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Factura Section -->
              <div class="border-2 border-border rounded-lg p-4 bg-background space-y-4">
                <h4 class="text-base font-semibold text-text-primary flex items-center gap-2">
                  <DocumentTextIcon class="w-5 h-5 text-primary flex-shrink-0" />
                  Factura
                </h4>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1.5">Número de factura</label>
                  <input
                    v-model="form.invoice_number"
                    type="text"
                    class="input-base w-full px-4 py-2"
                    placeholder="Ej: FV-12345"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1.5">Adjuntar Factura</label>
                  <PurchasesAttachmentUploader v-model="form.invoice_files" embedded />
                </div>
              </div>

              <!-- Comprobante de Pago Section -->
              <div class="border-2 border-border rounded-lg p-4 bg-background space-y-4">
                <h4 class="text-base font-semibold text-text-primary flex items-center gap-2">
                  <CreditCardIcon class="w-5 h-5 text-primary flex-shrink-0" />
                  Comprobante de Pago
                </h4>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1.5">Método de pago</label>
                  <select v-model="paymentSelectValue" class="input-base w-full px-4 py-2">
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

                <div v-if="hasPaymentSelected">
                  <label class="block text-sm font-medium text-text-primary mb-1.5">Referencia de pago</label>
                  <input
                    v-model="form.payment_reference"
                    type="text"
                    class="input-base w-full px-4 py-2"
                    placeholder="Numero de transferencia, etc."
                  />
                </div>

                <div v-if="hasPaymentSelected">
                  <label class="block text-sm font-medium text-text-primary mb-1.5">Adjuntar Comprobante</label>
                  <PurchasesAttachmentUploader v-model="form.payment_files" embedded />
                </div>
              </div>
            </div>

            </UiFormSection>
          </div>
        </div>

        <div class="xl:col-span-1">
            <!-- ── Columna derecha: panel sticky (primero en mobile) ── -->
            <div class="w-full xl:sticky xl:top-6 ">
              <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
              <div class="p-4 border-b border-border">
                <h3 class="text-lg font-semibold text-text-primary">Resumen</h3>
              </div>

                <!-- Proveedor + pago -->
                <div class="p-4 space-y-3">
                  <div class="flex justify-between items-start">
                    <p class="text-xs font-medium text-text-secondary">Proveedor</p>
                    <p class="text-sm font-semibold text-text-primary text-right max-w-[60%] leading-tight">{{ getSupplierName(form.supplier_id) }}</p>
                  </div>
                  <div class="flex justify-between items-center">
                    <p class="text-xs font-medium text-text-secondary">Fecha</p>
                    <p class="text-xs font-semibold text-text-primary">
                      {{ form.purchase_date ? fnsFormat(form.purchase_date, 'dd/MM/yy', { locale: es }) : '-' }}
                    </p>
                  </div>
                  <div class="flex justify-between items-center">
                    <p class="text-xs font-medium text-text-secondary">Pago</p>
                    <p class="text-xs font-semibold text-text-primary">{{ getPaymentTypeText(form.payment_type) }}</p>
                  </div>
                  <div v-if="hasPaymentSelected" class="flex justify-between items-center">
                    <p class="text-xs font-medium text-text-secondary">Método</p>
                    <p class="text-xs font-semibold text-text-primary">{{ resolvePaymentLabel(form.payment_method, form.payment_method_id) }}</p>
                  </div>
                </div>

                <!-- Documentos -->
                <div v-if="form.invoice_number || form.invoice_files.length || form.payment_files.length" class="p-4 space-y-2">
                  <p class="text-xs font-semibold text-text-secondary mb-2">Documentos</p>
                  <div v-if="form.invoice_number" class="flex items-center gap-2 text-xs">
                    <svg class="w-3.5 h-3.5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="text-text-primary font-medium">{{ form.invoice_number }}</span>
                    <span v-if="form.invoice_files.length" class="text-success">· {{ form.invoice_files.length }} adjunto(s)</span>
                  </div>
                  <div v-if="form.payment_reference" class="flex items-center gap-2 text-xs">
                    <svg class="w-3.5 h-3.5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                    <span class="text-text-primary font-medium">Ref: {{ form.payment_reference }}</span>
                    <span v-if="form.payment_files.length" class="text-success">· Comprobante</span>
                  </div>
                  <div v-if="form.notes" class="flex items-start gap-2 text-xs">
                    <span class="text-text-secondary flex-shrink-0">Nota:</span>
                    <span class="text-text-primary">{{ form.notes }}</span>
                  </div>
                </div>

                <!-- Total -->
                <div class="p-4 bg-primary/5">
                  <div class="flex justify-between items-center mb-1.5">
                    <p class="text-xs text-text-secondary">Subtotal ({{ form.items.length }} ítems)</p>
                    <p class="text-sm text-text-primary">${{ formatPrice(totalAmount) }}</p>
                  </div>
                  <div class="flex justify-between items-center pt-2 border-t border-primary/20">
                    <p class="text-sm font-bold text-text-primary">Total</p>
                    <p class="text-xl font-bold text-primary">${{ formatPrice(totalAmount) }}</p>
                  </div>
                </div>

                <!-- Aviso stock + CTA -->
                <div class="p-4 space-y-3">
                  <div class="flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg px-3 py-2">
                    <CheckCircleIcon class="w-4 h-4 flex-shrink-0" />
                    <span>El stock se actualizará al instante</span>
                  </div>
                  <p v-if="submitError" role="alert" class="text-sm text-destructive flex items-center gap-1">
                    <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    {{ submitError }}
                  </p>
                  <button
                    type="submit"
                    :disabled="isSubmitting"
                    class="w-full min-h-[48px] rounded-lg font-semibold text-base bg-action-success-bg text-action-success-text hover:bg-action-success-hover-bg active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <svg v-if="!isSubmitting" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <UiLoadingDots v-else size="9px" class="opacity-80" />
                    <span>{{ isSubmitting ? 'Guardando...' : 'Registrar compra' }}</span>
                  </button>
                  <NuxtLink
                    to="/abastecimiento/compras-directas"
                    class="w-full min-h-[44px] rounded-lg text-sm font-medium text-text-secondary border border-border hover:text-text-primary hover:bg-surface-secondary active:scale-[0.99] transition-all flex items-center justify-center"
                  >
                    Cancelar
                  </NuxtLink>
                </div>
              </div>
            </div>


        </div>
      </form>
    </div>
  </div>

  <!-- Quota exceeded modal -->
  <div
    v-if="showQuotaModal"
    class="fixed inset-0 bg-overlay-backdrop/50 flex items-center justify-center z-50 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="quota-modal-title"
    @click.self="showQuotaModal = false"
  >
    <div class="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-destructive" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div>
          <h3 id="quota-modal-title" class="text-base font-semibold text-text-primary">
            Cuota de escaneos agotada
          </h3>
          <p class="mt-1 text-sm text-text-secondary leading-relaxed">
            Usaste
            <strong class="text-text-primary">{{ quotaExceededData?.used?.toLocaleString('es-CO') }}</strong>
            de
            <strong class="text-text-primary">{{ quotaExceededData?.limit?.toLocaleString('es-CO') }}</strong>
            escaneos este período.
            <span v-if="quotaExceededData?.periodEnd">
              Tu cuota se renueva el {{ formatQuotaDate(quotaExceededData.periodEnd) }}.
            </span>
          </p>
        </div>
      </div>
      <div class="flex flex-col gap-2 pt-1">
        <NuxtLink
          to="/gestion/billing"
          class="btn-primary px-4 py-3 rounded-xl text-sm font-semibold text-center min-h-[44px] flex items-center justify-center"
          @click="showQuotaModal = false"
        >
          Actualizar plan
        </NuxtLink>
        <button
          type="button"
          @click="showQuotaModal = false"
          class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors min-h-[44px]"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>

  <!-- Create Ingredient Panel -->
  <MenuInlineCatalogCreateShell
    ref="inlineCreateShell"
    v-model:busy="inlineCatalogBusy"
    v-model:busy-label="inlineCatalogBusyLabel"
    v-model:busy-hint="inlineCatalogBusyHint"
    context="purchase"
    :initial-type="inlineCreateInitialType"
    :on-ingredient-saved="onIngredientCreated"
    :on-product-saved="onProductCreated"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TrashIcon, DocumentTextIcon, CreditCardIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import { useBilling } from '@/composables/useBilling'
import { WAREHOUSE_COPY } from '~/constants/warehouseCopy'
import { useScanQuotaQuery } from '~/composables/queries/useScanQuota'
import { usePaymentLabel } from '~/composables/usePaymentLabel'
import { usePaymentSelectValue } from '~/composables/usePaymentSelectValue'
import { mergePosPaymentGroupsFromApi } from '~/utils/paymentDefaults'
import { useInlineCatalogProductLink } from '@/composables/useInlineCatalogProductLink'

const { todayISO, dateAtNoon, isoFromDate, timeHHMMFromISO, combineDateAndTimeISO } = useTenantTimezone()

const formatPurchaseDate = (date: Date) => fnsFormat(date, 'dd/MM/yy', { locale: es })
const tenantNowISO = () => combineDateAndTimeISO(todayISO(), timeHHMMFromISO(new Date().toISOString())) ?? new Date().toISOString()
const purchaseDatePayloadISO = (date: Date) => dateAtNoon(isoFromDate(date)).toISOString()
const maxPurchaseDate = computed(() => dateAtNoon(todayISO()))

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
  searchTerm?: string // OCR-seeded value passed to UiIngredientSearchInput as :initial-value
}

interface NewUnitForm {
  show: boolean
  label: string      // nombre de la presentación ej: "Bloque x100 tajadas"
  factor: number     // cuántas unidades base contiene
  saving: boolean
}

// State
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const supplierError = ref('')
const supplierCatalog = ref<any[]>([])
const newUnitForms = ref<Record<number, NewUnitForm>>({})

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
  purchase_date: dateAtNoon(todayISO()) as Date | null,
  notes: '',
  invoice_number: '',
  invoice_files: [] as File[],
  payment_method: '',
  payment_method_id: null as string | null,
  payment_reference: '',
  payment_files: [] as File[],
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
  }
}

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

// Cache of ingredient details keyed by ingredient_id (populated on select + OCR match)
const ingredientCache = ref<Record<string, { id: string, name: string, unit: string, unit_weight_gr?: number | null, unit_weight_unit?: string | null, type?: string }>>({})

const cacheIngredient = (ing: any) => {
  if (ing?.id) {
    ingredientCache.value[ing.id] = {
      id: ing.id,
      name: ing.name,
      unit: ing.unit,
      unit_weight_gr: ing.unit_weight_gr ?? null,
      unit_weight_unit: ing.unit_weight_unit ?? null,
      type: ing.type
    }
  }
}

// Opciones de tipo por línea
const ingredientTypeOptions = [
  { value: 'food', label: 'Alimentos' },
  { value: 'service', label: 'Servicios' },
  { value: 'supply', label: 'Insumos' },
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

// Per-ingredient purchase units cache (fetched on demand)
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
const loadingUnitsFor = ref<Set<string>>(new Set())

const {
  isDualUnitIngredient,
  buildDualUnitCatalogOptionsWithMeta,
} = useIngredientUnitOptions()

// Loading state
const isLoadingData = computed(() => loadingSuppliers.value)

// Computed
const totalAmount = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (item.total_cost || 0), 0)
})

function validateForm(): boolean {
  submitError.value = null
  supplierError.value = ''

  if (!form.value.supplier_id) {
    supplierError.value = 'Selecciona un proveedor.'
    submitError.value = 'Completa la sección Proveedor y fecha.'
    return false
  }

  if (form.value.items.length === 0) {
    submitError.value = 'Agrega al menos un ítem a la compra.'
    return false
  }

  form.value.items.forEach(normalizeItemCosts)

  const invalidItem = form.value.items.find(item =>
    !item.ingredient_id ||
    item.purchase_quantity <= 0 ||
    !item.purchase_unit ||
    item.unit_cost < 0 ||
    (item.unit_cost === 0 && (item.total_cost || 0) <= 0)
  )
  if (invalidItem) {
    submitError.value = WAREHOUSE_COPY.purchaseCompleteItemsError
    return false
  }

  return true
}

// Methods
const formatPrice = (price: number) => {
  if (!price) return '0'
  return price.toLocaleString('es-CO', { minimumFractionDigits: 0 })
}

const MONEY_PRECISION = 0
const UNIT_COST_PRECISION = 6
const QUANTITY_PRECISION = 6
const CONVERTED_QUANTITY_PRECISION = 6

const roundMoney = (value: number) => roundDecimal(value, MONEY_PRECISION)
const roundUnitCost = (value: number) => roundDecimal(value, UNIT_COST_PRECISION)

const formatUnitCost = (price: number) => {
  if (!price) return '0'
  return price.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: UNIT_COST_PRECISION,
  })
}

function roundDecimal(value: number, precision: number) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** precision
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function formatQuantity(value: number) {
  if (!Number.isFinite(value)) return '0'
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: CONVERTED_QUANTITY_PRECISION,
  })
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
  return supplier?.name || '—'
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



const getPurchaseUnitOptions = (ingredientId: string) => {
  if (!ingredientId) return []

  const ingredient = ingredientCache.value[ingredientId]
  const baseUnit = ingredient?.unit || ''

  const units = purchaseUnitsCache.value.get(ingredientId) || []
  const pendingUnits = localPurchaseUnits.value.filter(u => u.ingredient_id === ingredientId)

  // Always include the base unit as first option
  const options: { value: string; label: string; conversion_factor: number; is_default: boolean; unit_cost?: number }[] = []
  if (ingredient) {
    options.push({ value: baseUnit, label: baseUnit, conversion_factor: 1, is_default: units.length === 0 && pendingUnits.length === 0 })
  }

  const weightUnit = ingredient?.unit_weight_unit as string | undefined
  if (isDualUnitIngredient(ingredient) && weightUnit) {
    options.push({ value: weightUnit, label: weightUnit, conversion_factor: 1, is_default: false })
    buildDualUnitCatalogOptionsWithMeta(weightUnit).forEach((entry) => {
      options.push({
        value: entry.value,
        label: entry.label,
        conversion_factor: entry.conversion_factor,
        is_default: false,
      })
    })
  }

  const serverOptions = units.map((u: any) => ({
    value: u.purchase_unit_label,
    label: u.conversion_factor && u.conversion_factor !== 1
      ? `${u.purchase_unit_label} · ${Number(u.conversion_factor).toLocaleString('es-CO')} ${baseUnit}`
      : u.purchase_unit_label,
    conversion_factor: u.conversion_factor,
    is_default: u.is_default,
    unit_cost: u.unit_cost
  }))

  const localOptions = pendingUnits.map(u => ({
    value: u.purchase_unit_label,
    label: u.conversion_factor !== 1
      ? `${u.purchase_unit_label} · ${Number(u.conversion_factor).toLocaleString('es-CO')} ${baseUnit}`
      : u.purchase_unit_label,
    conversion_factor: u.conversion_factor,
    is_default: false,
    unit_cost: undefined
  }))

  return [...options, ...serverOptions, ...localOptions]
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


// Obtener el factor de conversión para una unidad de compra
const getConversionFactor = (purchaseUnitLabel: string, ingredientId: string) => {
  // Buscar en unidades locales pendientes primero
  const localUnit = localPurchaseUnits.value.find(u =>
    u.ingredient_id === ingredientId &&
    u.purchase_unit_label === purchaseUnitLabel
  )
  if (localUnit) return localUnit.conversion_factor

  // Buscar en unidades configuradas del servidor
  const unit = (purchaseUnitsCache.value.get(ingredientId) || []).find((u: any) =>
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

  return formatQuantity(converted)
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

const onIngredientChange = async (index: number) => {
  const item = form.value.items[index]
  const ingredient = ingredientCache.value[item.ingredient_id]
  if (!ingredient) return

  // Fetch purchase units for this ingredient if not cached
  if (!purchaseUnitsCache.value.has(item.ingredient_id)) {
    loadingUnitsFor.value = new Set([...loadingUnitsFor.value, item.ingredient_id])
    try {
      const res = await $fetch<any>(`/api/suppliers/ingredient-purchase-units/ingredient/${item.ingredient_id}`)
      const updated = new Map(purchaseUnitsCache.value)
      updated.set(item.ingredient_id, res.data || [])
      purchaseUnitsCache.value = updated
    } catch {
      const updated = new Map(purchaseUnitsCache.value)
      updated.set(item.ingredient_id, [])
      purchaseUnitsCache.value = updated
    } finally {
      const next = new Set(loadingUnitsFor.value)
      next.delete(item.ingredient_id)
      loadingUnitsFor.value = next
    }
  }

  // Set default unit
  const units = getPurchaseUnitOptions(item.ingredient_id)
  const defaultUnit = units.find((u: any) => u.is_default) || units[0]
  if (defaultUnit) item.purchase_unit = defaultUnit.value

  updateSuggestedPrice(index)
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

const onUnitCostChange = (index: number) => {
  const item = form.value.items[index]
  const qty = Number(item.purchase_quantity) || 0
  const unit = Number(item.unit_cost) || 0
  if (qty > 0) {
    item.total_cost = roundMoney(qty * unit)
  }
}

const onTotalCostChange = (index: number) => {
  const item = form.value.items[index]
  const qty = Number(item.purchase_quantity) || 0
  const total = Number(item.total_cost) || 0
  if (qty > 0) {
    item.unit_cost = roundUnitCost(total / qty)
  }
}

const onQuantityChange = (index: number) => {
  const item = form.value.items[index]
  const qty = Number(item.purchase_quantity) || 0
  if (qty <= 0) return
  const unit = Number(item.unit_cost) || 0
  const total = Number(item.total_cost) || 0
  if (unit > 0) {
    item.total_cost = roundMoney(qty * unit)
  } else if (total > 0) {
    item.unit_cost = roundUnitCost(total / qty)
  }
}

/** @deprecated use onUnitCostChange — kept for callers that only recalc total from unit */
const updateItemTotal = onUnitCostChange

function normalizeItemCosts(item: PurchaseItem) {
  const qty = Number(item.purchase_quantity) || 0
  if (qty <= 0) return
  const unit = Number(item.unit_cost) || 0
  const total = Number(item.total_cost) || 0
  if (unit > 0 && total <= 0) {
    item.total_cost = roundMoney(qty * unit)
  } else if (total > 0 && unit <= 0) {
    item.unit_cost = roundUnitCost(total / qty)
  } else if (unit > 0 && total > 0) {
    // OCR may send both; prefer line total when they disagree slightly
    const expected = qty * unit
    if (Math.abs(expected - total) > 0.02) {
      item.unit_cost = roundUnitCost(total / qty)
    }
  }
}

const addItem = () => {
  form.value.items.push(createEmptyItem('food'))
}

const removeItem = (index: number) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

// --- Scan quota ---
const { quota, isQuotaExceeded, warningLevel, scansRemaining, refetch: refetchQuota } = useScanQuotaQuery()

// --- Access status — blocks scan when subscription is read_only or blocked ---
const { accessStatus } = useBilling()
const isScanBlocked = computed(() =>
  ['read_only', 'blocked'].includes(accessStatus.value?.level ?? '')
)

// Quota exceeded modal
const showQuotaModal = ref(false)
const quotaExceededData = ref<{ used: number; limit: number; periodEnd: string } | null>(null)

function formatQuotaDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long' }).format(date)
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

const selectIngredient = (ingredient: any, index: number) => {
  const item = form.value.items[index]
  item.ingredient_id = ingredient.id
  if (ingredient.type) item.item_type = ingredient.type
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
      body: formData,
      timeout: 240_000, // 4 min — Gemini OCR; was timing out at ~120s
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
        // Cache all matched ingredients returned by the backend to avoid N+1 fetches
        data.items.forEach((ocrItem: any) => {
          if (ocrItem.matched_ingredient) {
            cacheIngredient(ocrItem.matched_ingredient)
          }
        })

        form.value.items = data.items.map((ocrItem: any) => {
          const matched = ocrItem.matched_ingredient
          const matchedId = matched?.id || ocrItem.detected_ingredient_id || ''
          const ingredientName = matched?.name || ocrItem.detected_ingredient || ocrItem.descripcion || ''

          const item: PurchaseItem = {
            ingredient_id: matchedId,
            searchTerm: ingredientName,
            purchase_quantity: ocrItem.cantidad || 1,
            purchase_unit: '',
            unit_cost: ocrItem.precio_unitario || 0,
            total_cost: ocrItem.total || 0,
            notes: '',
            suggested_price: null,
            item_type: inferItemTypeFromOcrLine(ocrItem, matched),
            ocr_description: ocrItem.descripcion || ''
          }
          normalizeItemCosts(item)
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
      form.value.invoice_files = [optimizedFile]
    }
  } catch (e) {
    const err = e as { data?: { detail?: { error?: string; scans_used?: number; scans_limit?: number; period_end?: string } }; status?: number }
    if (err?.data?.detail?.error === 'scan_quota_exceeded') {
      quotaExceededData.value = {
        used: err.data.detail.scans_used ?? 0,
        limit: err.data.detail.scans_limit ?? 0,
        periodEnd: err.data.detail.period_end ?? '',
      }
      showQuotaModal.value = true
      await refetchQuota()
      return
    }
    if (err?.status === 504) {
      alert('La lectura de factura tomó demasiado tiempo (timeout). Por favor intenta de nuevo con una imagen más clara o ingresa los datos manualmente.')
    }
    console.error('OCR scan error:', e)
  } finally {
    const elapsed = Date.now() - startTime
    if (elapsed < 2500) {
      await new Promise(resolve => setTimeout(resolve, 2500 - elapsed))
    }
    isScanning.value = false
    stopPhraseRotation()
    refetchQuota()
  }
}

// --- Create Ingredient Modal ---
const inlineCreateShell = ref<{ openFromSearch: (name: string) => void } | null>(null)
const createModalItemIndex = ref(-1)
const inlineCatalogBusy = ref(false)
const inlineCatalogBusyLabel = ref('')
const inlineCatalogBusyHint = ref('')

function normalizeItemType(type: unknown): 'food' | 'supply' | 'service' {
  if (type === 'supply' || type === 'service') return type
  return 'food'
}

function onLineTypeChange(index: number) {
  const item = form.value.items[index]
  if (!item) return
  item.item_type = normalizeItemType(item.item_type)
  if (!item.ingredient_id) return
  const cached = ingredientCache.value[item.ingredient_id]
  const cachedType = cached?.type ? normalizeItemType(cached.type) : null
  if (cachedType && cachedType !== item.item_type) {
    item.ingredient_id = ''
    item.searchTerm = ''
    item.purchase_unit = ''
    item.suggested_price = null
    item.unit_cost = 0
    updateItemTotal(index)
  }
}

/** OCR/Gemini no devuelve item_type; usamos catálogo o heurística sobre la descripción. */
function inferItemTypeFromOcrLine(
  ocrItem: { descripcion?: string; detected_ingredient?: string },
  matched?: { type?: string } | null,
): 'food' | 'supply' | 'service' {
  if (matched?.type === 'supply' || matched?.type === 'service' || matched?.type === 'food') {
    return normalizeItemType(matched.type)
  }
  const text = `${ocrItem.descripcion || ''} ${ocrItem.detected_ingredient || ''}`.toLowerCase()
  if (/(servicio|mano de obra|transporte|flete|aseo|n[oó]mina|mensajer[ií]a)/i.test(text)) return 'service'
  if (/(icopor|bolsa|envase|detergente|guante|caja|servilleta|insumo|empaque|descartable)/i.test(text)) return 'supply'
  return 'food'
}

const inlineCreateInitialType = computed(() => {
  const index = createModalItemIndex.value
  if (index < 0 || index >= form.value.items.length) return 'food'
  return normalizeItemType(form.value.items[index].item_type)
})

function openCreateModal(index: number, name: string) {
  createModalItemIndex.value = index
  inlineCreateShell.value?.openFromSearch(name || '')
}

const { linkCreatedProductToRow } = useInlineCatalogProductLink()

async function onIngredientCreated(ingredient: any) {
  const index = createModalItemIndex.value
  if (index < 0 || index >= form.value.items.length) return
  const item = form.value.items[index]
  ingredientCache.value[ingredient.id] = ingredient
  item.ingredient_id = ingredient.id
  item.searchTerm = ingredient.name ?? item.searchTerm
  if (ingredient.type) item.item_type = normalizeItemType(ingredient.type)
  const updated = new Map(purchaseUnitsCache.value)
  updated.delete(ingredient.id)
  purchaseUnitsCache.value = updated
  await onIngredientChange(index)
}

async function onProductCreated(product: Record<string, unknown>) {
  const index = createModalItemIndex.value
  if (index < 0 || index >= form.value.items.length) return
  await linkCreatedProductToRow(product, async (ingredient) => {
    await onIngredientCreated(ingredient)
  })
}

// Submit
const handleSubmit = async () => {
  if (!validateForm()) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  submitError.value = null

  isSubmitting.value = true

  try {
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

    if (form.value.purchase_date) payload.purchase_date = purchaseDatePayloadISO(form.value.purchase_date)
    if (form.value.notes) payload.notes = form.value.notes
    if (form.value.invoice_number) payload.invoice_number = form.value.invoice_number
    if (form.value.payment_method) {
      payload.payment_method = form.value.payment_method
      if (form.value.payment_method_id) {
        payload.payment_method_id = form.value.payment_method_id
      }
      payload.payment_amount = totalAmount.value
      payload.payment_date = tenantNowISO()
    }
    if (form.value.payment_reference) payload.payment_reference = form.value.payment_reference

    const response = await $fetch('/api/suppliers/purchases/direct', {
      method: 'POST',
      body: payload
    })

    if (response.success) {
      // Upload files if present
      if ((form.value.invoice_files.length > 0 || form.value.payment_files.length > 0) && response.data?.id) {
        try {
          const formData = new FormData()
          form.value.invoice_files.forEach((file) => formData.append('invoice_files', file))
          form.value.payment_files.forEach((file) => formData.append('payment_files', file))

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
