<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Draggable from 'vuedraggable'
import { Bars3Icon } from '@heroicons/vue/24/outline'
import {
  areCategoryOrdersEqual,
  getCategoryOrderIds,
} from '~/composables/useCategoryOrderDraft'

interface OnlineMenuCategory {
  id: string
  name: string
}

const { t } = useI18n({ useScope: 'global' })
const toast = useToast()
const { currentTenant } = useTenantReactive()

const {
  data: categoriesData,
  status: categoriesStatus,
  error: categoriesError,
  refetch,
} = useQuery({
  key: () => ['menu', 'online-menu-categories', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: OnlineMenuCategory[] }>(
    '/api/menu/categories/online-menu',
  ),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const eligibleCategories = computed(() => categoriesData.value?.data ?? [])
const isLoadingCategories = computed(() => categoriesStatus.value === 'pending' && !categoriesData.value)

const categoryOrderDraft = ref<OnlineMenuCategory[]>([])
const lastConfirmedCategoryOrder = ref<OnlineMenuCategory[]>([])
const isDraggingCategoryOrder = ref(false)
const isSavingCategoryOrder = ref(false)
const categoryOrderError = ref('')

const syncConfirmedCategoryOrder = () => {
  lastConfirmedCategoryOrder.value = [...eligibleCategories.value]
  categoryOrderDraft.value = [...eligibleCategories.value]
  categoryOrderError.value = ''
}

const isCategoryOrderDirty = computed(() =>
  !areCategoryOrdersEqual(categoryOrderDraft.value, lastConfirmedCategoryOrder.value),
)

const isCategoryDragDisabled = computed(() =>
  eligibleCategories.value.length < 2 || isSavingCategoryOrder.value,
)

const categoryDragDisabledReason = computed(() => {
  if (eligibleCategories.value.length < 2) {
    return t('negocio.onlineMenuCategories.needTwoCategories')
  }
  if (isSavingCategoryOrder.value) {
    return t('negocio.onlineMenuCategories.savingOrder')
  }
  return t('negocio.onlineMenuCategories.dragToOrder')
})

const categoryErrorMessage = (err: any, fallback: string) =>
  err?.data?.detail || err?.data?.message || err?.message || fallback

const saveCategoryOrder = async () => {
  if (isSavingCategoryOrder.value || !isCategoryOrderDirty.value) return
  if (categoryOrderDraft.value.length < 2) return

  const nextOrder = [...categoryOrderDraft.value]
  isSavingCategoryOrder.value = true
  categoryOrderError.value = ''

  try {
    const response = await $fetch<{ message?: string }>(
      '/api/menu/categories/online-menu/reorder',
      {
        method: 'PATCH',
        body: { category_ids: getCategoryOrderIds(nextOrder) },
      },
    )
    lastConfirmedCategoryOrder.value = [...nextOrder]
    toast.success(
      response?.message || t('negocio.onlineMenuCategories.orderUpdated'),
      { title: t('negocio.onlineMenuCategories.orderUpdatedTitle') },
    )
    await refetch()
  } catch (err: any) {
    categoryOrderDraft.value = [...lastConfirmedCategoryOrder.value]
    categoryOrderError.value = categoryErrorMessage(
      err,
      t('negocio.onlineMenuCategories.saveError'),
    )
    toast.error(categoryOrderError.value, { title: t('negocio.error') })
  } finally {
    isSavingCategoryOrder.value = false
  }
}

const onCategoryOrderDragStart = () => {
  isDraggingCategoryOrder.value = true
  categoryOrderError.value = ''
}

const onCategoryOrderDragEnd = async () => {
  isDraggingCategoryOrder.value = false
  await saveCategoryOrder()
}

const categoryRowClass = (index: number) =>
  index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'

watch(eligibleCategories, () => {
  if (!isDraggingCategoryOrder.value && !isSavingCategoryOrder.value) {
    syncConfirmedCategoryOrder()
  }
}, { immediate: true })
</script>

<template>
  <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
      <div class="min-w-0">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
          <Bars3Icon class="w-5 h-5 text-primary flex-shrink-0" />
          {{ t('negocio.onlineMenuCategories.title') }}
        </h3>
        <p class="mt-1 text-xs sm:text-sm text-text-secondary leading-snug">
          {{ t('negocio.onlineMenuCategories.description') }}
        </p>
      </div>
      <p class="text-xs font-semibold text-text-tertiary flex-shrink-0">
        <span
          v-if="isSavingCategoryOrder"
          class="inline-flex min-h-7 items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-primary"
        >
          <span>{{ t('negocio.onlineMenuCategories.savingOrderBusy') }}</span>
          <UiLoadingDots size="7px" color="currentColor" aria-hidden="true" />
        </span>
        <span
          v-else-if="eligibleCategories.length >= 2"
          class="inline-flex min-h-7 items-center rounded-full border border-status-chip-border bg-status-chip-bg px-2.5 py-1 text-status-chip-text"
        >
          {{ t('negocio.onlineMenuCategories.savedAutomatically') }}
        </span>
      </p>
    </div>

    <div v-if="isLoadingCategories" class="py-6 flex justify-center">
      <UiLoadingDots size="10px" aria-hidden="true" />
    </div>

    <div
      v-else-if="categoriesError"
      class="rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
    >
      {{ t('negocio.onlineMenuCategories.loadError') }}
    </div>

    <div
      v-else-if="eligibleCategories.length === 0"
      class="rounded-lg border border-border bg-surface-secondary px-4 py-6 text-center"
    >
      <p class="text-sm font-semibold text-text-primary">
        {{ t('negocio.onlineMenuCategories.emptyTitle') }}
      </p>
      <p class="mt-1 text-xs text-text-secondary">
        {{ t('negocio.onlineMenuCategories.emptyDescription') }}
      </p>
    </div>

    <template v-else>
      <section
        class="rounded-xl border border-data-table-border bg-data-table-container-bg shadow-sm overflow-hidden"
        :aria-label="t('negocio.onlineMenuCategories.title')"
      >
        <div v-if="categoryOrderError" class="border-b border-destructive/20 bg-destructive/8 px-4 py-3">
          <p class="text-sm font-medium text-destructive">{{ categoryOrderError }}</p>
        </div>

        <div
          v-if="eligibleCategories.length < 2"
          class="border-b border-data-table-border px-4 py-3"
        >
          <p class="text-xs text-text-secondary">{{ categoryDragDisabledReason }}</p>
        </div>

        <Draggable
          v-model="categoryOrderDraft"
          item-key="id"
          tag="ol"
          handle=".category-order-handle"
          :disabled="isCategoryDragDisabled"
          ghost-class="opacity-50"
          chosen-class="bg-data-table-row-hover-bg"
          drag-class="shadow-lg"
          class="divide-y divide-data-table-border"
          @start="onCategoryOrderDragStart"
          @end="onCategoryOrderDragEnd"
        >
          <template #item="{ element: category, index }">
            <li
              class="grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-data-table-row-hover-bg"
              :class="categoryRowClass(index)"
            >
              <button
                type="button"
                class="category-order-handle flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-tertiary transition-colors"
                :class="isCategoryDragDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab hover:bg-surface-secondary hover:text-text-primary active:cursor-grabbing'"
                :title="categoryDragDisabledReason"
                :aria-label="t('negocio.onlineMenuCategories.dragHandleAria', { name: category.name })"
                :disabled="isCategoryDragDisabled"
              >
                <span class="text-lg font-black leading-none tracking-tight" aria-hidden="true">⋮⋮</span>
              </button>

              <div class="min-w-0 flex items-center gap-2">
                <span class="text-xs font-black text-text-tertiary tabular-nums">{{ index + 1 }}</span>
                <span class="truncate text-sm font-bold text-text-primary">{{ category.name }}</span>
              </div>
            </li>
          </template>
        </Draggable>
      </section>

      <p
        v-if="eligibleCategories.length >= 2 && !isCategoryDragDisabled"
        class="mt-3 text-xs text-text-secondary"
      >
        {{ categoryDragDisabledReason }}
      </p>
    </template>
  </div>
</template>
