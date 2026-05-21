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

        <!-- Filters Bar -->
        <UiAdvancedFiltersBar
          v-model:search="localSearchTerm"
          v-model:search-field="apiSearchField"
          :search-fields="searchFields"
          search-placeholder="Buscar productos..."
          :show-date-range="false"
          :show-clear="hasActiveFilters"
          @search="performSearch"
          @clear="clearFilters"
        >
          <template #additional-filters>
            <select
              v-model="categoryFilter"
              :class="filterSelectClass"
              aria-label="Filtrar por categoría"
            >
              <option value="">Categoría</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>

            <select
              v-model="statusFilter"
              :class="filterSelectClass"
              aria-label="Filtrar por estado"
            >
              <option value="">Estado</option>
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <select
              v-if="showComandasStations"
              v-model="stationFilter"
              :class="filterSelectClass"
              aria-label="Filtrar por estación de cocina"
            >
              <option value="">Estación</option>
              <option v-for="st in stations" :key="st.id" :value="st.id">{{ st.name }}</option>
            </select>

            <select
              v-model="sortFilter"
              :class="filterSelectClass"
              aria-label="Ordenar productos"
            >
              <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label
              class="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-colors flex-shrink-0"
              :class="onlineOnly
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-emerald-400'"
            >
              <input v-model="onlineOnly" type="checkbox" class="sr-only" aria-label="Solo visibles online" />
              <span class="text-sm font-semibold">Online</span>
            </label>

            <label
              v-if="showTableQrColumn"
              class="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-colors flex-shrink-0"
              :class="qrOnly
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-emerald-400'"
            >
              <input v-model="qrOnly" type="checkbox" class="sr-only" aria-label="Solo visibles en QR mesa" />
              <span class="text-sm font-semibold">QR mesa</span>
            </label>

            <label
              class="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-colors flex-shrink-0"
              :class="noRecipeOnly
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-emerald-400'"
            >
              <input v-model="noRecipeOnly" type="checkbox" class="sr-only" aria-label="Solo productos sin receta" />
              <span class="text-sm font-semibold">Sin receta</span>
            </label>

            <label
              class="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-colors flex-shrink-0"
              :class="marginNegativeOnly
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-emerald-400'"
            >
              <input v-model="marginNegativeOnly" type="checkbox" class="sr-only" aria-label="Solo margen negativo" />
              <span class="text-sm font-semibold">Margen negativo</span>
            </label>
          </template>
        </UiAdvancedFiltersBar>

        <HealthSemaphore :is-unlocked="true" title="Catálogo y rentabilidad de productos">
          <template #header-actions>
            <NuxtLink
              to="/menu/productos/crear"
              class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
            >
              <span class="hidden sm:inline">+ Nuevo producto</span>
              <span class="sm:hidden">+ Nuevo</span>
            </NuxtLink>
          </template>
        <!-- Responsive Data View (Mobile Cards + Desktop Table) -->
        <UiResponsiveDataView
          :columns="productosTableColumns"
          :data="products"
          :row-class="getRowClass"
          :empty-message="emptyMessage"
          :empty-sub-message="emptySubMessage"
          variant="default"
          row-size="sm"
        >

          <!-- Mobile Card Slot -->
          <template #card="{ item, index }">
            <div
              class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary cursor-pointer"
              :class="[
                costIssueProductIds?.has(item.id)
                  ? 'bg-status-critical-bg'
                  : costDriftProductIds?.has(item.id)
                    ? 'bg-status-warning-bg/40'
                    : (index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30')
              ]"
              @click="editProduct(item)"
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
              <div class="flex-1 min-w-0">
                <span class="text-sm font-bold text-text-primary">{{ toTitleCase(item.name) }}</span>
                <p class="text-xs text-text-secondary mt-0.5">
                  {{ item.category_name || 'Sin categoría' }} · {{ formatCurrency(item.price) }}
                </p>
                <p class="text-xs text-text-tertiary flex flex-wrap items-center gap-1">
                  <span>Real:</span>
                  <span v-if="hasCostValue(item.costo_calculado)">{{ formatCostCell(item.costo_calculado) }}</span>
                  <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
                  <span>· Mi costo:</span>
                  <span v-if="hasCostValue(item.costo_percibido)">{{ formatCostCell(item.costo_percibido) }}</span>
                  <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
                </p>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span
                  v-if="businessProfile?.comandas_enabled && item.station"
                  class="flex items-center gap-1 text-xs text-text-secondary whitespace-nowrap"
                >
                  <span class="inline-block w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: item.station.color }" />
                  <span class="whitespace-nowrap">{{ item.station.name }}</span>
                </span>
                <UiStatusBadge
                  v-if="marginRealPct(item) !== null"
                  :value="marginRealPct(item)!"
                  format="percentage"
                  :variant="(marginRealPct(item) ?? 0) >= 0 ? 'success' : 'secondary'"
                  size="sm"
                  title="Margen real"
                />
                <UiStatusBadge
                  v-if="marginOperativoPct(item) !== null"
                  :value="marginOperativoPct(item)!"
                  format="percentage"
                  variant="secondary"
                  size="sm"
                  title="Margen operativo"
                />
                <UiStatusBadge
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
            <div class="flex items-center gap-3">
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
              <span class="text-sm font-medium text-text-primary whitespace-nowrap">{{ toTitleCase(value) }}</span>
            </div>
          </template>

          <template #cell-category_name="{ value }">
            <span class="text-sm text-text-secondary whitespace-nowrap">{{ value || 'Sin categoría' }}</span>
          </template>

          <template #cell-price="{ value }">
            <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-costo_calculado="{ value }">
            <div class="flex justify-end">
              <span v-if="hasCostValue(value)" class="text-sm text-text-primary tabular-nums">
                {{ formatCostCell(value) }}
              </span>
              <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
            </div>
          </template>

          <template #cell-costo_percibido="{ value }">
            <div class="flex justify-end">
              <span v-if="hasCostValue(value)" class="text-sm text-text-primary tabular-nums">
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
            <div v-if="item.station" class="flex items-center gap-1.5 whitespace-nowrap">
              <span class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: item.station.color }" />
              <span class="text-sm text-text-secondary whitespace-nowrap">{{ item.station.name }}</span>
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

          <template #cell-is_available="{ value }">
            <div class="flex justify-center">
              <UiStatusBadge
                :value="value ? 'Disponible' : 'No disponible'"
                format="text"
                :variant="value ? 'success' : 'secondary'"
                size="sm"
              />
            </div>
          </template>

          <template #cell-is_available_online="{ row }">
            <div class="flex justify-center">
              <button
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
            </div>
          </template>

          <template v-if="showTableQrColumn" #cell-is_available_table_qr="{ row }">
            <div class="flex justify-center">
              <button
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
            </div>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-center space-x-2">
              <button
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
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useToast } from '@/composables/useToast'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Productos' })

const router = useRouter()

// Filters — AdvancedFiltersBar + server-side API (#761)
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const apiSearchField = ref('name')
const statusFilter = ref('')
const categoryFilter = ref('')
const stationFilter = ref('')
const sortFilter = ref('created_at_desc')
const onlineOnly = ref(false)
const qrOnly = ref(false)
const noRecipeOnly = ref(false)
const marginNegativeOnly = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(20)

const searchFields = [
  { label: 'Nombre', value: 'name' },
  { label: 'Descripción', value: 'description' },
  { label: 'Nombre cocina', value: 'kitchen_name' },
]

const statusOptions = [
  { label: 'Disponible', value: 'true' },
  { label: 'No disponible', value: 'false' },
]

const sortOptions = [
  { label: 'Más recientes', value: 'created_at_desc' },
  { label: 'Más antiguos', value: 'created_at_asc' },
  { label: 'Nombre A-Z', value: 'name_asc' },
  { label: 'Nombre Z-A', value: 'name_desc' },
  { label: 'Precio menor', value: 'price_asc' },
  { label: 'Precio mayor', value: 'price_desc' },
  { label: 'Margen menor', value: 'margin_asc' },
  { label: 'Margen mayor', value: 'margin_desc' },
]

const performSearch = () => applySearch(() => { currentPage.value = 1 })

const clearFilters = () => {
  clearSearch()
  apiSearchField.value = 'name'
  statusFilter.value = ''
  categoryFilter.value = ''
  stationFilter.value = ''
  sortFilter.value = 'created_at_desc'
  onlineOnly.value = false
  qrOnly.value = false
  noRecipeOnly.value = false
  marginNegativeOnly.value = false
  currentPage.value = 1
}

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!statusFilter.value
    || !!categoryFilter.value
    || !!stationFilter.value
    || sortFilter.value !== 'created_at_desc'
    || onlineOnly.value
    || qrOnly.value
    || noRecipeOnly.value
    || marginNegativeOnly.value,
)

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

// Reset page on tenant or filter change
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
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
    appliedSearch,
  ],
  () => { currentPage.value = 1 },
)

// Computed properties for data
const products = computed(() => productsData.value?.data || [])

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

const getRowClass = (row: any): string | undefined => {
  if (costIssueProductIds.value.has(row.id)) return 'bg-status-critical-bg'
  if (costDriftProductIds.value.has(row.id)) return 'bg-status-warning-bg/40'
  return undefined
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

  cols.push(
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
    {
      key: 'actions',
      title: 'Acciones',
      sortable: false,
      format: 'text',
      align: 'center'
    }
  )

  if (businessProfile.value?.comandas_enabled) {
    cols.splice(cols.length - 1, 0, {
      key: 'station',
      title: 'Cocina',
      sortable: false,
      format: 'text',
      align: 'left'
    })
  }

  return cols
})

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
const toast = useToast()
const togglingIds = ref<Set<string>>(new Set())
const togglingTableQrIds = ref<Set<string>>(new Set())

const toggleOnlineAvailability = async (product: any) => {
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
const editProduct = (product: any) => {
  router.push(`/menu/productos/${product.id}`)
}

</script>

<style scoped>
.page-layout {
  @apply w-full;
}
</style>
