<template>
  <div class="page-layout">

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar el catálogo.</p>
        <p class="text-sm text-text-secondary">{{ fetchError.message }}</p>
        <button
          @click="refresh"
          class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 min-h-[44px]"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- Filters -->
      <SharedFiltersBar
        v-model:search="searchQuery"
        search-label="Buscar"
        search-placeholder="Buscar ingredientes base..."
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
        </template>
      </SharedFiltersBar>

      <!-- Table -->
      <UiResponsiveDataView
        :columns="tableColumns"
        :data="bases"
        title="Catálogo Global de Ingredientes"
        empty-message="No hay ingredientes base en el catálogo."
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
            Nuevo ingrediente base
          </button>
        </template>

        <!-- Card slot (mobile) -->
        <template #card="{ row }">
          <div class="flex flex-col gap-1">
            <div class="font-medium text-text-primary">{{ row.name }}</div>
            <div class="text-sm text-text-secondary">{{ row.unit }} · {{ typeLabel(row.type) }}</div>
            <div v-if="row.category" class="text-sm text-text-secondary">{{ row.category }}</div>
            <div class="text-sm text-text-secondary">{{ row.variant_count }} variante{{ row.variant_count !== 1 ? 's' : '' }}</div>
            <div class="flex gap-2 mt-2">
              <button @click="openVariantsPanel(row)" class="text-sm text-primary hover:underline min-h-[44px] px-2">Ver variantes</button>
              <button @click="openEditModal(row)" class="text-sm text-primary hover:underline min-h-[44px] px-2">Editar</button>
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

        <!-- Variant count cell -->
        <template #cell-variant_count="{ row }">
          <button
            v-if="row.variant_count > 0"
            @click="openVariantsPanel(row)"
            class="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
            :aria-label="`Ver ${row.variant_count} variantes de ${row.name}`"
          >
            {{ row.variant_count }}
          </button>
          <span v-else class="text-sm text-text-tertiary">—</span>
        </template>

        <!-- Actions cell -->
        <template #cell-actions="{ row }">
          <button
            @click="openEditModal(row)"
            class="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            :aria-label="`Editar ${row.name}`"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
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
          Nuevo ingrediente base
        </h2>

        <form @submit.prevent="submitCreate" class="flex flex-col gap-4" novalidate>
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
              @blur="checkDuplicate"
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ej. Tomate"
              autocomplete="off"
            />
            <!-- Duplicate warning -->
            <div
              v-if="duplicateWarning"
              class="flex items-start gap-2 p-2 bg-status-warning-bg rounded-lg text-sm text-status-warning-text"
              role="alert"
            >
              <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <span>Nombre similar a <strong>"{{ duplicateWarning }}"</strong> (ya existe). Continúa solo si son distintos.</span>
            </div>
            <span v-if="createErrors.name" class="text-sm text-status-critical-text flex items-center gap-1" role="alert">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              {{ createErrors.name }}
            </span>
          </div>

          <!-- Unit + Type (two fields in one row — both short selects, acceptable) -->
          <div class="grid grid-cols-2 gap-3">
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

            <div class="flex flex-col gap-1">
              <label for="create-type" class="text-sm font-medium text-text-primary">
                Tipo <span class="text-status-critical-text" aria-hidden="true">*</span>
              </label>
              <select
                id="create-type"
                v-model="createForm.type"
                required
                class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="food">Alimento</option>
                <option value="service">Servicio</option>
                <option value="supply">Insumo</option>
              </select>
            </div>
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

          <!-- Description -->
          <div class="flex flex-col gap-1">
            <label for="create-description" class="text-sm font-medium text-text-primary">Descripción</label>
            <textarea
              id="create-description"
              v-model="createForm.description"
              rows="2"
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Descripción opcional"
            />
          </div>

          <div class="flex gap-3 justify-end pt-2">
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
        </form>
      </div>
    </div>

    <!-- ── Edit Modal ───────────────────────────────────────────────────── -->
    <div
      v-if="showEditModal && editingBase"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeEditModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div class="bg-surface rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <h2 id="edit-modal-title" class="text-lg font-semibold text-text-primary">
          Editar ingrediente base
        </h2>

        <form @submit.prevent="submitEdit" class="flex flex-col gap-4" novalidate>
          <!-- Locked fields -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-text-secondary">Unidad (bloqueada)</label>
              <div class="px-3 py-2 border border-border/50 rounded-lg text-sm text-text-tertiary bg-surface-secondary">
                {{ editingBase.unit }}
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-text-secondary">Tipo (bloqueado)</label>
              <div class="px-3 py-2 border border-border/50 rounded-lg text-sm text-text-tertiary bg-surface-secondary">
                {{ typeLabel(editingBase.type) }}
              </div>
            </div>
          </div>

          <!-- Editable: Name -->
          <div class="flex flex-col gap-1">
            <label for="edit-name" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-status-critical-text" aria-hidden="true">*</span>
            </label>
            <input
              id="edit-name"
              v-model="editForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span v-if="editErrors.name" class="text-sm text-status-critical-text" role="alert">{{ editErrors.name }}</span>
          </div>

          <!-- Editable: Category -->
          <div class="flex flex-col gap-1">
            <label for="edit-category" class="text-sm font-medium text-text-primary">Categoría</label>
            <input
              id="edit-category"
              v-model="editForm.category"
              type="text"
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Editable: Description -->
          <div class="flex flex-col gap-1">
            <label for="edit-description" class="text-sm font-medium text-text-primary">Descripción</label>
            <textarea
              id="edit-description"
              v-model="editForm.description"
              rows="2"
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div class="flex gap-3 justify-end pt-2">
            <button
              type="button"
              @click="closeEditModal"
              class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg min-h-[44px] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-opacity"
            >
              <span v-if="isSubmitting">Guardando...</span>
              <span v-else>Guardar cambios</span>
            </button>
          </div>
        </form>
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
            Ningún restaurante ha creado variantes de este ingrediente aún.
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
              <span class="text-xs text-text-secondary">{{ v.unit }} · {{ typeLabel(v.type) }}</span>
            </div>
            <span class="text-xs text-text-tertiary bg-surface-secondary px-2 py-1 rounded-md">
              {{ v.tenant_name }}
            </span>
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

const { setRefreshHandler, clearRefreshHandler } = useLayoutActions()

// ── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 50

// ── Filters & pagination ────────────────────────────────────────────────────
const searchQuery = ref('')
const typeFilter = ref('')
const currentPage = ref(1)

// ── Data fetch ──────────────────────────────────────────────────────────────
const { data: listData, pending: isLoading, error: fetchError, refresh } = useFetch('/api/admin/ingredients', {
  server: false,
  query: computed(() => ({
    page: currentPage.value,
    limit: PAGE_SIZE,
    search: searchQuery.value || undefined,
    type: typeFilter.value || undefined,
  })),
})

const bases = computed(() => listData.value?.data ?? [])
const totalItems = computed(() => listData.value?.total ?? 0)

function handleSearch() {
  currentPage.value = 1
}

function clearFilters() {
  searchQuery.value = ''
  typeFilter.value = ''
  currentPage.value = 1
}

function onPageChange(page: number) {
  currentPage.value = page
}

watch(typeFilter, () => {
  currentPage.value = 1
})

// ── Table columns ────────────────────────────────────────────────────────────
const tableColumns: Column[] = [
  { key: 'name',          title: 'Nombre',    sortable: false },
  { key: 'unit',          title: 'Unidad',    sortable: false },
  { key: 'type',          title: 'Tipo',      sortable: false },
  { key: 'category',      title: 'Categoría', sortable: false },
  { key: 'variant_count', title: 'Variantes', sortable: false, align: 'center' },
  { key: 'actions',       title: '',          sortable: false, align: 'right' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function typeLabel(type: string): string {
  if (type === 'food') return 'Alimento'
  if (type === 'service') return 'Servicio'
  if (type === 'supply') return 'Insumo'
  return type
}

// ── Create modal ─────────────────────────────────────────────────────────────
const showCreateModal = ref(false)
const isSubmitting = ref(false)
const duplicateWarning = ref<string | null>(null)
const createErrors = ref<Record<string, string>>({})

const createForm = ref({
  name: '',
  unit: '',
  type: 'food',
  category: '',
  description: '',
})

function openCreateModal() {
  createForm.value = { name: '', unit: '', type: 'food', category: '', description: '' }
  createErrors.value = {}
  duplicateWarning.value = null
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

async function checkDuplicate() {
  const name = createForm.value.name.trim()
  if (!name) { duplicateWarning.value = null; return }
  try {
    const res = await $fetch<any>('/api/suppliers/ingredients/match', {
      query: { name, threshold: 0.75 }
    })
    duplicateWarning.value = res?.data?.name ?? null
  } catch {
    duplicateWarning.value = null
  }
}

async function submitCreate() {
  createErrors.value = {}
  const { name, unit, type, category, description } = createForm.value
  if (!name.trim()) { createErrors.value.name = 'El nombre es obligatorio'; return }
  if (!unit) { createErrors.value.unit = 'Selecciona una unidad'; return }

  isSubmitting.value = true
  try {
    await $fetch('/api/admin/ingredients', {
      method: 'POST',
      body: { name: name.trim(), unit, type, category: category || null, description: description || null }
    })
    closeCreateModal()
    await refresh()
    useNuxtApp().$toast?.success('Ingrediente creado')
  } catch (e: any) {
    if (e?.response?.status === 409) {
      createErrors.value.name = 'Ya existe un ingrediente con ese nombre'
    } else {
      useNuxtApp().$toast?.error('Error al crear el ingrediente')
    }
  } finally {
    isSubmitting.value = false
  }
}

// ── Edit modal ────────────────────────────────────────────────────────────────
const showEditModal = ref(false)
const editingBase = ref<any>(null)
const editErrors = ref<Record<string, string>>({})
const editForm = ref({ name: '', category: '', description: '' })

function openEditModal(row: any) {
  editingBase.value = row
  editForm.value = {
    name: row.name,
    category: row.category ?? '',
    description: row.description ?? '',
  }
  editErrors.value = {}
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingBase.value = null
}

async function submitEdit() {
  editErrors.value = {}
  if (!editForm.value.name.trim()) { editErrors.value.name = 'El nombre es obligatorio'; return }

  isSubmitting.value = true
  try {
    await $fetch(`/api/admin/ingredients/${editingBase.value.id}`, {
      method: 'PATCH',
      body: {
        name: editForm.value.name.trim(),
        category: editForm.value.category || null,
        description: editForm.value.description || null,
      }
    })
    closeEditModal()
    await refresh()
    useNuxtApp().$toast?.success('Ingrediente actualizado')
  } catch (e: any) {
    if (e?.response?.status === 409) {
      editErrors.value.name = 'Ya existe un ingrediente con ese nombre'
    } else {
      useNuxtApp().$toast?.error('Error al actualizar')
    }
  } finally {
    isSubmitting.value = false
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
onUnmounted(() => clearRefreshHandler(refresh))
</script>
