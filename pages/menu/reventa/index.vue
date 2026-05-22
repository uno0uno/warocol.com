<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="page-layout">
      <div class="flex flex-col gap-3 md:gap-4">
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
          search-placeholder="Buscar productos de reventa..."
          :show-no-recipe="false"
          show-cost-drift
          @search="onCatalogSearch"
          @clear="onCatalogClear"
          @filter-change="() => {}"
        />

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
          :is-submitting="isSubmittingBulk"
          :can-apply="canBulkApply"
          :show-station="false"
          :show-online="false"
          :show-qr="false"
          :categories="categories"
          :availability-options="availabilityBulkOptions"
          @apply="onBulkApply"
          @clear-selection="clearSelection"
          @cancel="onBulkCancel"
          @delete="openBulkDeleteModal"
        />

        <MenuCatalogBulkBar
          v-else-if="editMode"
          variant="edit-only"
          :is-submitting="isSubmittingSave"
          :can-save-edit="editSessionHasChanges && canSubmitEdit"
          @apply="saveEditSession"
          @cancel="onCancelEdit"
        />

        <HealthSemaphore :is-unlocked="true" title="Catálogo comercial de productos de reventa">
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
              <div class="text-right flex-shrink-0">
                <p class="text-xs text-text-secondary">En catálogo</p>
                <p class="text-2xl font-bold text-primary tabular-nums">{{ activeProductsCount }}</p>
              </div>
            </div>
          </template>

          <UiResponsiveDataView
            :columns="productosTableColumns"
            :data="displayTableRows"
            :row-class="getRowClass"
            :empty-message="emptyMessage"
            :empty-sub-message="emptySubMessage"
            variant="default"
            row-size="sm"
          >
            <template #header-select>
              <div class="flex items-center justify-center">
                <UiBulkSelectCheckbox :checked="allPageSelected" @change="toggleSelectAll" />
              </div>
            </template>

            <template #cell-select="{ row }">
              <UiBulkSelectCheckbox
                v-if="row"
                :checked="selectedIds.includes(row.id)"
                @change="toggleSelect(row.id)"
              />
            </template>

            <template #card="{ item, index }">
              <div
                class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors"
                :class="catalogRowClass(item, index)"
              >
                <UiBulkSelectCheckbox
                  :checked="selectedIds.includes(item.id)"
                  @change="toggleSelect(item.id)"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                    <span
                      v-if="item._item.toDelete"
                      class="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded"
                    >
                      Se quitará
                    </span>
                    <span
                      v-else-if="item._item.isNew"
                      class="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded"
                    >
                      Nuevo
                    </span>
                  </div>
                  <p class="text-xs text-text-secondary mt-0.5">
                    {{ item.category_name }}
                    <template v-if="isInCatalog(item._item)"> · {{ formatCurrency(item.price) }}</template>
                  </p>
                  <p v-if="item._item.existingProduct" class="text-xs text-text-tertiary flex flex-wrap items-center gap-1 mt-0.5">
                    <span>Real:</span>
                    <span v-if="hasCostValue(item.costo_calculado)">{{ formatCostCell(item.costo_calculado) }}</span>
                    <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
                    <span>· Mi costo:</span>
                    <span v-if="hasCostValue(item.costo_percibido)">{{ formatCostCell(item.costo_percibido) }}</span>
                    <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
                  </p>
                  <div v-if="editMode && isInCatalog(item._item)" class="relative w-fit mt-2" @click.stop>
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">$</span>
                    <input
                      v-model.number="ensureDraft(item._item).price"
                      type="number"
                      min="0"
                      step="100"
                      class="input-base input-money w-fit min-w-[7rem] pl-5 pr-2 py-1.5 text-sm text-right tabular-nums"
                      :style="{ width: moneyInputWidth(ensureDraft(item._item).price) }"
                    >
                  </div>
                  <p v-else-if="isInCatalog(item._item)" class="text-sm font-semibold text-text-primary mt-1">
                    {{ formatCurrency(item.price) }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <UiStatusBadge
                    v-if="marginRealPct(item) !== null"
                    :value="marginRealPct(item)!"
                    format="percentage"
                    :variant="(marginRealPct(item) ?? 0) >= 0 ? 'success' : 'secondary'"
                    size="sm"
                    title="Margen real"
                  />
                  <UiStatusBadge
                    v-else-if="item._item.existingProduct"
                    value="N/A"
                    format="text"
                    variant="secondary"
                    size="sm"
                    title="Margen real"
                    class="whitespace-nowrap"
                  />
                  <UiStatusBadge
                    v-if="marginOperativoPct(item) !== null"
                    :value="marginOperativoPct(item)!"
                    format="percentage"
                    variant="secondary"
                    size="sm"
                    title="Margen operativo"
                  />
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-text-tertiary uppercase tracking-wide">Catálogo</span>
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="isInCatalog(item._item)"
                      class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                      :class="isInCatalog(item._item) ? 'bg-success' : 'bg-titan-300'"
                      @click.stop="onToggleCatalog(item._item)"
                    >
                      <span
                        class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                        :class="isInCatalog(item._item) ? 'translate-x-4' : 'translate-x-0.5'"
                      />
                    </button>
                  </div>
                  <div v-if="isInCatalog(item._item)" class="flex items-center gap-2">
                    <span class="text-[10px] text-text-tertiary uppercase tracking-wide">Disp.</span>
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="item._item.isAvailable"
                      class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                      :class="item._item.isAvailable ? 'bg-success' : 'bg-titan-300'"
                      @click.stop="onToggleAvailabilityMobile(item)"
                    >
                      <span
                        class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                        :class="item._item.isAvailable ? 'translate-x-4' : 'translate-x-0.5'"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <template #cell-name="{ value, item }">
              <div class="flex items-center gap-2 flex-wrap min-w-0">
                <span class="text-sm font-medium text-text-primary">{{ value }}</span>
                <span
                  v-if="item._item.toDelete"
                  class="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded whitespace-nowrap"
                >
                  Se quitará
                </span>
                <span
                  v-else-if="item._item.isNew"
                  class="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded whitespace-nowrap"
                >
                  Nuevo
                </span>
              </div>
            </template>

            <template #cell-category_name="{ value, item }">
              <UiFilterSelect
                v-if="editMode && isInCatalog(item._item)"
                v-model="ensureDraft(item._item).category_id"
                placeholder="Categoría"
                :aria-label="`Categoría de ${item.name}`"
                :options="categoryOptions"
                class="min-w-[140px]"
                @click.stop
              />
              <span v-else class="text-sm text-text-secondary whitespace-nowrap">{{ value || 'Sin categoría' }}</span>
            </template>

            <template #cell-price="{ value, item }">
              <div
                v-if="editMode && isInCatalog(item._item)"
                class="relative w-fit ml-auto shrink-0"
                @click.stop
              >
                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">$</span>
                <input
                  v-model.number="ensureDraft(item._item).price"
                  type="number"
                  min="0"
                  step="100"
                  class="input-base input-money w-fit min-w-[7rem] pl-5 pr-2 py-1.5 text-sm text-right tabular-nums"
                  :style="{ width: moneyInputWidth(ensureDraft(item._item).price) }"
                  :aria-label="`Precio de ${item.name}`"
                >
              </div>
              <span v-else-if="isInCatalog(item._item)" class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
              <span v-else class="text-sm text-text-tertiary">—</span>
            </template>

            <template #cell-costo_calculado="{ value }">
              <div class="flex justify-end">
                <span v-if="hasCostValue(value)" class="text-sm text-text-primary tabular-nums">
                  {{ formatCostCell(value) }}
                </span>
                <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
              </div>
            </template>

            <template #cell-costo_percibido="{ value, item }">
              <div class="flex justify-end" @click.stop>
                <div
                  v-if="editMode && isInCatalog(item._item)"
                  class="relative w-fit ml-auto shrink-0"
                >
                  <input
                    v-model.number="ensureDraft(item._item).costo_percibido"
                    type="number"
                    min="0"
                    step="100"
                    class="input-base input-money w-fit min-w-[7rem] px-2 py-1.5 text-sm text-right tabular-nums"
                    :style="{ width: moneyInputWidth(ensureDraft(item._item).costo_percibido) }"
                    :aria-label="`Mi costo de ${item.name}`"
                    placeholder="Mi costo"
                  >
                </div>
                <span v-else-if="hasCostValue(value)" class="text-sm text-text-primary tabular-nums">
                  {{ formatCostCell(value) }}
                </span>
                <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
              </div>
            </template>

            <template #cell-margen_real="{ row }">
              <div class="flex justify-end">
                <UiStatusBadge
                  v-if="marginRealPct(row) !== null"
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
                  v-if="marginOperativoPct(row) !== null"
                  :value="marginOperativoPct(row)!"
                  format="percentage"
                  variant="secondary"
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

            <template #cell-in_catalog="{ item }">
              <div class="flex justify-center" @click.stop>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="isInCatalog(item._item)"
                  :aria-label="isInCatalog(item._item) ? `Quitar ${item.name} del catálogo al guardar` : `Agregar ${item.name} al catálogo al guardar`"
                  :title="isInCatalog(item._item) ? 'En catálogo (se aplica al guardar)' : 'Fuera del catálogo'"
                  class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  :class="isInCatalog(item._item) ? 'bg-success' : 'bg-titan-300'"
                  @click="onToggleCatalog(item._item)"
                >
                  <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                    :class="isInCatalog(item._item) ? 'translate-x-4' : 'translate-x-0.5'"
                  />
                </button>
              </div>
            </template>

            <template #cell-is_available="{ item }">
              <div class="flex justify-center" @click.stop="editMode && isInCatalog(item._item)">
                <template v-if="isInCatalog(item._item)">
                  <button
                    v-if="editMode"
                    type="button"
                    role="switch"
                    :aria-checked="ensureDraft(item._item).is_available"
                    :aria-label="ensureDraft(item._item).is_available ? `Marcar ${item.name} no disponible al guardar` : `Marcar ${item.name} disponible al guardar`"
                    class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                    :class="ensureDraft(item._item).is_available ? 'bg-success' : 'bg-titan-300'"
                    @click="toggleDraftAvailability(item._item)"
                  >
                    <span
                      class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                      :class="ensureDraft(item._item).is_available ? 'translate-x-4' : 'translate-x-0.5'"
                    />
                  </button>
                  <button
                    v-else
                    type="button"
                    role="switch"
                    :aria-checked="item.is_available"
                    :title="availabilityToggleTitle(item._item)"
                    :disabled="isAvailabilityToggleDisabled(item._item)"
                    class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="[
                      item.is_available ? 'bg-success' : 'bg-titan-300',
                      isAvailabilityToggleDisabled(item._item) ? 'cursor-wait' : 'cursor-pointer',
                    ]"
                    @click="onToggleAvailability(item._item)"
                  >
                    <span
                      class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                      :class="item.is_available ? 'translate-x-4' : 'translate-x-0.5'"
                    />
                  </button>
                </template>
                <span v-else class="text-sm text-text-tertiary">—</span>
              </div>
            </template>
          </UiResponsiveDataView>
        </HealthSemaphore>
      </div>
    </div>

    <UiModal v-model="showBulkDeleteModal" title="Eliminar productos de reventa">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <Icon name="heroicons:trash" class="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p class="text-sm text-text-primary font-medium mb-1">
              ¿Eliminar {{ selectedProductIds.length }} producto{{ selectedProductIds.length !== 1 ? 's' : '' }}?
            </p>
            <p class="text-sm text-text-secondary">
              Los ítems sin producto creado solo se desmarcarán del catálogo al guardar.
            </p>
          </div>
        </div>
        <div v-if="bulkDeleteError" class="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {{ bulkDeleteError }}
        </div>
        <div class="flex gap-3 mt-6">
          <UiButton type="button" variant="outline" class="flex-1" :disabled="isSubmittingBulk" @click="showBulkDeleteModal = false">
            Cancelar
          </UiButton>
          <UiButton type="button" variant="destructive" class="flex-1 flex items-center justify-center gap-2" :disabled="isSubmittingBulk" @click="confirmBulkDelete">
            <UiLoadingDots v-if="isSubmittingBulk" size="8px" color="currentColor" />
            <span>{{ isSubmittingBulk ? 'Eliminando...' : 'Sí, eliminar' }}</span>
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
import {
  runSequentialProductPatches,
  runSequentialRequests,
  toastCatalogBulkResult,
  toastCatalogDeleteResult,
} from '@/composables/useMenuCatalogBulkSave'
import { useMenuCatalogSelection } from '@/composables/useMenuCatalogSelection'
import { useResaleCatalogEditMode } from '@/composables/useResaleCatalogEditMode'
import {
  useResaleIngredientCatalog,
  type ResaleIngredientItemState,
  type ResaleIngredientTableRow,
} from '@/composables/useResaleIngredientCatalog'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useToast } from '@/composables/useToast'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Productos de Reventa' })

const toast = useToast()
const cache = useQueryCache()
const { currentTenant } = useTenantReactive()

const availabilityBulkOptions = [
  { label: 'Disponible', value: 'true' },
  { label: 'No disponible', value: 'false' },
]

const {
  selectedIds,
  bulkCategoryId,
  bulkStationId,
  bulkAvailability,
  bulkOnline,
  bulkQr,
  toggleSelect: selectionToggleSelect,
  allPageSelected: isAllPageSelected,
  toggleSelectAll: selectionToggleSelectAll,
  clearSelection: clearCatalogSelection,
  canBulkApplyCatalog: selectionCanBulkApplyCatalog,
  catalogRowSelectionClass,
} = useMenuCatalogSelection()

const showBulkDeleteModal = ref(false)
const bulkDeleteError = ref('')
const bannerDismissed = ref(false)

const {
  categories,
  resaleIngredients,
  isLoading,
  isRefreshing,
  fetchError,
  activeProductsCount,
  catalogHasChanges,
  canSubmit: catalogCanSubmit,
  isSubmittingBulk,
  isSubmittingSave,
  togglingAvailabilityIds,
  itemToTableRow,
  isInCatalog,
  toggleItem,
  toggleItemAvailability,
  toggleItemAvailabilityOptimistic,
  saveChanges,
  refetchCatalog,
  buildItemsWithStatus,
  itemsWithStatus,
} = useResaleIngredientCatalog(currentTenant)

const categoryOptions = computed(() =>
  (categories.value as { id: string, name: string }[]).map(c => ({ label: c.name, value: c.id })),
)

const bulkFields = computed(() => ({
  bulkCategoryId: bulkCategoryId.value,
  bulkStationId: bulkStationId.value,
  bulkAvailability: bulkAvailability.value,
  bulkOnline: bulkOnline.value,
  bulkQr: bulkQr.value,
}))

const {
  editMode,
  ensureDraft,
  itemToDisplayRow,
  hasChanges: editSessionHasChanges,
  canSubmit: canSubmitEdit,
  applyBulkOverridesForSelectedRows,
  syncDraftsToItems,
  discardAllDrafts,
  cancelEditOperation,
  canBulkApplyEdit,
} = useResaleCatalogEditMode({
  categories: computed(() => categories.value as { id: string, name: string }[]),
  itemsWithStatus,
  selectedIds,
  bulkFields,
  isInCatalog,
  itemHasChanges: catalogHasChanges,
})

function onToggleCatalog(item: ResaleIngredientItemState) {
  toggleItem(item)
  if (editMode.value && isInCatalog(item)) {
    ensureDraft(item)
  }
}

function toggleDraftAvailability(item: ResaleIngredientItemState) {
  const draft = ensureDraft(item)
  draft.is_available = !draft.is_available
}

function onToggleAvailability(item: ResaleIngredientItemState) {
  if (editMode.value) {
    toggleDraftAvailability(item)
    return
  }
  if (item.existingProduct) {
    toggleItemAvailabilityOptimistic(item)
  } else {
    toggleItemAvailability(item)
  }
}

function onToggleAvailabilityMobile(item: ResaleIngredientTableRow) {
  onToggleAvailability(item._item)
}

function isAvailabilityToggleDisabled(item: ResaleIngredientItemState) {
  return !!item.existingProduct?.id && togglingAvailabilityIds.value.has(item.existingProduct.id)
}

function availabilityToggleTitle(item: ResaleIngredientItemState) {
  if (item.existingProduct) {
    return item.isAvailable ? 'Disponible en POS' : 'No disponible en POS'
  }
  return item.isAvailable ? 'Disponible (se aplica al guardar)' : 'No disponible (se aplica al guardar)'
}

const {
  appliedSearch,
  statusFilter,
  categoryFilter,
  marginNegativeOnly,
  costDriftOnly,
  performSearch: applyCatalogSearch,
  hasActiveFilters,
} = useMenuCatalogFilters()

const onCatalogSearch = () => applyCatalogSearch()
const onCatalogClear = () => applyCatalogSearch()

const emptyMessage = computed(() =>
  resaleIngredients.value.length === 0
    ? 'No hay ingredientes de reventa'
    : hasActiveFilters.value
      ? 'Ningún ítem coincide con los filtros'
      : 'No hay ítems para mostrar',
)

const emptySubMessage = computed(() =>
  resaleIngredients.value.length === 0
    ? 'Activa is_resale en ingredientes propios'
    : hasActiveFilters.value
      ? 'Prueba ajustar o limpiar los filtros'
      : '',
)

const {
  marginRealPct,
  marginOperativoPct,
  hasCostDrift,
  formatCostCell: formatCostCellValue,
} = useProductMargins()

const formatCurrency = (value: number) => {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const formatCostCell = (value: unknown) => formatCostCellValue(value, formatCurrency)
const hasCostValue = (value: unknown) => value !== null && value !== undefined

function moneyInputWidth(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '7rem'
  const digits = String(Math.abs(Math.round(Number(value)))).length
  return `${Math.max(11, digits + 5)}ch`
}

const categoryNameById = computed(() => {
  const map = new Map<string, string>()
  for (const c of categories.value) {
    map.set(c.id, c.name)
  }
  return map
})

const tableRows = computed((): ResaleIngredientTableRow[] => {
  let rows = itemsWithStatus.value.map(item =>
    editMode.value && isInCatalog(item) ? itemToDisplayRow(item) : itemToTableRow(item),
  )

  const q = appliedSearch.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter(r => r.name.toLowerCase().includes(q))
  }

  if (statusFilter.value) {
    const wantAvailable = statusFilter.value === 'true'
    rows = rows.filter((r) => {
      if (!isInCatalog(r._item)) return false
      return r._item.isAvailable === wantAvailable
    })
  }

  if (categoryFilter.value) {
    const catName = categoryNameById.value.get(categoryFilter.value)
    if (catName) {
      rows = rows.filter(r =>
        r.category_name.toLowerCase() === catName.toLowerCase(),
      )
    }
  }

  if (marginNegativeOnly.value) {
    rows = rows.filter((r) => {
      const m = marginRealPct(r)
      return m !== null && m < 0
    })
  }

  if (costDriftOnly.value) {
    rows = rows.filter(r => r._item.existingProduct && hasCostDrift(r))
  }

  return rows
})

const displayTableRows = tableRows

const selectableRowsOnPage = computed(() => tableRows.value)

const allPageSelected = computed(() => isAllPageSelected(selectableRowsOnPage.value))

const canBulkApplyCatalog = computed(() =>
  selectionCanBulkApplyCatalog({ showOnline: false, showQr: false }),
)

const canBulkApply = computed(() =>
  editMode.value ? canBulkApplyEdit() : canBulkApplyCatalog.value,
)

function toggleEditMode() {
  if (editMode.value) {
    if (editSessionHasChanges.value) {
      const ok = window.confirm('¿Descartar los cambios y salir del modo edición?')
      if (!ok) return
    }
    discardAllDrafts()
    editMode.value = false
    buildItemsWithStatus()
    return
  }
  editMode.value = true
  for (const item of itemsWithStatus.value) {
    if (isInCatalog(item)) ensureDraft(item)
  }
}

function onCancelEdit() {
  cancelEditOperation(() => buildItemsWithStatus())
}

function onBulkCancel() {
  if (editMode.value) {
    onCancelEdit()
  } else {
    clearSelection()
  }
}

async function saveEditSession() {
  if (isSubmittingSave.value || !editSessionHasChanges.value || !catalogCanSubmit.value) return
  applyBulkOverridesForSelectedRows()
  syncDraftsToItems()
  await saveChanges()
  discardAllDrafts()
  clearSelection()
}

function toggleSelect(id: string) {
  selectionToggleSelect(id, tableRows.value)
}

function toggleSelectAll() {
  selectionToggleSelectAll(selectableRowsOnPage.value)
}

function clearSelection() {
  clearCatalogSelection()
  bulkDeleteError.value = ''
}

function findItemByIngredientId(ingredientId: string) {
  return itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
}

const selectedProductIds = computed(() =>
  selectedIds.value
    .map(id => findItemByIngredientId(id)?.existingProduct?.id)
    .filter((id): id is string => !!id),
)

function applyBulkDraftToSelection() {
  for (const ingredientId of selectedIds.value) {
    const item = findItemByIngredientId(ingredientId)
    if (!item) continue
    if (bulkAvailability.value !== '' && isInCatalog(item)) {
      item.isAvailable = bulkAvailability.value === 'true'
    }
  }
}

async function executeBulkCatalogApply() {
  if (!canBulkApply.value || isSubmittingBulk.value) return

  applyBulkDraftToSelection()

  const productIds = selectedProductIds.value
  if (productIds.length === 0) {
    clearSelection()
    toast.success('Cambios aplicados a la selección. Guarda para confirmar.', { title: 'Listo' })
    return
  }

  isSubmittingBulk.value = true
  const body: Record<string, string | boolean> = {}
  if (bulkCategoryId.value) body.category_id = bulkCategoryId.value
  if (bulkAvailability.value !== '') {
    body.is_available = bulkAvailability.value === 'true'
  }

  if (Object.keys(body).length === 0) {
    isSubmittingBulk.value = false
    clearSelection()
    return
  }

  try {
    const result = await runSequentialProductPatches(productIds, () => body)
    cache.invalidateQueries({ key: ['menu', 'products'] })
    await refetchCatalog()
    clearSelection()
    toastCatalogBulkResult(result, toast, {
      title: 'Listo',
      errorMessage: 'No se pudo actualizar ningún producto',
    })
  } finally {
    isSubmittingBulk.value = false
  }
}

function onBulkApply() {
  if (editMode.value) {
    saveEditSession()
  } else {
    executeBulkCatalogApply()
  }
}

const openBulkDeleteModal = () => {
  bulkDeleteError.value = ''
  if (selectedProductIds.value.length === 0) {
    for (const ingredientId of selectedIds.value) {
      const item = findItemByIngredientId(ingredientId)
      if (item && isInCatalog(item)) onToggleCatalog(item)
    }
    clearSelection()
    return
  }
  showBulkDeleteModal.value = true
}

async function confirmBulkDelete() {
  const productIds = selectedProductIds.value
  if (productIds.length === 0 || isSubmittingBulk.value) return

  isSubmittingBulk.value = true
  bulkDeleteError.value = ''
  let archived = 0

  const result = await runSequentialRequests(
    productIds.map(id => ({
      key: id,
      run: async () => {
        const res = await $fetch<{ success: boolean, archived?: boolean }>(
          `/api/menu/products/${id}`,
          { method: 'DELETE' },
        )
        if (res?.archived) archived++
      },
    })),
  )

  showBulkDeleteModal.value = false
  cache.invalidateQueries({ key: ['menu', 'products'] })
  await refetchCatalog()
  clearSelection()
  isSubmittingBulk.value = false

  if (result.fail === 0) {
    toastCatalogDeleteResult({ ...result, archived }, toast)
  } else if (result.ok > 0) {
    toastCatalogDeleteResult({ ...result, archived }, toast)
  } else {
    bulkDeleteError.value = 'No se pudo eliminar ningún producto'
    showBulkDeleteModal.value = true
    toast.error('Error al eliminar', { title: 'Error' })
  }
}

watch([appliedSearch, statusFilter, categoryFilter, marginNegativeOnly, costDriftOnly], clearSelection)

const costIssueRowIds = computed(() => {
  const ids = new Set<string>()
  for (const r of tableRows.value) {
    if (r._item.existingProduct && r.costo_calculado != null && Number(r.costo_calculado) > Number(r.price)) {
      ids.add(r.id)
    }
  }
  return ids
})

const costIssueCount = computed(() => costIssueRowIds.value.size)

const costDriftRowIds = computed(() => {
  const ids = new Set<string>()
  for (const r of tableRows.value) {
    if (r._item.existingProduct && hasCostDrift(r)) ids.add(r.id)
  }
  return ids
})

const catalogRowBaseClass = (row: ResaleIngredientTableRow, index: number) => {
  if (row._item.toDelete) return 'bg-red-50 dark:bg-red-950/20'
  if (costIssueRowIds.value.has(row.id)) return 'bg-status-critical-bg'
  if (costDriftRowIds.value.has(row.id)) return 'bg-status-warning-bg/40'
  if (isInCatalog(row._item)) return 'bg-primary/5'
  return index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'
}

const catalogRowClass = (row: ResaleIngredientTableRow, index: number) =>
  catalogRowSelectionClass(row.id, catalogRowBaseClass(row, index))

const getRowClass = (row: ResaleIngredientTableRow): string => {
  const index = tableRows.value.findIndex(r => r.id === row.id)
  return catalogRowClass(row, index >= 0 ? index : 0)
}

const productosTableColumns = computed(() => [
  { key: 'select', title: '', sortable: false, width: '44px', class: '!px-0', align: 'center' as const },
  { key: 'name', title: 'Producto', sortable: false, format: 'text', align: 'left' as const },
  { key: 'category_name', title: 'Categoría', sortable: false, format: 'text', align: 'left' as const },
  { key: 'price', title: 'Precio', sortable: false, format: 'currency', align: 'right' as const },
  { key: 'costo_calculado', title: 'Costo real', sortable: false, format: 'currency', align: 'right' as const },
  { key: 'costo_percibido', title: 'Mi costo', sortable: false, format: 'currency', align: 'right' as const },
  { key: 'margen_real', title: 'Margen real', sortable: false, format: 'text', align: 'center' as const },
  { key: 'margen_operativo', title: 'Margen op.', sortable: false, format: 'text', align: 'center' as const },
  { key: 'in_catalog', title: 'En catálogo', sortable: false, format: 'boolean', align: 'center' as const },
  { key: 'is_available', title: 'Disponible', sortable: false, format: 'boolean', align: 'center' as const },
])

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

onMounted(() => {
  setRefreshHandler(refetchCatalog)
})
useMenuReturnRefresh('/menu/reventa', refetchCatalog)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetchCatalog)
})
</script>

<style scoped>
.page-layout {
  @apply w-full;
}
</style>
