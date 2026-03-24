<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar los ingredientes.</p>
        <p class="text-sm text-text-secondary">{{ fetchError.message }}</p>
        <button @click="refresh" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- Stats -->
      <UiStats>
        <UiStatsCard
          label="Bases"
          :value="totalBases"
          icon="beaker"
        />
        <UiStatsCard
          label="Con variantes"
          :value="basesWithVariants"
          icon="collection"
        />
        <UiStatsCard
          label="Standalone"
          :value="standaloneCount"
          icon="cube"
        />
      </UiStats>

      <!-- Filters -->
      <SharedFiltersBar
        v-model:search="searchQuery"
        search-label="Buscar"
        search-placeholder="Buscar ingredientes..."
        @search="handleSearch"
        @clear-filters="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="typeFilter"
            class="px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos los tipos</option>
            <option value="food">Alimento</option>
            <option value="service">Servicio</option>
            <option value="supply">Insumo</option>
          </select>
        </template>
      </SharedFiltersBar>

      <!-- Table -->
      <UiResponsiveDataView
        :columns="tableColumns"
        :data="flatRows"
        :row-class="getRowClass"
        title="Catálogo de Ingredientes"
        empty-message="No hay ingredientes en el catálogo"
        empty-sub-message="Los ingredientes aparecerán aquí"
        variant="default"
      >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <!-- Variant card (indented) -->
          <div v-if="item._isVariant" class="ml-6 border-l-2 border-border pl-3">
            <UiCard class="bg-surface-secondary/50">
              <UiCardContent class="py-3 px-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-text-primary">{{ item.name }}</p>
                    <p class="text-xs text-text-secondary">{{ item.unit }} · {{ getTypeLabel(item.type) }}</p>
                  </div>
                  <button
                    @click="openDeleteConfirm(item)"
                    :aria-label="`Eliminar variante ${item.name}`"
                    class="p-2 rounded-md hover:bg-surface-secondary text-destructive transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </UiCardContent>
            </UiCard>
          </div>

          <!-- Base / Standalone card -->
          <UiCard v-else class="hover:shadow-md transition-shadow">
            <UiCardHeader>
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <button
                      v-if="item.has_variants"
                      @click="toggleExpand(item.id)"
                      :aria-expanded="expandedIds.has(item.id)"
                      :aria-label="expandedIds.has(item.id) ? `Colapsar variantes de ${item.name}` : `Expandir variantes de ${item.name}`"
                      class="p-1 rounded hover:bg-surface-secondary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center flex-shrink-0"
                    >
                      <svg class="w-4 h-4 text-text-secondary transition-transform" :class="{ 'rotate-90': expandedIds.has(item.id) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <h3 class="text-base font-semibold text-text-primary truncate">{{ item.name }}</h3>
                  </div>
                  <p class="text-sm text-text-secondary mt-0.5">{{ item.unit }} · {{ getTypeLabel(item.type) }}</p>
                </div>
                <UiStatusBadge
                  v-if="item.has_variants"
                  label="Con variantes"
                  variant="info"
                  class="ml-2 flex-shrink-0"
                />
                <UiStatusBadge
                  v-else
                  label="Standalone"
                  variant="default"
                  class="ml-2 flex-shrink-0"
                />
              </div>
            </UiCardHeader>
            <UiCardContent v-if="item.has_variants" class="pt-0">
              <div class="flex items-center gap-2 mt-2">
                <div v-if="loadingVariants.has(item.id)" class="text-xs text-text-secondary">Cargando variantes...</div>
                <div v-else-if="expandedIds.has(item.id)" class="text-xs text-text-secondary">
                  {{ (variantsByBase[item.id] || []).length }} variante(s)
                </div>
                <button
                  @click="openCreateVariant(item)"
                  :aria-label="`Agregar variante a ${item.name}`"
                  class="text-xs text-primary hover:underline font-medium min-h-[44px] flex items-center"
                >
                  + Agregar variante
                </button>
              </div>
            </UiCardContent>
          </UiCard>
        </template>

        <!-- Desktop Header -->
        <template #header>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 class="text-base sm:text-lg font-bold text-text-primary">Catálogo de Ingredientes</h3>
          </div>
        </template>

        <!-- Desktop: Nombre -->
        <template #cell-name="{ row }">
          <div class="flex items-center gap-2" :class="row._isVariant ? 'pl-8' : ''">
            <button
              v-if="!row._isVariant && row.has_variants"
              @click.stop="toggleExpand(row.id)"
              :aria-expanded="expandedIds.has(row.id)"
              :aria-label="expandedIds.has(row.id) ? `Colapsar ${row.name}` : `Expandir ${row.name}`"
              class="p-1.5 rounded hover:bg-surface-secondary transition-colors flex items-center justify-center min-h-[32px] min-w-[32px] flex-shrink-0"
            >
              <svg class="w-4 h-4 text-text-secondary transition-transform" :class="{ 'rotate-90': expandedIds.has(row.id) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div v-if="!row._isVariant && !row.has_variants" class="w-8 flex-shrink-0" />
            <div>
              <span :class="row._isVariant ? 'text-sm text-text-secondary' : 'text-sm font-semibold text-text-primary'">
                {{ row.name }}
              </span>
              <p v-if="row._isVariant" class="text-xs text-text-secondary/60">variante de {{ row._parentName }}</p>
            </div>
          </div>
        </template>

        <!-- Desktop: Unidad -->
        <template #cell-unit="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <!-- Desktop: Tipo -->
        <template #cell-type="{ row }">
          <UiStatusBadge
            :label="getTypeLabel(row.type)"
            :variant="getTypeVariant(row.type)"
          />
        </template>

        <!-- Desktop: Base global -->
        <template #cell-base_ref="{ row }">
          <span v-if="row._isVariant" class="text-sm text-text-secondary">{{ row._parentName }}</span>
          <span v-else class="text-xs text-text-secondary/40">—</span>
        </template>

        <!-- Desktop: Variantes -->
        <template #cell-variants_info="{ row }">
          <div v-if="!row._isVariant">
            <span v-if="row.has_variants" class="text-sm text-text-secondary">
              <span v-if="expandedIds.has(row.id) && variantsByBase[row.id]">
                {{ variantsByBase[row.id].length }}
              </span>
              <span v-else-if="loadingVariants.has(row.id)" class="text-text-secondary/60">...</span>
              <span v-else>—</span>
            </span>
            <span v-else class="text-xs text-text-secondary/60">Standalone</span>
          </div>
          <span v-else class="text-xs text-text-secondary/60">variante</span>
        </template>

        <!-- Desktop: Acciones -->
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-center gap-1">
            <!-- Base: agregar variante -->
            <button
              v-if="!row._isVariant && row.has_variants"
              @click.stop="openCreateVariant(row)"
              :aria-label="`Agregar variante a ${row.name}`"
              title="Agregar variante"
              class="p-2 rounded-md hover:bg-surface-secondary text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <!-- Variant: delete -->
            <template v-if="row._isVariant">
              <div v-if="deletingId === row.id" class="flex items-center gap-1">
                <span class="text-xs text-text-secondary whitespace-nowrap">¿Eliminar?</span>
                <button
                  @click.stop="confirmDelete(row)"
                  :disabled="isDeleting"
                  class="px-2 py-1 text-xs bg-destructive text-white rounded hover:opacity-90 disabled:opacity-50 min-h-[32px]"
                >
                  Sí
                </button>
                <button
                  @click.stop="cancelDelete"
                  class="px-2 py-1 text-xs border border-border rounded hover:bg-surface-secondary min-h-[32px]"
                >
                  No
                </button>
              </div>
              <button
                v-else
                @click.stop="openDeleteConfirm(row)"
                :aria-label="`Eliminar variante ${row.name}`"
                title="Eliminar variante"
                class="p-2 rounded-md hover:bg-surface-secondary text-destructive transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </template>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>

    <!-- Create Variant Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeCreateModal"
    >
      <div class="bg-surface rounded-xl max-w-md w-full shadow-xl">
        <div class="p-6 border-b border-border">
          <h3 class="text-lg font-semibold text-text-primary">
            Agregar variante de <span class="text-primary">{{ selectedBase?.name }}</span>
          </h3>
        </div>

        <form @submit.prevent="handleCreateVariant" class="p-6 space-y-5">
          <!-- Unidad (read-only) -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Unidad</label>
            <div class="px-4 py-3 border border-border rounded-lg bg-surface-secondary text-text-secondary text-sm">
              {{ selectedBase?.unit }}
              <span class="text-xs ml-2 text-text-secondary/60">(heredada del base — no editable)</span>
            </div>
          </div>

          <!-- Nombre -->
          <div>
            <label for="variant-name" class="block text-sm font-medium text-text-primary mb-2">
              Nombre de la variante <span class="text-destructive">*</span>
            </label>
            <input
              id="variant-name"
              v-model="variantForm.name"
              type="text"
              required
              :placeholder="`Ej: ${selectedBase?.name} premium`"
              class="input-base w-full px-4 py-2"
              autofocus
            />
          </div>

          <!-- Error -->
          <div v-if="createError" class="flex items-center gap-2 text-destructive text-sm">
            <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ createError }}</span>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="closeCreateModal"
              :disabled="isCreating"
              class="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-secondary transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isCreating || !variantForm.name.trim()"
              class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity min-h-[44px] flex items-center gap-2"
            >
              <CommonsTheCustomLoader v-if="isCreating" size="small" />
              <span>{{ isCreating ? 'Guardando...' : 'Guardar variante' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

useHead({ title: 'Ingredientes - Abastecimiento' })

const { onTenantChange, currentTenant } = useTenantReactive()
const { setRefreshHandler } = useLayoutActions()
const toast = useToast()

// --- Filters ---
const searchQuery = ref('')
const typeFilter = ref('')

// --- Base ingredients fetch ---
const { data: basesData, pending: isLoading, error: fetchError, refresh } = useFetch('/api/suppliers/ingredients', {
  server: false,
  watch: [currentTenant],
  query: computed(() => ({
    base_only: true,
    limit: 300,
    search: searchQuery.value || undefined,
    type: typeFilter.value || undefined,
  })),
  default: () => ({ data: [], total: 0 }),
  transform: (response: any) => ({
    data: response?.data || [],
    total: response?.total || 0,
  }),
})

const bases = computed(() => (basesData.value as any)?.data || [])
const totalBases = computed(() => (basesData.value as any)?.total || 0)
const basesWithVariants = computed(() => bases.value.filter((b: any) => b.has_variants).length)
const standaloneCount = computed(() => bases.value.filter((b: any) => !b.has_variants).length)

onTenantChange(async () => { await refresh() })
onMounted(() => { setRefreshHandler(refresh) })

// --- Expand / collapse ---
const expandedIds = ref<Set<string>>(new Set())
const variantsByBase = ref<Record<string, any[]>>({})
const loadingVariants = ref<Set<string>>(new Set())

async function toggleExpand(baseId: string) {
  if (expandedIds.value.has(baseId)) {
    expandedIds.value.delete(baseId)
    // Trigger reactivity
    expandedIds.value = new Set(expandedIds.value)
    return
  }
  expandedIds.value.add(baseId)
  expandedIds.value = new Set(expandedIds.value)

  if (!variantsByBase.value[baseId]) {
    loadingVariants.value.add(baseId)
    loadingVariants.value = new Set(loadingVariants.value)
    try {
      const res = await $fetch<any>(`/api/suppliers/ingredients/${baseId}/variants`)
      variantsByBase.value = { ...variantsByBase.value, [baseId]: res?.data || [] }
    } catch {
      variantsByBase.value = { ...variantsByBase.value, [baseId]: [] }
    } finally {
      loadingVariants.value.delete(baseId)
      loadingVariants.value = new Set(loadingVariants.value)
    }
  }
}

// --- Flat rows for table (bases + expanded variants interleaved) ---
const flatRows = computed(() => {
  const rows: any[] = []
  for (const base of bases.value) {
    rows.push(base)
    if (expandedIds.value.has(base.id)) {
      const variants = variantsByBase.value[base.id] || []
      for (const v of variants) {
        rows.push({ ...v, _isVariant: true, _parentName: base.name, _parentId: base.id })
      }
    }
  }
  return rows
})

// Row styling — variant rows get a subtle secondary background
const getRowClass = (row: any): string | undefined => {
  if (row._isVariant) return '!bg-surface-secondary/40'
  return undefined
}

// --- Create variant modal ---
const showCreateModal = ref(false)
const selectedBase = ref<any>(null)
const variantForm = ref({ name: '' })
const isCreating = ref(false)
const createError = ref('')

function openCreateVariant(base: any) {
  selectedBase.value = base
  variantForm.value = { name: '' }
  createError.value = ''
  showCreateModal.value = true
}

function closeCreateModal() {
  if (isCreating.value) return
  showCreateModal.value = false
  selectedBase.value = null
}

async function handleCreateVariant() {
  if (!selectedBase.value || !variantForm.value.name.trim()) return
  isCreating.value = true
  createError.value = ''
  try {
    await $fetch('/api/suppliers/ingredients', {
      method: 'POST',
      body: {
        name: variantForm.value.name.trim(),
        unit: selectedBase.value.unit,
        parent_id: selectedBase.value.id,
        type: selectedBase.value.type,
      },
    })
    // Reload variants for this base
    variantsByBase.value = { ...variantsByBase.value, [selectedBase.value.id]: null as any }
    expandedIds.value.add(selectedBase.value.id)
    expandedIds.value = new Set(expandedIds.value)
    const res = await $fetch<any>(`/api/suppliers/ingredients/${selectedBase.value.id}/variants`)
    variantsByBase.value = { ...variantsByBase.value, [selectedBase.value.id]: res?.data || [] }
    toast.success?.('Variante creada correctamente') || console.log('Variante creada')
    closeCreateModal()
  } catch (err: any) {
    createError.value = err?.data?.detail || 'Error al crear la variante. Intenta nuevamente.'
  } finally {
    isCreating.value = false
  }
}

// --- Delete variant ---
const deletingId = ref<string | null>(null)
const isDeleting = ref(false)

function openDeleteConfirm(variant: any) {
  deletingId.value = variant.id
}

function cancelDelete() {
  deletingId.value = null
}

async function confirmDelete(variant: any) {
  if (isDeleting.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/suppliers/ingredients/${variant.id}`, { method: 'DELETE' })
    // Remove from local list
    const parentId = variant._parentId
    if (parentId && variantsByBase.value[parentId]) {
      variantsByBase.value = {
        ...variantsByBase.value,
        [parentId]: variantsByBase.value[parentId].filter((v: any) => v.id !== variant.id),
      }
    }
    deletingId.value = null
    toast.success?.('Variante eliminada') || console.log('Variante eliminada')
  } catch (err: any) {
    const status = err?.status || err?.statusCode
    if (status === 409) {
      toast.error?.('Este ingrediente está en uso y no puede eliminarse') ||
        alert('Este ingrediente está en uso y no puede eliminarse')
    } else {
      toast.error?.('Error al eliminar la variante') || alert('Error al eliminar la variante')
    }
    deletingId.value = null
  } finally {
    isDeleting.value = false
  }
}

// --- Search ---
const handleSearch = () => {
  // Collapse all expanded rows when searching
  expandedIds.value = new Set()
  refresh()
}

const clearFilters = () => {
  searchQuery.value = ''
  typeFilter.value = ''
  expandedIds.value = new Set()
  refresh()
}

// --- Table columns ---
const tableColumns = [
  { key: 'name', title: 'Ingrediente', sortable: false, format: 'text', align: 'left' as const },
  { key: 'unit', title: 'Unidad', sortable: false, format: 'text', align: 'left' as const },
  { key: 'type', title: 'Tipo', sortable: false, format: 'text', align: 'center' as const },
  { key: 'base_ref', title: 'Base', sortable: false, format: 'text', align: 'left' as const },
  { key: 'variants_info', title: 'Variantes', sortable: false, format: 'text', align: 'center' as const },
  { key: 'actions', title: 'Acciones', sortable: false, format: 'text', align: 'center' as const },
]

// --- Helpers ---
const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = { food: 'Alimento', service: 'Servicio', supply: 'Insumo' }
  return labels[type] || type
}

const getTypeVariant = (type: string) => {
  const variants: Record<string, string> = { food: 'success', service: 'info', supply: 'warning' }
  return variants[type] || 'default'
}
</script>
