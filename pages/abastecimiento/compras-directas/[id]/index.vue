<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSaving || isUploading || isDeleting"
      :label="isDeleting
        ? t('abastecimiento.compraDirectaDetalle.deleting')
        : (isSaving ? t('abastecimiento.compraDirectaDetalle.saving') : t('abastecimiento.compraDirectaDetalle.uploading'))"
      :hint="isDeleting
        ? t('abastecimiento.compraDirectaDetalle.deletingHint')
        : (isSaving ? t('abastecimiento.compraDirectaDetalle.savingHint') : t('abastecimiento.compraDirectaDetalle.uploadingHint'))"
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
        <!-- Purchase Number -->
        <PurchasesPurchaseInfoCard
          :label="t('ventas.detail.number')"
          icon-path="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
        >
          <p class="text-lg font-mono font-semibold text-text-primary">{{ purchase.purchase_number }}</p>
        </PurchasesPurchaseInfoCard>

        <!-- Date -->
        <PurchasesPurchaseInfoCard
          :label="t('ventas.common.fecha')"
          icon-path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        >
          <p class="text-lg font-semibold text-text-primary">{{ formatDate(purchase.purchase_date) }}</p>
        </PurchasesPurchaseInfoCard>

        <!-- Supplier -->
        <PurchasesPurchaseInfoCard
          :label="t('abastecimiento.compraDirectaDetalle.supplier')"
          icon-path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        >
          <p class="text-lg font-semibold text-text-primary">{{ purchase.supplier_name || t('abastecimiento.compraDirectaDetalle.emptySupplier') }}</p>
          <p v-if="purchase.supplier_tax_id" class="text-xs text-text-secondary">NIT: {{ purchase.supplier_tax_id }}</p>
        </PurchasesPurchaseInfoCard>

        <!-- Status Badge -->
        <PurchasesPurchaseInfoCard
          :label="t('abastecimiento.compraDirectaDetalle.currentStatus')"
          icon-path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        >
          <UiStatusBadge
            :value="isEditMode ? t('abastecimiento.compraDirectaDetalle.editing') : getStatusText(purchase.status)"
            format="text"
            :variant="isEditMode ? 'warning' : getStatusVariant(purchase.status)"
          />
        </PurchasesPurchaseInfoCard>

        <!-- Payment Method -->
        <PurchasesPurchaseInfoCard
          :label="t('abastecimiento.compraDirectaDetalle.paymentMethod')"
          icon-path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        >
          <p class="text-lg font-semibold text-text-primary">
            {{ purchase.payment_method ? resolvePaymentLabel(purchase.payment_method, purchase.payment_method_id) : '—' }}
          </p>
          <p
            v-if="isPurchaseCash"
            class="text-sm text-text-secondary"
          >
            {{ purchaseCashDrawerLabel }}
          </p>
        </PurchasesPurchaseInfoCard>
      </PurchasesPurchaseOrderHeader>

      <div
        v-if="canPayPurchase"
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
      >
        <div>
          <p class="text-sm font-semibold text-text-primary">{{ t('abastecimiento.compraDirectaDetalle.pendingPayment') }}</p>
          <p class="text-xs text-text-secondary">
            {{ t('abastecimiento.compraDirectaDetalle.pendingPaymentHelp') }}
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
          <NuxtLink
            v-if="purchase.payment_type !== 'contado'"
            :to="{
              path: '/finanzas/pagos',
              query: {
                search: purchase.purchase_number,
                highlight: purchase.id,
              },
            }"
            class="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-text-primary transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring"
          >
            {{ t('finanzas.pagos.viewInPagos') }}
          </NuxtLink>
          <button
            type="button"
            class="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-shell-cta-bg px-4 text-sm font-semibold text-shell-cta-text transition-all hover:bg-shell-cta-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring"
            @click="showPaymentPanel = true"
          >
            {{ t('abastecimiento.compraDirectaDetalle.pay') }}
          </button>
        </div>
      </div>

      <!-- Items Section -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4 sm:mb-6">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>{{ t('abastecimiento.common.items') }} ({{ editItems.length }})</span>
          </h3>

          <!-- Edit / Delete -->
          <div v-if="!isEditMode" class="flex items-center gap-2">
            <button
              type="button"
              @click="enterEditMode"
              class="px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors flex items-center space-x-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>{{ t('abastecimiento.compraDirectaDetalle.edit') }}</span>
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium text-destructive border-2 border-border rounded-lg hover:border-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              :disabled="isDeleting"
              :aria-label="t('abastecimiento.compraDirectaDetalle.deleteAria')"
              @click="requestDeletePurchase"
            >
              {{ t('abastecimiento.compraDirectaDetalle.delete') }}
            </button>
          </div>

          <div v-else class="flex items-center gap-2">
            <button
              @click="cancelEdit"
              class="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-background transition-colors"
            >
              {{ t('abastecimiento.compraDirectaDetalle.cancel') }}
            </button>
            <button
              @click="saveChanges"
              :disabled="!isFormValid || isSaving"
              class="px-3 py-1.5 text-xs font-medium text-action-primary-text bg-action-primary-bg rounded-lg hover:bg-action-primary-hover-bg transition-colors disabled:opacity-50 flex items-center space-x-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ t('abastecimiento.compraDirectaDetalle.save') }}</span>
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
                  <p class="text-[11px] text-text-secondary mb-0.5 uppercase tracking-wide">{{ t('abastecimiento.compraDirectaDetalle.price') }}</p>
                  <p class="text-sm font-medium text-text-primary">{{ formatUnitCost(getPurchaseUnitCost(item)) }}</p>
                  <p class="text-[11px] text-text-secondary">/ {{ item.purchase_unit || item.unit }}</p>
                </div>
                <div class="h-8 w-px bg-border"></div>
                <div class="text-end">
                  <p class="text-[11px] text-text-secondary mb-0.5 uppercase tracking-wide">{{ t('abastecimiento.compraDirectaDetalle.total') }}</p>
                  <p class="text-base font-bold text-text-primary">{{ formatCurrency(item.total_cost) }}</p>
                </div>
              </div>
              <div v-if="item.notes" class="px-4 pb-3">
                <p class="text-xs text-text-secondary italic">{{ item.notes }}</p>
              </div>
            </div>
            <!-- Mobile total -->
            <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <span class="text-sm font-medium text-primary">{{ t('abastecimiento.compraDirectaDetalle.purchaseTotal') }}</span>
              <span class="text-lg font-bold text-primary">{{ formatCurrency(purchase.total_amount) }}</span>
            </div>
          </div>

          <!-- Desktop: Table View -->
          <div class="hidden md:block rounded-xl border border-border overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="bg-surface-secondary border-b border-border">
                  <th class="w-8 px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">#</th>
                  <th class="px-4 py-3 text-start text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">{{ WAREHOUSE_COPY.warehouseItemColumn }}</th>
                  <th class="px-4 py-3 text-start text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">{{ t('abastecimiento.compraDirectaDetalle.invoiceReference') }}</th>
                  <th class="px-4 py-3 text-end text-xs font-semibold text-text-secondary uppercase tracking-wider w-20 border-r border-dashed border-border/60">{{ t('abastecimiento.compraDirectaDetalle.quantityShort') }}</th>
                  <th class="px-4 py-3 text-start text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">{{ t('abastecimiento.compraDirectaDetalle.unit') }}</th>
                  <th class="px-4 py-3 text-end text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">{{ t('abastecimiento.compraDirectaDetalle.price') }}</th>
                  <th class="px-4 py-3 text-end text-xs font-semibold text-text-secondary uppercase tracking-wider">{{ t('abastecimiento.compraDirectaDetalle.total') }}</th>
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
                  <td class="px-4 py-3.5 text-end border-r border-dashed border-border/60">
                    <span class="text-sm font-semibold text-text-primary tabular-nums">{{ item.purchase_quantity || item.quantity }}</span>
                  </td>
                  <td class="px-4 py-3.5 border-r border-dashed border-border/60">
                    <span class="text-sm text-text-primary">{{ item.purchase_unit || item.unit }}</span>
                  </td>
                  <td class="px-4 py-3.5 text-end border-r border-dashed border-border/60">
                    <span class="text-sm text-text-primary tabular-nums">{{ formatUnitCost(getPurchaseUnitCost(item)) }}</span>
                  </td>
                  <td class="px-4 py-3.5 text-end">
                    <span class="text-sm font-bold text-text-primary tabular-nums">{{ formatCurrency(item.total_cost) }}</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-primary/5 border-t-2 border-primary/20">
                  <td colspan="6" class="px-4 py-3.5 text-sm font-semibold text-text-secondary text-end border-r border-dashed border-border/60">{{ t('abastecimiento.compraDirectaDetalle.purchaseTotal') }}</td>
                  <td class="px-4 py-3.5 text-end">
                    <span class="text-base font-bold text-primary tabular-nums">{{ formatCurrency(purchase.total_amount) }}</span>
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
                class="text-state-danger-text hover:text-state-danger-text disabled:opacity-50 disabled:cursor-not-allowed p-1"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <!-- Quantity -->
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('abastecimiento.common.cantidad') }}</label>
                <UiDecimalInput
                  v-model="item.purchase_quantity"
                  :min="0.000001"
                  :precision="QUANTITY_PRECISION"
                  class="w-full px-3 py-2 text-sm"
                  @update:model-value="updateItemTotal(index)"
                />
              </div>

              <!-- Unit -->
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('abastecimiento.compraDirectaDetalle.unit') }}</label>
                <select
                  v-model="item.purchase_unit"
                  class="input-base w-full px-3 py-2 text-sm"
                  @change="updateItemTotal(index)"
                >
                  <option value="">{{ t('abastecimiento.compraDirectaDetalle.selectUnit') }}</option>
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
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('abastecimiento.compraDirectaDetalle.unitPrice') }}</label>
                <UiDecimalInput
                  v-model="item.unit_cost"
                  :min="0"
                  :precision="UNIT_COST_PRECISION"
                  class="w-full px-3 py-2 text-sm"
                  @update:model-value="updateItemTotal(index)"
                />
              </div>

              <!-- Total -->
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('abastecimiento.compraDirectaDetalle.total') }}</label>
                <div class="input-base w-full px-3 py-2 text-sm bg-primary/10 text-primary font-bold">
                  {{ formatCurrency(item.total_cost) }}
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="mt-3">
              <input
                v-model="item.notes"
                type="text"
                class="input-base w-full px-3 py-2 text-sm"
                :placeholder="t('abastecimiento.compraDirectaDetalle.itemNotesPlaceholder')"
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
              <span>{{ t('abastecimiento.compraDirectaDetalle.addItem') }}</span>
            </button>

            <!-- Expanded: Inline Add Form -->
            <div v-else class="p-4 bg-background">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-sm font-semibold text-text-primary">{{ t('abastecimiento.compraDirectaDetalle.newItem') }}</h4>
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
                <label class="block text-xs font-medium text-text-secondary mb-1">{{ WAREHOUSE_COPY.purchaseLineRequired }}</label>
                <UiSearchableSelect
                  v-model="newItem.ingredient_id"
                  :options="ingredientOptions"
                  :placeholder="WAREHOUSE_COPY.purchaseSearchPlaceholder"
                  @update:model-value="onNewIngredientChange"
                />
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <!-- Quantity -->
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('abastecimiento.common.cantidad') }} *</label>
                  <UiDecimalInput
                    v-model="newItem.purchase_quantity"
                    :min="0.000001"
                    :precision="QUANTITY_PRECISION"
                    class="w-full px-3 py-2 text-sm"
                  />
                </div>

                <!-- Unit Select -->
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('abastecimiento.compraDirectaDetalle.unit') }} *</label>
                  <select
                    v-model="newItem.purchase_unit"
                    :disabled="!newItem.ingredient_id"
                    class="input-base w-full px-3 py-2 text-sm"
                    :class="{ 'bg-surface-secondary cursor-not-allowed': !newItem.ingredient_id }"
                  >
                    <option value="">{{ newItem.ingredient_id ? t('abastecimiento.compraDirectaDetalle.selectUnit') : WAREHOUSE_COPY.selectWarehouseItemShort }}</option>
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
                  <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('abastecimiento.compraDirectaDetalle.unitPrice') }} *</label>
                  <UiDecimalInput
                    v-model="newItem.unit_cost"
                    :min="0"
                    :precision="UNIT_COST_PRECISION"
                    class="w-full px-3 py-2 text-sm"
                  />
                </div>

                <!-- Preview Total -->
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('abastecimiento.compraDirectaDetalle.total') }}</label>
                  <div class="input-base w-full px-3 py-2 text-sm bg-primary/10 text-primary font-bold">
                    {{ formatCurrency(roundMoney(newItem.purchase_quantity * newItem.unit_cost)) }}
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div class="mb-4">
                <input
                  v-model="newItem.notes"
                  type="text"
                  class="input-base w-full px-3 py-2 text-sm"
                  :placeholder="t('abastecimiento.compraDirectaDetalle.itemNotesPlaceholder')"
                />
              </div>

              <!-- Add Button -->
              <button
                type="button"
                @click="addNewItem"
                :disabled="!newItem.ingredient_id || newItem.purchase_quantity <= 0"
                class="w-full px-4 py-2 bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{{ t('abastecimiento.compraDirectaDetalle.addToList') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Total Summary (Edit mode only — view mode shows total in table footer) -->
        <div v-if="isEditMode" class="flex justify-end mt-4">
          <div class="bg-primary/10 border border-primary/20 rounded-xl px-5 py-3 flex items-center gap-4">
            <p class="text-sm font-medium text-primary">{{ t('abastecimiento.compraDirectaDetalle.purchaseTotal') }}</p>
            <p class="text-xl font-bold text-primary">{{ formatCurrency(editTotal) }}</p>
          </div>
        </div>

        <!-- Purchase Date (edit mode only) -->
        <div v-if="isEditMode" class="mt-4 sm:mt-6">
          <h4 class="font-medium text-text-primary text-sm sm:text-base mb-2">{{ t('abastecimiento.compraDirectaDetalle.purchaseDate') }}</h4>
          <ClientOnly>
            <VueDatePicker
              v-model="editPurchaseDate"
              :enable-time-picker="false"
              :locale="datePickerLocale"
              auto-apply
              :teleport="true"
              :max-date="new Date()"
              :format="formatPurchaseDateFn"
              input-class-name="dp-custom-input"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
              :placeholder="t('abastecimiento.compraDirectaDetalle.selectDate')"
            />
          </ClientOnly>
        </div>

        <!-- Notes -->
        <div class="mt-4 sm:mt-6">
          <h4 class="font-medium text-text-primary text-sm sm:text-base mb-2">{{ t('abastecimiento.compraDirectaDetalle.notes') }}</h4>
          <textarea
            v-if="isEditMode"
            v-model="editNotes"
            class="input-base w-full px-3 py-2 text-sm"
            rows="2"
            :placeholder="t('abastecimiento.compraDirectaDetalle.notesPlaceholder')"
          ></textarea>
          <p v-else-if="purchase.notes" class="text-xs sm:text-sm text-text-secondary bg-background p-3 sm:p-4 rounded-lg border border-border whitespace-pre-wrap">
            {{ purchase.notes }}
          </p>
          <p v-else class="text-xs sm:text-sm text-text-secondary italic">{{ t('abastecimiento.compraDirectaDetalle.noNotes') }}</p>
        </div>
      </div>

      <!-- Attachments Section -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span>{{ t('abastecimiento.compraDirectaDetalle.attachments') }}</span>
        </h3>

        <!-- Existing Attachments -->
        <div v-if="purchase.attachments?.length > 0" class="mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <component
              :is="getAttachmentUrl(attachment) ? 'a' : 'div'"
              v-for="attachment in purchase.attachments"
              :key="attachment.id"
              :href="getAttachmentUrl(attachment) || undefined"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-3 p-3 border border-border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
              :class="getAttachmentUrl(attachment) ? 'hover:bg-surface-secondary cursor-pointer' : ''"
              :aria-label="getAttachmentUrl(attachment) ? t('abastecimiento.compraDirectaDetalle.openDocument', { name: attachment.file_name }) : undefined"
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
              <span
                v-if="getAttachmentUrl(attachment)"
                class="p-2 text-primary rounded-lg transition-colors"
                :title="t('abastecimiento.compraDirectaDetalle.openNewWindow')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M6 8.25V18h9.75" />
                </svg>
              </span>
            </component>
          </div>
        </div>

        <!-- Upload New Attachments -->
        <div :class="{ 'border-t border-border pt-4': purchase.attachments?.length > 0 }">
          <h4 class="font-medium text-text-primary mb-4">{{ t('abastecimiento.compraDirectaDetalle.addDocument') }}</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Invoice Upload -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">{{ t('abastecimiento.compraDirectaDetalle.invoice') }}</label>
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
                <p class="text-sm text-text-secondary">{{ t('abastecimiento.compraDirectaDetalle.dropFile') }}</p>
                <p class="text-xs text-text-secondary mt-1">{{ t('abastecimiento.compraDirectaDetalle.acceptedFiles') }}</p>
              </div>
            </div>

            <!-- Payment Proof Upload -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">{{ t('abastecimiento.compraDirectaDetalle.paymentProof') }}</label>
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
                <p class="text-sm text-text-secondary">{{ t('abastecimiento.compraDirectaDetalle.dropFile') }}</p>
                <p class="text-xs text-text-secondary mt-1">{{ t('abastecimiento.compraDirectaDetalle.acceptedFiles') }}</p>
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

    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div
          v-if="showPaymentPanel && purchase"
          class="fixed inset-0 z-[80] bg-black/40"
          @click.self="showPaymentPanel = false"
        />
      </Transition>

      <Transition name="panel">
        <aside
          v-if="showPaymentPanel && purchase"
          class="fixed z-[90] flex flex-col bg-surface shadow-2xl
                 inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
                 md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full md:border-l md:border-border"
          role="dialog"
          aria-modal="true"
          aria-labelledby="direct-purchase-payment-title"
        >
          <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div class="h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
          </div>
          <header class="flex-shrink-0 border-b border-border bg-surface-secondary/40 px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h2 id="direct-purchase-payment-title" class="text-base font-bold leading-tight text-text-primary">{{ t('abastecimiento.compraDirectaDetalle.registerPayment') }}</h2>
                  <p class="mt-0.5 truncate text-xs leading-snug text-text-secondary">{{ purchase.purchase_number }} · {{ purchase.supplier_name || t('abastecimiento.compraDirectaDetalle.emptySupplier') }}</p>
                </div>
              </div>
              <button
                type="button"
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                :aria-label="t('abastecimiento.compraDirectaDetalle.close')"
                @click="showPaymentPanel = false"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>
          <PaymentsPaymentForm
            :purchases="[purchase]"
            compact
            @cancel="showPaymentPanel = false"
            @paid="handlePaymentRegistered"
          />
        </aside>
      </Transition>
    </Teleport>

    <AbastecimientoDirectPurchasePrintTicket
      v-if="purchase"
      :title="t('abastecimiento.compraDirectaDetalle.printTitle')"
      :purchase-number="purchase.purchase_number"
      :business-name="printBusinessName"
      :business-tax-id="printBusinessTaxId"
      :date-label="t('abastecimiento.compraDirectaDetalle.purchaseDate')"
      :date-value="formatDate(purchase.purchase_date)"
      :supplier-label="t('abastecimiento.compraDirectaDetalle.supplier')"
      :supplier-value="purchase.supplier_name || t('abastecimiento.compraDirectaDetalle.emptySupplier')"
      :supplier-tax-id="purchase.supplier_tax_id || null"
      :status-label="t('abastecimiento.compraDirectaDetalle.currentStatus')"
      :status-value="getStatusText(purchase.status)"
      :payment-label="t('abastecimiento.compraDirectaDetalle.paymentMethod')"
      :payment-value="printPaymentValue"
      :items="printTicketItems"
      :total-label="t('abastecimiento.compraDirectaDetalle.purchaseTotal')"
      :total-value="formatCurrency(purchase.total_amount)"
      :notes-label="t('abastecimiento.compraDirectaDetalle.notes')"
      :notes-value="purchase.notes || null"
    />

    <AbastecimientoDirectPurchasePrintDocument
      v-if="purchase"
      :title="t('abastecimiento.compraDirectaDetalle.printTitle')"
      :purchase-number="purchase.purchase_number"
      :business-name="printBusinessName"
      :business-tax-id="printBusinessTaxId"
      :date-label="t('abastecimiento.compraDirectaDetalle.purchaseDate')"
      :date-value="formatDate(purchase.purchase_date)"
      :supplier-label="t('abastecimiento.compraDirectaDetalle.supplier')"
      :supplier-value="purchase.supplier_name || t('abastecimiento.compraDirectaDetalle.emptySupplier')"
      :supplier-tax-id="purchase.supplier_tax_id || null"
      :status-label="t('abastecimiento.compraDirectaDetalle.currentStatus')"
      :status-value="getStatusText(purchase.status)"
      :payment-label="t('abastecimiento.compraDirectaDetalle.paymentMethod')"
      :payment-value="printPaymentValue"
      :item-name-label="WAREHOUSE_COPY.warehouseItemColumn"
      :qty-label="t('abastecimiento.compraDirectaDetalle.quantityShort')"
      :unit-label="t('abastecimiento.compraDirectaDetalle.unit')"
      :unit-cost-label="t('abastecimiento.compraDirectaDetalle.unitPrice')"
      :line-total-label="t('abastecimiento.compraDirectaDetalle.total')"
      :items="printDocumentItems"
      :total-label="t('abastecimiento.compraDirectaDetalle.purchaseTotal')"
      :total-value="formatCurrency(purchase.total_amount)"
      :notes-label="t('abastecimiento.compraDirectaDetalle.notes')"
      :notes-value="purchase.notes || null"
    />

    <UiPrintFormatChooserModal
      v-model="printFormatModalOpen"
      :title="t('abastecimiento.compraDirectaDetalle.printFormatTitle')"
      :message="t('abastecimiento.compraDirectaDetalle.printFormatMessage')"
      :ticket-label="t('abastecimiento.compraDirectaDetalle.printFormatTicket')"
      :ticket-hint="t('abastecimiento.compraDirectaDetalle.printFormatTicketHint')"
      :document-label="t('abastecimiento.compraDirectaDetalle.printFormatDocument')"
      :document-hint="t('abastecimiento.compraDirectaDetalle.printFormatDocumentHint')"
      :cancel-label="t('abastecimiento.compraDirectaDetalle.printFormatCancel')"
      @select="onPrintFormatSelect"
    />

    <UiConfirmActionModal
      v-model="showDeleteConfirm"
      :title="t('abastecimiento.compraDirectaDetalle.deleteConfirmTitle')"
      :message="t('abastecimiento.compraDirectaDetalle.deleteConfirmMessage')"
      :confirm-label="t('abastecimiento.compraDirectaDetalle.delete')"
      :cancel-label="t('abastecimiento.compraDirectaDetalle.cancel')"
      :loading-label="t('abastecimiento.compraDirectaDetalle.deleting')"
      variant="destructive"
      :loading="isDeleting"
      @confirm="performDeletePurchase"
    />
  </div>
</template>

<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { computed, inject, nextTick, onMounted, onUnmounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { localeToNumberFormatTag, normalizeCurrencyCode } from '~/utils/currencyDisplay'
import { useQuery, useQueryCache } from '@pinia/colada'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'
import { useWarehouseCopy } from '~/composables/useWarehouseCopy'
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { usePaymentLabel } from '~/composables/usePaymentLabel'
import { notifyCajaPrintResult, useCajaTicketPrint } from '~/composables/useCajaTicketPrint'
import { collectThermalTicketText } from '~/utils/receiptTicketPlainText'
import { isCashPaymentSlug, readFromCashDrawer } from '~/utils/paymentDefaults'
import type { PrintFormatChoice } from '~/components/ui/PrintFormatChooserModal.vue'

const route = useRoute()
const purchaseId = route.params.id as string
const toast = useToast()
const cache = useQueryCache()
const { t, locale } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()
const { printElement: printTicketElement } = useCajaTicketPrint()
const { settingsData } = useReceiptPrintSettings()
const setHeaderAction = inject<(action: { label: string; ariaLabel?: string; icon?: boolean | 'printer'; iconOnly?: boolean; handler: () => void } | undefined) => void>('setHeaderAction')
const printFormatModalOpen = ref(false)
const isDeleting = ref(false)

const { paymentGroups, isLoading: pmGroupsLoading, fetchPaymentMethods } = usePaymentMethods()
fetchPaymentMethods()
const { resolveLabel: _resolvePaymentLabel } = usePaymentLabel(computed(() => [...paymentGroups.value]))
function resolvePaymentLabel(slug: string | null | undefined, methodId?: string | null): string {
  if (pmGroupsLoading.value) return '—'
  return _resolvePaymentLabel(slug, methodId)
}

const datePickerLocale = computed(() => normalizeUiLocale(locale.value))
const formatPurchaseDateFn = (date: Date) => fnsFormat(date, 'dd/MM/yy', { locale: toDateFnsLocale(locale.value) })

useHead({
  title: () => t('abastecimiento.head.comprasDirectas')
})

// State
const isUploading = ref(false)
const isSaving = ref(false)
const isEditMode = ref(false)
const showAddItemForm = ref(false)
const showPaymentPanel = ref(false)
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
const isPurchaseCash = computed(() => isCashPaymentSlug(purchase.value?.payment_method))
const purchaseCashDrawerLabel = computed(() =>
  readFromCashDrawer(purchase.value)
    ? t('abastecimiento.compraDirectaDetalle.fromCashDrawerYes')
    : t('abastecimiento.compraDirectaDetalle.fromCashDrawerNo'),
)
const fiscalData = computed(() => settingsData.value?.data?.fiscal_data ?? null)
const printBusinessName = computed(() => fiscalData.value?.business_name?.trim() || null)
const printBusinessTaxId = computed(() => fiscalData.value?.nit?.trim() || null)
const printPaymentValue = computed(() => {
  const current = purchase.value
  if (!current?.payment_method) return '—'
  const method = resolvePaymentLabel(current.payment_method, current.payment_method_id)
  if (!isPurchaseCash.value) return method
  return `${method} · ${purchaseCashDrawerLabel.value}`
})
const isLoading = computed(() => !purchaseResponse.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && purchaseResponse.value != null)
const refresh = refetch
const payableStatuses = new Set(['confirmed', 'preparing', 'received', 'invoiced'])
const canPayPurchase = computed(() => {
  const current = purchase.value
  if (!current) return false
  if (!payableStatuses.has(current.status)) return false
  return !current.paid_at && !current.payment_amount
})

async function handlePaymentRegistered() {
  showPaymentPanel.value = false
  await refetch()
}

const showDeleteConfirm = ref(false)

function requestDeletePurchase() {
  if (isDeleting.value) return
  showDeleteConfirm.value = true
}

async function performDeletePurchase() {
  if (isDeleting.value) return

  isDeleting.value = true
  try {
    await $fetch(`/api/suppliers/purchases/direct/${purchaseId}`, {
      method: 'DELETE',
    })
    showDeleteConfirm.value = false
    cache.invalidateQueries({ key: ['suppliers', 'direct-purchases'] })
    cache.invalidateQueries({ key: ['purchase-direct', purchaseId] })
    await navigateTo('/abastecimiento/compras-directas')
  } catch (error: any) {
    console.error('Error deleting direct purchase:', error)
    showDeleteConfirm.value = false
    alert(error?.data?.detail || t('abastecimiento.compraDirectaDetalle.deleteError'))
  } finally {
    isDeleting.value = false
  }
}

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

const MONEY_PRECISION = 0
const UNIT_COST_PRECISION = 6
const QUANTITY_PRECISION = 6

const roundMoney = (value: number) => roundDecimal(value, MONEY_PRECISION)
const roundUnitCost = (value: number) => roundDecimal(value, UNIT_COST_PRECISION)

function roundDecimal(value: number, precision: number) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** precision
  return Math.round((value + Number.EPSILON) * factor) / factor
}

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
    const purchaseUnitCost = pqty > 0 ? roundUnitCost((item.total_cost || 0) / pqty) : 0
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
  return qty > 0 ? roundUnitCost((item.total_cost || 0) / qty) : 0
}

const updateItemTotal = (index: number) => {
  const item = editItems.value[index]
  item.total_cost = roundMoney((item.purchase_quantity || 0) * (item.unit_cost || 0))
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
    total_cost: roundMoney(newItem.value.purchase_quantity * newItem.value.unit_cost),
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

    toast.success(t('abastecimiento.compraDirectaDetalle.saveSuccess'), { title: t('abastecimiento.compraDirectaDetalle.savedTitle') })
    isEditMode.value = false
    await refresh()
  } catch (error: any) {
    console.error('Error saving changes:', error)
    toast.error(error.data?.detail || t('abastecimiento.compraDirectaDetalle.saveError'), { title: t('common.error') })
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
    toast.error(t('abastecimiento.compraDirectaDetalle.fileTooLarge'), { title: t('common.error') })
    return
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    toast.error(t('abastecimiento.compraDirectaDetalle.invalidFileType'), { title: t('common.error') })
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

    toast.success(t('abastecimiento.compraDirectaDetalle.fileUploaded', {
      type: t(type === 'invoice' ? 'abastecimiento.compraDirectaDetalle.invoice' : 'abastecimiento.compraDirectaDetalle.paymentProof'),
    }), { title: t('abastecimiento.compraDirectaDetalle.uploadedTitle') })
    await refresh()
  } catch (error: any) {
    console.error('Error uploading file:', error)
    toast.error(error.data?.detail || t('abastecimiento.compraDirectaDetalle.uploadError'), { title: t('common.error') })
  } finally {
    isUploading.value = false
  }
}

// Formatting methods
const { formatDate: _fmtDate, formatCurrency, currencyCode, uiLocale } = useFormatters()
const formatDate = (date: string) => _fmtDate(date)

const formatUnitCost = (value: number) => {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 0
  return new Intl.NumberFormat(localeToNumberFormatTag(uiLocale.value), {
    style: 'currency',
    currency: normalizeCurrencyCode(currencyCode.value),
    minimumFractionDigits: 0,
    maximumFractionDigits: UNIT_COST_PRECISION,
  }).format(numeric)
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'received': t('abastecimiento.common.recibida'),
    'invoiced': t('abastecimiento.common.facturada'),
    'paid': t('abastecimiento.common.pagada')
  }
  return statusMap[status] || status
}

const getStatusVariant = (status: string) => {
  const variantMap: Record<string, 'success' | 'warning' | 'info' | 'secondary'> = {
    received: 'info',
    invoiced: 'warning',
    paid: 'success'
  }
  return variantMap[status] || 'secondary'
}


const getAttachmentTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'invoice': t('abastecimiento.compraDirectaDetalle.attachmentInvoice'),
    'payment_proof': t('abastecimiento.compraDirectaDetalle.attachmentPayment'),
    'delivery_photo': t('abastecimiento.compraDirectaDetalle.attachmentDelivery'),
    'quality_photo': t('abastecimiento.compraDirectaDetalle.attachmentQuality'),
    'other': t('abastecimiento.compraDirectaDetalle.attachmentOther')
  }
  return typeMap[type] || type
}

const getAttachmentUrl = (attachment: any) =>
  attachment?.file_url || attachment?.s3_url || attachment?.url || ''

const printTicketItems = computed(() => {
  const items = purchase.value?.items || []
  return items.map((item: any) => {
    const qty = item.purchase_quantity || item.quantity || 0
    const unit = item.purchase_unit || item.unit || ''
    return {
      name: item.ingredient_name || '—',
      qtyLabel: `${qty} ${unit}`.trim(),
      unitCostLabel: formatUnitCost(getPurchaseUnitCost(item)),
      totalLabel: formatCurrency(item.total_cost || 0),
    }
  })
})

const printDocumentItems = computed(() => {
  const items = purchase.value?.items || []
  return items.map((item: any) => {
    const qty = item.purchase_quantity || item.quantity || 0
    const unit = item.purchase_unit || item.unit || ''
    return {
      name: item.ingredient_name || '—',
      qtyLabel: String(qty),
      unit,
      unitCostLabel: formatUnitCost(getPurchaseUnitCost(item)),
      totalLabel: formatCurrency(item.total_cost || 0),
      notes: item.notes || null,
    }
  })
})

const openPrintFormatChooser = () => {
  if (!purchase.value) {
    toast.error(t('abastecimiento.compraDirectaDetalle.printNoData'))
    return
  }
  printFormatModalOpen.value = true
}

const onPrintFormatSelect = (format: PrintFormatChoice) => {
  if (format === 'ticket') {
    void printPurchaseTicket()
    return
  }
  void printPurchaseDocument()
}

const printPurchaseTicket = async () => {
  if (!purchase.value) {
    toast.error(t('abastecimiento.compraDirectaDetalle.printNoData'))
    return
  }
  document.body.classList.add('printing-receipt-ticket')
  await nextTick()
  const cleanup = () => {
    document.body.classList.remove('printing-receipt-ticket')
    window.removeEventListener('afterprint', cleanup)
  }
  const printResult = await printTicketElement('direct-purchase-print-ticket', {
    browserPrint: () => {},
    getElementHtml: () => {
      if (typeof document === 'undefined') return null
      return collectThermalTicketText(document.querySelector('#direct-purchase-print-ticket')) || null
    },
  })
  if (printResult.mode === 'bridge') {
    cleanup()
    notifyCajaPrintResult(printResult, {
      t,
      toast,
      onRetry: () => { void printPurchaseTicket() },
      onBrowserPrint: () => {
        document.body.classList.add('printing-receipt-ticket')
        window.addEventListener('afterprint', cleanup)
        window.setTimeout(cleanup, 1500)
        window.print()
      },
    })
    return
  }
  if (printResult.mode === 'skipped') {
    cleanup()
    return
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
  window.setTimeout(cleanup, 1500)
}

const printPurchaseDocument = async () => {
  if (!purchase.value) {
    toast.error(t('abastecimiento.compraDirectaDetalle.printNoData'))
    return
  }
  document.body.classList.add('printing-letter-document')
  await nextTick()
  const cleanup = () => {
    document.body.classList.remove('printing-letter-document')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
  window.setTimeout(cleanup, 1500)
}

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  setRefreshHandler(refetch)
  setHeaderAction?.({
    label: t('abastecimiento.compraDirectaDetalle.print'),
    ariaLabel: t('abastecimiento.compraDirectaDetalle.printAria'),
    icon: 'printer',
    iconOnly: true,
    handler: () => { openPrintFormatChooser() },
  })
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
  setHeaderAction?.(undefined)
})
</script>

<style>
@media print {
  body.printing-receipt-ticket * {
    visibility: hidden !important;
  }
  body.printing-receipt-ticket #direct-purchase-print-ticket,
  body.printing-receipt-ticket #direct-purchase-print-ticket * {
    visibility: visible !important;
  }
  body.printing-receipt-ticket #direct-purchase-print-ticket {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 72mm;
  }

  body.printing-letter-document * {
    visibility: hidden !important;
  }
  body.printing-letter-document #direct-purchase-print-document,
  body.printing-letter-document #direct-purchase-print-document * {
    visibility: visible !important;
  }
  body.printing-letter-document #direct-purchase-print-document {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
</style>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
