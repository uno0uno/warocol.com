<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="page-layout">
      <div class="flex flex-col gap-3 md:gap-4">
        <!-- Cost Warning Banner -->
        <div
          v-if="costIssueCount > 0 && !bannerDismissed && !marginNegativeOnly"
          role="alert"
          class="flex items-center gap-2 px-3 py-2 bg-status-critical-bg border border-destructive/20 rounded-lg"
        >
          <svg class="w-4 h-4 text-status-critical-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="flex-1 min-w-0 truncate text-sm leading-5">
            <span class="font-bold text-status-critical-text">{{ t('menu.productos.costWarning', { count: costIssueCount, suffix: costIssueCount !== 1 ? 's' : '' }) }}</span>
            <NuxtLink
              to="/abastecimiento/calidad-datos"
              class="font-semibold text-status-critical-text hover:underline whitespace-nowrap"
            >{{ t('menu.productos.viewDataQuality') }}</NuxtLink>
          </p>
          <button
            class="flex-shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-status-critical-text hover:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/30"
            :aria-label="t('menu.productos.closeWarning')"
            @click="bannerDismissed = true"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <MenuCatalogFiltersBar
          show-product-type-filter
          table-header-filters
          :show-qr="showTableQrColumn"
          :show-online="showOnlineControls"
          @search="onCatalogSearch"
          @clear="onCatalogClear"
          @filter-change="currentPage = 1"
        >
          <template #trailing>
            <div class="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap min-h-[44px] transition-all focus:outline-none focus:ring-2"
                :class="editMode
                  ? 'bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus:ring-shell-action-focus-ring'
                  : 'bg-shell-cta-bg text-shell-cta-text hover:bg-shell-cta-hover-bg focus:ring-shell-cta-focus-ring'"
                @click="onToggleEditMode"
              >
                <span class="hidden sm:inline">{{ editMode ? t('menu.productos.viewCatalog') : t('menu.productos.editMode') }}</span>
                <span class="sm:hidden">{{ editMode ? t('menu.productos.viewShort') : t('menu.productos.editShort') }}</span>
              </button>
              <NuxtLink
                to="/menu/productos/crear"
                class="flex min-h-[44px] items-center rounded-lg bg-shell-cta-bg px-4 py-2 text-center text-sm font-medium text-shell-cta-text whitespace-nowrap transition-all hover:bg-shell-cta-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring"
              >
                <span class="hidden sm:inline">{{ t('menu.productos.newProduct') }}</span>
                <span class="sm:hidden">{{ t('menu.productos.newShort') }}</span>
              </NuxtLink>
            </div>
          </template>
        </MenuCatalogFiltersBar>

        <MenuCatalogBulkBar
          v-if="selectedIds.length > 0"
          variant="selection"
          v-model:bulk-category-id="bulkCategoryId"
          v-model:bulk-availability="bulkAvailability"
          v-model:bulk-station-id="bulkStationId"
          v-model:bulk-online="bulkOnline"
          v-model:bulk-qr="bulkQr"
          :selected-count="selectedIds.length"
          :edit-mode="editMode"
          :is-submitting="isSubmitting"
          :can-apply="canBulkApply"
          :show-station="showComandasStations"
          :show-online="showOnlineControls"
          :show-qr="showTableQrColumn"
          :categories="categories"
          :stations="stations"
          :availability-options="availabilityBulkOptions"
          :channel-options="channelBulkOptions"
          @apply="onBulkApply"
          @clear-selection="clearSelection"
          @cancel="() => cancelEditOperation(clearSelection)"
          @delete="openBulkDeleteModal"
        />

        <MenuCatalogBulkBar
          v-else-if="editMode"
          variant="edit-only"
          :is-submitting="isSubmitting"
          :can-save-edit="hasChanges && canSubmit"
          @apply="saveChanges"
          @cancel="() => cancelEditOperation(clearSelection)"
        />

        <!-- Responsive Data View (Mobile Cards + Desktop Table) -->
        <UiResponsiveDataView
          :columns="productosTableColumns"
          :data="displayProducts"
          :row-class="getRowClass"
          :empty-message="emptyMessage"
          :empty-sub-message="emptySubMessage"
          variant="default"
          row-size="sm"
          :sort-field="tableSortField"
          :sort-direction="tableSortDirection"
          @sort="handleProductsTableSort"
        >
          <!-- Checkbox header: select all (same pattern as ventas/ordenes) -->
          <template #header-select>
            <div class="flex items-center justify-center">
              <UiBulkSelectCheckbox :checked="allPageSelected" @change="toggleSelectAll" />
            </div>
          </template>

          <template #header-name>
            <UiTableHeaderFilter
              :title="t('menu.common.producto')"
              column-key="name"
              sortable
              :sort-field="tableSortField"
              :sort-direction="tableSortDirection"
              filter-type="none"
              class="min-w-[11rem]"
              @sort="handleProductsTableSort"
            />
          </template>

          <template #header-tipo>
            <UiTableHeaderFilter
              v-model="productTypeFilter"
              :title="t('menu.common.tipo')"
              filter-type="select"
              :options="productTypeHeaderOptions"
              :all-label="t('menu.filters.typeAll')"
              align="left"
            />
          </template>

          <template #header-category_name>
            <UiTableHeaderFilter
              v-model="categoryFilter"
              :title="t('menu.common.categoria')"
              filter-type="select"
              :options="categoryHeaderOptions"
              :all-label="t('menu.filters.typeAll')"
              align="left"
            />
          </template>

          <template #header-price>
            <UiTableHeaderFilter
              :title="t('menu.common.precio')"
              column-key="price"
              sortable
              :sort-field="tableSortField"
              :sort-direction="tableSortDirection"
              filter-type="none"
              align="right"
              @sort="handleProductsTableSort"
            />
          </template>

          <template #header-margen_operativo>
            <UiTableHeaderFilter
              v-model="marginNegativeOnly"
              :title="t('menu.productos.marginOperational')"
              column-key="margen_operativo"
              sortable
              :sort-field="tableSortField"
              :sort-direction="tableSortDirection"
              filter-type="toggle"
              :toggle-label="t('menu.filters.marginNegative')"
              align="center"
              @sort="handleProductsTableSort"
            />
          </template>

          <template #header-is_available>
            <UiTableHeaderFilter
              v-model="statusFilter"
              :title="t('menu.common.estado')"
              filter-type="select"
              :options="statusHeaderOptions"
              :all-label="t('menu.filters.typeAll')"
              align="center"
            />
          </template>

          <template v-if="showOnlineControls" #header-is_available_online>
            <UiTableHeaderFilter
              v-model="onlineOnly"
              :title="t('menu.filters.onlineOnly')"
              filter-type="toggle"
              :toggle-label="t('menu.filters.onlineOnly')"
              align="center"
            />
          </template>

          <template v-if="showTableQrColumn" #header-is_available_table_qr>
            <UiTableHeaderFilter
              v-model="qrOnly"
              :title="t('menu.filters.qrOnly')"
              filter-type="toggle"
              :toggle-label="t('menu.filters.qrOnly')"
              align="center"
            />
          </template>

          <template #cell-select="{ row }">
            <UiBulkSelectCheckbox
              v-if="row && !isOpenSaleShell(row)"
              :checked="selectedIds.includes(row.id)"
              @change="toggleSelect(row.id)"
            />
          </template>

          <!-- Mobile Card Slot -->
          <template #card="{ item, index }">
            <div
              class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors"
              :class="[
                catalogRowClass(item, index),
                !editMode ? 'hover:bg-surface-secondary cursor-pointer' : '',
              ]"
              @click="!editMode && onProductRowClick(item)"
            >
              <div class="w-10 h-10 rounded-md bg-surface-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="item.name"
                  loading="lazy"
                  class="w-full h-full object-cover"
                />
                <svg v-else class="w-5 h-5 text-text-secondary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0" @click.stop="editMode && !isOpenSaleShell(item)">
                <template v-if="editMode && !isOpenSaleShell(item)">
                  <label class="sr-only" :for="`mobile-name-${item.id}`">{{ t('menu.common.nombre') }}</label>
                  <input
                    :id="`mobile-name-${item.id}`"
                    v-model="ensureDraft(item).name"
                    type="text"
                    class="input-base w-full py-1.5 px-2 text-sm font-medium"
                    :placeholder="t('menu.productos.productNamePlaceholder')"
                  />
                  <UiFilterSelect
                    v-model="ensureDraft(item).category_id"
                    :placeholder="t('menu.filters.categoryPlaceholder')"
                    :aria-label="t('menu.productos.categoryOf', { name: item.name })"
                    :options="categories.map(c => ({ label: c.name, value: c.id }))"
                    class="mt-2 min-w-0"
                  />
                  <div class="flex flex-wrap gap-2 mt-2">
                    <div class="relative w-fit shrink-0">
                      <span class="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">$</span>
                      <label class="sr-only" :for="`mobile-price-${item.id}`">{{ t('menu.common.precio') }}</label>
                      <UiDecimalInput
                        :id="`mobile-price-${item.id}`"
                        v-model="ensureDraft(item).price"
                        :min="0"
                        :precision="0"
                        class="input-base input-money w-fit min-w-[7rem] max-w-none pl-5 pr-2 py-1.5 text-sm tabular-nums text-right"
                        :style="{ width: moneyInputWidth(ensureDraft(item).price) }"
                        :placeholder="t('menu.common.precio')"
                      />
                    </div>
                    <div class="relative w-fit shrink-0">
                      <label class="sr-only" :for="`mobile-costo-${item.id}`">{{ t('menu.productos.miCosto') }}</label>
                      <UiDecimalInput
                        :id="`mobile-costo-${item.id}`"
                        v-model="ensureDraft(item).costo_percibido"
                        :min="0"
                        :precision="0"
                        class="input-base input-money w-fit min-w-[7rem] max-w-none px-2 py-1.5 text-sm tabular-nums text-right"
                        :style="{ width: moneyInputWidth(ensureDraft(item).costo_percibido) }"
                        :placeholder="t('menu.productos.miCosto')"
                      />
                    </div>
                  </div>
                  <div
                    v-if="showOnlineControls || showTableQrColumn"
                    class="flex flex-wrap items-center gap-4 mt-2 pt-2 border-t border-border/60"
                    @click.stop
                  >
                    <label
                      v-if="showOnlineControls"
                      class="flex items-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      <span class="text-xs text-text-secondary whitespace-nowrap">{{ t('menu.filters.onlineOnly') }}</span>
                      <button
                        type="button"
                        role="switch"
                        :aria-checked="item.is_available_online"
                        class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                        :class="item.is_available_online ? 'bg-success' : 'bg-titan-300'"
                        @click="toggleDraftOnline(item)"
                      >
                        <span
                          class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                          :class="item.is_available_online ? 'translate-x-4' : 'translate-x-0.5'"
                        />
                      </button>
                    </label>
                    <label
                      v-if="showTableQrColumn"
                      class="flex items-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      <span class="text-xs text-text-secondary whitespace-nowrap">{{ t('menu.filters.qrOnly') }}</span>
                      <button
                        type="button"
                        role="switch"
                        :aria-checked="item.is_available_table_qr"
                        class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                        :class="item.is_available_table_qr ? 'bg-success' : 'bg-titan-300'"
                        @click="toggleDraftTableQr(item)"
                      >
                        <span
                          class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                          :class="item.is_available_table_qr ? 'translate-x-4' : 'translate-x-0.5'"
                        />
                      </button>
                    </label>
                  </div>
                </template>
                <template v-else>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-sm font-semibold text-text-primary">{{ toTitleCase(item.name) }}</span>
                    <UiStatusBadge
                      v-if="!isOpenSaleShell(item)"
                      :value="productTipoLabel(item)"
                      format="text"
                      :variant="isResaleProduct(item) ? 'primary' : 'secondary'"
                      size="sm"
                      class="flex-shrink-0"
                    />
                  </div>
                  <UiStatusBadge
                    v-if="isOpenSaleShell(item)"
                    value="POS"
                    :title="t('menu.productos.openSaleTitle')"
                    format="text"
                    variant="secondary"
                    size="sm"
                    class="mt-0.5"
                  />
                  <p class="text-xs text-text-secondary mt-0.5">
                    <template v-if="isOpenSaleShell(item)">
                      {{ t('menu.productos.openSalePrice') }}
                    </template>
                    <template v-else>
                      {{ item.category_name || t('menu.common.sinCategoria') }} · {{ formatCurrency(item.price) }}
                    </template>
                  </p>
                  <p class="text-xs text-text-tertiary flex flex-wrap items-center gap-1">
                    <span>{{ t('menu.productos.myCostLabel') }}</span>
                    <span v-if="hasCostValue(item.costo_percibido)">{{ formatCostCell(item.costo_percibido) }}</span>
                    <UiStatusBadge v-else value="N/A" :title="t('menu.productos.noCost')" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
                  </p>
                </template>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span
                  v-if="!isOpenSaleShell(item) && businessProfile?.comandas_enabled && resolveProductStation(item)"
                  class="inline-flex items-center justify-center min-h-[44px] min-w-[44px]"
                  :title="resolveProductStation(item)!.name"
                  :aria-label="`Cocina: ${resolveProductStation(item)!.name}`"
                >
                  <span
                    class="inline-block w-3 h-3 rounded-full ring-2 ring-surface shadow-sm flex-shrink-0"
                    :style="{ backgroundColor: resolveProductStation(item)!.color }"
                  />
                </span>
                <UiStatusBadge
                  v-if="!isOpenSaleShell(item) && marginOperativoPct(item) !== null"
                  :value="marginOperativoPct(item)!"
                  format="percentage"
                  variant="secondary"
                  size="sm"
                  :title="t('menu.productos.marginOperational')"
                />
                <UiStatusBadge
                  v-if="isOpenSaleShell(item)"
                  :value="t('menu.productos.customizeOpenSale')"
                  :title="t('menu.productos.customizeOpenSale')"
                  format="text"
                  variant="secondary"
                  size="sm"
                />
                <UiStatusBadge
                  v-else
                  :value="item.is_available ? t('menu.common.disponible') : t('menu.common.noDisponible')"
                  format="text"
                  :variant="item.is_available ? 'success' : 'secondary'"
                  size="sm"
                />
                <UiStatusBadge
                  v-if="!productTracksInventory(item)"
                  :value="t('menu.productos.noInventory')"
                  format="text"
                  variant="secondary"
                  size="sm"
                />
              </div>
            </div>
          </template>


          <!-- Desktop Table Cell Customizations -->
          <template #cell-name="{ value, item }">
            <div class="flex items-center gap-3 min-w-0" @click.stop="editMode && !isOpenSaleShell(item)">
              <div class="w-8 h-8 rounded-md bg-surface-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="value"
                  loading="lazy"
                  class="w-full h-full object-cover"
                />
                <svg v-else class="w-4 h-4 text-text-secondary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                v-if="editMode && !isOpenSaleShell(item)"
                v-model="ensureDraft(item).name"
                type="text"
                class="input-base min-w-[140px] max-w-[220px] py-1.5 px-2 text-sm font-medium"
                :aria-label="t('menu.productos.nameOf', { name: item.name })"
                :placeholder="t('menu.common.nombre')"
              />
              <template v-else>
                <span class="text-sm font-medium text-text-primary whitespace-nowrap">{{ toTitleCase(value) }}</span>
                <UiStatusBadge
                  v-if="isOpenSaleShell(item)"
                  :value="t('menu.productos.system')"
                  :title="t('menu.productos.openSaleTitle')"
                  format="text"
                  variant="secondary"
                  size="sm"
                />
              </template>
            </div>
          </template>

          <template #cell-tipo="{ item }">
            <UiStatusBadge
              v-if="!isOpenSaleShell(item)"
              :value="productTipoLabel(item)"
              format="text"
              :variant="isResaleProduct(item) ? 'primary' : 'secondary'"
              size="sm"
            />
            <UiStatusBadge
              v-else
              :value="t('menu.productos.system')"
              :title="t('menu.productos.openSaleTitle')"
              format="text"
              variant="secondary"
              size="sm"
            />
          </template>

          <template #cell-category_name="{ value, item }">
            <UiFilterSelect
              v-if="editMode && !isOpenSaleShell(item)"
              v-model="ensureDraft(item).category_id"
              :placeholder="t('menu.filters.categoryPlaceholder')"
              :aria-label="t('menu.productos.categoryOf', { name: item.name })"
              :options="categories.map(c => ({ label: c.name, value: c.id }))"
              class="min-w-[140px]"
              @click.stop
            />
            <UiStatusBadge
              v-else-if="isOpenSaleShell(item)"
              value="N/A"
              :title="t('menu.productos.noMenuCategory')"
              format="text"
              variant="secondary"
              size="sm"
              class="whitespace-nowrap"
            />
            <span v-else class="text-sm text-text-secondary whitespace-nowrap">{{ value || t('menu.common.sinCategoria') }}</span>
          </template>

          <template #cell-price="{ value, item }">
            <div
              v-if="editMode && !isOpenSaleShell(item)"
              class="relative w-fit ml-auto shrink-0"
              @click.stop
            >
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">$</span>
              <UiDecimalInput
                v-model="ensureDraft(item).price"
                :min="0"
                :precision="0"
                class="input-base input-money w-fit min-w-[7rem] max-w-none pl-5 pr-2 py-1.5 text-sm text-right tabular-nums"
                :style="{ width: moneyInputWidth(ensureDraft(item).price) }"
                :aria-label="`Precio de ${item.name}`"
                placeholder="0"
              />
            </div>
            <UiStatusBadge
              v-else-if="isOpenSaleShell(item)"
              :value="t('menu.productos.sellPrice')"
              :title="t('menu.productos.sellPriceDefinedByCashier')"
              format="text"
              variant="secondary"
              size="sm"
              class="whitespace-nowrap"
            />
            <span v-else class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-costo_percibido="{ value, item }">
            <div class="flex justify-end">
              <div
                v-if="editMode && !isOpenSaleShell(item)"
                class="relative w-fit ml-auto shrink-0"
                @click.stop
              >
                <UiDecimalInput
                  v-model="ensureDraft(item).costo_percibido"
                  :min="0"
                  :precision="0"
                  class="input-base input-money w-fit min-w-[7rem] max-w-none px-2 py-1.5 text-sm text-right tabular-nums"
                  :style="{ width: moneyInputWidth(ensureDraft(item).costo_percibido) }"
                  :aria-label="`Mi costo de ${item.name}`"
                  placeholder="—"
                />
              </div>
              <UiStatusBadge
                v-else-if="isOpenSaleShell(item)"
                value="N/A"
                :title="t('menu.productos.notApplicable')"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
              <span v-else-if="hasCostValue(value)" class="text-sm text-text-primary tabular-nums">
                {{ formatCostCell(value) }}
              </span>
              <UiStatusBadge v-else value="N/A" :title="t('menu.productos.noCost')" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
            </div>
          </template>

          <template #cell-margen_operativo="{ row }">
            <div class="flex justify-end">
              <UiStatusBadge
                v-if="isOpenSaleShell(row)"
                value="N/A"
                :title="t('menu.productos.notApplicable')"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
              <UiStatusBadge
                v-else-if="marginOperativoPct(row) !== null"
                :value="marginOperativoPct(row)!"
                format="percentage"
                :variant="(marginOperativoPct(row) ?? 0) >= 0 ? 'success' : 'secondary'"
                size="sm"
              />
              <UiStatusBadge
                v-else
                value="N/A"
                :title="t('menu.productos.noMargin')"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
            </div>
          </template>

          <!-- REMOVED: cell-controla_stock - ALL products now control inventory automatically -->

          <template #cell-is_available="{ value, item }">
            <div class="flex justify-center">
              <UiStatusBadge
                v-if="isOpenSaleShell(item)"
                :value="t('menu.productos.customizeOpenSale')"
                :title="t('menu.productos.customizeOpenSale')"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap max-w-[7rem]"
              />
              <UiStatusBadge
                v-else
                :value="value ? t('menu.common.disponible') : t('menu.common.noDisponible')"
                format="text"
                :variant="value ? 'success' : 'secondary'"
                size="sm"
              />
            </div>
          </template>

          <template v-if="showOnlineControls" #cell-is_available_online="{ row }">
            <div class="flex justify-center" @click.stop="editMode && !isOpenSaleShell(row)">
              <UiStatusBadge
                v-if="isOpenSaleShell(row)"
                :value="t('menu.productos.notApplicable')"
                :title="t('menu.productos.notApplicable')"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
              <button
                v-else-if="editMode"
                type="button"
                role="switch"
                :aria-checked="row.is_available_online"
                :aria-label="row.is_available_online ? t('menu.productos.disableDeliveryFor', { name: row.name }) : t('menu.productos.enableDeliveryFor', { name: row.name })"
                :title="row.is_available_online ? t('menu.productos.disableDelivery') : t('menu.productos.enableDelivery')"
                class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                :class="row.is_available_online ? 'bg-success' : 'bg-titan-300'"
                @click="toggleDraftOnline(row)"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                  :class="row.is_available_online ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
              <button
                v-else
                type="button"
                @click="toggleOnlineAvailability(row)"
                role="switch"
                :aria-checked="row.is_available_online"
                :disabled="togglingIds.has(row.id)"
                :aria-label="row.is_available_online ? t('menu.productos.disableDeliveryFor', { name: row.name }) : t('menu.productos.enableDeliveryFor', { name: row.name })"
                :title="row.is_available_online ? t('menu.productos.disableDelivery') : t('menu.productos.enableDelivery')"
                class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                :class="[
                  row.is_available_online ? 'bg-success' : 'bg-titan-300',
                  togglingIds.has(row.id) ? 'cursor-wait opacity-70' : 'cursor-pointer'
                ]"
              >
                <svg
                  v-if="togglingIds.has(row.id)"
                  class="animate-spin h-3.5 w-3.5 text-white"
                  :class="row.is_available_online ? 'translate-x-4' : 'translate-x-0.5'"
                  fill="none" viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span
                  v-else
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                  :class="row.is_available_online ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
            </div>
          </template>

          <template v-if="showTableQrColumn" #cell-is_available_table_qr="{ row }">
            <div class="flex justify-center" @click.stop="editMode && !isOpenSaleShell(row)">
              <UiStatusBadge
                v-if="isOpenSaleShell(row)"
                :value="t('menu.productos.notApplicable')"
                :title="t('menu.productos.notApplicable')"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
              <button
                v-else-if="editMode"
                type="button"
                role="switch"
                :aria-checked="row.is_available_table_qr"
                :aria-label="row.is_available_table_qr ? t('menu.productos.disableQrFor', { name: row.name }) : t('menu.productos.enableQrFor', { name: row.name })"
                :title="row.is_available_table_qr ? t('menu.productos.disableQr') : t('menu.productos.enableQr')"
                class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                :class="row.is_available_table_qr ? 'bg-success' : 'bg-titan-300'"
                @click="toggleDraftTableQr(row)"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                  :class="row.is_available_table_qr ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
              <button
                v-else
                type="button"
                @click="toggleTableQrAvailability(row)"
                role="switch"
                :aria-checked="row.is_available_table_qr"
                :disabled="togglingTableQrIds.has(row.id)"
                :aria-label="row.is_available_table_qr ? t('menu.productos.disableQrFor', { name: row.name }) : t('menu.productos.enableQrFor', { name: row.name })"
                :title="row.is_available_table_qr ? t('menu.productos.disableQr') : t('menu.productos.enableQr')"
                class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                :class="[
                  row.is_available_table_qr ? 'bg-success' : 'bg-titan-300',
                  togglingTableQrIds.has(row.id) ? 'cursor-wait opacity-70' : 'cursor-pointer'
                ]"
              >
                <svg
                  v-if="togglingTableQrIds.has(row.id)"
                  class="animate-spin h-3.5 w-3.5 text-white"
                  :class="row.is_available_table_qr ? 'translate-x-4' : 'translate-x-0.5'"
                  fill="none" viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span
                  v-else
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                  :class="row.is_available_table_qr ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
            </div>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-center space-x-2">
              <button
                v-if="isOpenSaleShell(row)"
                type="button"
                class="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-primary transition-colors hover:text-primary/70 focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
                :aria-label="t('menu.productos.configureOpenSale')"
                :title="t('menu.productos.configureOpenSale')"
                @click="goToOpenSaleSettings()"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                v-else-if="!editMode"
                @click="editProduct(row)"
                class="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-primary transition-colors hover:text-primary/70 focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
                :aria-label="t('menu.productos.editProductFor', { name: row.name })"
                :title="t('menu.productos.editProduct')"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </template>
        </UiResponsiveDataView>

        <!-- Pagination -->
        <div v-if="productsData.total > itemsPerPage" class="mt-4 bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              @click="previousPage"
              :disabled="!canGoPrevious"
              :class="[
                'relative inline-flex min-h-[44px] items-center rounded-md px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                canGoPrevious ? 'bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg' : 'bg-shell-icon-bg text-shell-icon-text cursor-not-allowed opacity-50'
              ]">
              {{ t('common.previous') }}
            </button>
            <button
              @click="nextPage"
              :disabled="!canGoNext"
              :class="[
                'ml-3 relative inline-flex min-h-[44px] items-center rounded-md px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                canGoNext ? 'bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg' : 'bg-shell-icon-bg text-shell-icon-text cursor-not-allowed opacity-50'
              ]">
              {{ t('common.next') }}
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-titan-700">
                {{ t('menu.productos.showingProducts', { start: startItem, end: endItem, total: productsData.total }) }}
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" :aria-label="t('menu.productos.pagination')">
                <button
                  @click="previousPage"
                  :disabled="!canGoPrevious"
                  :class="[
                    'relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-l-md text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                    canGoPrevious ? 'bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg' : 'bg-shell-icon-bg text-shell-icon-text cursor-not-allowed opacity-50'
                  ]">
                <span class="sr-only">{{ t('common.previous') }}</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="goToPage(page)"
                  :class="[
                    'relative inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                    page === currentPage
                      ? 'z-10 bg-shell-cta-bg text-shell-cta-text'
                      : 'bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg'
                  ]">
                  {{ page }}
                </button>
                <button
                  @click="nextPage"
                  :disabled="!canGoNext"
                  :class="[
                    'relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-md text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                    canGoNext ? 'bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg' : 'bg-shell-icon-bg text-shell-icon-text cursor-not-allowed opacity-50'
                  ]">
                  <span class="sr-only">{{ t('common.next') }}</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk delete confirmation (#816) -->
    <UiModal v-model="showBulkDeleteModal" :title="t('menu.productos.deleteProductsTitle')">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <Icon name="heroicons:trash" class="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p class="text-sm text-text-primary font-medium mb-1">
              {{ t('menu.productos.deleteProductsQuestion', { count: selectedIds.length, suffix: selectedIds.length !== 1 ? 's' : '' }) }}
            </p>
            <p class="text-sm text-text-secondary">
              {{ t('menu.productos.deleteProductsDescription') }}
            </p>
          </div>
        </div>
        <div v-if="bulkDeleteError" class="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {{ bulkDeleteError }}
        </div>
        <div class="flex gap-3 mt-6">
          <UiButton type="button" variant="default" class="flex-1 bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring" :disabled="isSubmitting" @click="showBulkDeleteModal = false">
            {{ t('common.cancel') }}
          </UiButton>
          <UiButton type="button" variant="destructive" class="flex-1 flex items-center justify-center gap-2" :disabled="isSubmitting" @click="confirmBulkDelete">
            <UiLoadingDots v-if="isSubmitting" size="8px" color="currentColor" />
            <span>{{ isSubmitting ? t('menu.productos.deleting') : t('menu.productos.confirmDelete') }}</span>
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import type { ProductTypeFilter } from '@/stores/menuFilters'
import { useQueryCache } from '@pinia/colada'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { runSequentialProductPatches, runSequentialRequests, toastCatalogBulkResult, toastCatalogDeleteResult } from '@/composables/useMenuCatalogBulkSave'
import { syncResaleIngredientName } from '@/composables/useResaleIngredientSync'
import { useMenuCatalogEditMode } from '@/composables/useMenuCatalogEditMode'
import { useMenuCatalogSelection } from '@/composables/useMenuCatalogSelection'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useToast } from '@/composables/useToast'
const { t, locale } = useI18n({ useScope: 'global' })

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
  module: 'menu',
})

const route = useRoute()
const router = useRouter()

const QUERY_TO_PRODUCT_TYPE: Record<string, ProductTypeFilter> = {
  menu: 'menu',
  reventa: 'resale',
  resale: 'resale',
  all: 'all',
}

const productTypeHeaderOptions: { label: string; value: ProductTypeFilter }[] = [
  { label: 'Menú', value: 'menu' },
  { label: t('menu.common.reventa'), value: 'resale' },
]

const statusHeaderOptions = [
  { label: t('menu.common.disponible'), value: 'true' },
  { label: t('menu.common.noDisponible'), value: 'false' },
]

const TABLE_SORT_TO_API: Record<string, { asc: string; desc: string }> = {
  name: { asc: 'name_asc', desc: 'name_desc' },
  price: { asc: 'price_asc', desc: 'price_desc' },
  margen_operativo: { asc: 'margin_asc', desc: 'margin_desc' },
}

const API_SORT_TO_TABLE: Record<string, { field: string; direction: 'asc' | 'desc' }> = {
  name_asc: { field: 'name', direction: 'asc' },
  name_desc: { field: 'name', direction: 'desc' },
  price_asc: { field: 'price', direction: 'asc' },
  price_desc: { field: 'price', direction: 'desc' },
  margin_asc: { field: 'margen_operativo', direction: 'asc' },
  margin_desc: { field: 'margen_operativo', direction: 'desc' },
}

function productTypeFromRouteQuery(tipo: unknown): ProductTypeFilter {
  if (typeof tipo !== 'string') return 'all'
  return QUERY_TO_PRODUCT_TYPE[tipo] ?? 'all'
}

function routeQueryTipoFromProductType(filter: ProductTypeFilter): string | undefined {
  if (filter === 'all') return undefined
  if (filter === 'resale') return 'reventa'
  return 'menu'
}

const cache = useQueryCache()
const toast = useToast()

// Filters — persisted in Pinia across Menú tabs (#816)
const {
  appliedSearch,
  apiSearchField,
  statusFilter,
  categoryFilter,
  stationFilter,
  sortFilter,
  onlineOnly,
  qrOnly,
  noRecipeOnly,
  marginNegativeOnly,
  productTypeFilter,
  performSearch: applyCatalogSearch,
  hasActiveFilters,
} = useMenuCatalogFilters()

useHead({ title: () => t('menu.head.productos') })

let syncingProductTypeRoute = false

const currentPage = ref(1)
const itemsPerPage = ref(20)

watch(
  () => route.query.tipo,
  () => {
    if (syncingProductTypeRoute) return
    syncingProductTypeRoute = true
    const next = productTypeFromRouteQuery(route.query.tipo)
    if (productTypeFilter.value !== next) {
      productTypeFilter.value = next
      currentPage.value = 1
    }
    syncingProductTypeRoute = false
  },
  { immediate: true },
)

watch(productTypeFilter, (filter) => {
  if (syncingProductTypeRoute || route.path !== '/menu/productos') return
  const expectedTipo = routeQueryTipoFromProductType(filter)
  const currentTipo = typeof route.query.tipo === 'string' ? route.query.tipo : undefined
  if (currentTipo === expectedTipo) return

  syncingProductTypeRoute = true
  const nextQuery = { ...route.query }
  if (expectedTipo) {
    nextQuery.tipo = expectedTipo
  } else {
    delete nextQuery.tipo
  }
  void router.replace({ path: '/menu/productos', query: nextQuery })
  syncingProductTypeRoute = false
})

const onCatalogSearch = () => applyCatalogSearch(() => { currentPage.value = 1 })
const onCatalogClear = () => { currentPage.value = 1 }

const emptyMessage = computed(() =>
  hasActiveFilters.value ? t('menu.productos.emptyFiltered') : t('menu.productos.empty'),
)

const emptySubMessage = computed(() =>
  hasActiveFilters.value
    ? t('menu.productos.emptySubFiltered')
    : t('menu.productos.emptySub'),
)

// Pagination
const totalPages = computed(() => {
  return Math.ceil((productsData.value?.total || 0) / itemsPerPage.value)
})

const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const previousPage = () => {
  if (canGoPrevious.value) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (canGoNext.value) {
    currentPage.value++
  }
}

const startItem = computed(() => {
  return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endItem = computed(() => {
  return Math.min(currentPage.value * itemsPerPage.value, productsData.value?.total || 0)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push(total)
    }
  }

  return pages
})

// Tenant reactivity
const { currentTenant, businessProfile } = useTenantReactive()

const showTableQrColumn = computed(
  () => !!(businessProfile.value?.tables_enabled && businessProfile.value?.table_qr_module_enabled)
)

/** Pedidos online / domicilios — `tenant_public_profiles.accepts_online_orders` */
const showOnlineControls = computed(() => !!businessProfile.value?.accepts_online_orders)

const showComandasStations = computed(() => !!businessProfile.value?.comandas_enabled)

const { data: stationsData } = useQuery({
  key: () => ['tenant', 'stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { id: string; name: string; color?: string }[] }>('/api/api/stations'),
  enabled: () => !!currentTenant.value && showComandasStations.value,
  staleTime: 30_000,
})
const stations = computed(() => stationsData.value?.data ?? [])

const STATION_FALLBACK_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
] as const

function stationDotColor(st: { color?: string | null; id?: string }, index = 0) {
  if (st.color) return st.color
  if (st.id) {
    const idx = stations.value.findIndex(s => s.id === st.id)
    if (idx >= 0) return STATION_FALLBACK_COLORS[idx % STATION_FALLBACK_COLORS.length]
  }
  return STATION_FALLBACK_COLORS[index % STATION_FALLBACK_COLORS.length]
}

/** Product override station_id, else category default from API `station` object. */
const resolveProductStation = (item: {
  station?: { id: string; name: string; color?: string } | null
  station_id?: string | null
}) => {
  if (item.station) {
    const idx = stations.value.findIndex(s => s.id === item.station!.id)
    const catalogSt = idx >= 0 ? stations.value[idx] : item.station
    return {
      ...item.station,
      color: item.station.color || stationDotColor(catalogSt, idx >= 0 ? idx : 0),
    }
  }
  if (!item.station_id) return null
  const st = stations.value.find(s => s.id === item.station_id)
  if (!st) return null
  const idx = stations.value.findIndex(s => s.id === st.id)
  return {
    id: st.id,
    name: st.name,
    color: stationDotColor(st, idx >= 0 ? idx : 0),
  }
}

// Fetch categories (static per tenant)
const { data: categoriesData } = useQuery({
  key: () => ['menu', 'categories', currentTenant.value?.id],
  query: () => $fetch('/api/menu/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const categories = computed(() => (categoriesData.value as any)?.data || [])
const categoryHeaderOptions = computed(() =>
  categories.value.map((c: { id: string; name: string }) => ({ label: c.name, value: c.id })),
)

// Fetch products
const { data: productsData, error: fetchError, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['menu', 'products', currentTenant.value?.id, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: appliedSearch.value || null,
    searchField: apiSearchField.value,
    status: statusFilter.value || null,
    category: categoryFilter.value || null,
    station: stationFilter.value || null,
    onlineOnly: onlineOnly.value,
    qrOnly: qrOnly.value,
    noRecipeOnly: noRecipeOnly.value,
    marginNegativeOnly: marginNegativeOnly.value,
    productType: productTypeFilter.value,
    sort: sortFilter.value,
  }],
  query: () => {
    const params: Record<string, string | number | boolean> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
      sort: sortFilter.value,
    }
    if (productTypeFilter.value === 'menu') {
      params.is_resale = false
    } else if (productTypeFilter.value === 'resale') {
      params.is_resale = true
    } else if (productTypeFilter.value === 'all') {
      params.include_all_types = true
    }
    if (appliedSearch.value) {
      params.search = appliedSearch.value
      params.search_field = apiSearchField.value
    }
    if (statusFilter.value) {
      params.is_available = statusFilter.value === 'true'
    }
    if (categoryFilter.value) {
      params.category_id = categoryFilter.value
    }
    if (stationFilter.value) {
      params.station_id = stationFilter.value
    }
    if (onlineOnly.value) {
      params.is_available_online = true
    }
    if (qrOnly.value) {
      params.is_available_table_qr = true
    }
    if (noRecipeOnly.value) {
      params.has_recipe = false
    }
    if (marginNegativeOnly.value) {
      params.margin_negative = true
    }
    return $fetch('/api/menu/products', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !productsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && productsData.value != null)

// Reset page on tenant change
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })

// Computed properties for data
const products = computed(() => productsData.value?.data || [])

/** Shell product for POS venta libre (#805) — not a normal catalog item. */
const isOpenSaleShell = (row: { open_priced?: boolean }) => !!row.open_priced

const isResaleProduct = (row: { is_resale?: boolean }) => !!row.is_resale

const productTipoLabel = (row: { is_resale?: boolean }) =>
  isResaleProduct(row) ? t('menu.common.reventa') : t('menu.common.menuTipo')

const isSubmitting = ref(false)

const availabilityBulkOptions = [
  { label: t('menu.common.disponible'), value: 'true' },
  { label: t('menu.common.noDisponible'), value: 'false' },
]

const channelBulkOptions = [
  { label: t('menu.productos.enable'), value: 'true' },
  { label: t('menu.productos.disable'), value: 'false' },
]

const {
  selectedIds,
  bulkCategoryId,
  bulkStationId,
  bulkAvailability,
  bulkOnline,
  bulkQr,
  bulkFields,
  toggleSelect: selectionToggleSelect,
  allPageSelected: isAllPageSelected,
  toggleSelectAll: selectionToggleSelectAll,
  clearSelection: clearCatalogSelection,
  canBulkApplyCatalog: selectionCanBulkApplyCatalog,
  catalogRowSelectionClass,
} = useMenuCatalogSelection({ isRowSelectable: (row) => !isOpenSaleShell(row) })

const {
  editMode,
  productDrafts,
  ensureDraft,
  displayProducts,
  hasChanges,
  canSubmit,
  applyBulkOverridesForSelectedRows,
  discardAllDrafts,
  cancelEditOperation,
  toggleEditMode: editToggleEditMode,
  toggleDraftOnline,
  toggleDraftTableQr,
  canBulkApplyEdit,
  buildSavePatchBody,
  idsWithDraftChanges,
} = useMenuCatalogEditMode({
  categories,
  products,
  selectedIds,
  bulkFields,
  isOpenSaleShell,
  showOnlineControls,
  showTableQrColumn,
})

const showBulkDeleteModal = ref(false)
const bulkDeleteError = ref('')

const selectableProductsOnPage = computed(() =>
  displayProducts.value.filter((p: { open_priced?: boolean }) => !isOpenSaleShell(p)),
)

const allPageSelected = computed(() => isAllPageSelected(selectableProductsOnPage.value))

const canBulkApplyCatalog = computed(() =>
  selectionCanBulkApplyCatalog({
    showOnline: showOnlineControls.value,
    showQr: showTableQrColumn.value,
  }),
)

const canBulkApply = computed(() =>
  editMode.value ? canBulkApplyEdit() : canBulkApplyCatalog.value,
)

const toggleSelect = (id: string) => selectionToggleSelect(id, products.value)

const toggleSelectAll = () => selectionToggleSelectAll(selectableProductsOnPage.value)

function clearSelection() {
  clearCatalogSelection()
  bulkDeleteError.value = ''
}

const onToggleEditMode = () => editToggleEditMode(clearSelection)

const tableSortField = computed(() => API_SORT_TO_TABLE[sortFilter.value]?.field ?? '')
const tableSortDirection = computed(() => API_SORT_TO_TABLE[sortFilter.value]?.direction ?? 'asc')

function handleProductsTableSort(field: string) {
  const sortConfig = TABLE_SORT_TO_API[field]
  if (!sortConfig) return
  const nextDirection = tableSortField.value === field && tableSortDirection.value === 'asc' ? 'desc' : 'asc'
  sortFilter.value = sortConfig[nextDirection]
  currentPage.value = 1
}

watch(
  [
    statusFilter,
    categoryFilter,
    stationFilter,
    sortFilter,
    onlineOnly,
    qrOnly,
    noRecipeOnly,
    marginNegativeOnly,
    productTypeFilter,
    appliedSearch,
  ],
  () => { currentPage.value = 1 },
)

watch(
  [
    currentPage,
    statusFilter,
    categoryFilter,
    stationFilter,
    sortFilter,
    onlineOnly,
    qrOnly,
    noRecipeOnly,
    marginNegativeOnly,
    productTypeFilter,
    appliedSearch,
  ],
  clearSelection,
)

async function executeBulkCatalogApply() {
  if (!canBulkApplyCatalog.value || isSubmitting.value) return
  isSubmitting.value = true
  const body: Record<string, string | boolean> = {}
  if (bulkCategoryId.value) body.category_id = bulkCategoryId.value
  if (bulkStationId.value) body.station_id = bulkStationId.value
  if (bulkAvailability.value !== '') {
    body.is_available = bulkAvailability.value === 'true'
  }
  if (showOnlineControls.value && bulkOnline.value !== '') {
    body.is_available_online = bulkOnline.value === 'true'
  }
  if (showTableQrColumn.value && bulkQr.value !== '') {
    body.is_available_table_qr = bulkQr.value === 'true'
  }

  try {
    const result = await runSequentialProductPatches(
      selectedIds.value,
      () => body,
    )
    cache.invalidateQueries({ key: ['menu', 'products'] })
    cache.invalidateQueries({ key: ['menu', 'products-resale'] })
    await refetch()
    clearSelection()
    toastCatalogBulkResult(result, toast, {
      title: t('menu.common.listo'),
      errorMessage: t('menu.productos.updateNoneError'),
    })
  } finally {
    isSubmitting.value = false
  }
}

function onBulkApply() {
  if (editMode.value) {
    saveChanges()
  } else {
    executeBulkCatalogApply()
  }
}

async function saveChanges() {
  if (isSubmitting.value || !canSubmit.value) return
  applyBulkOverridesForSelectedRows()

  const idsToSave = idsWithDraftChanges()
  if (idsToSave.length === 0) return

  isSubmitting.value = true

  try {
    const result = await runSequentialProductPatches(idsToSave, (id) => {
      const draft = productDrafts.value[id]
      if (!draft) return null
      return buildSavePatchBody(draft)
    })

    const syncWarnings: string[] = []
    for (const id of idsToSave) {
      const row = products.value.find((p: { id: string }) => p.id === id)
      const draft = productDrafts.value[id]
      if (!row?.is_resale || !draft || draft.name === draft.originalName) continue
      const sync = await syncResaleIngredientName(id, draft.name, draft.originalName)
      if (sync.warning) {
        syncWarnings.push(`${draft.name.trim()}: ${sync.warning}`)
      }
    }
    if (syncWarnings.length > 0) {
      toast.error(syncWarnings.slice(0, 3).join('\n'), {
        title:
          syncWarnings.length > 1
            ? t('menu.productos.someIngredientsNotRenamed')
            : t('menu.productos.ingredientNotSynced'),
        duration: 6000,
      })
    }

    cache.invalidateQueries({ key: ['menu', 'products'] })
    cache.invalidateQueries({ key: ['menu', 'products-resale'] })
    await refetch()
    discardAllDrafts()
    clearSelection()

    toastCatalogBulkResult(result, toast, {
      title: t('menu.common.guardado'),
      emptySuccessMessage: t('menu.productos.catalogUpdated'),
    })
  } finally {
    isSubmitting.value = false
  }
}

const openBulkDeleteModal = () => {
  bulkDeleteError.value = ''
  showBulkDeleteModal.value = true
}

const confirmBulkDelete = async () => {
  if (selectedIds.value.length === 0 || isSubmitting.value) return
  isSubmitting.value = true
  bulkDeleteError.value = ''
  let archived = 0

  const result = await runSequentialRequests(
    selectedIds.value.map((id) => ({
      key: id,
      run: async () => {
        const res = await $fetch<{ success: boolean; archived?: boolean }>(
          `/api/menu/products/${id}`,
          { method: 'DELETE' },
        )
        if (res?.archived) archived++
      },
    })),
  )

  showBulkDeleteModal.value = false
  cache.invalidateQueries({ key: ['menu', 'products'] })
  await refetch()
  clearSelection()
  isSubmitting.value = false

  if (result.fail === 0) {
    toastCatalogDeleteResult({ ...result, archived }, toast)
  } else if (result.ok > 0) {
    toastCatalogDeleteResult({ ...result, archived }, toast)
  } else {
    bulkDeleteError.value = t('menu.productos.bulkDeleteError')
    showBulkDeleteModal.value = true
    toast.error(t('menu.productos.deleteErrorTitle'), { title: t('menu.common.error') })
  }
}

// Cost issue detection — products where costo_calculado > price
const costIssueProductIds = computed(() => {
  const ids = new Set<string>()
  for (const p of products.value) {
    if (p.costo_calculado != null && Number(p.costo_calculado) > Number(p.price)) {
      ids.add(p.id)
    }
  }
  return ids
})

const costIssueCount = computed(() => costIssueProductIds.value.size)

const costDriftProductIds = computed(() => {
  const ids = new Set<string>()
  for (const p of products.value) {
    if (hasCostDrift(p)) ids.add(p.id)
  }
  return ids
})

const bannerDismissed = ref(false)

const catalogRowBaseClass = (row: { id: string }) => {
  if (costIssueProductIds.value.has(row.id)) return 'bg-status-critical-bg'
  if (costDriftProductIds.value.has(row.id)) return 'bg-status-warning-bg/40'
  return ''
}

const catalogRowClass = (row: { id: string }, _index?: number) =>
  catalogRowSelectionClass(row.id, catalogRowBaseClass(row))

const getRowClass = (row: any): string => {
  return catalogRowClass(row)
}

// Inject refresh handler setter from layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refetch)
})
useMenuReturnRefresh('/menu/productos', refetch)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})

// Table columns configuration
// REMOVED: controla_stock column - ALL products now control inventory automatically
const productosTableColumns = computed(() => {
  const cols: any[] = [
    { key: 'select', title: '', sortable: false, width: '44px', class: '!px-0', align: 'center' as const },
    {
      key: 'name',
      title: t('menu.common.producto'),
      sortable: true,
      format: 'text',
      align: 'left'
    },
    {
      key: 'tipo',
      title: t('menu.common.tipo'),
      sortable: false,
      align: 'left',
      width: '5.5rem',
      class: 'whitespace-nowrap',
    },
  ]

  cols.push(
    {
      key: 'category_name',
      title: t('menu.common.categoria'),
      sortable: false,
      format: 'text',
      align: 'left'
    },
    {
      key: 'price',
      title: t('menu.common.precio'),
      sortable: true,
      format: 'currency',
      align: 'right'
    },
    {
      key: 'costo_percibido',
      title: t('menu.productos.miCosto'),
      sortable: false,
      format: 'currency',
      align: 'right'
    },
    {
      key: 'margen_operativo',
      title: t('menu.productos.marginOperational'),
      sortable: true,
      format: 'text',
      align: 'center'
    },
  )

  const tailCols: typeof cols = [
    {
      key: 'is_available',
      title: t('menu.common.estado'),
      sortable: false,
      format: 'boolean',
      align: 'center'
    },
    ...(showOnlineControls.value
      ? [{
          key: 'is_available_online',
          title: t('menu.filters.onlineOnly'),
          sortable: false,
          format: 'boolean',
          align: 'center'
        }]
      : []),
    ...(showTableQrColumn.value
      ? [{
          key: 'is_available_table_qr',
          title: t('menu.filters.qrOnly'),
          sortable: false,
          format: 'boolean',
          align: 'center'
        }]
      : []),
  ]

  if (!editMode.value) {
    tailCols.push({
      key: 'actions',
      title: t('menu.common.acciones'),
      sortable: false,
      format: 'text',
      align: 'center'
    })
  }

  cols.push(...tailCols)

  return cols
})

/** Ancho dinámico en `ch` para inputs de montos (incl. $ y padding). */
function moneyInputWidth(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '7rem'
  const digits = String(Math.abs(Math.round(Number(value)))).length
  return `${Math.max(11, digits + 5)}ch`
}

// Format currency
const formatCurrency = (value: number) => {
  if (!value) return '$0'
  return new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const {
  marginOperativoPct,
  hasCostDrift,
  formatCostCell: formatCostCellValue,
} = useProductMargins()

const formatCostCell = (value: unknown) => formatCostCellValue(value, formatCurrency)

const hasCostValue = (value: unknown) => value !== null && value !== undefined

// True if the product has any recipe row (direct ingredients or recipe bases).
// Null/zero costo_calculado is the proxy: the backend persists NULL when no recipe.
// A product with cost=0 but with a recipe (extreme case) is treated as tracking — safer.
const productTracksInventory = (product: any): boolean => {
  if ((product?.recipe_base_ids?.length ?? 0) > 0) return true
  if ((product?.ingredients?.length ?? 0) > 0) return true
  return product?.costo_calculado != null
}

// Display product names in Title Case (DB stores them as ALL CAPS)
const toTitleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

// Inline toggle for online availability
const togglingIds = ref<Set<string>>(new Set())
const togglingTableQrIds = ref<Set<string>>(new Set())

const toggleOnlineAvailability = async (product: any) => {
  if (editMode.value || isOpenSaleShell(product)) return
  if (togglingIds.value.has(product.id)) return
  togglingIds.value = new Set([...togglingIds.value, product.id])

  const newValue = !product.is_available_online
  product.is_available_online = newValue
  try {
    await $fetch(`/api/menu/products/${product.id}`, {
      method: 'PUT',
      body: { is_available_online: newValue }
    })
    toast.success(
      newValue ? `${product.name} ahora aparece en domicilios` : `${product.name} ocultado del menú online`,
      { duration: 3000 }
    )
  } catch (e) {
    product.is_available_online = !newValue
    toast.error(t('menu.productos.updateError'))
  } finally {
    togglingIds.value = new Set([...togglingIds.value].filter(id => id !== product.id))
  }
}

const toggleTableQrAvailability = async (product: any) => {
  if (editMode.value || isOpenSaleShell(product)) return
  if (togglingTableQrIds.value.has(product.id)) return
  togglingTableQrIds.value = new Set([...togglingTableQrIds.value, product.id])

  const newValue = !product.is_available_table_qr
  product.is_available_table_qr = newValue
  try {
    await $fetch(`/api/menu/products/${product.id}`, {
      method: 'PUT',
      body: { is_available_table_qr: newValue }
    })
    toast.success(
      newValue ? `${product.name} ahora aparece en el menú QR de mesa` : `${product.name} ocultado del menú QR de mesa`,
      { duration: 3000 }
    )
  } catch {
    product.is_available_table_qr = !newValue
    toast.error(t('menu.productos.updateError'))
  } finally {
    togglingTableQrIds.value = new Set([...togglingTableQrIds.value].filter(id => id !== product.id))
  }
}

// Navigation
const goToOpenSaleSettings = () => {
  router.push('/operaciones/personalizar')
}

const onProductRowClick = (product: any) => {
  if (editMode.value) return
  if (isOpenSaleShell(product)) {
    goToOpenSaleSettings()
    return
  }
  editProduct(product)
}

const editProduct = (product: any) => {
  if (editMode.value) return
  router.push(`/menu/productos/${product.id}`)
}

</script>

<style scoped>
.page-layout {
  @apply w-full;
}
.input-base {
  @apply border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-surface;
}

/* Sin flechas arriba/abajo del input number (Chrome, Safari, Firefox) */
.input-money[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
.input-money[type='number']::-webkit-outer-spin-button,
.input-money[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
