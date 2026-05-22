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
          class="flex items-start gap-2 px-3 py-2.5 bg-status-critical-bg border border-border rounded-lg"
        >
          <svg class="w-4 h-4 text-status-critical-text flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="flex-1 min-w-0 text-sm">
            <span class="font-bold text-status-critical-text">{{ costIssueCount }} producto{{ costIssueCount !== 1 ? 's' : '' }}</span>
            <span class="text-text-secondary"> con costo mayor al precio de venta — posibles compras mal registradas. </span>
            <NuxtLink
              to="/abastecimiento/calidad-datos"
              class="font-semibold text-status-critical-text hover:underline whitespace-nowrap"
            >Ver Calidad de Datos →</NuxtLink>
          </p>
          <button
            class="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors text-text-tertiary hover:text-text-primary"
            aria-label="Cerrar aviso"
            @click="bannerDismissed = true"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <MenuCatalogFiltersBar
          show-station
          :show-qr="showTableQrColumn"
          @search="onCatalogSearch"
          @clear="onCatalogClear"
          @filter-change="currentPage = 1"
        />

        <!-- Bulk Action Bar (#816) -->
        <div
          v-if="selectedIds.length > 0"
          class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5"
        >
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-sm font-semibold text-text-primary">{{ selectedIds.length }} seleccionada(s)</span>
            <button type="button" class="text-xs text-text-secondary hover:text-text-primary underline" @click="clearSelection">
              deseleccionar
            </button>
          </div>

          <div class="flex-1" />

          <UiFilterSelect
            v-model="bulkCategoryId"
            placeholder="Categoría..."
            :aria-label="editMode ? 'Categoría al guardar para seleccionadas' : 'Cambiar categoría masivamente'"
            :options="categories.map(c => ({ label: c.name, value: c.id }))"
          />

          <UiFilterSelect
            v-model="bulkAvailability"
            placeholder="Estado..."
            :aria-label="editMode ? 'Estado al guardar para seleccionadas' : 'Cambiar estado masivamente'"
            :options="availabilityBulkOptions"
          />

          <UiFilterSelect
            v-if="showComandasStations"
            v-model="bulkStationId"
            placeholder="Cocina..."
            :aria-label="editMode ? 'Cocina al guardar para seleccionadas' : 'Cambiar estación de cocina masivamente'"
            :options="stations.map(s => ({ label: s.name, value: s.id }))"
          />

          <button
            type="button"
            class="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            :disabled="!canBulkApply || isSubmitting"
            @click="onBulkApply"
          >
            <UiLoadingDots v-if="isSubmitting" size="12px" />
            <span v-else>Aplicar</span>
          </button>

          <button
            v-if="!editMode"
            type="button"
            class="h-9 px-3 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-50 transition-colors"
            :disabled="isSubmitting"
            @click="openBulkDeleteModal"
          >
            Eliminar
          </button>

          <button
            type="button"
            class="h-9 px-3 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
            :disabled="isSubmitting"
            @click="editMode ? cancelEditOperation() : clearSelection()"
          >
            Cancelar
          </button>
        </div>

        <!-- Barra modo edición sin selección -->
        <div
          v-else-if="editMode"
          class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5"
        >
          <span class="text-sm text-text-secondary flex-shrink-0">
            Modo edición — los cambios se envían al guardar
          </span>

          <div class="flex-1" />

          <button
            type="button"
            class="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            :disabled="!hasChanges || !canSubmit || isSubmitting"
            @click="saveChanges"
          >
            <UiLoadingDots v-if="isSubmitting" size="12px" />
            <span v-else>Aplicar</span>
          </button>

          <button
            type="button"
            class="h-9 px-3 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
            :disabled="isSubmitting"
            @click="cancelEditOperation"
          >
            Cancelar
          </button>
        </div>

        <HealthSemaphore :is-unlocked="true" title="Catálogo y rentabilidad de productos">
          <template #header-actions>
            <div class="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap min-h-[44px] transition-colors"
                :class="editMode
                  ? 'bg-surface border-2 border-border text-text-primary hover:bg-surface-secondary'
                  : 'btn-primary text-primary-foreground'"
                @click="toggleEditMode"
              >
                <span class="hidden sm:inline">{{ editMode ? 'Ver catálogo' : 'Modo edición' }}</span>
                <span class="sm:hidden">{{ editMode ? 'Ver' : 'Editar' }}</span>
              </button>
              <NuxtLink
                to="/menu/productos/crear"
                class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap min-h-[44px] flex items-center"
              >
                <span class="hidden sm:inline">+ Nuevo producto</span>
                <span class="sm:hidden">+ Nuevo</span>
              </NuxtLink>
            </div>
          </template>
        <!-- Responsive Data View (Mobile Cards + Desktop Table) -->
        <UiResponsiveDataView
          :columns="productosTableColumns"
          :data="displayProducts"
          :row-class="getRowClass"
          :empty-message="emptyMessage"
          :empty-sub-message="emptySubMessage"
          variant="default"
          row-size="sm"
        >
          <!-- Checkbox header: select all (same pattern as ventas/ordenes) -->
          <template #header-select>
            <div class="flex items-center justify-center">
              <UiBulkSelectCheckbox :checked="allPageSelected" @change="toggleSelectAll" />
            </div>
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
                  <label class="sr-only" :for="`mobile-name-${item.id}`">Nombre</label>
                  <input
                    :id="`mobile-name-${item.id}`"
                    v-model="ensureDraft(item).name"
                    type="text"
                    class="input-base w-full py-1.5 px-2 text-sm font-medium"
                    placeholder="Nombre del producto"
                  />
                  <UiFilterSelect
                    v-model="ensureDraft(item).category_id"
                    placeholder="Categoría"
                    :aria-label="`Categoría de ${item.name}`"
                    :options="categories.map(c => ({ label: c.name, value: c.id }))"
                    class="mt-2 min-w-0"
                  />
                  <div class="flex flex-wrap gap-2 mt-2">
                    <div class="relative w-fit shrink-0">
                      <span class="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">$</span>
                      <label class="sr-only" :for="`mobile-price-${item.id}`">Precio</label>
                      <input
                        :id="`mobile-price-${item.id}`"
                        v-model.number="ensureDraft(item).price"
                        type="number"
                        min="0"
                        step="100"
                        class="input-base input-money w-fit min-w-[7rem] max-w-none pl-5 pr-2 py-1.5 text-sm tabular-nums text-right"
                        :style="{ width: moneyInputWidth(ensureDraft(item).price) }"
                        placeholder="Precio"
                      />
                    </div>
                    <div class="relative w-fit shrink-0">
                      <label class="sr-only" :for="`mobile-costo-${item.id}`">Mi costo</label>
                      <input
                        :id="`mobile-costo-${item.id}`"
                        v-model.number="ensureDraft(item).costo_percibido"
                        type="number"
                        min="0"
                        step="100"
                        class="input-base input-money w-fit min-w-[7rem] max-w-none px-2 py-1.5 text-sm tabular-nums text-right"
                        :style="{ width: moneyInputWidth(ensureDraft(item).costo_percibido) }"
                        placeholder="Mi costo"
                      />
                    </div>
                  </div>
                </template>
                <template v-else>
                  <span class="text-sm font-bold text-text-primary">{{ toTitleCase(item.name) }}</span>
                  <UiStatusBadge
                    v-if="isOpenSaleShell(item)"
                    value="POS"
                    title="Contenedor de venta libre — se gestiona en Operaciones → Personalizar"
                    format="text"
                    variant="secondary"
                    size="sm"
                    class="mt-0.5"
                  />
                  <p class="text-xs text-text-secondary mt-0.5">
                    <template v-if="isOpenSaleShell(item)">
                      Precio al vender en el POS · sin categoría de menú
                    </template>
                    <template v-else>
                      {{ item.category_name || 'Sin categoría' }} · {{ formatCurrency(item.price) }}
                    </template>
                  </p>
                  <p class="text-xs text-text-tertiary flex flex-wrap items-center gap-1">
                    <span>Real:</span>
                    <span v-if="hasCostValue(item.costo_calculado)">{{ formatCostCell(item.costo_calculado) }}</span>
                    <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
                    <span>· Mi costo:</span>
                    <span v-if="hasCostValue(item.costo_percibido)">{{ formatCostCell(item.costo_percibido) }}</span>
                    <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
                  </p>
                </template>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span
                  v-if="!isOpenSaleShell(item) && businessProfile?.comandas_enabled && resolveProductStation(item)"
                  class="flex items-center gap-1 text-xs text-text-secondary whitespace-nowrap"
                >
                  <span class="inline-block w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: resolveProductStation(item)!.color }" />
                  <span class="whitespace-nowrap">{{ resolveProductStation(item)!.name }}</span>
                </span>
                <UiStatusBadge
                  v-if="!isOpenSaleShell(item) && marginRealPct(item) !== null"
                  :value="marginRealPct(item)!"
                  format="percentage"
                  :variant="(marginRealPct(item) ?? 0) >= 0 ? 'success' : 'secondary'"
                  size="sm"
                  title="Margen real"
                />
                <UiStatusBadge
                  v-if="!isOpenSaleShell(item) && marginOperativoPct(item) !== null"
                  :value="marginOperativoPct(item)!"
                  format="percentage"
                  variant="secondary"
                  size="sm"
                  title="Margen operativo"
                />
                <UiStatusBadge
                  v-if="isOpenSaleShell(item)"
                  value="Personalizar"
                  title="Activa o desactiva venta libre en Operaciones → Personalizar"
                  format="text"
                  variant="secondary"
                  size="sm"
                />
                <UiStatusBadge
                  v-else
                  :value="item.is_available ? 'Disponible' : 'No disponible'"
                  format="text"
                  :variant="item.is_available ? 'success' : 'secondary'"
                  size="sm"
                />
                <UiStatusBadge
                  v-if="!productTracksInventory(item)"
                  value="Sin inventario"
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
                :aria-label="`Nombre de ${item.name}`"
                placeholder="Nombre"
              />
              <template v-else>
                <span class="text-sm font-medium text-text-primary whitespace-nowrap">{{ toTitleCase(value) }}</span>
                <UiStatusBadge
                  v-if="isOpenSaleShell(item)"
                  value="Sistema"
                  title="Producto contenedor de venta libre en el POS"
                  format="text"
                  variant="secondary"
                  size="sm"
                />
              </template>
            </div>
          </template>

          <template #cell-category_name="{ value, item }">
            <UiFilterSelect
              v-if="editMode && !isOpenSaleShell(item)"
              v-model="ensureDraft(item).category_id"
              placeholder="Categoría"
              :aria-label="`Categoría de ${item.name}`"
              :options="categories.map(c => ({ label: c.name, value: c.id }))"
              class="min-w-[140px]"
              @click.stop
            />
            <UiStatusBadge
              v-else-if="isOpenSaleShell(item)"
              value="N/A"
              title="No usa categoría de menú"
              format="text"
              variant="secondary"
              size="sm"
              class="whitespace-nowrap"
            />
            <span v-else class="text-sm text-text-secondary whitespace-nowrap">{{ value || 'Sin categoría' }}</span>
          </template>

          <template #cell-price="{ value, item }">
            <div
              v-if="editMode && !isOpenSaleShell(item)"
              class="relative w-fit ml-auto shrink-0"
              @click.stop
            >
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">$</span>
              <input
                v-model.number="ensureDraft(item).price"
                type="number"
                min="0"
                step="100"
                class="input-base input-money w-fit min-w-[7rem] max-w-none pl-5 pr-2 py-1.5 text-sm text-right tabular-nums"
                :style="{ width: moneyInputWidth(ensureDraft(item).price) }"
                :aria-label="`Precio de ${item.name}`"
                placeholder="0"
              />
            </div>
            <UiStatusBadge
              v-else-if="isOpenSaleShell(item)"
              value="Al vender"
              title="El cajero define el monto en el POS"
              format="text"
              variant="secondary"
              size="sm"
              class="whitespace-nowrap"
            />
            <span v-else class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-costo_calculado="{ value, item }">
            <div class="flex justify-end">
              <UiStatusBadge
                v-if="isOpenSaleShell(item)"
                value="N/A"
                title="No aplica al contenedor de venta libre"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
              <span v-else-if="hasCostValue(value)" class="text-sm text-text-primary tabular-nums">
                {{ formatCostCell(value) }}
              </span>
              <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
            </div>
          </template>

          <template #cell-costo_percibido="{ value, item }">
            <div class="flex justify-end">
              <div
                v-if="editMode && !isOpenSaleShell(item)"
                class="relative w-fit ml-auto shrink-0"
                @click.stop
              >
                <input
                  v-model.number="ensureDraft(item).costo_percibido"
                  type="number"
                  min="0"
                  step="100"
                  class="input-base input-money w-fit min-w-[7rem] max-w-none px-2 py-1.5 text-sm text-right tabular-nums"
                  :style="{ width: moneyInputWidth(ensureDraft(item).costo_percibido) }"
                  :aria-label="`Mi costo de ${item.name}`"
                  placeholder="—"
                />
              </div>
              <UiStatusBadge
                v-else-if="isOpenSaleShell(item)"
                value="N/A"
                title="No aplica al contenedor de venta libre"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
              <span v-else-if="hasCostValue(value)" class="text-sm text-text-primary tabular-nums">
                {{ formatCostCell(value) }}
              </span>
              <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
            </div>
          </template>

          <template #cell-margen_real="{ row }">
            <div class="flex justify-end">
              <UiStatusBadge
                v-if="isOpenSaleShell(row)"
                value="N/A"
                title="No aplica al contenedor de venta libre"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
              <UiStatusBadge
                v-else-if="marginRealPct(row) !== null"
                :value="marginRealPct(row)!"
                format="percentage"
                :variant="(marginRealPct(row) ?? 0) >= 0 ? 'success' : 'secondary'"
                size="sm"
              />
              <UiStatusBadge
                v-else
                value="N/A"
                title="Sin margen"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
            </div>
          </template>

          <template #cell-margen_operativo="{ row }">
            <div class="flex justify-end">
              <UiStatusBadge
                v-if="isOpenSaleShell(row)"
                value="N/A"
                title="No aplica al contenedor de venta libre"
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
                title="Sin margen"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
            </div>
          </template>

          <!-- REMOVED: cell-controla_stock - ALL products now control inventory automatically -->

          <template v-if="businessProfile?.comandas_enabled" #cell-station="{ item }">
            <UiStatusBadge
              v-if="isOpenSaleShell(item)"
              value="N/A"
              title="Sin estación de cocina"
              format="text"
              variant="secondary"
              size="sm"
              class="whitespace-nowrap"
            />
            <div v-else-if="resolveProductStation(item)" class="flex items-center gap-1.5 whitespace-nowrap">
              <span class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: resolveProductStation(item)!.color }" />
              <span class="text-sm text-text-secondary whitespace-nowrap">{{ resolveProductStation(item)!.name }}</span>
            </div>
            <UiStatusBadge
              v-else
              value="N/A"
              title="Sin estación"
              format="text"
              variant="secondary"
              size="sm"
              class="whitespace-nowrap"
            />
          </template>

          <template #cell-is_available="{ value, item }">
            <div class="flex justify-center">
              <UiStatusBadge
                v-if="isOpenSaleShell(item)"
                value="Personalizar"
                title="Activa o desactiva venta libre en Operaciones → Personalizar"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap max-w-[7rem]"
              />
              <UiStatusBadge
                v-else
                :value="value ? 'Disponible' : 'No disponible'"
                format="text"
                :variant="value ? 'success' : 'secondary'"
                size="sm"
              />
            </div>
          </template>

          <template #cell-is_available_online="{ row }">
            <div class="flex justify-center">
              <UiStatusBadge
                v-if="isOpenSaleShell(row)"
                value="No aplica"
                title="No aplica al contenedor de venta libre"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
              <button
                v-else-if="!editMode"
                @click="toggleOnlineAvailability(row)"
                role="switch"
                :aria-checked="row.is_available_online"
                :disabled="togglingIds.has(row.id)"
                :aria-label="row.is_available_online ? `Deshabilitar ${row.name} para domicilios` : `Habilitar ${row.name} para domicilios`"
                :title="row.is_available_online ? 'Deshabilitar para domicilios' : 'Habilitar para domicilios'"
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
              <UiStatusBadge
                v-else
                :value="row.is_available_online ? 'Online' : 'Oculto'"
                format="text"
                :variant="row.is_available_online ? 'success' : 'secondary'"
                size="sm"
                class="whitespace-nowrap"
              />
            </div>
          </template>

          <template v-if="showTableQrColumn" #cell-is_available_table_qr="{ row }">
            <div class="flex justify-center">
              <UiStatusBadge
                v-if="isOpenSaleShell(row)"
                value="No aplica"
                title="No aplica al contenedor de venta libre"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
              <button
                v-else-if="!editMode"
                @click="toggleTableQrAvailability(row)"
                role="switch"
                :aria-checked="row.is_available_table_qr"
                :disabled="togglingTableQrIds.has(row.id)"
                :aria-label="row.is_available_table_qr ? `Deshabilitar ${row.name} para QR en mesa` : `Habilitar ${row.name} para QR en mesa`"
                :title="row.is_available_table_qr ? 'Deshabilitar para QR en mesa' : 'Habilitar para QR en mesa'"
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
              <UiStatusBadge
                v-else
                :value="row.is_available_table_qr ? 'QR' : 'Oculto'"
                format="text"
                :variant="row.is_available_table_qr ? 'success' : 'secondary'"
                size="sm"
                class="whitespace-nowrap"
              />
            </div>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-center space-x-2">
              <button
                v-if="isOpenSaleShell(row)"
                type="button"
                class="text-primary hover:text-primary/70 transition-colors"
                aria-label="Configurar venta libre en Personalizar"
                title="Operaciones → Personalizar"
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
                class="text-primary hover:text-primary/70 transition-colors"
                :aria-label="`Editar ${row.name}`"
                title="Editar producto"
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
                'relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md',
                canGoPrevious ? 'text-titan-700 bg-white hover:bg-titan-50' : 'text-titan-400 bg-titan-50 cursor-not-allowed'
              ]">
              Anterior
            </button>
            <button
              @click="nextPage"
              :disabled="!canGoNext"
              :class="[
                'ml-3 relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md',
                canGoNext ? 'text-titan-700 bg-white hover:bg-titan-50' : 'text-titan-400 bg-titan-50 cursor-not-allowed'
              ]">
              Siguiente
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-titan-700">
                Mostrando
                <span class="font-medium">{{ startItem }}</span>
                a
                <span class="font-medium">{{ endItem }}</span>
                de
                <span class="font-medium">{{ productsData.total }}</span>
                productos
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  @click="previousPage"
                  :disabled="!canGoPrevious"
                  :class="[
                    'relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 text-sm font-medium',
                    canGoPrevious ? 'bg-white text-titan-500 hover:bg-titan-50' : 'bg-titan-50 text-titan-400 cursor-not-allowed'
                  ]">
                  <span class="sr-only">Anterior</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="goToPage(page)"
                  :class="[
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                    page === currentPage
                      ? 'z-10 bg-primary/10 border-primary text-primary'
                      : 'bg-white border-titan-300 text-titan-700 hover:bg-titan-50'
                  ]">
                  {{ page }}
                </button>
                <button
                  @click="nextPage"
                  :disabled="!canGoNext"
                  :class="[
                    'relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 text-sm font-medium',
                    canGoNext ? 'bg-white text-titan-500 hover:bg-titan-50' : 'bg-titan-50 text-titan-400 cursor-not-allowed'
                  ]">
                  <span class="sr-only">Siguiente</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
        </HealthSemaphore>
      </div>
    </div>

    <!-- Bulk delete confirmation (#816) -->
    <UiModal v-model="showBulkDeleteModal" title="Eliminar productos">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <Icon name="heroicons:trash" class="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p class="text-sm text-text-primary font-medium mb-1">
              ¿Eliminar {{ selectedIds.length }} producto{{ selectedIds.length !== 1 ? 's' : '' }}?
            </p>
            <p class="text-sm text-text-secondary">
              Si tienen ventas registradas, se archivarán: dejarán de venderse en POS y domicilios, pero se conserva el historial.
              Si nunca se vendieron, se eliminan permanentemente.
            </p>
          </div>
        </div>
        <div v-if="bulkDeleteError" class="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {{ bulkDeleteError }}
        </div>
        <div class="flex gap-3 mt-6">
          <UiButton type="button" variant="outline" class="flex-1" :disabled="isSubmitting" @click="showBulkDeleteModal = false">
            Cancelar
          </UiButton>
          <UiButton type="button" variant="destructive" class="flex-1 flex items-center justify-center gap-2" :disabled="isSubmitting" @click="confirmBulkDelete">
            <UiLoadingDots v-if="isSubmitting" size="8px" color="currentColor" />
            <span>{{ isSubmitting ? 'Eliminando...' : 'Sí, eliminar' }}</span>
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useToast } from '@/composables/useToast'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Productos' })

const router = useRouter()
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
  performSearch: applyCatalogSearch,
  hasActiveFilters,
} = useMenuCatalogFilters()

const currentPage = ref(1)
const itemsPerPage = ref(20)

const onCatalogSearch = () => applyCatalogSearch(() => { currentPage.value = 1 })
const onCatalogClear = () => { currentPage.value = 1 }

const emptyMessage = computed(() =>
  hasActiveFilters.value ? 'Ningún producto coincide con los filtros' : 'No hay productos registrados',
)

const emptySubMessage = computed(() =>
  hasActiveFilters.value
    ? 'Prueba ajustar o limpiar los filtros'
    : 'Crea un nuevo producto para comenzar',
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

const showComandasStations = computed(() => !!businessProfile.value?.comandas_enabled)

const { data: stationsData } = useQuery({
  key: () => ['tenant', 'stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { id: string; name: string }[] }>('/api/api/stations'),
  enabled: () => !!currentTenant.value && showComandasStations.value,
  staleTime: 30_000,
})
const stations = computed(() => stationsData.value?.data ?? [])

/** Product override station_id, else category default from API `station` object. */
const resolveProductStation = (item: {
  station?: { id: string; name: string; color?: string } | null
  station_id?: string | null
}) => {
  if (item.station) return item.station
  if (!item.station_id) return null
  const st = stations.value.find(s => s.id === item.station_id)
  if (!st) return null
  return {
    id: st.id,
    name: st.name,
    color: (st as { color?: string }).color ?? '#6366f1',
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
    sort: sortFilter.value,
  }],
  query: () => {
    const params: Record<string, string | number | boolean> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
      sort: sortFilter.value,
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

type ProductDraft = {
  name: string
  category_id: string
  price: number
  costo_percibido: number | null
  is_available: boolean
  station_id: string | null
  originalName: string
  originalCategoryId: string
  originalPrice: number
  originalCostoPercibido: number | null
  originalIsAvailable: boolean
  originalStationId: string | null
}

const editMode = ref(false)
const productDrafts = ref<Record<string, ProductDraft>>({})
const isSubmitting = ref(false)

const availabilityBulkOptions = [
  { label: 'Disponible', value: 'true' },
  { label: 'No disponible', value: 'false' },
]

function resolveCategoryId(product: {
  category_id?: string
  category_name?: string
}): string {
  if (product.category_id) return String(product.category_id)
  const name = product.category_name
  if (!name) return ''
  const match = categories.value.find((c: { id: string; name: string }) => c.name === name)
  return match?.id ?? ''
}

function createDraftFromProduct(product: {
  id: string
  name: string
  category_id?: string
  category_name?: string
  price: number
  costo_percibido?: number | string | null
  is_available?: boolean
  station_id?: string | null
}): ProductDraft {
  const category_id = resolveCategoryId(product)
  const price = Number(product.price)
  const costo =
    product.costo_percibido != null && product.costo_percibido !== ''
      ? Number(product.costo_percibido)
      : null
  const station_id = product.station_id ?? null
  const is_available = !!product.is_available
  return {
    name: String(product.name),
    category_id,
    price,
    costo_percibido: costo,
    is_available,
    station_id,
    originalName: String(product.name),
    originalCategoryId: category_id,
    originalPrice: price,
    originalCostoPercibido: costo,
    originalIsAvailable: is_available,
    originalStationId: station_id,
  }
}

function ensureDraft(product: {
  id: string
  name: string
  category_id?: string
  category_name?: string
  price: number
  costo_percibido?: number | string | null
  is_available?: boolean
  station_id?: string | null
}): ProductDraft {
  if (!productDrafts.value[product.id]) {
    productDrafts.value = {
      ...productDrafts.value,
      [product.id]: createDraftFromProduct(product),
    }
  }
  return productDrafts.value[product.id]
}

function draftHasChanges(d: ProductDraft): boolean {
  return (
    d.name !== d.originalName
    || d.category_id !== d.originalCategoryId
    || d.price !== d.originalPrice
    || d.costo_percibido !== d.originalCostoPercibido
    || d.is_available !== d.originalIsAvailable
    || d.station_id !== d.originalStationId
  )
}

const displayProducts = computed(() =>
  products.value.map((p: Record<string, unknown>) => {
    const draft = productDrafts.value[String(p.id)]
    if (!draft) return p
    const cat = categories.value.find((c: { id: string }) => c.id === draft.category_id)
    return {
      ...p,
      name: draft.name,
      category_id: draft.category_id,
      category_name: cat?.name ?? p.category_name,
      price: draft.price,
      costo_percibido: draft.costo_percibido,
      is_available: draft.is_available,
      station_id: draft.station_id,
    }
  }),
)

function applyBulkOverridesForSelectedRows() {
  if (selectedIds.value.length === 0) return
  for (const id of selectedIds.value) {
    const product = products.value.find((p: { id: string }) => p.id === id)
    if (!product || isOpenSaleShell(product)) continue
    const draft = ensureDraft(product)
    if (bulkCategoryId.value) draft.category_id = bulkCategoryId.value
    if (bulkAvailability.value !== '') {
      draft.is_available = bulkAvailability.value === 'true'
    }
    if (bulkStationId.value) draft.station_id = bulkStationId.value
  }
}

const hasBulkPendingOnSelection = computed(() => {
  if (selectedIds.value.length === 0) return false
  if (!editMode.value) {
    return !!bulkCategoryId.value || bulkAvailability.value !== '' || !!bulkStationId.value
  }
  if (!bulkCategoryId.value && bulkAvailability.value === '' && !bulkStationId.value) {
    return false
  }
  return selectedIds.value.some((id) => {
    const product = products.value.find((p: { id: string }) => p.id === id)
    if (!product || isOpenSaleShell(product)) return false
    const draft = productDrafts.value[id] ?? createDraftFromProduct(product)
    if (bulkCategoryId.value && draft.category_id !== bulkCategoryId.value) return true
    if (bulkAvailability.value !== '') {
      const want = bulkAvailability.value === 'true'
      if (draft.is_available !== want) return true
    }
    if (bulkStationId.value && draft.station_id !== bulkStationId.value) return true
    return false
  })
})

const hasRowChanges = computed(() =>
  Object.values(productDrafts.value).some(draftHasChanges),
)

const hasChanges = computed(() => hasRowChanges.value || hasBulkPendingOnSelection.value)

const canSubmit = computed(() => {
  const drafts = Object.values(productDrafts.value)
  if (drafts.length === 0 && hasBulkPendingOnSelection.value) {
    return true
  }
  return drafts.every(
    (d) => !!d.name.trim() && !!d.category_id && d.price > 0,
  )
})

function discardAllDrafts() {
  productDrafts.value = {}
}

function cancelEditOperation() {
  if (hasChanges.value) {
    const ok = window.confirm('¿Descartar los cambios y cancelar la edición?')
    if (!ok) return
  }
  discardAllDrafts()
  editMode.value = false
  clearSelection()
}

function toggleEditMode() {
  if (editMode.value) {
    cancelEditOperation()
    return
  }
  editMode.value = true
}

// Bulk selection (#816 / #817)
const selectedIds = ref<string[]>([])
const bulkCategoryId = ref('')
const bulkStationId = ref('')
const bulkAvailability = ref('')
const showBulkDeleteModal = ref(false)
const bulkDeleteError = ref('')

const selectableProductsOnPage = computed(() =>
  displayProducts.value.filter((p: { open_priced?: boolean }) => !isOpenSaleShell(p)),
)

const allPageSelected = computed(() => {
  const ids = selectableProductsOnPage.value.map((p: { id: string }) => p.id)
  return ids.length > 0 && ids.every((id: string) => selectedIds.value.includes(id))
})

const canBulkApplyCatalog = computed(
  () =>
    selectedIds.value.length > 0
    && (!!bulkCategoryId.value || bulkAvailability.value !== '' || !!bulkStationId.value),
)

const canBulkApplyEdit = computed(() => {
  if (selectedIds.value.length > 0) {
    return (hasChanges.value && canSubmit.value) || hasBulkPendingOnSelection.value
  }
  return hasChanges.value && canSubmit.value
})

const canBulkApply = computed(() =>
  editMode.value ? canBulkApplyEdit.value : canBulkApplyCatalog.value,
)

const toggleSelect = (id: string) => {
  const product = products.value.find((p: { id: string }) => p.id === id)
  if (product && isOpenSaleShell(product)) return
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value = selectedIds.value.filter((_, i) => i !== idx)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

const toggleSelectAll = () => {
  if (allPageSelected.value) {
    const pageIds = new Set(selectableProductsOnPage.value.map((p: { id: string }) => p.id))
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id))
  } else {
    const merged = new Set(selectedIds.value)
    for (const p of selectableProductsOnPage.value) {
      merged.add(p.id)
    }
    selectedIds.value = [...merged]
  }
}

const clearSelection = () => {
  selectedIds.value = []
  bulkCategoryId.value = ''
  bulkStationId.value = ''
  bulkAvailability.value = ''
  bulkDeleteError.value = ''
}

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
    appliedSearch,
  ],
  clearSelection,
)

async function executeBulkCatalogApply() {
  if (!canBulkApplyCatalog.value || isSubmitting.value) return
  isSubmitting.value = true
  let ok = 0
  let fail = 0
  const body: Record<string, string | boolean> = {}
  if (bulkCategoryId.value) body.category_id = bulkCategoryId.value
  if (bulkStationId.value) body.station_id = bulkStationId.value
  if (bulkAvailability.value !== '') {
    body.is_available = bulkAvailability.value === 'true'
  }

  try {
    for (const id of selectedIds.value) {
      try {
        await $fetch(`/api/menu/products/${id}`, { method: 'PUT', body })
        ok++
      } catch {
        fail++
      }
    }

    cache.invalidateQueries({ key: ['menu', 'products'] })
    await refetch()
    clearSelection()

    if (fail === 0) {
      toast.success(`Actualizados ${ok} producto${ok !== 1 ? 's' : ''}`, { title: 'Listo' })
    } else if (ok > 0) {
      toast.warning(`Actualizados ${ok}, fallaron ${fail}`, { title: 'Parcial' })
    } else {
      toast.error('No se pudo actualizar ningún producto', { title: 'Error' })
    }
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

  const idsToSave = new Set<string>()
  for (const [id, draft] of Object.entries(productDrafts.value)) {
    if (draftHasChanges(draft)) idsToSave.add(id)
  }
  if (idsToSave.size === 0) return

  isSubmitting.value = true
  let ok = 0
  let fail = 0

  try {
    for (const id of idsToSave) {
      const draft = productDrafts.value[id]
      if (!draft) continue
      const body: Record<string, unknown> = {
        name: draft.name.trim(),
        category_id: draft.category_id,
        price: draft.price,
        costo_percibido: draft.costo_percibido,
      }
      if (draft.is_available !== draft.originalIsAvailable) {
        body.is_available = draft.is_available
      }
      if (draft.station_id !== draft.originalStationId) {
        body.station_id = draft.station_id
      }
      try {
        await $fetch(`/api/menu/products/${id}`, { method: 'PUT', body })
        ok++
      } catch {
        fail++
      }
    }

    cache.invalidateQueries({ key: ['menu', 'products'] })
    await refetch()
    discardAllDrafts()
    clearSelection()

    if (fail === 0) {
      if (ok > 0) {
        toast.success(`Actualizados ${ok} producto${ok !== 1 ? 's' : ''}`, { title: 'Guardado' })
      } else {
        toast.success('Catálogo actualizado', { title: 'Guardado' })
      }
    } else if (ok > 0) {
      toast.warning(`Actualizados ${ok}, fallaron ${fail}`, { title: 'Guardado parcial' })
    } else {
      toast.error('No se pudo guardar ningún producto', { title: 'Error' })
    }
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
  let ok = 0
  let archived = 0
  let fail = 0

  for (const id of selectedIds.value) {
    try {
      const result = await $fetch<{ success: boolean; archived?: boolean }>(
        `/api/menu/products/${id}`,
        { method: 'DELETE' },
      )
      ok++
      if (result?.archived) archived++
    } catch {
      fail++
    }
  }

  showBulkDeleteModal.value = false
  cache.invalidateQueries({ key: ['menu', 'products'] })
  await refetch()
  clearSelection()
  isSubmitting.value = false

  if (fail === 0) {
    const msg = archived > 0
      ? `${ok} producto${ok !== 1 ? 's' : ''} procesado${ok !== 1 ? 's' : ''} (${archived} archivado${archived !== 1 ? 's' : ''})`
      : `${ok} producto${ok !== 1 ? 's' : ''} eliminado${ok !== 1 ? 's' : ''}`
    toast.success(msg, { title: 'Listo' })
  } else if (ok > 0) {
    toast.warning(`Procesados ${ok}, fallaron ${fail}`, { title: 'Parcial' })
  } else {
    bulkDeleteError.value = 'No se pudo eliminar ningún producto'
    showBulkDeleteModal.value = true
    toast.error('Error al eliminar', { title: 'Error' })
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

const catalogRowBaseClass = (row: { id: string }, index: number) => {
  if (costIssueProductIds.value.has(row.id)) return 'bg-status-critical-bg'
  if (costDriftProductIds.value.has(row.id)) return 'bg-status-warning-bg/40'
  return index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'
}

const catalogRowClass = (row: { id: string }, index: number) => {
  if (selectedIds.value.includes(row.id)) return 'bg-primary/10'
  return catalogRowBaseClass(row, index)
}

const getRowClass = (row: any): string => {
  const index = displayProducts.value.findIndex((p: { id: string }) => p.id === row.id)
  return catalogRowClass(row, index >= 0 ? index : 0)
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
      title: 'Producto',
      sortable: false,
      format: 'text',
      align: 'left'
    },
    {
      key: 'category_name',
      title: 'Categoría',
      sortable: false,
      format: 'text',
      align: 'left'
    },
    {
      key: 'price',
      title: 'Precio',
      sortable: false,
      format: 'currency',
      align: 'right'
    },
    {
      key: 'costo_calculado',
      title: 'Costo real',
      sortable: false,
      format: 'currency',
      align: 'right'
    },
    {
      key: 'costo_percibido',
      title: 'Mi costo',
      sortable: false,
      format: 'currency',
      align: 'right'
    },
    {
      key: 'margen_real',
      title: 'Margen real',
      sortable: false,
      format: 'text',
      align: 'center'
    },
    {
      key: 'margen_operativo',
      title: 'Margen op.',
      sortable: false,
      format: 'text',
      align: 'center'
    },
  ]

  const tailCols: typeof cols = [
    {
      key: 'is_available',
      title: 'Estado',
      sortable: false,
      format: 'boolean',
      align: 'center'
    },
    {
      key: 'is_available_online',
      title: 'Online',
      sortable: false,
      format: 'boolean',
      align: 'center'
    },
    ...(showTableQrColumn.value
      ? [{
          key: 'is_available_table_qr',
          title: 'QR mesa',
          sortable: false,
          format: 'boolean',
          align: 'center'
        }]
      : []),
  ]

  if (businessProfile.value?.comandas_enabled) {
    tailCols.push({
      key: 'station',
      title: 'Cocina',
      sortable: false,
      format: 'text',
      align: 'left'
    })
  }

  if (!editMode.value) {
    tailCols.push({
      key: 'actions',
      title: 'Acciones',
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
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const {
  marginRealPct,
  marginOperativoPct,
  hasCostDrift,
  formatCostCell: formatCostCellValue,
} = useProductMargins()

const formatCostCell = (value: unknown) => formatCostCellValue(value, formatCurrency)

const hasCostValue = (value: unknown) => value !== null && value !== undefined

// Backward compat alias
const getMarginValue = marginRealPct

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
    toast.error('Error al actualizar. Intenta de nuevo.')
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
    toast.error('Error al actualizar. Intenta de nuevo.')
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
