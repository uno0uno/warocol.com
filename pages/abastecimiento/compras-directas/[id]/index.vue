<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSaving || isUploading"
      :label="isSaving ? 'Guardando cambios...' : 'Subiendo archivo...'"
      :hint="isSaving ? 'Estamos actualizando la compra directa.' : 'Estamos subiendo el archivo y asociandolo a la compra.'"
      variant="glass"
      indicator="matrix"
    />

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else-if="purchase" class="space-y-4 sm:space-y-6">
      <!-- Header Cards -->
      <PurchasesPurchaseOrderHeader :columns="4">
        <!-- Purchase Number with Date -->
        <PurchasesPurchaseInfoCard
          :label="formatDate(purchase.purchase_date)"
          icon-path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        >
          <div class="flex items-center gap-2">
            <p class="text-lg font-semibold text-text-primary">{{ purchase.purchase_number }}</p>
            <button @click="copyPurchaseLink"
              class="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded-md text-primary transition-colors"
              title="Copiar enlace">
              <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
          </div>
        </PurchasesPurchaseInfoCard>

        <!-- Supplier -->
        <PurchasesPurchaseInfoCard
          label="Proveedor"
          icon-path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        >
          <p class="text-lg font-semibold text-text-primary">{{ purchase.supplier_name || 'Sin proveedor' }}</p>
          <p v-if="purchase.supplier_tax_id" class="text-xs text-text-secondary">NIT: {{ purchase.supplier_tax_id }}</p>
        </PurchasesPurchaseInfoCard>

        <!-- Status Badge -->
        <PurchasesPurchaseInfoCard
          label="Estado Actual"
          icon-path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        >
          <UiStatusBadge
            :value="isEditMode ? 'Editando' : getStatusText(purchase.status)"
            format="text"
            :class="isEditMode ? 'bg-yellow-100 text-yellow-800 border-0' : ['border-0', getStatusClass(purchase.status)]"
          />
        </PurchasesPurchaseInfoCard>

        <!-- Payment Method -->
        <PurchasesPurchaseInfoCard
          label="Método de Pago"
          icon-path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        >
          <p class="text-lg font-semibold text-text-primary">
            {{ purchase.payment_method ? resolvePaymentLabel(purchase.payment_method, purchase.payment_method_id) : '—' }}
          </p>
        </PurchasesPurchaseInfoCard>
      </PurchasesPurchaseOrderHeader>

      <!-- Items Section -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4 sm:mb-6">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Items ({{ editItems.length }})</span>
          </h3>

          <!-- Edit Toggle Button -->
          <button
            v-if="!isEditMode"
            @click="enterEditMode"
            class="px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors flex items-center space-x-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Editar</span>
          </button>

          <div v-else class="flex items-center gap-2">
            <button
              @click="cancelEdit"
              class="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-background transition-colors"
            >
              Cancelar
            </button>
            <button
              @click="saveChanges"
              :disabled="!isFormValid || isSaving"
              class="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center space-x-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Guardar</span>
            </button>
          </div>
        </div>

        <!-- VIEW MODE: Items Table -->
        <div v-if="!isEditMode">
          <!-- Mobile: Cards View -->
          <div class="md:hidden space-y-2">
            <div v-for="(item, index) in purchase.items" :key="index"
              class="rounded-xl border border-border bg-background overflow-hidden">
              <!-- Card header -->
              <div class="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b border-border">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">{{ index + 1 }}</span>
                  <h4 class="text-sm font-semibold text-text-primary leading-tight">{{ item.ingredient_name }}</h4>
                </div>
                <div class="flex items-center gap-1">
                  <span class="text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5 tabular-nums">{{ item.purchase_quantity || item.quantity }}</span>
                  <span class="text-xs text-text-secondary">{{ item.purchase_unit || item.unit }}</span>
                </div>
              </div>
              <!-- Card body -->
              <div class="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p class="text-[11px] text-text-secondary mb-0.5 uppercase tracking-wide">Precio</p>
                  <p class="text-sm font-medium text-text-primary">${{ formatCurrency(getPurchaseUnitCost(item)) }}</p>
                  <p class="text-[11px] text-text-secondary">/ {{ item.purchase_unit || item.unit }}</p>
                </div>
                <div class="h-8 w-px bg-border"></div>
                <div class="text-right">
                  <p class="text-[11px] text-text-secondary mb-0.5 uppercase tracking-wide">Total</p>
                  <p class="text-base font-bold text-text-primary">${{ formatCurrency(item.total_cost) }}</p>
                </div>
              </div>
              <div v-if="item.notes" class="px-4 pb-3">
                <p class="text-xs text-text-secondary italic">{{ item.notes }}</p>
              </div>
            </div>
            <!-- Mobile total -->
            <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <span class="text-sm font-medium text-primary">Total compra</span>
              <span class="text-lg font-bold text-primary">${{ formatCurrency(purchase.total_amount) }}</span>
            </div>
          </div>

          <!-- Desktop: Table View -->
          <div class="hidden md:block rounded-xl border border-border overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="bg-surface-secondary border-b border-border">
                  <th class="w-8 px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">#</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">Ingrediente</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">Ref. Factura</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider w-20 border-r border-dashed border-border/60">Cant.</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">Unidad</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">Precio</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="(item, index) in purchase.items" :key="index"
                  class="group bg-surface hover:bg-surface-secondary/60 transition-colors duration-100">
                  <td class="px-4 py-3.5 text-center border-r border-dashed border-border/60">
                    <span class="text-xs font-medium text-text-secondary tabular-nums">{{ index + 1 }}</span>
                  </td>
                  <td class="px-4 py-3.5 border-r border-dashed border-border/60">
                    <span class="text-sm font-semibold text-text-primary">{{ item.ingredient_name }}</span>
                  </td>
                  <td class="px-4 py-3.5 border-r border-dashed border-border/60">
                    <span v-if="item.notes" class="text-xs text-text-secondary italic">{{ item.notes }}</span>
                    <span v-else class="text-xs text-text-secondary/40">—</span>
                  </td>
                  <td class="px-4 py-3.5 text-right border-r border-dashed border-border/60">
                    <span class="text-sm font-semibold text-text-primary tabular-nums">{{ item.purchase_quantity || item.quantity }}</span>
                  </td>
                  <td class="px-4 py-3.5 border-r border-dashed border-border/60">
                    <span class="text-sm text-text-primary">{{ item.purchase_unit || item.unit }}</span>
                  </td>
                  <td class="px-4 py-3.5 text-right border-r border-dashed border-border/60">
                    <span class="text-sm text-text-primary tabular-nums">${{ formatCurrency(getPurchaseUnitCost(item)) }}</span>
                  </td>
                  <td class="px-4 py-3.5 text-right">
                    <span class="text-sm font-bold text-text-primary tabular-nums">${{ formatCurrency(item.total_cost) }}</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-primary/5 border-t-2 border-primary/20">
                  <td colspan="6" class="px-4 py-3.5 text-sm font-semibold text-text-secondary text-right border-r border-dashed border-border/60">Total de la compra</td>
                  <td class="px-4 py-3.5 text-right">
                    <span class="text-base font-bold text-primary tabular-nums">${{ formatCurrency(purchase.total_amount) }}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- EDIT MODE: Editable Items -->
        <div v-else class="space-y-4">
          <div
            v-for="(item, index) in editItems"
            :key="index"
            class="p-4 border-2 border-border rounded-lg bg-background"
          >
            <div class="flex justify-between items-start mb-4">
              <h4 class="text-sm font-medium text-text-primary">{{ getIngredientName(item.ingredient_id) }}</h4>
              <button
                type="button"
                @click="removeItem(index)"
                :disabled="editItems.length === 1"
                class="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed p-1"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <!-- Quantity -->
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad</label>
                <input
                  v-model.number="item.purchase_quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="input-base w-full px-3 py-2 text-sm"
                  @input="updateItemTotal(index)"
                />
              </div>

              <!-- Unit -->
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Unidad</label>
                <select
                  v-model="item.purchase_unit"
                  class="input-base w-full px-3 py-2 text-sm"
                  @change="updateItemTotal(index)"
                >
                  <option value="">Seleccionar</option>
                  <option
                    v-for="unitOpt in getPurchaseUnitOptions(item.ingredient_id)"
                    :key="unitOpt.value"
                    :value="unitOpt.value"
                  >
                    {{ unitOpt.label }}
                  </option>
                </select>
              </div>

              <!-- Unit Cost -->
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Precio Unit.</label>
                <input
                  v-model.number="item.unit_cost"
                  type="number"
                  min="0"
                  step="1"
                  class="input-base w-full px-3 py-2 text-sm"
                  @input="updateItemTotal(index)"
                />
              </div>

              <!-- Total -->
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Total</label>
                <div class="input-base w-full px-3 py-2 text-sm bg-primary/10 text-primary font-bold">
                  ${{ formatCurrency(item.total_cost) }}
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="mt-3">
              <input
                v-model="item.notes"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                placeholder="Notas del item (opcional)"
              />
            </div>
          </div>

          <!-- Add Item Section (Inline) -->
          <div class="border-2 border-dashed border-border rounded-lg overflow-hidden">
            <!-- Collapsed: Add Item Button -->
            <button
              v-if="!showAddItemForm"
              type="button"
              @click="showAddItemForm = true"
              class="w-full px-4 py-3 text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Agregar Item</span>
            </button>

            <!-- Expanded: Inline Add Form -->
            <div v-else class="p-4 bg-background">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-sm font-semibold text-text-primary">Nuevo Item</h4>
                <button
                  @click="showAddItemForm = false; resetNewItem()"
                  class="text-text-secondary hover:text-text-primary p-1"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Ingredient Select -->
              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary mb-1">Ingrediente *</label>
                <UiSearchableSelect
                  v-model="newItem.ingredient_id"
                  :options="ingredientOptions"
                  placeholder="Buscar ingrediente..."
                  @update:model-value="onNewIngredientChange"
                />
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <!-- Quantity -->
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad *</label>
                  <input
                    v-model.number="newItem.purchase_quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="input-base w-full px-3 py-2 text-sm"
                  />
                </div>

                <!-- Unit Select -->
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">Unidad *</label>
                  <select
                    v-model="newItem.purchase_unit"
                    :disabled="!newItem.ingredient_id"
                    class="input-base w-full px-3 py-2 text-sm"
                    :class="{ 'bg-surface-secondary cursor-not-allowed': !newItem.ingredient_id }"
                  >
                    <option value="">{{ newItem.ingredient_id ? 'Seleccionar' : 'Primero ingrediente' }}</option>
                    <option
                      v-for="unitOpt in getPurchaseUnitOptions(newItem.ingredient_id)"
                      :key="unitOpt.value"
                      :value="unitOpt.value"
                    >
                      {{ unitOpt.label }}
                    </option>
                  </select>
                </div>

                <!-- Unit Cost -->
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">Precio Unit. *</label>
                  <input
                    v-model.number="newItem.unit_cost"
                    type="number"
                    min="0"
                    step="1"
                    class="input-base w-full px-3 py-2 text-sm"
                  />
                </div>

                <!-- Preview Total -->
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">Total</label>
                  <div class="input-base w-full px-3 py-2 text-sm bg-primary/10 text-primary font-bold">
                    ${{ formatCurrency(newItem.purchase_quantity * newItem.unit_cost) }}
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div class="mb-4">
                <input
                  v-model="newItem.notes"
                  type="text"
                  class="input-base w-full px-3 py-2 text-sm"
                  placeholder="Notas del item (opcional)"
                />
              </div>

              <!-- Add Button -->
              <button
                type="button"
                @click="addNewItem"
                :disabled="!newItem.ingredient_id || newItem.purchase_quantity <= 0"
                class="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Agregar a la Lista</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Total Summary (Edit mode only — view mode shows total in table footer) -->
        <div v-if="isEditMode" class="flex justify-end mt-4">
          <div class="bg-primary/10 border border-primary/20 rounded-xl px-5 py-3 flex items-center gap-4">
            <p class="text-sm font-medium text-primary">Total de la Compra</p>
            <p class="text-xl font-bold text-primary">${{ formatCurrency(editTotal) }}</p>
          </div>
        </div>

        <!-- Purchase Date (edit mode only) -->
        <div v-if="isEditMode" class="mt-4 sm:mt-6">
          <h4 class="font-medium text-text-primary text-sm sm:text-base mb-2">Fecha de compra</h4>
          <ClientOnly>
            <VueDatePicker
              v-model="editPurchaseDate"
              :enable-time-picker="false"
              :locale="es"
              auto-apply
              :teleport="true"
              :max-date="new Date()"
              :format="formatPurchaseDateFn"
              input-class-name="dp-custom-input"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
              placeholder="Seleccionar fecha..."
            />
          </ClientOnly>
        </div>

        <!-- Notes -->
        <div class="mt-4 sm:mt-6">
          <h4 class="font-medium text-text-primary text-sm sm:text-base mb-2">Observaciones</h4>
          <textarea
            v-if="isEditMode"
            v-model="editNotes"
            class="input-base w-full px-3 py-2 text-sm"
            rows="2"
            placeholder="Observaciones (opcional)"
          ></textarea>
          <p v-else-if="purchase.notes" class="text-xs sm:text-sm text-text-secondary bg-background p-3 sm:p-4 rounded-lg border border-border whitespace-pre-wrap">
            {{ purchase.notes }}
          </p>
          <p v-else class="text-xs sm:text-sm text-text-secondary italic">Sin observaciones</p>
        </div>
      </div>

      <!-- Attachments Section -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span>Documentos Adjuntos</span>
        </h3>

        <!-- Existing Attachments -->
        <div v-if="purchase.attachments?.length > 0" class="mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="attachment in purchase.attachments"
              :key="attachment.id"
              class="flex items-center gap-3 p-3 border border-border rounded-lg bg-background hover:bg-surface-secondary transition-colors"
            >
              <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-text-primary truncate">{{ attachment.file_name }}</p>
                <p class="text-xs text-text-secondary">{{ getAttachmentTypeLabel(attachment.attachment_type) }}</p>
              </div>
              <a
                v-if="attachment.file_url"
                :href="attachment.file_url"
                target="_blank"
                class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="Descargar"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <!-- Upload New Attachments -->
        <div :class="{ 'border-t border-border pt-4': purchase.attachments?.length > 0 }">
          <h4 class="font-medium text-text-primary mb-4">Agregar Documento</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Invoice Upload -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Factura</label>
              <div
                class="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                @click="triggerFileInput('invoice')"
                @dragover.prevent
                @drop.prevent="handleFileDrop($event, 'invoice')"
              >
                <input
                  ref="invoiceFileInput"
                  type="file"
                  class="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  @change="handleFileSelect($event, 'invoice')"
                />
                <svg class="w-8 h-8 mx-auto text-text-secondary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="text-sm text-text-secondary">Click o arrastra archivo aqui</p>
                <p class="text-xs text-text-secondary mt-1">PDF, JPG, PNG (max 10MB)</p>
              </div>
            </div>

            <!-- Payment Proof Upload -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Comprobante de Pago</label>
              <div
                class="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                @click="triggerFileInput('payment')"
                @dragover.prevent
                @drop.prevent="handleFileDrop($event, 'payment')"
              >
                <input
                  ref="paymentFileInput"
                  type="file"
                  class="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  @change="handleFileSelect($event, 'payment')"
                />
                <svg class="w-8 h-8 mx-auto text-text-secondary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="text-sm text-text-secondary">Click o arrastra archivo aqui</p>
                <p class="text-xs text-text-secondary mt-1">PDF, JPG, PNG (max 10MB)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status History Timeline -->
      <PurchasesStatusHistoryTimeline
        :purchase-id="purchaseId"
        :current-status="purchase?.status"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { es } from 'date-fns/locale'
import { computed } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { useQuery } from '@pinia/colada'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { usePaymentLabel } from '~/composables/usePaymentLabel'

const route = useRoute()
const purchaseId = route.params.id as string
const toast = useToast()

const { paymentGroups, isLoading: pmGroupsLoading, fetchPaymentMethods } = usePaymentMethods()
fetchPaymentMethods()
const { resolveLabel: _resolvePaymentLabel } = usePaymentLabel(computed(() => [...paymentGroups.value]))
function resolvePaymentLabel(slug: string | null | undefined, methodId?: string | null): string {
  if (pmGroupsLoading.value) return '—'
  return _resolvePaymentLabel(slug, methodId)
}

const formatPurchaseDateFn = (date: Date) => fnsFormat(date, 'dd/MM/yy', { locale: es })

useHead({
  title: 'Detalle Compra Directa - Abastecimiento'
})

// State
const isUploading = ref(false)
const isSaving = ref(false)
const isEditMode = ref(false)
const showAddItemForm = ref(false)
const invoiceFileInput = ref<HTMLInputElement | null>(null)
const paymentFileInput = ref<HTMLInputElement | null>(null)

// Edit state
const editItems = ref<any[]>([])
const editNotes = ref('')
const editPurchaseDate = ref<Date | null>(null)

// New item state
const newItem = ref({
  ingredient_id: '',
  purchase_quantity: 1,
  purchase_unit: '',
  unit_cost: 0,
  notes: ''
})

// Fetch purchase
const { data: purchaseResponse, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['purchase-direct', purchaseId],
  query: () => $fetch(`/api/suppliers/purchases/direct/${purchaseId}`),
  staleTime: 30_000,
})

const purchase = computed(() => (purchaseResponse.value as any)?.data || null)
const isLoading = computed(() => !purchaseResponse.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && purchaseResponse.value != null)
const refresh = refetch

// Fetch ingredients for add item modal
const { data: ingredientsData } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: INGREDIENTS_FETCH_LIMIT }
})

const ingredients = computed(() => ingredientsData.value?.data || [])
const ingredientOptions = computed(() => ingredients.value.map((i: any) => ({
  value: i.id,
  label: i.name,
  unit: i.unit
})))

// Fetch purchase units for unit selector
const { data: purchaseUnitsData } = useFetch('/api/suppliers/ingredient-purchase-units', {
  server: false,
  query: { limit: 10000, active_only: true }
})

const purchaseUnits = computed(() => purchaseUnitsData.value?.data || [])

// Edit mode computed
const editTotal = computed(() => {
  return editItems.value.reduce((sum, item) => sum + (item.total_cost || 0), 0)
})

const isFormValid = computed(() => {
  return editItems.value.length > 0 && editItems.value.every(item =>
    item.ingredient_id &&
    item.purchase_quantity > 0 &&
    item.unit_cost >= 0
  )
})

// Methods
const enterEditMode = () => {
  if (!purchase.value) return

  editItems.value = (purchase.value.items || []).map((item: any) => {
    const pqty = item.purchase_quantity || item.quantity || 1
    // unit_cost in DB is per base unit (gr). Convert to per purchase unit for display/edit.
    const purchaseUnitCost = pqty > 0 ? (item.total_cost || 0) / pqty : 0
    return {
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      purchase_quantity: pqty,
      purchase_unit: item.purchase_unit || item.unit,
      unit_cost: purchaseUnitCost,
      total_cost: item.total_cost || 0,
      notes: item.notes || ''
    }
  })
  editNotes.value = purchase.value.notes || ''
  editPurchaseDate.value = purchase.value.purchase_date ? new Date(purchase.value.purchase_date) : new Date()
  isEditMode.value = true
}

const cancelEdit = () => {
  isEditMode.value = false
  editItems.value = []
  editNotes.value = ''
  editPurchaseDate.value = null
}

// Returns price per purchase unit (for view mode display)
// unit_cost in DB is stored per base unit (gr/ml/und), so we derive from total/qty
const getPurchaseUnitCost = (item: any): number => {
  const qty = item.purchase_quantity || item.quantity || 1
  return qty > 0 ? (item.total_cost || 0) / qty : 0
}

const updateItemTotal = (index: number) => {
  const item = editItems.value[index]
  item.total_cost = (item.purchase_quantity || 0) * (item.unit_cost || 0)
}

const removeItem = (index: number) => {
  if (editItems.value.length > 1) {
    editItems.value.splice(index, 1)
  }
}

const getIngredientName = (id: string) => {
  // First check if it's already in the edit items
  const editItem = editItems.value.find(i => i.ingredient_id === id)
  if (editItem?.ingredient_name) return editItem.ingredient_name

  // Then check ingredients list
  const ingredient = ingredients.value.find((i: any) => i.id === id)
  return ingredient?.name || ''
}

// Get purchase unit options for an ingredient
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
    let label = u.purchase_unit_label
    if (u.conversion_factor && u.conversion_factor !== 1) {
      label = `${u.purchase_unit_label} (${u.conversion_factor} ${baseUnit})`
    }

    return {
      value: u.purchase_unit_label,
      label: label,
      conversion_factor: u.conversion_factor,
      is_default: u.is_default
    }
  })
}

const onNewIngredientChange = () => {
  const ingredient = ingredients.value.find((i: any) => i.id === newItem.value.ingredient_id)
  if (ingredient) {
    // Auto-select default purchase unit
    const units = getPurchaseUnitOptions(ingredient.id)
    const defaultUnit = units.find((u: any) => u.is_default) || units[0]

    if (defaultUnit) {
      newItem.value.purchase_unit = defaultUnit.value
    } else {
      newItem.value.purchase_unit = ingredient.unit
    }
  }
}

const resetNewItem = () => {
  newItem.value = {
    ingredient_id: '',
    purchase_quantity: 1,
    purchase_unit: '',
    unit_cost: 0,
    notes: ''
  }
}

const addNewItem = () => {
  const ingredient = ingredients.value.find((i: any) => i.id === newItem.value.ingredient_id)

  editItems.value.push({
    ingredient_id: newItem.value.ingredient_id,
    ingredient_name: ingredient?.name || '',
    purchase_quantity: newItem.value.purchase_quantity,
    purchase_unit: newItem.value.purchase_unit || ingredient?.unit || '',
    unit_cost: newItem.value.unit_cost,
    total_cost: newItem.value.purchase_quantity * newItem.value.unit_cost,
    notes: newItem.value.notes
  })

  // Reset and collapse the form
  resetNewItem()
  showAddItemForm.value = false
}

const saveChanges = async () => {
  if (!isFormValid.value) return

  isSaving.value = true

  try {
    const payload = {
      items_data: JSON.stringify(editItems.value.map(item => ({
        ingredient_id: item.ingredient_id,
        quantity: item.purchase_quantity,
        unit_cost: item.unit_cost,
        purchase_quantity: item.purchase_quantity,
        purchase_unit: item.purchase_unit,
        notes: item.notes
      }))),
      purchase_date: editPurchaseDate.value ? editPurchaseDate.value.toISOString() : null,
      notes: editNotes.value || ''
    }

    await $fetch(`/api/suppliers/purchases/direct/${purchaseId}`, {
      method: 'PUT',
      body: payload
    })

    toast.success('Cambios guardados exitosamente', { title: 'Guardado' })
    isEditMode.value = false
    await refresh()
  } catch (error: any) {
    console.error('Error saving changes:', error)
    toast.error(error.data?.detail || 'Error al guardar los cambios', { title: 'Error' })
  } finally {
    isSaving.value = false
  }
}

// File upload methods
const triggerFileInput = (type: 'invoice' | 'payment') => {
  if (type === 'invoice') {
    invoiceFileInput.value?.click()
  } else {
    paymentFileInput.value?.click()
  }
}

const handleFileSelect = async (event: Event, type: 'invoice' | 'payment') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await uploadFile(file, type)
    input.value = ''
  }
}

const handleFileDrop = async (event: DragEvent, type: 'invoice' | 'payment') => {
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    await uploadFile(file, type)
  }
}

const uploadFile = async (file: File, type: 'invoice' | 'payment') => {
  if (file.size > 10 * 1024 * 1024) {
    toast.error('El archivo es muy grande. Maximo 10MB permitido.', { title: 'Error' })
    return
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    toast.error('Tipo de archivo no permitido. Use PDF, JPG o PNG.', { title: 'Error' })
    return
  }

  isUploading.value = true

  try {
    const formData = new FormData()

    // Append file to appropriate field
    if (type === 'invoice') {
      formData.append('invoice_files', file)
    } else {
      formData.append('payment_files', file)
    }

    // Use correct endpoint: POST to /attachments
    await $fetch(`/api/suppliers/purchases/direct/${purchaseId}/attachments`, {
      method: 'POST',
      body: formData
    })

    toast.success(`${type === 'invoice' ? 'Factura' : 'Comprobante'} subido exitosamente`, { title: 'Archivo Subido' })
    await refresh()
  } catch (error: any) {
    console.error('Error uploading file:', error)
    toast.error(error.data?.detail || 'Error al subir el archivo', { title: 'Error' })
  } finally {
    isUploading.value = false
  }
}

// Copy link
const copyPurchaseLink = async () => {
  try {
    const baseUrl = window.location.origin
    const purchaseUrl = `${baseUrl}/abastecimiento/compras-directas/${purchaseId}`

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(purchaseUrl)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = purchaseUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    toast.success('Enlace copiado exitosamente', { title: 'Copiado' })
  } catch (error) {
    console.error('Error copying link:', error)
    toast.error('No se pudo copiar el enlace', { title: 'Error' })
  }
}

// Formatting methods
const { formatDate: _fmtDate } = useFormatters()
const formatDate = (date: string) => _fmtDate(date)

const formatCurrency = (value: number) => {
  if (!value) return '0'
  return value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'received': 'Recibida',
    'invoiced': 'Facturada',
    'paid': 'Pagada'
  }
  return statusMap[status] || status
}

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    'received': 'bg-blue-100 text-blue-800',
    'invoiced': 'bg-yellow-100 text-yellow-800',
    'paid': 'bg-green-100 text-green-800'
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
}


const getAttachmentTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'invoice': 'Factura',
    'payment_proof': 'Comprobante de Pago',
    'delivery_photo': 'Foto de Entrega',
    'quality_photo': 'Foto de Calidad',
    'other': 'Otro'
  }
  return typeMap[type] || type
}

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetch) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>
