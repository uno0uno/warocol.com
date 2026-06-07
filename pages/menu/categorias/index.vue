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
        <!-- Page subtitle + CTA -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p class="text-sm text-text-secondary">
            Agrupa productos del menú y enruta comandas por categoría.
          </p>
          <button
            type="button"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap min-h-[44px]"
            @click="openCreatePanel"
          >
            <span class="hidden sm:inline">+ Nueva categoría</span>
            <span class="sm:hidden">+ Nueva</span>
          </button>
        </div>

        <UiAdvancedFiltersBar
          v-model:search="localSearchTerm"
          :search-fields="[]"
          search-placeholder="Buscar categoría..."
          :show-date-range="false"
          :show-clear="hasActiveFilters"
          @search="performSearch"
          @clear="clearFilters"
        >
          <template #additional-filters>
            <select
              v-model="tipoFilter"
              :class="[filterSelectClass, 'md:hidden']"
              aria-label="Filtrar por tipo"
            >
              <option value="">Tipo</option>
              <option value="global">Global</option>
              <option value="own">Propia</option>
            </select>
          </template>
        </UiAdvancedFiltersBar>

        <!-- List -->
        <UiResponsiveDataView
          :columns="columns"
          :data="categories"
          empty-message="No hay categorías"
          empty-sub-message="Crea la primera para organizar tu menú."
          variant="default"
          row-size="sm"
        >
          <template #header-tipo>
            <UiTableHeaderFilter
              v-model="tipoFilter"
              title="Tipo"
              filter-type="select"
              :options="tipoHeaderOptions"
              all-label="Todos"
              align="left"
            />
          </template>

      <!-- Mobile row (matches /menu/modificadores pattern) -->
      <template #card="{ item, index }">
        <div
          class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors"
          :class="[
            item.tenant_id !== null ? 'hover:bg-surface-secondary cursor-pointer' : 'cursor-default',
            index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30',
          ]"
          @click="item.tenant_id !== null && openEditPanel(item)"
        >
          <div class="flex-1 min-w-0">
            <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
            <p v-if="item.description" class="text-xs text-text-secondary mt-0.5 truncate">{{ item.description }}</p>
          </div>
          <span
            class="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
            :class="item.tenant_id === null
              ? 'bg-text-secondary/10 text-text-secondary'
              : 'bg-primary/10 text-primary'"
          >
            {{ item.tenant_id === null ? 'Global' : 'Propia' }}
          </span>
          <button
            v-if="item.tenant_id !== null"
            type="button"
            :aria-label="`Eliminar categoría ${item.name}`"
            class="flex-shrink-0 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive/30 transition-colors"
            @click.stop="requestDelete(item)"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </template>

      <!-- Desktop cells: one data per column -->
      <template #cell-name="{ value }">
        <span class="text-sm font-medium text-text-primary">{{ value }}</span>
      </template>

      <template #cell-tipo="{ item }">
        <span
          class="text-xs font-medium px-2 py-0.5 rounded-full inline-block"
          :class="item.tenant_id === null
            ? 'bg-text-secondary/10 text-text-secondary'
            : 'bg-primary/10 text-primary'"
        >
          {{ item.tenant_id === null ? 'Global' : 'Propia' }}
        </span>
      </template>

      <template #cell-description="{ value }">
        <span class="text-sm text-text-secondary">{{ value || '—' }}</span>
      </template>

      <template #cell-actions="{ item }">
        <div class="flex items-center justify-end gap-1">
          <button
            v-if="item.tenant_id !== null"
            type="button"
            :aria-label="`Editar categoría ${item.name}`"
            class="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
            @click="openEditPanel(item)"
          >
            <PencilSquareIcon class="w-4 h-4" />
          </button>
          <button
            v-if="item.tenant_id !== null"
            type="button"
            :aria-label="`Eliminar categoría ${item.name}`"
            class="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive/30 transition-colors"
            @click="requestDelete(item)"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
          <span v-if="item.tenant_id === null" class="text-xs text-text-tertiary px-2">Solo lectura</span>
        </div>
      </template>
        </UiResponsiveDataView>
      </div>
    </div>

    <!-- Create/Edit slide-over -->
    <MenuCategoryPanel
      v-model="panelOpen"
      :category="panelCategory"
      @saved="onSaved"
    />

    <!-- Delete confirm -->
    <UiConfirmActionModal
      v-model="confirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      confirm-label="Eliminar"
      loading-label="Eliminando..."
      variant="destructive"
      :loading="isDeleting"
      @confirm="performDelete"
    />

    <!-- Error modal -->
    <UiErrorAlertModal
      v-model="errorModal.open"
      :title="errorModal.title"
      :message="errorModal.message"
      :dependents="errorModal.dependents"
    />
  </div>
</template>

<script setup lang="ts">
import { PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'

definePageMeta({
  // layout: 'dashboard' — inherited from parent menu.vue
  // module gating: inherited as 'menu' from parent menu.vue
})

useHead({ title: 'Categorías' })

interface Category {
  id: string
  name: string
  description: string | null
  tenant_id: string | null
  created_at?: string
  updated_at?: string
}

interface ErrorModalDependent {
  label: string
  count: number
}

const { currentTenant } = useTenantReactive()
const cache = useQueryCache()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const tipoFilter = ref<'global' | 'own' | ''>('')

const performSearch = () => applySearch()
const tipoHeaderOptions = [
  { label: 'Global', value: 'global' },
  { label: 'Propia', value: 'own' },
]

const hasActiveFilters = computed(
  () => !!localSearchTerm.value || !!appliedSearch.value || !!tipoFilter.value,
)

const clearFilters = () => {
  clearSearch()
  tipoFilter.value = ''
}

const columns = [
  { key: 'name', title: 'Nombre' },
  { key: 'tipo', title: 'Tipo' },
  { key: 'description', title: 'Descripción' },
  { key: 'actions', title: '', align: 'right' as const },
]

const {
  data: categoriesData,
  asyncStatus: queryAsyncStatus,
  error: queryError,
  refetch,
} = useQuery({
  key: () => ['tenant', 'menu-categories', currentTenant.value?.id ?? null, {
    search: appliedSearch.value || null,
  }],
  query: () => {
    const query: Record<string, string | number> = { limit: 250 }
    if (appliedSearch.value) query.search = appliedSearch.value
    return $fetch<{ success: boolean; data: Category[] }>('/api/menu/categories', { query })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const categories = computed<Category[]>(() => {
  let list = categoriesData.value?.data ?? []
  if (tipoFilter.value === 'global') list = list.filter((c) => c.tenant_id === null)
  else if (tipoFilter.value === 'own') list = list.filter((c) => c.tenant_id !== null)
  return list
})
// Matrix loader: only the very first load (no data yet). Subsequent refetches
// surface as a progressive indicator in the header — see registerProgressiveLoading.
const isLoading = computed(() => !categoriesData.value && !queryError.value)
const fetchError = computed(() => !!queryError.value)
const isRefreshing = computed(
  () => queryAsyncStatus.value === 'loading' && categoriesData.value != null,
)

// Header refresh button + progressive loading indicator (mirrors siblings).
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const refreshHandler = async () => {
  await refetch()
}
onMounted(() => {
  setRefreshHandler(refreshHandler)
  registerProgressiveLoading(isRefreshing)
})
onUnmounted(() => {
  clearRefreshHandler(refreshHandler)
})

// ── Slide-over (create/edit) ────────────────────────────────────────────
const panelOpen = ref(false)
const panelCategory = ref<Category | null>(null)

const openCreatePanel = () => {
  panelCategory.value = null
  panelOpen.value = true
}

const openEditPanel = (cat: Record<string, any>) => {
  panelCategory.value = cat as Category
  panelOpen.value = true
}

const invalidateConsumers = async () => {
  await cache.invalidateQueries({ key: ['tenant', 'menu-categories'] })
  await cache.invalidateQueries({ key: ['tenant', 'category-stations'] })
}

const onSaved = async (cat: Category) => {
  await invalidateConsumers()
  if (panelCategory.value) {
    panelCategory.value = cat
  }
}

// ── Delete flow ─────────────────────────────────────────────────────────
const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const isDeleting = ref(false)
const pendingDelete = ref<Category | null>(null)

const errorModal = ref<{
  open: boolean
  title: string
  message: string
  dependents: ErrorModalDependent[]
}>({
  open: false,
  title: '',
  message: '',
  dependents: [],
})

const requestDelete = async (rawCat: Record<string, any>) => {
  const cat = rawCat as Category
  if (cat.tenant_id === null) return // safety net — UI also hides

  pendingDelete.value = cat
  confirmTitle.value = '¿Eliminar categoría?'
  confirmMessage.value = `Esta acción no se puede deshacer y removerá "${cat.name}" del menú.`

  // Fetch cascade impact (products + station mappings) before opening the
  // confirm modal so we can warn about the kitchen-routing side effect.
  try {
    const impact = await $fetch<{ success: boolean; data: { products: number; station_mappings: number } }>(
      `/api/menu/categories/${cat.id}/delete-impact`,
    )
    if (impact.data.station_mappings > 0) {
      confirmMessage.value += ` Esto también quitará la asignación a la estación de cocina; tendrás que reasignarla en /operaciones/comandas si quieres seguir usándola.`
    }
  } catch {
    // Pre-fetch is best-effort — if it fails, fall through with the base
    // message. The DELETE itself will still surface the structured 409.
  }

  confirmOpen.value = true
}

const performDelete = async () => {
  if (!pendingDelete.value || isDeleting.value) return
  const cat = pendingDelete.value
  isDeleting.value = true
  try {
    await $fetch(`/api/menu/categories/${cat.id}`, { method: 'DELETE' })
    confirmOpen.value = false
    pendingDelete.value = null
    await invalidateConsumers()
  } catch (err: any) {
    const detail = err?.data?.detail
    const isStructured409 =
      err?.status === 409 &&
      detail &&
      typeof detail === 'object' &&
      (detail.code === 'category_has_dependents' || detail.code === 'category_has_dependents_unknown')

    const dependents: ErrorModalDependent[] = isStructured409 && detail.counts
      ? [{ label: 'Productos asociados', count: detail.counts.products ?? 0 }].filter((d) => d.count > 0)
      : []

    confirmOpen.value = false
    pendingDelete.value = null
    errorModal.value = {
      open: true,
      title: 'No se pudo eliminar la categoría',
      message: isStructured409 && typeof detail.message === 'string'
        ? detail.message
        : 'Ocurrió un error al intentar eliminar la categoría. Inténtalo de nuevo.',
      dependents,
    }
  } finally {
    isDeleting.value = false
  }
}
</script>
