<template>
  <div class="page-layout">

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

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
            class="px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>
            <option value="food">Alimentos</option>
            <option value="service">Servicios</option>
            <option value="supply">Insumos</option>
          </select>
          <!-- Hierarchy filter toggle -->
          <div class="flex rounded-lg border border-border overflow-hidden text-sm" role="group" aria-label="Filtrar por jerarquía de ingredientes">
            <button
              @click="hierarchyFilter = ''"
              :class="['px-3 py-2 min-h-[44px] transition-colors', hierarchyFilter === '' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-secondary']"
            >Ver todas</button>
            <button
              @click="hierarchyFilter = 'bases'"
              :class="['px-3 py-2 min-h-[44px] border-l border-border transition-colors', hierarchyFilter === 'bases' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-secondary']"
            >Solo bases</button>
            <button
              @click="hierarchyFilter = 'variantes'"
              :class="['px-3 py-2 min-h-[44px] border-l border-border transition-colors', hierarchyFilter === 'variantes' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-secondary']"
            >Solo variantes</button>
          </div>
        </template>
      </SharedFiltersBar>

      <!-- Table -->
      <UiResponsiveDataView
        row-size="sm"
        :columns="tableColumns"
        :data="filteredBases"
        title="Catálogo Global de Ingredientes"
        empty-message="No hay ingredientes en el catálogo."
        :total="totalItems"
        :page="currentPage"
        :per-page="PAGE_SIZE"
        @page-change="onPageChange"
      >
        <template #header-actions>
          <button
            @click="openCreateModal"
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium min-h-[44px]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nuevo ingrediente
          </button>
        </template>

        <!-- Card slot (mobile) -->
        <template #card="{ row }">
          <div class="flex flex-col gap-1">
            <div class="font-medium text-text-primary">{{ row.name }}</div>
            <div class="text-sm text-text-secondary">{{ row.unit }} · {{ typeLabel(row.type) }}</div>
            <div v-if="row.category" class="text-sm text-text-secondary">{{ row.category }}</div>
            <div v-if="row.hierarchy_base_name" class="text-sm text-text-secondary">
              Base: <span class="font-medium text-text-primary">{{ row.hierarchy_base_name }}</span>
            </div>
            <div v-else-if="row.hierarchy_variant_count > 0" class="text-sm text-text-secondary">
              {{ row.hierarchy_variant_count }} variante{{ row.hierarchy_variant_count !== 1 ? 's' : '' }}
            </div>
            <div class="flex gap-2 mt-2 flex-wrap">
              <button
                v-if="row.hierarchy_variant_count > 0"
                @click="openVariantsPanel(row)"
                class="text-sm text-primary hover:underline min-h-[44px] px-2"
              >Ver variantes</button>
              <button
                v-if="row.hierarchy_base_id"
                @click="removeBase(row)"
                class="text-sm text-status-critical-text hover:underline min-h-[44px] px-2"
              >Quitar base</button>
              <button
                v-else
                @click="openAssignModal(row)"
                class="text-sm text-primary hover:underline min-h-[44px] px-2"
              >Asignar base</button>
            </div>
          </div>
        </template>

        <!-- Name cell -->
        <template #cell-name="{ row }">
          <span class="font-medium text-text-primary">{{ row.name }}</span>
        </template>

        <!-- Type cell -->
        <template #cell-type="{ row }">
          <span class="text-sm text-text-secondary">{{ typeLabel(row.type) }}</span>
        </template>

        <!-- Hierarchy base cell -->
        <template #cell-hierarchy_base="{ row }">
          <span
            v-if="row.hierarchy_base_name"
            class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-secondary text-text-secondary"
          >
            {{ row.hierarchy_base_name }}
          </span>
          <span v-else-if="row.hierarchy_variant_count > 0" class="text-xs text-text-tertiary">
            base ({{ row.hierarchy_variant_count }})
          </span>
          <span v-else class="text-sm text-text-tertiary">—</span>
        </template>

        <!-- Variant count cell -->
        <template #cell-hierarchy_variant_count="{ row }">
          <button
            v-if="row.hierarchy_variant_count > 0"
            @click="openVariantsPanel(row)"
            class="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
            :aria-label="`Ver ${row.hierarchy_variant_count} variantes de ${row.name}`"
          >
            {{ row.hierarchy_variant_count }}
          </button>
          <span v-else class="text-sm text-text-tertiary">—</span>
        </template>

        <!-- Actions cell -->
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-1 justify-end">
            <button
              v-if="row.hierarchy_base_id"
              @click="removeBase(row)"
              class="p-2 text-status-critical-text hover:bg-status-critical-bg rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              :aria-label="`Quitar base de ${row.name}`"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
            </button>
            <button
              v-else
              @click="openAssignModal(row)"
              class="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              :aria-label="`Asignar base a ${row.name}`"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>

    <!-- ── Create Modal ─────────────────────────────────────────────────── -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeCreateModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-modal-title"
    >
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <h2 id="create-modal-title" class="text-lg font-semibold text-text-primary">
          Nuevo ingrediente
        </h2>

        <form @submit.prevent="() => submitCreate(false)" class="flex flex-col gap-4" novalidate>
          <!-- Name -->
          <div class="flex flex-col gap-1">
            <label for="create-name" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-status-critical-text" aria-hidden="true">*</span>
            </label>
            <input
              id="create-name"
              v-model="createForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ej. Tomate"
              autocomplete="off"
            />
            <!-- Similar ingredients conflict warning -->
            <div
              v-if="conflictSimilar.length > 0"
              class="flex flex-col gap-2 p-3 bg-status-warning-bg rounded-lg text-sm"
              role="alert"
            >
              <div class="flex items-start gap-2 text-status-warning-text font-medium">
                <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                <span>Ingredientes similares encontrados:</span>
              </div>
              <ul class="flex flex-col gap-0.5 pl-6">
                <li
                  v-for="s in conflictSimilar"
                  :key="s.id"
                  class="text-text-secondary"
                >
                  · {{ s.name }} <span v-if="s.unit">({{ s.unit }})</span> — {{ Math.round(s.score * 100) }}% similar
                </li>
              </ul>
              <div class="flex gap-2 pt-1">
                <button
                  type="button"
                  @click="closeCreateModal"
                  class="flex-1 px-3 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-secondary min-h-[44px] transition-colors"
                >
                  Usar existente
                </button>
                <button
                  type="button"
                  @click="() => submitCreate(true)"
                  :disabled="isSubmitting"
                  class="flex-1 px-3 py-2 text-sm bg-status-warning-text text-white rounded-lg hover:opacity-90 disabled:opacity-50 min-h-[44px] transition-opacity"
                >
                  <span v-if="isSubmitting">Creando...</span>
                  <span v-else>Crear de todas formas</span>
                </button>
              </div>
            </div>
            <span v-if="createErrors.name" class="text-sm text-status-critical-text flex items-center gap-1" role="alert">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              {{ createErrors.name }}
            </span>
          </div>

          <!-- Unit -->
          <div class="flex flex-col gap-1">
            <label for="create-unit" class="text-sm font-medium text-text-primary">
              Unidad <span class="text-status-critical-text" aria-hidden="true">*</span>
            </label>
            <select
              id="create-unit"
              v-model="createForm.unit"
              required
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar</option>
              <option value="gr">gr</option>
              <option value="ml">ml</option>
              <option value="kg">kg</option>
              <option value="und">und</option>
              <option value="lt">lt</option>
            </select>
            <span v-if="createErrors.unit" class="text-sm text-status-critical-text" role="alert">{{ createErrors.unit }}</span>
          </div>

          <!-- Category -->
          <div class="flex flex-col gap-1">
            <label for="create-category" class="text-sm font-medium text-text-primary">Categoría</label>
            <input
              id="create-category"
              v-model="createForm.category"
              type="text"
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ej. Lácteos"
            />
          </div>

          <div v-if="conflictSimilar.length === 0" class="flex gap-3 justify-end pt-2">
            <button
              type="button"
              @click="closeCreateModal"
              class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg min-h-[44px] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-opacity"
            >
              <span v-if="isSubmitting">Creando...</span>
              <span v-else>Crear ingrediente</span>
            </button>
          </div>
          <div v-else class="flex justify-start">
            <button
              type="button"
              @click="conflictSimilar = []"
              class="text-sm text-text-secondary hover:underline"
            >
              ← Volver al formulario
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Assign Base Modal ──────────────────────────────────────────────── -->
    <div
      v-if="showAssignModal && assigningRow"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeAssignModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-modal-title"
    >
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <h2 id="assign-modal-title" class="text-lg font-semibold text-text-primary">
          Asignar base a "{{ assigningRow.name }}"
        </h2>

        <div class="flex flex-col gap-0.5 text-sm bg-surface-secondary rounded-lg p-3">
          <span class="text-text-secondary">Unidad de este ingrediente: <strong class="text-text-primary">{{ assigningRow.unit ?? '—' }}</strong></span>
          <span class="text-xs text-text-tertiary">La unidad del ingrediente base debe coincidir.</span>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-primary">
            Buscar ingrediente base <span class="text-status-critical-text" aria-hidden="true">*</span>
          </label>
          <UiIngredientSearchInput
            placeholder="Buscar base..."
            @select="onSelectBase"
          />
          <!-- Selected base preview -->
          <div
            v-if="selectedBase"
            class="flex items-center justify-between px-3 py-2 bg-surface-secondary rounded-lg text-sm mt-1"
          >
            <span class="font-medium text-text-primary">{{ selectedBase.name }}</span>
            <span class="text-text-secondary">{{ selectedBase.unit }}</span>
          </div>
          <!-- Inline error: unit mismatch or API error -->
          <span
            v-if="assignError"
            class="flex items-center gap-1 text-sm text-status-critical-text"
            role="alert"
          >
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            {{ assignError }}
          </span>
        </div>

        <div class="flex gap-3 justify-end pt-2">
          <button
            type="button"
            @click="closeAssignModal"
            class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg min-h-[44px] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="submitAssign"
            :disabled="!selectedBase || !!assignError || assignSubmitting"
            class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-opacity"
          >
            <span v-if="assignSubmitting">Asignando...</span>
            <span v-else>Asignar base</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Variants Panel ──────────────────────────────────────────────── -->
    <div
      v-if="showVariantsPanel && variantsBase"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeVariantsPanel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`variants-title-${variantsBase.id}`"
    >
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[80vh]">
        <div class="flex items-center justify-between">
          <h2 :id="`variants-title-${variantsBase.id}`" class="text-lg font-semibold text-text-primary">
            Variantes de "{{ variantsBase.name }}"
          </h2>
          <button
            @click="closeVariantsPanel"
            class="p-2 text-text-secondary hover:text-text-primary rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar panel de variantes"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Loading variants -->
        <div v-if="variantsLoading" class="flex items-center justify-center py-8">
          <CommonsTheCustomLoader size="medium" />
        </div>

        <!-- Empty state -->
        <div v-else-if="variantsData.length === 0" class="flex flex-col items-center justify-center py-8 text-center gap-2">
          <svg class="w-10 h-10 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <p class="text-sm text-text-secondary leading-relaxed">
            Este ingrediente no tiene variantes asignadas en la jerarquía.
          </p>
        </div>

        <!-- Variants list -->
        <div v-else class="overflow-y-auto flex flex-col gap-1">
          <div
            v-for="v in variantsData"
            :key="v.id"
            class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-secondary"
          >
            <div class="flex flex-col">
              <span class="text-sm font-medium text-text-primary">{{ v.name }}</span>
              <span class="text-xs text-text-secondary">{{ v.unit }}</span>
            </div>
          </div>
        </div>

        <p class="text-xs text-text-tertiary">
          {{ variantsData.length }} variante{{ variantsData.length !== 1 ? 's' : '' }} en total
        </p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: ['admin-only'],
})

useHead({ title: 'Catálogo Global — WaRo Admin' })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// ── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 50

// ── Filters & pagination ────────────────────────────────────────────────────
const searchQuery = ref('')
const typeFilter = ref('')
const hierarchyFilter = ref<'' | 'bases' | 'variantes'>('bases')
const currentPage = ref(1)

// ── Data fetch ──────────────────────────────────────────────────────────────
const {
  data: listData,
  status: queryStatus,
  asyncStatus: queryAsyncStatus,
  error: fetchError,
  refetch: refresh
} = useQuery({
  key: () => ['admin-ingredients', currentPage.value, PAGE_SIZE, searchQuery.value, hierarchyFilter.value],
  query: () => $fetch('/api/admin/ingredients', {
    params: {
      page: currentPage.value,
      limit: PAGE_SIZE,
      search: searchQuery.value || undefined,
      bases_only: hierarchyFilter.value === 'bases' ? true : undefined,
    }
  }),
  staleTime: 30_000,
})
const isLoading = computed(() => !listData.value && queryStatus.value === 'loading')
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && !!listData.value)

const allBases = computed(() => listData.value?.data ?? [])
const totalItems = computed(() => listData.value?.pagination?.total ?? 0)

// Client-side type + variantes filtering (bases filter is server-side via bases_only param)
const filteredBases = computed(() => {
  let rows = allBases.value as any[]
  if (typeFilter.value) {
    rows = rows.filter((r) => r.type === typeFilter.value)
  }
  if (hierarchyFilter.value === 'variantes') {
    rows = rows.filter((r) => !!r.hierarchy_base_id)
  }
  return rows
})

function handleSearch() {
  currentPage.value = 1
}

function clearFilters() {
  searchQuery.value = ''
  typeFilter.value = ''
  hierarchyFilter.value = ''
  currentPage.value = 1
}

function onPageChange(page: number) {
  currentPage.value = page
}

watch([typeFilter, hierarchyFilter], () => {
  currentPage.value = 1
})

// ── Table columns ────────────────────────────────────────────────────────────
const tableColumns: Column[] = [
  { key: 'name',                    title: 'Nombre',    sortable: false },
  { key: 'unit',                    title: 'Unidad',    sortable: false },
  { key: 'type',                    title: 'Tipo',      sortable: false },
  { key: 'category',                title: 'Categoría', sortable: false },
  { key: 'hierarchy_base',          title: 'Base',      sortable: false },
  { key: 'hierarchy_variant_count', title: 'Variantes', sortable: false, align: 'center' },
  { key: 'actions',                 title: '',          sortable: false, align: 'right' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function typeLabel(type: string): string {
  if (type === 'food') return 'Alimento'
  if (type === 'service') return 'Servicio'
  if (type === 'supply') return 'Insumo'
  return type ?? ''
}

// ── Create modal ─────────────────────────────────────────────────────────────
const showCreateModal = ref(false)
const isSubmitting = ref(false)
const conflictSimilar = ref<any[]>([])
const createErrors = ref<Record<string, string>>({})

const createForm = ref({
  name: '',
  unit: '',
  category: '',
})

function openCreateModal() {
  createForm.value = { name: '', unit: '', category: '' }
  createErrors.value = {}
  conflictSimilar.value = []
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
  conflictSimilar.value = []
}

async function submitCreate(force = false) {
  createErrors.value = {}
  const { name, unit, category } = createForm.value
  if (!name.trim()) { createErrors.value.name = 'El nombre es obligatorio'; return }
  if (!unit) { createErrors.value.unit = 'Selecciona una unidad'; return }

  isSubmitting.value = true
  try {
    await $fetch('/api/admin/ingredients', {
      method: 'POST',
      body: { name: name.trim(), unit, category: category || null, force },
    })
    conflictSimilar.value = []
    closeCreateModal()
    await refresh()
    useNuxtApp().$toast?.success('Ingrediente creado')
  } catch (e: any) {
    const status = e?.response?.status ?? e?.status
    const detail = e?.data?.detail ?? e?.response?._data?.detail
    if (status === 409 && detail?.status === 'conflict') {
      conflictSimilar.value = detail.similar ?? []
    } else {
      useNuxtApp().$toast?.error('Error al crear el ingrediente')
    }
  } finally {
    isSubmitting.value = false
  }
}

// ── Assign Base modal ─────────────────────────────────────────────────────────
const showAssignModal = ref(false)
const assigningRow = ref<any>(null)
const selectedBase = ref<any>(null)
const assignError = ref<string | null>(null)
const assignSubmitting = ref(false)

function openAssignModal(row: any) {
  assigningRow.value = row
  selectedBase.value = null
  assignError.value = null
  showAssignModal.value = true
}

function closeAssignModal() {
  showAssignModal.value = false
  assigningRow.value = null
  selectedBase.value = null
  assignError.value = null
}

function onSelectBase(ingredient: any) {
  selectedBase.value = ingredient
  assignError.value = null
  // Client-side unit pre-check to give immediate feedback
  if (
    assigningRow.value?.unit &&
    ingredient.unit &&
    assigningRow.value.unit !== ingredient.unit
  ) {
    assignError.value = `La unidad del base (${ingredient.unit}) no coincide con la de este ingrediente (${assigningRow.value.unit})`
  }
}

async function submitAssign() {
  if (!selectedBase.value || !assigningRow.value) return
  if (assignError.value) return

  assignSubmitting.value = true
  try {
    await $fetch(`/api/admin/ingredients/${assigningRow.value.id}/set-base`, {
      method: 'POST',
      body: { base_id: selectedBase.value.id },
    })
    closeAssignModal()
    await refresh()
    useNuxtApp().$toast?.success('Base asignado correctamente')
  } catch (e: any) {
    const status = e?.response?.status ?? e?.status
    const detail = e?.data?.detail ?? e?.response?._data?.detail
    if (status === 409) {
      assignError.value = 'Este ingrediente ya tiene un base asignado. Quítalo primero.'
    } else if (status === 422) {
      assignError.value = typeof detail === 'string' ? detail : 'Error de validación al asignar base'
    } else {
      useNuxtApp().$toast?.error('Error al asignar base')
    }
  } finally {
    assignSubmitting.value = false
  }
}

// ── Remove base ───────────────────────────────────────────────────────────────
async function removeBase(row: any) {
  if (!confirm(`¿Quitar base de "${row.name}"? El ingrediente quedará sin jerarquía asignada.`)) return
  try {
    await $fetch(`/api/admin/ingredients/${row.id}/set-base`, { method: 'DELETE' })
    await refresh()
    useNuxtApp().$toast?.success('Base removido')
  } catch {
    useNuxtApp().$toast?.error('Error al quitar base')
  }
}

// ── Variants panel ────────────────────────────────────────────────────────────
const showVariantsPanel = ref(false)
const variantsBase = ref<any>(null)
const variantsLoading = ref(false)
const variantsData = ref<any[]>([])

async function openVariantsPanel(row: any) {
  variantsBase.value = row
  variantsData.value = []
  variantsLoading.value = true
  showVariantsPanel.value = true
  try {
    const res = await $fetch<any>(`/api/admin/ingredients/${row.id}/variants`)
    variantsData.value = res?.data ?? []
  } catch {
    variantsData.value = []
  } finally {
    variantsLoading.value = false
  }
}

function closeVariantsPanel() {
  showVariantsPanel.value = false
  variantsBase.value = null
}

// ── Layout actions ────────────────────────────────────────────────────────────
onMounted(() => setRefreshHandler(refresh))
registerProgressiveLoading(isRefreshing)
onUnmounted(() => clearRefreshHandler(refresh))
</script>
