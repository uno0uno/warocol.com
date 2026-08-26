<template>
  <UiModal v-model="open" :title="modalTitle">
    <div class="px-6 pb-6 space-y-4" role="document">
      <input
        ref="searchInputRef"
        v-model="searchTerm"
        type="search"
        placeholder="Buscar en alcance…"
        class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface min-h-[44px]"
        aria-label="Buscar en alcance"
      />

      <div v-if="isLoading" class="flex items-center justify-center py-10" aria-busy="true">
        <div
          class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"
          aria-label="Cargando alcance"
        />
      </div>

      <div v-else-if="scopeError" class="flex flex-col items-center gap-3 py-8 text-center">
        <p class="text-sm text-text-secondary">No se pudo cargar el alcance.</p>
        <button
          type="button"
          class="btn-primary px-4 py-2 rounded-lg text-sm min-h-[44px]"
          @click="refetch()"
        >
          Reintentar
        </button>
      </div>

      <p v-else-if="items.length === 0" class="text-sm text-text-secondary text-center py-8">
        {{ appliedSearch ? 'Sin resultados para esta búsqueda.' : 'No hay ítems en el alcance.' }}
      </p>

      <ul v-else class="divide-y divide-border max-h-[50vh] overflow-y-auto">
        <li
          v-for="item in items"
          :key="item.id"
          class="py-2.5 text-sm text-text-primary min-h-[44px] flex items-center"
        >
          {{ item.name }}
        </li>
      </ul>

      <div
        v-if="showPagination"
        class="flex items-center justify-between gap-2 pt-2 border-t border-border"
      >
        <p class="text-xs text-text-secondary">
          Mostrando {{ startItem }}–{{ endItem }} de {{ total }}
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            :disabled="!canGoPrevious"
            class="px-3 py-2 text-sm rounded-lg border min-h-[44px]"
            :class="canGoPrevious ? 'border-border text-text-primary hover:bg-surface-secondary' : 'border-border/50 text-text-tertiary cursor-not-allowed'"
            @click="previousPage"
          >
            Anterior
          </button>
          <button
            type="button"
            :disabled="!canGoNext"
            class="px-3 py-2 text-sm rounded-lg border min-h-[44px]"
            :class="canGoNext ? 'border-border text-text-primary hover:bg-surface-secondary' : 'border-border/50 text-text-tertiary cursor-not-allowed'"
            @click="nextPage"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </UiModal>

  <UiBottomSheetModal v-model="open" :title="modalTitle" max-height="lg">
    <div class="px-4 pb-4 space-y-4" role="document">
      <input
        v-model="searchTerm"
        type="search"
        placeholder="Buscar en alcance…"
        class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface min-h-[44px]"
        aria-label="Buscar en alcance"
      />

      <div v-if="isLoading" class="flex items-center justify-center py-10" aria-busy="true">
        <div
          class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"
          aria-label="Cargando alcance"
        />
      </div>

      <div v-else-if="scopeError" class="flex flex-col items-center gap-3 py-8 text-center">
        <p class="text-sm text-text-secondary">No se pudo cargar el alcance.</p>
        <button
          type="button"
          class="btn-primary px-4 py-2 rounded-lg text-sm min-h-[44px]"
          @click="refetch()"
        >
          Reintentar
        </button>
      </div>

      <p v-else-if="items.length === 0" class="text-sm text-text-secondary text-center py-8">
        {{ appliedSearch ? 'Sin resultados para esta búsqueda.' : 'No hay ítems en el alcance.' }}
      </p>

      <ul v-else class="divide-y divide-border max-h-[50vh] overflow-y-auto">
        <li
          v-for="item in items"
          :key="item.id"
          class="py-2.5 text-sm text-text-primary min-h-[44px] flex items-center"
        >
          {{ item.name }}
        </li>
      </ul>

      <div
        v-if="showPagination"
        class="flex items-center justify-between gap-2 pt-2 border-t border-border"
      >
        <p class="text-xs text-text-secondary">
          Mostrando {{ startItem }}–{{ endItem }} de {{ total }}
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            :disabled="!canGoPrevious"
            class="px-3 py-2 text-sm rounded-lg border min-h-[44px]"
            :class="canGoPrevious ? 'border-border text-text-primary hover:bg-surface-secondary' : 'border-border/50 text-text-tertiary cursor-not-allowed'"
            @click="previousPage"
          >
            Anterior
          </button>
          <button
            type="button"
            :disabled="!canGoNext"
            class="px-3 py-2 text-sm rounded-lg border min-h-[44px]"
            :class="canGoNext ? 'border-border text-text-primary hover:bg-surface-secondary' : 'border-border/50 text-text-tertiary cursor-not-allowed'"
            @click="nextPage"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </UiBottomSheetModal>
</template>

<script setup lang="ts">
import { formatScopeTypeLabel } from '~/utils/promotionPreview'

interface ScopeItem {
  id: string
  name: string
}

interface ScopeResponse {
  success: boolean
  data: {
    scope_type: string
    promotion_name: string
    items: ScopeItem[]
    total: number
    page: number
    page_size: number
  }
}

const props = defineProps<{
  modelValue: boolean
  promotionId: string | null
  promotionName: string
  scopeType: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const PAGE_SIZE = 50

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const searchTerm = ref('')
const appliedSearch = ref('')
const page = ref(1)
const searchInputRef = ref<HTMLInputElement | null>(null)

let searchDebounce: ReturnType<typeof setTimeout> | null = null

watch(searchTerm, (value) => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    appliedSearch.value = value.trim()
    page.value = 1
  }, 300)
})

const {
  data: scopeData,
  error: scopeError,
  asyncStatus,
  refetch,
} = useQuery({
  key: () => [
    'tenant',
    'promotions',
    props.promotionId,
    'scope',
    { search: appliedSearch.value, page: page.value },
  ],
  query: () =>
    $fetch<ScopeResponse>(`/api/api/promotions/${props.promotionId}/scope`, {
      query: {
        search: appliedSearch.value || undefined,
        page: page.value,
        page_size: PAGE_SIZE,
      },
    }),
  enabled: () => open.value && !!props.promotionId,
  staleTime: 10_000,
})

const isLoading = computed(() => asyncStatus.value === 'loading' && !scopeData.value)
const items = computed(() => scopeData.value?.data.items ?? [])
const total = computed(() => scopeData.value?.data.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const canGoPrevious = computed(() => page.value > 1)
const canGoNext = computed(() => page.value < totalPages.value)
const startItem = computed(() => (total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1))
const endItem = computed(() => Math.min(page.value * PAGE_SIZE, total.value))
const showPagination = computed(() => total.value > PAGE_SIZE)

const { t, locale } = useI18n({ useScope: 'global' })
const scopeTypeLabel = computed(() => {
  const key = `menu.promotionsScope.types.${props.scopeType}`
  const fromI18n = t(key)
  if (fromI18n !== key) return fromI18n
  return formatScopeTypeLabel(props.scopeType, locale.value)
})
const modalTitle = computed(() =>
  t('menu.promotionsScope.titleWithType', {
    name: props.promotionName,
    type: scopeTypeLabel.value,
  }),
)

function closePanel() {
  open.value = false
}

function previousPage() {
  if (canGoPrevious.value) page.value -= 1
}

function nextPage() {
  if (canGoNext.value) page.value += 1
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    closePanel()
  }
}

watch(open, (isOpen) => {
  if (!isOpen) {
    searchTerm.value = ''
    appliedSearch.value = ''
    page.value = 1
    return
  }
  nextTick(() => searchInputRef.value?.focus())
})

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  if (searchDebounce) clearTimeout(searchDebounce)
})
</script>
