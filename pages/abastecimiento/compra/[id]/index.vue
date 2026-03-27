<template>
  <div>
    <!-- Loading overlay during submit/delete (always on top) -->
    <div v-if="isSubmitting || isDeleting"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">
          {{ isSubmitting ? 'Guardando cambios...' : 'Eliminando orden...' }}
        </p>
      </div>
    </div>

    <!-- Loading State for initial data -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="error" />

    <!-- Edit Form -->
    <div v-else class="page-layout">
      <!-- EDIT MODE -->
      <div v-if="isEditMode" class="space-y-4 sm:space-y-6">
        <!-- Edit Mode Header -->
        <div class="bg-primary/10 border-2 border-primary rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <div>
                <h2 class="text-lg font-bold text-text-primary">Editando Orden {{ form.purchase_number }}</h2>
                <p class="text-sm text-text-secondary">Modifica los items antes de que el proveedor cotice</p>
              </div>
            </div>
            <button @click="cancelEdit" class="text-text-secondary hover:text-text-primary transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Supplier Selection -->
        <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4">Proveedor</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Proveedor *</label>
              <UiSearchableSelect
                v-model="editForm.supplier_id"
                :options="supplierOptions"
                placeholder="Buscar proveedor..."
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Observaciones</label>
              <textarea
                v-model="editForm.notes"
                class="input-base w-full px-4 py-2"
                rows="2"
                placeholder="Observaciones adicionales..."
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Items Section -->
        <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary">Items de la Orden</h3>
            <button
              type="button"
              @click="addEditItem"
              class="px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors flex items-center space-x-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Agregar Item</span>
            </button>
          </div>

          <!-- Type Filter Tabs -->
          <div class="flex flex-wrap gap-2 mb-4 p-1 bg-background rounded-lg border border-border">
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
              v-for="(item, index) in editForm.items"
              :key="index"
              class="p-4 border-2 border-border rounded-lg"
            >
              <div class="flex justify-between items-start mb-4">
                <h4 class="text-sm font-medium text-text-primary">Item #{{ index + 1 }}</h4>
                <button
                  type="button"
                  @click="removeEditItem(index)"
                  :disabled="editForm.items.length === 1"
                  class="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <!-- Ingredient -->
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">Ingrediente *</label>
                  <UiSearchableSelect
                    v-model="item.ingredient_id"
                    :options="ingredientOptions"
                    placeholder="Buscar ingrediente..."
                    required
                    @update:model-value="onEditIngredientChange(index)"
                  />
                </div>

                <!-- Purchase Unit -->
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">Unidad *</label>
                  <select
                    v-model="item.purchase_unit"
                    required
                    :disabled="!item.ingredient_id"
                    class="input-base w-full px-4 py-2"
                    :class="{ 'bg-surface-secondary cursor-not-allowed': !item.ingredient_id }"
                  >
                    <option value="">{{ item.ingredient_id ? 'Seleccionar unidad' : 'Seleccione ingrediente' }}</option>
                    <option
                      v-for="option in getEditPurchaseUnitOptions(item.ingredient_id)"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </div>

                <!-- Quantity -->
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">Cantidad *</label>
                  <input
                    v-model.number="item.purchase_quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    class="input-base w-full px-4 py-2"
                  />
                </div>

                <!-- Notes -->
                <div class="sm:col-span-2 md:col-span-3">
                  <label class="block text-sm font-medium text-text-primary mb-2">Notas del Item</label>
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

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="cancelEdit"
            :disabled="isSubmitting"
            class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="saveEdit"
            :disabled="isSubmitting || !isEditFormValid"
            class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
            <span>{{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}</span>
          </button>
        </div>
      </div>

      <!-- VIEW MODE (Original content) -->
      <!-- Order Information Card -->
      <PurchasesPurchaseOrderHeader v-if="!isEditMode">
        <!-- Purchase Number with Date and Payment Type -->
        <PurchasesPurchaseInfoCard
          :label="formatDate(form.purchase_date)"
          :subtitle="form.payment_type ? `Pago: ${getPaymentTypeText(form.payment_type)}` : undefined"
          icon-path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        >
          <div class="flex items-center gap-2">
            <p class="text-lg font-semibold text-text-primary">
              {{ form.purchase_number }}
            </p>
            <button @click="copyPurchaseLink"
              class="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded-md text-primary transition-colors"
              title="Copiar enlace de la orden">
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
          <div class="flex items-center gap-2">
            <p class="text-lg font-semibold text-text-primary">
              {{ getSupplierName(form.supplier_id) }}
            </p>
            <button v-if="currentSupplier" @click="copyPortalLink"
              class="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded-md text-primary transition-colors"
              title="Copiar enlace del portal">
              <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
          </div>
        </PurchasesPurchaseInfoCard>

        <!-- Status Badge -->
        <PurchasesPurchaseInfoCard
          label="Estado Actual"
          icon-path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        >
          <UiStatusBadge :value="getStatusText(form.status)" format="text"
            :variant="getStatusVariant(form.status)" />
        </PurchasesPurchaseInfoCard>
      </PurchasesPurchaseOrderHeader>

      <!-- Read-only Summary + Status History (All states) -->
      <div v-if="!isEditMode" class="space-y-4 sm:space-y-6">
        <!-- Order Summary (Read-only) -->
        <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6 flex items-center space-x-2">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Resumen de la Orden</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-4 mb-6">
            <div>
              <p class="text-sm text-text-secondary mb-1">Fecha de Orden</p>
              <p class="text-base font-medium text-text-primary">{{ formatDate(form.purchase_date) }}</p>
            </div>
            <div>
              <p class="text-sm text-text-secondary mb-1">Fecha de Entrega</p>
              <p class="text-base font-medium text-text-primary">
                {{ purchase?.estimated_delivery_date || purchase?.delivery_date ? formatDate(purchase.estimated_delivery_date || purchase.delivery_date) : 'No especificada' }}
              </p>
            </div>
          </div>

          <!-- Items Section -->
          <div class="mb-4 sm:mb-6">
            <h4 class="font-medium text-text-primary mb-3 sm:mb-4">Items</h4>

            <!-- Mobile: Cards View -->
            <div class="md:hidden space-y-3">
              <div v-for="(item, index) in form.items" :key="index"
                class="bg-surface rounded-xl  transition-shadow border border-border">
                <div class="p-4">
                  <!-- Main Content with Dashed Border -->
                  <div class="border-2 border-dashed border-border rounded-lg p-3 mb-3">

                    <!-- Ingredient Name -->
                    <div class="mb-3">
                      <h4 class="text-sm font-bold text-text-primary">
                        {{ getIngredientName(item.ingredient_id) }}
                      </h4>
                      <p v-if="item.notes" class="text-xs text-text-secondary mt-1">
                        {{ item.notes }}
                      </p>
                    </div>

                    <!-- Value Info -->
                    <div v-if="form.status !== 'quotation'" class="flex items-end justify-between pt-2 border-t border-border">
                      <div>
                        <p class="text-xs text-muted-foreground mb-0.5">Precio Unitario</p>
                        <p class="text-base font-semibold text-text-primary">
                          {{ parseFloat(item.unit_cost).toLocaleString('es-CO', {
                            style: 'currency', currency: 'COP',
                            minimumFractionDigits: 0, maximumFractionDigits: 0
                          }) }}
                        </p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                          por {{ item.unit }}
                        </p>
                      </div>
                      <div class="text-right">
                        <p class="text-xs text-muted-foreground mb-0.5">Total {{ item.purchase_unit }}</p>
                        <p class="text-lg font-bold text-text-primary">
                          {{ parseFloat(item.total_cost).toLocaleString('es-CO', {
                            style: 'currency', currency: 'COP',
                            minimumFractionDigits: 0, maximumFractionDigits: 0
                          }) }}
                        </p>
                      </div>
                    </div>

                  </div>

                  <!-- Footer Stats -->
                  <div class="flex items-center justify-between">

                    <!-- Stats Icons -->
                    <div class="flex items-center gap-3">

                      <!-- Quantity -->
                      <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-1">
                          <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span class="text-text-primary font-semibold text-xs">{{ item.purchase_quantity || item.quantity }} {{ item.purchase_unit || item.unit }}</span>
                        </div>
                        <span v-if="item.weight_value && item.weight_unit" class="text-text-secondary text-xs ml-5">
                          Peso: {{ item.weight_value }} {{ item.weight_unit }}
                        </span>
                      </div>

                      <!-- Batch Number -->
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span class="text-text-secondary text-xs">{{ item.batch_number || 'Sin lote' }}</span>
                      </div>

                    </div>

                  </div>

                </div>
              </div>
            </div>

            <!-- Desktop: Table View -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full border-2 border-border rounded-lg">
                <thead class="bg-surface-secondary">
                  <tr>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Ingrediente
                    </th>
                    <th
                      class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Cantidad
                    </th>
                    <th v-if="form.status !== 'quotation'"
                      class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Precio Unitario
                    </th>
                    <th v-if="form.status !== 'quotation'"
                      class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Total
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Lote
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-surface divide-y divide-border">
                  <tr v-for="(item, index) in form.items" :key="index"
                    class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <div>
                        <p class="font-medium">{{ getIngredientName(item.ingredient_id) }}</p>
                        <p v-if="item.notes" class="text-xs text-text-secondary mt-1">{{ item.notes }}</p>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary text-right font-medium">
                      <div>{{ item.purchase_quantity || item.quantity }} {{ item.purchase_unit || item.unit }}</div>
                      <div v-if="item.weight_value && item.weight_unit" class="text-xs text-text-secondary mt-1">
                        Peso: {{ item.weight_value }} {{ item.weight_unit }} ({{ item.weight_per_unit_grams }} gr/und)
                      </div>
                    </td>
                    <td v-if="form.status !== 'quotation'" class="px-4 py-3 text-sm text-text-primary text-right">
                      <div>
                        {{ parseFloat(item.unit_cost).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
                      </div>
                      <div class="text-xs text-text-secondary mt-1">
                        por {{ item.unit }}
                      </div>
                    </td>
                    <td v-if="form.status !== 'quotation'" class="px-4 py-3 text-sm font-bold text-text-primary text-right">
                      <div>{{ parseFloat(item.total_cost).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}</div>
                      <div class="text-xs text-text-secondary mt-1">{{ item.purchase_unit }}</div>
                    </td>
                    <td class="px-4 py-3 text-sm text-text-secondary text-center">
                      {{ item.batch_number || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Totals Summary -->
          <!-- Mobile: Card Layout -->
          <div v-if="form.status !== 'quotation'" class="md:hidden mb-4">
            <div class="bg-surface border-2 border-border rounded-xl">
              <div class="p-6">
                <div class="space-y-3">
                  <!-- Subtotal Row -->
                  <div class="flex justify-between items-center">
                    <span class="text-[15px] font-medium text-text-primary opacity-70">Subtotal</span>
                    <span class="text-[15px] font-semibold text-text-primary">
                      {{ subtotal.toLocaleString('es-CO', {
                        style: 'currency', currency: 'COP', minimumFractionDigits:
                          0, maximumFractionDigits: 0
                      }) }}
                    </span>
                  </div>

                  <!-- IVA Row -->
                  <div class="flex justify-between items-center">
                    <span class="text-[15px] font-medium text-text-primary opacity-70">IVA (19%)</span>
                    <span class="text-[15px] font-semibold text-text-primary">
                      {{ parseFloat(form.tax_amount).toLocaleString('es-CO', {
                        style: 'currency', currency: 'COP',
                        minimumFractionDigits: 0, maximumFractionDigits: 0
                      }) }}
                    </span>
                  </div>

                  <!-- Total Row -->
                  <div class="flex justify-between items-center pt-4 mt-4 border-t border-border">
                    <span class="text-lg font-semibold text-text-primary">Total</span>
                    <span class="text-2xl font-bold text-primary">
                      {{ totalAmount.toLocaleString('es-CO', {
                        style: 'currency', currency: 'COP',
                        minimumFractionDigits: 0, maximumFractionDigits: 0
                      }) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: Grid Layout (unchanged) -->
          <div v-if="form.status !== 'quotation'" class="hidden md:grid md:grid-cols-3 gap-4 mb-6">
            <!-- Subtotal Card -->
            <div class="bg-surface rounded-xl  transition-shadow border border-border">
              <div class="p-4">
                <div class="border-2 border-dashed border-border rounded-lg p-3">
                  <p class="text-xs text-muted-foreground mb-1">Subtotal</p>
                  <p class="text-xl font-bold text-text-primary">
                    {{ subtotal.toLocaleString('es-CO', {
                      style: 'currency', currency: 'COP', minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- IVA Card -->
            <div class="bg-surface rounded-xl  transition-shadow border border-border">
              <div class="p-4">
                <div class="border-2 border-dashed border-border rounded-lg p-3">
                  <p class="text-xs text-muted-foreground mb-1">IVA</p>
                  <p class="text-xl font-bold text-text-primary">
                    {{ parseFloat(form.tax_amount).toLocaleString('es-CO', {
                      style: 'currency', currency: 'COP',
                      minimumFractionDigits: 0, maximumFractionDigits: 0
                    }) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Total Card -->
            <div class="bg-surface rounded-xl  transition-shadow border border-border">
              <div class="p-4">
                <div class="border-2 border-dashed border-border rounded-lg p-3">
                  <p class="text-xs text-muted-foreground mb-1">Total</p>
                  <p class="text-2xl font-bold text-primary">
                    {{ totalAmount.toLocaleString('es-CO', {
                      style: 'currency', currency: 'COP', minimumFractionDigits:
                        0, maximumFractionDigits: 0
                    }) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Observaciones -->
          <div v-if="form.notes" class="mt-4 sm:mt-6">
            <h4 class="font-medium text-text-primary text-sm sm:text-base mb-2">Observaciones</h4>
            <p class="text-xs sm:text-sm text-text-secondary bg-background p-3 sm:p-4 rounded-lg border border-border">
              {{ form.notes }}
            </p>
          </div>
        </div>

        <!-- Action Buttons Section -->
        <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">

            <!-- Action buttons based on current status -->
            <div v-if="purchase" class="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <!-- WAITING: Quotation - Supplier must complete prices -->
              <div v-if="purchase.status === 'quotation'"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0"
                  style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Esperando cotización del proveedor</span>
              </div>

              <!-- Edit button (only when in quotation status and supplier hasn't responded) -->
              <button v-if="canEditQuotation"
                @click="isEditMode = true"
                class="px-3 py-2 sm:px-4 border-2 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm hover:opacity-60"
                style="border-color: hsl(var(--primary)); color: hsl(var(--primary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar Orden</span>
              </button>

              <!-- Approve (when in pending status) - USER ACTION -->
              <NuxtLink v-if="purchase.status === 'pending'" :to="`/abastecimiento/compra/${purchaseId}/acciones`"
                class="px-3 py-2 sm:px-4 border-2 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm hover:opacity-60"
                style="border-color: hsl(var(--success)); color: hsl(var(--success));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Aprobar Orden</span>
              </NuxtLink>

              <!-- WAITING: Payment (for "contado" type) or Invoice (for other types) -->
              <div v-if="purchase.status === 'confirmed' || purchase.status === 'preparing'"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0"
                  style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span v-if="purchase.payment_type === 'contado'">Esperando pago antes de facturar</span>
                <span v-else>Esperando factura del proveedor</span>
              </div>

              <!-- WAITING: Invoice after payment (for "contado" type only) -->
              <div v-if="purchase.status === 'paid' && purchase.payment_type === 'contado'"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0"
                  style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pago recibido. Esperando factura del proveedor</span>
              </div>

              <!-- WAITING: Ship - Supplier must ship -->
              <div v-if="purchase.status === 'invoiced'"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0"
                  style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Esperando envío del proveedor</span>
              </div>

              <!-- Receive (includes quality verification) -->
              <NuxtLink v-if="purchase.status === 'shipped' || purchase.status === 'partially_received'"
                :to="`/abastecimiento/compra/${purchaseId}/acciones`"
                class="px-3 py-2 sm:px-4 border-2 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm hover:opacity-60"
                style="border-color: hsl(var(--success)); color: hsl(var(--success));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Recibir Orden</span>
              </NuxtLink>

              <!-- Received state - Payment reminder -->
              <div v-if="purchase.status === 'received' && shouldShowPaymentReminder"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--success)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style="color: hsl(var(--success));"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Orden recibida. Registrar pago en módulo de Pagos</span>
              </div>

              <!-- Cancel (only available for early states before payment/shipping) -->
              <button v-if="canCancelPurchase" type="button"
                @click="showCancelModal = true"
                class="px-3 py-2 sm:px-4 border-2 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm hover:opacity-60"
                style="border-color: hsl(var(--destructive)); color: hsl(var(--destructive));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancelar Orden</span>
              </button>

              <!-- Info message when cannot cancel -->
              <div v-else-if="!isCancelled && cancelBlockedReason"
                class="px-3 py-2 sm:px-4 bg-muted/50 border-2 border-border rounded-lg flex items-start space-x-2 text-xs sm:text-sm">
                <svg class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-muted-foreground mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-text-secondary">{{ cancelBlockedReason }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Status History Timeline -->
        <PurchasesStatusHistoryTimeline :purchase-id="purchaseId" :current-status="purchase?.status"
          :base-transition-url="`/abastecimiento/compra/${purchaseId}/transicion`" />
      </div>
    </div>

    <!-- Cancel Modal -->
    <PurchasesCancelPurchaseModal :is-open="showCancelModal" :purchase-id="purchaseId" @close="showCancelModal = false"
      @cancelled="handleCancelled" />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { usePurchasesStore } from '~/stores/purchases'
import { storeToRefs } from 'pinia'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'

// Get order ID from route
const route = useRoute()
const router = useRouter()
const purchaseId = route.params.id as string

useHead({
  title: `Editar Orden ${purchaseId} - Abastecimiento`
})

// Use Pinia store
const purchasesStore = usePurchasesStore()
const { currentPurchase } = storeToRefs(purchasesStore)

// Fetch suppliers (NO await to show loading)
const { data: suppliersData, pending: loadingSuppliers } = useFetch('/api/suppliers/providers', {
  server: false,
  query: { limit: 250 }
})

const suppliers = computed(() => suppliersData.value?.data || [])

// Fetch ingredients (NO await to show loading)
const { data: ingredientsData, pending: loadingIngredients } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: INGREDIENTS_FETCH_LIMIT }
})

const ingredients = computed(() => ingredientsData.value?.data || [])

const isSubmitting = ref(false)
const isDeleting = ref(false)
const error = ref<string | null>(null)

// Cancel modal state
const showCancelModal = ref(false)

// Edit mode state
const isEditMode = ref(false)
const editForm = ref({
  supplier_id: '',
  notes: '',
  items: [] as any[]
})

// Fetch ingredient purchase units for edit mode
const { data: purchaseUnitsData } = useFetch('/api/suppliers/ingredient-purchase-units', {
  server: false,
  query: { limit: 10000, active_only: true }
})

const purchaseUnits = computed(() => purchaseUnitsData.value?.data || [])

// Supplier options for searchable select
const supplierOptions = computed(() =>
  suppliers.value.map((supplier: any) => ({
    value: supplier.id,
    label: supplier.name
  }))
)

// Ingredient type filter for edit mode
const selectedIngredientType = ref('food')

const ingredientTypeOptions = [
  { value: 'food', label: 'Alimentos' },
  { value: 'service', label: 'Servicios' },
  { value: 'supply', label: 'Insumos' }
]

// Filter ingredients by selected type
const filteredIngredients = computed(() =>
  ingredients.value.filter((ingredient: any) =>
    !selectedIngredientType.value || ingredient.type === selectedIngredientType.value
  )
)

// Ingredient options for searchable select (filtered by type)
const ingredientOptions = computed(() =>
  filteredIngredients.value.map((ingredient: any) => ({
    value: ingredient.id,
    label: ingredient.name,
    type: ingredient.type
  }))
)

// Get purchase unit options for a specific ingredient
const getEditPurchaseUnitOptions = (ingredientId: string) => {
  if (!ingredientId) return []

  const units = purchaseUnits.value.filter((u: any) => u.ingredient_id === ingredientId)

  // If no configured units, return base unit option
  if (units.length === 0) {
    const ingredient = ingredients.value.find((i: any) => i.id === ingredientId)
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

  return units.map((u: any) => ({
    value: u.purchase_unit_label,
    label: u.purchase_unit_label,
    conversion_factor: u.conversion_factor,
    is_default: u.is_default
  }))
}

// Get ingredient base unit
const getIngredientUnit = (ingredientId: string) => {
  if (!ingredientId) return ''
  const ingredient = ingredients.value.find((ing: any) => ing.id === ingredientId)
  return ingredient?.unit || ''
}

// Get conversion factor for a purchase unit
const getConversionFactor = (purchaseUnitLabel: string, ingredientId: string) => {
  const unit = purchaseUnits.value.find((u: any) =>
    u.ingredient_id === ingredientId &&
    u.purchase_unit_label === purchaseUnitLabel
  )

  if (unit) {
    return unit.conversion_factor
  }

  return 1
}

// Initialize edit form with current purchase data
const initEditForm = () => {
  if (!purchase.value) return

  editForm.value = {
    supplier_id: purchase.value.supplier_id || '',
    notes: purchase.value.notes || '',
    items: (purchase.value.items || []).map((item: any) => ({
      ingredient_id: item.ingredient_id,
      quantity: item.quantity,
      unit: item.unit,
      purchase_quantity: item.purchase_quantity || item.quantity,
      purchase_unit: item.purchase_unit || item.unit,
      notes: item.notes || ''
    }))
  }

  // Ensure at least one item
  if (editForm.value.items.length === 0) {
    addEditItem()
  }
}

// Watch for edit mode to initialize form
watch(isEditMode, (newValue) => {
  if (newValue) {
    initEditForm()
  }
})

// Edit form validation
const isEditFormValid = computed(() => {
  if (!editForm.value.supplier_id) return false
  if (editForm.value.items.length === 0) return false

  return editForm.value.items.every((item: any) =>
    item.ingredient_id &&
    item.purchase_quantity > 0 &&
    item.purchase_unit
  )
})

// Cancel edit mode
const cancelEdit = () => {
  isEditMode.value = false
}

// Add item to edit form
const addEditItem = () => {
  editForm.value.items.push({
    ingredient_id: '',
    quantity: 1,
    unit: '',
    purchase_quantity: 1,
    purchase_unit: '',
    notes: ''
  })
}

// Remove item from edit form
const removeEditItem = (index: number) => {
  if (editForm.value.items.length > 1) {
    editForm.value.items.splice(index, 1)
  }
}

// Handle ingredient change in edit mode
const onEditIngredientChange = (index: number) => {
  const ingredient = ingredients.value.find(
    (ing: any) => ing.id === editForm.value.items[index].ingredient_id
  )
  if (ingredient) {
    editForm.value.items[index].unit = ingredient.unit

    // Auto-select default purchase unit
    const options = getEditPurchaseUnitOptions(ingredient.id)
    const defaultUnit = options.find((opt: any) => opt.is_default)

    if (defaultUnit) {
      editForm.value.items[index].purchase_unit = defaultUnit.value
    } else if (options.length > 0) {
      editForm.value.items[index].purchase_unit = options[0].value
    } else {
      editForm.value.items[index].purchase_unit = ingredient.unit
    }
  }
}

// Save edit
const saveEdit = async () => {
  if (!isEditFormValid.value) {
    useToast().error('Completa todos los campos requeridos', { title: 'Error de Validación' })
    return
  }

  isSubmitting.value = true

  try {
    // Convert items to base units for database
    const convertedItems = editForm.value.items.map((item: any) => {
      const baseUnit = getIngredientUnit(item.ingredient_id)
      const factor = getConversionFactor(item.purchase_unit, item.ingredient_id)
      const convertedQuantity = item.purchase_quantity * factor

      return {
        ingredient_id: item.ingredient_id,
        quantity: convertedQuantity,
        unit: baseUnit,
        purchase_quantity: item.purchase_quantity,
        purchase_unit: item.purchase_unit,
        unit_cost: null,
        total_cost: 0,
        notes: item.notes || null
      }
    })

    await $fetch(`/api/suppliers/purchases/${purchaseId}`, {
      method: 'PUT',
      body: {
        supplier_id: editForm.value.supplier_id,
        notes: editForm.value.notes || null,
        items: convertedItems
      }
    })

    // Exit edit mode and refresh data
    isEditMode.value = false
    await loadPurchase(true)

    useToast().success('Los cambios se han guardado correctamente', { title: 'Orden Actualizada' })
  } catch (error: any) {
    console.error('Error updating purchase:', error)
    useToast().error(error.data?.detail || 'No se pudo actualizar la orden', { title: 'Error' })
  } finally {
    isSubmitting.value = false
  }
}

// Load purchase from store
const loadingPurchase = ref(false)
const loadPurchase = async (forceRefresh = false) => {
  loadingPurchase.value = true
  error.value = null
  try {
    await purchasesStore.fetchPurchase(purchaseId, forceRefresh)
  } catch (err: any) {
    error.value = err.message || 'Error loading purchase'
  } finally {
    loadingPurchase.value = false
  }
}

// Get purchase from store (reactive) - using currentPurchase which is already set
const purchase = currentPurchase

// Form state derived from store
const form = computed(() => {
  if (!purchase.value) {
    return {
      supplier_id: '',
      purchase_number: '',
      purchase_date: '',
      delivery_date: '',
      status: 'pending',
      invoice_number: '',
      tax_amount: 0,
      total_amount: 0,
      notes: '',
      items: []
    }
  }

  return {
    supplier_id: purchase.value.supplier_id,
    purchase_number: purchase.value.purchase_number,
    purchase_date: purchase.value.purchase_date ? new Date(purchase.value.purchase_date).toISOString().slice(0, 16) : '',
    delivery_date: purchase.value.delivery_date ? new Date(purchase.value.delivery_date).toISOString().slice(0, 16) : '',
    status: purchase.value.status,
    payment_type: purchase.value.payment_type,
    credit_days: purchase.value.credit_days,
    payment_due_date: purchase.value.payment_due_date,
    payment_terms: purchase.value.payment_terms,
    consolidation_group: purchase.value.consolidation_group,
    requires_advance_payment: purchase.value.requires_advance_payment,
    invoice_number: purchase.value.invoice_number || '',
    tax_amount: purchase.value.tax_amount,
    total_amount: purchase.value.total_amount,
    notes: purchase.value.notes || '',
    items: purchase.value.items
  }
  

})

// Refresh function
const refresh = async () => {
  await loadPurchase(true)
}

// Inject refresh handler setter from layout (must be at setup level)
const { setRefreshHandler } = useLayoutActions()

// Load on mount and set as current purchase
onMounted(async () => {
  // First set the current purchase ID (this will show the bar but wait for data)
  purchasesStore.setCurrentPurchase(purchaseId)

  // Check if we should force refresh on mount
  const shouldRefresh = route.query.refresh === 'true'

  // Then load the purchase data
  await loadPurchase(shouldRefresh)

  // Clean up the query param if it exists
  if (shouldRefresh) {
    const { refresh, ...restQuery } = route.query
    router.replace({ query: restQuery })
  }

  // Register refresh handler for mobile bottom nav
  setRefreshHandler(refresh)
})

// Watch route query to detect when we should reload (e.g., after completing an action)
// This handles the case when navigating within the same page
watch(() => route.query.refresh, async (newValue, oldValue) => {
  // Only trigger if the value changed to 'true' (not on initial mount)
  if (newValue === 'true' && oldValue !== 'true') {
    console.log('🔄 Refresh requested, reloading purchase data...')
    await loadPurchase(true)
    // Clean up the query param
    const { refresh, ...restQuery } = route.query
    router.replace({ query: restQuery })
  }
})

// Clean up on unmount
onUnmounted(() => {
  purchasesStore.setCurrentPurchase(null)
})

// Combined loading state
const isLoading = computed(() => loadingPurchase.value || loadingSuppliers.value || loadingIngredients.value)

// Computed totals
const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0)
})

const totalAmount = computed(() => {
  return subtotal.value + (parseFloat(form.value.tax_amount) || 0)
})

// Helper functions for status
function getStatusVariant(status) {
  switch (status) {
    case 'quotation':
      return 'info'
    case 'pending':
      return 'warning'
    case 'confirmed':
      return 'info'
    case 'preparing':
      return 'info'
    case 'shipped':
      return 'info'
    case 'partially_received':
      return 'warning'
    case 'received':
      return 'success'
    case 'verified':
      return 'success'
    case 'invoiced':
      return 'secondary'
    case 'paid':
      return 'success'
    case 'cancelled':
      return 'destructive'
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function getStatusText(status) {
  const texts = {
    quotation: 'Cotización',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    shipped: 'Enviado',
    partially_received: 'Parcialmente Recibido',
    received: 'Recibido',
    verified: 'Verificado',
    invoiced: 'Facturado',
    paid: 'Pagado',
    cancelled: 'Cancelado',
    overdue: 'Vencido'
  }
  return texts[status] || 'Desconocido'
}

function getSupplierName(supplierId) {
  if (!supplierId) return 'No especificado'
  const supplier = suppliers.value.find(sup => sup.id === supplierId)
  return supplier?.name || 'Proveedor desconocido'
}

// Get current supplier with access token
const currentSupplier = computed(() => {
  if (!form.value.supplier_id) return null
  const supplier = suppliers.value.find(sup => sup.id === form.value.supplier_id)

  return supplier
})

function getIngredientName(ingredientId) {
  if (!ingredientId) return 'No especificado'
  const ingredient = ingredients.value.find(ing => ing.id === ingredientId)
  return ingredient?.name || 'Ingrediente desconocido'
}

function formatDate(dateString) {
  if (!dateString) return 'No especificada'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getPaymentTypeText(paymentType) {
  const types = {
    'contado': 'Contado',
    'credito': 'Crédito',
    'contraentrega': 'Contraentrega'
  }
  return types[paymentType] || 'No especificado'
}

// Methods
const onIngredientChange = (index) => {
  const selectedIngredient = ingredients.value.find(
    ing => ing.id === form.value.items[index].ingredient_id
  )
  if (selectedIngredient) {
    form.value.items[index].unit = selectedIngredient.unit
    if (selectedIngredient.price) {
      form.value.items[index].unit_cost = parseFloat(selectedIngredient.price)
      updateItemTotal(index)
    }
  }
}

const updateItemTotal = (index) => {
  const item = form.value.items[index]
  item.total_cost = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)
  updateTotal()
}

const updateTotal = () => {
  form.value.total_amount = totalAmount.value
}

const addItem = () => {
  form.value.items.push({
    ingredient_id: '',
    quantity: 1,
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

// Handle form submission
const handleSubmit = async () => {
  try {
    isSubmitting.value = true

    // Update total before submit
    form.value.total_amount = totalAmount.value

    await $fetch(`/api/suppliers/purchases/${purchaseId}`, {
      method: 'PUT',
      body: form.value
    })

    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')

  } catch (error) {
    console.error('Error updating purchase:', error)
    alert('Error al actualizar la orden. Por favor intente nuevamente.')
  } finally {
    isSubmitting.value = false
  }
}

// Handle order deletion
const handleDelete = async () => {
  if (!confirm('¿Está seguro de que desea eliminar esta orden? Esta acción no se puede deshacer.')) {
    return
  }

  try {
    isDeleting.value = true

    await $fetch(`/api/suppliers/purchases/${purchaseId}`, {
      method: 'DELETE'
    })

    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')

  } catch (error) {
    console.error('Error deleting purchase:', error)
    alert('Error al eliminar la orden. Por favor intente nuevamente.')
  } finally {
    isDeleting.value = false
  }
}

// Check if we should show payment reminder for received orders
// For "contado" orders, payment happens before verification, so we shouldn't show the reminder
// For "credito" orders, payment happens after verification, so we should show the reminder
const shouldShowPaymentReminder = computed(() => {
  if (!purchase.value) return false

  const paymentType = purchase.value.payment_type
  const history = purchase.value.status_history || []

  // For contado orders, check if payment already occurred (status transitioned through "paid")
  if (paymentType === 'contado') {
    const hasPaidStatus = history.some((entry: any) => entry.to_status === 'paid')
    return !hasPaidStatus // Don't show reminder if already paid
  }

  // For credit orders, show reminder (payment happens after verification)
  return true
})

// Determine if there are available actions for the current status
const hasAvailableActions = computed(() => {
  if (!purchase.value) return false

  const status = purchase.value.status

  // Has available actions if:
  // 1. Status is 'pending' (can approve)
  // 2. Status is 'shipped' or 'partially_received' (can receive)
  // 3. Status is not 'received' or 'cancelled' (can cancel)

  const canApprove = status === 'pending'
  const canReceive = status === 'shipped' || status === 'partially_received'
  const canCancel = status !== 'received' && status !== 'cancelled'

  return canApprove || canReceive || canCancel
})

// Check if current status is a waiting state (no user action required)
const hasWaitingStatus = computed(() => {
  if (!purchase.value) return false

  const status = purchase.value.status
  const waitingStatuses = ['quotation', 'confirmed', 'preparing', 'paid', 'invoiced']

  return waitingStatuses.includes(status) ||
    (status === 'received' && shouldShowPaymentReminder.value)
})

// Get waiting message based on status
const getWaitingMessage = computed(() => {
  if (!purchase.value) return ''

  const status = purchase.value.status
  const paymentType = purchase.value.payment_type

  switch (status) {
    case 'quotation':
      return 'Esperando cotización del proveedor'
    case 'confirmed':
    case 'preparing':
      return paymentType === 'contado'
        ? 'Esperando pago antes de facturar'
        : 'Esperando factura del proveedor'
    case 'paid':
      return 'Pago recibido. Esperando factura del proveedor'
    case 'invoiced':
      return 'Esperando envío del proveedor'
    case 'received':
      if (shouldShowPaymentReminder.value) {
        return 'Orden recibida. Registrar pago en módulo de Pagos'
      }
      return 'Orden completada'
    default:
      return 'Estado actual: ' + getStatusText(status)
  }
})

// Get waiting description based on status
const getWaitingDescription = computed(() => {
  if (!purchase.value) return ''

  const status = purchase.value.status
  const paymentType = purchase.value.payment_type

  switch (status) {
    case 'quotation':
      return 'El proveedor debe completar los precios en su portal'
    case 'confirmed':
    case 'preparing':
      return paymentType === 'contado'
        ? 'Debes registrar el pago en el módulo de Pagos'
        : 'El proveedor enviará la factura'
    case 'paid':
      return 'El proveedor debe enviar la factura'
    case 'invoiced':
      return 'El proveedor debe despachar la orden'
    case 'received':
      if (shouldShowPaymentReminder.value) {
        return 'Dirígete al módulo de Pagos para registrar el pago de esta orden'
      }
      return 'La orden ha sido recibida y verificada'
    default:
      return ''
  }
})

// Cancellation rules - match backend validation
const CANCELLABLE_STATES = ['quotation', 'pending', 'confirmed', 'preparing']

const canCancelPurchase = computed(() => {
  if (!purchase.value) return false
  return CANCELLABLE_STATES.includes(purchase.value.status)
})

// Can edit quotation - only when status is 'quotation' and supplier hasn't responded (no prices set)
const canEditQuotation = computed(() => {
  if (!purchase.value) return false
  if (purchase.value.status !== 'quotation') return false

  // Check if any item has a price set (supplier has started responding)
  const items = purchase.value.items || []
  const hasAnyPrice = items.some((item: any) => item.unit_cost !== null && item.unit_cost > 0)

  return !hasAnyPrice
})

const isCancelled = computed(() => {
  return purchase.value?.status === 'cancelled'
})

const cancelBlockedReason = computed(() => {
  if (!purchase.value) return ''

  const status = purchase.value.status

  const errorMessages = {
    'paid': 'No se puede cancelar una orden que ya ha sido pagada.',
    'invoiced': 'No se puede cancelar una orden que ya ha sido facturada.',
    'shipped': 'No se puede cancelar una orden que ya ha sido enviada.',
    'received': 'No se puede cancelar una orden que ya ha sido recibida. El inventario ya fue actualizado.',
    'partially_received': 'No se puede cancelar una orden parcialmente recibida.',
    'overdue': 'No se puede cancelar una orden vencida.',
    'cancelled': ''  // Don't show message for already cancelled
  }

  return errorMessages[status] || ''
})

// Copy portal link to clipboard
const copyPortalLink = async () => {
  const toast = useToast()
  try {
    const baseUrl = window.location.origin
    const portalUrl = `${baseUrl}/proveedor/${currentSupplier.value.access_token}/${purchaseId}`

    // Try modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(portalUrl)
    } else {
      // Fallback for non-HTTPS contexts
      const textArea = document.createElement('textarea')
      textArea.value = portalUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    console.log('✅ Portal link copied:', portalUrl)
    toast.success('Enlace del portal del proveedor copiado exitosamente', { title: 'Copiado' })
  } catch (error) {
    console.error('Error copying portal link:', error)
    toast.error('No se pudo copiar el enlace', { title: 'Error' })
  }
}

// Copy purchase order link to clipboard
const copyPurchaseLink = async () => {
  const toast = useToast()
  try {
    const baseUrl = window.location.origin
    const purchaseUrl = `${baseUrl}/abastecimiento/compra/${purchaseId}`

    // Try modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(purchaseUrl)
    } else {
      // Fallback for non-HTTPS contexts
      const textArea = document.createElement('textarea')
      textArea.value = purchaseUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    console.log('✅ Purchase link copied:', purchaseUrl)
    toast.success('Enlace de la orden copiado exitosamente', { title: 'Copiado' })
  } catch (error) {
    console.error('Error copying purchase link:', error)
    toast.error('No se pudo copiar el enlace', { title: 'Error' })
  }
}

// Handle cancel action
const handleCancelled = async () => {
  showCancelModal.value = false
  await refresh()
}
</script>
