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

interface OnlineMenuProduct {
  id: string
  name: string
  category_id: string
  is_available_online?: boolean
  is_available_table_qr?: boolean
}

const { t } = useI18n({ useScope: 'global' })
const toast = useToast()
const { currentTenant } = useTenantReactive()

const {
  data: categoriesData,
  status: categoriesStatus,
  error: categoriesError,
} = useQuery({
  key: () => ['menu', 'online-menu-categories', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: OnlineMenuCategory[] }>(
    '/api/menu/categories/online-menu',
  ),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const eligibleCategories = computed(() => categoriesData.value?.data ?? [])
const isLoadingCategories = computed(
  () => categoriesStatus.value === 'pending' && !categoriesData.value,
)

const selectedCategoryId = ref('')

watch(eligibleCategories, (cats) => {
  if (!cats.length) {
    selectedCategoryId.value = ''
    return
  }
  if (!cats.some((c) => c.id === selectedCategoryId.value)) {
    selectedCategoryId.value = cats[0].id
  }
}, { immediate: true })

const {
  data: productsData,
  status: productsStatus,
  error: productsError,
  refetch: refetchProducts,
} = useQuery({
  key: () => [
    'menu',
    'online-menu-products',
    currentTenant.value?.id,
    selectedCategoryId.value,
  ],
  query: () => $fetch<{ success: boolean; data: OnlineMenuProduct[] }>(
    '/api/menu/categories/online-menu/products',
    { query: { category_id: selectedCategoryId.value } },
  ),
  enabled: () => !!currentTenant.value && !!selectedCategoryId.value,
  staleTime: 30_000,
})

const eligibleProducts = computed(() => productsData.value?.data ?? [])
const isLoadingProducts = computed(
  () => productsStatus.value === 'pending' && !productsData.value,
)

const productOrderDraft = ref<OnlineMenuProduct[]>([])
const lastConfirmedProductOrder = ref<OnlineMenuProduct[]>([])
const isDraggingProductOrder = ref(false)
const isSavingProductOrder = ref(false)
const productOrderError = ref('')

const syncConfirmedProductOrder = () => {
  lastConfirmedProductOrder.value = [...eligibleProducts.value]
  productOrderDraft.value = [...eligibleProducts.value]
  productOrderError.value = ''
}

const isProductOrderDirty = computed(() =>
  !areCategoryOrdersEqual(productOrderDraft.value, lastConfirmedProductOrder.value),
)

const isProductDragDisabled = computed(() =>
  eligibleProducts.value.length < 2 || isSavingProductOrder.value,
)

const productDragDisabledReason = computed(() => {
  if (eligibleProducts.value.length < 2) {
    return t('negocio.onlineMenuProducts.needTwoProducts')
  }
  if (isSavingProductOrder.value) {
    return t('negocio.onlineMenuProducts.savingOrder')
  }
  return t('negocio.onlineMenuProducts.dragToOrder')
})

const productErrorMessage = (err: any, fallback: string) =>
  err?.data?.detail || err?.data?.message || err?.message || fallback

const saveProductOrder = async () => {
  if (isSavingProductOrder.value || !isProductOrderDirty.value) return
  if (productOrderDraft.value.length < 2 || !selectedCategoryId.value) return

  const nextOrder = [...productOrderDraft.value]
  isSavingProductOrder.value = true
  productOrderError.value = ''

  try {
    const response = await $fetch<{ message?: string }>(
      '/api/menu/categories/online-menu/products/reorder',
      {
        method: 'PATCH',
        body: {
          category_id: selectedCategoryId.value,
          product_ids: getCategoryOrderIds(nextOrder),
        },
      },
    )
    lastConfirmedProductOrder.value = [...nextOrder]
    toast.success(
      response?.message || t('negocio.onlineMenuProducts.orderUpdated'),
      { title: t('negocio.onlineMenuProducts.orderUpdatedTitle') },
    )
    await refetchProducts()
  } catch (err: any) {
    productOrderDraft.value = [...lastConfirmedProductOrder.value]
    productOrderError.value = productErrorMessage(
      err,
      t('negocio.onlineMenuProducts.saveError'),
    )
    toast.error(productOrderError.value, { title: t('negocio.error') })
  } finally {
    isSavingProductOrder.value = false
  }
}

const onProductOrderDragStart = () => {
  isDraggingProductOrder.value = true
  productOrderError.value = ''
}

const onProductOrderDragEnd = async () => {
  isDraggingProductOrder.value = false
  await saveProductOrder()
}

const productRowClass = (index: number) =>
  index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'

watch(eligibleProducts, () => {
  if (!isDraggingProductOrder.value && !isSavingProductOrder.value) {
    syncConfirmedProductOrder()
  }
}, { immediate: true })

watch(selectedCategoryId, () => {
  productOrderError.value = ''
})
</script>

<template>
  <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
      <div class="min-w-0">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
          <Bars3Icon class="w-5 h-5 text-primary flex-shrink-0" />
          {{ t('negocio.onlineMenuProducts.title') }}
        </h3>
        <p class="mt-1 text-xs sm:text-sm text-text-secondary leading-snug">
          {{ t('negocio.onlineMenuProducts.description') }}
        </p>
      </div>
      <p class="text-xs font-semibold text-text-tertiary flex-shrink-0">
        <span
          v-if="isSavingProductOrder"
          class="inline-flex min-h-7 items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-primary"
        >
          <span>{{ t('negocio.onlineMenuProducts.savingOrderBusy') }}</span>
          <UiLoadingDots size="7px" color="currentColor" aria-hidden="true" />
        </span>
        <span
          v-else-if="eligibleProducts.length >= 2"
          class="inline-flex min-h-7 items-center rounded-full border border-status-chip-border bg-status-chip-bg px-2.5 py-1 text-status-chip-text"
        >
          {{ t('negocio.onlineMenuProducts.savedAutomatically') }}
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
      {{ t('negocio.onlineMenuProducts.loadCategoriesError') }}
    </div>

    <div
      v-else-if="eligibleCategories.length === 0"
      class="rounded-lg border border-border bg-surface-secondary px-4 py-6 text-center"
    >
      <p class="text-sm font-semibold text-text-primary">
        {{ t('negocio.onlineMenuProducts.emptyCategoriesTitle') }}
      </p>
      <p class="mt-1 text-xs text-text-secondary">
        {{ t('negocio.onlineMenuProducts.emptyCategoriesDescription') }}
      </p>
    </div>

    <template v-else>
      <div class="mb-4">
        <label
          for="online-menu-product-order-category"
          class="block text-xs font-medium text-text-secondary mb-1"
        >
          {{ t('negocio.onlineMenuProducts.categoryLabel') }}
        </label>
        <select
          id="online-menu-product-order-category"
          v-model="selectedCategoryId"
          class="input-base w-full max-w-md px-3 py-2 text-sm"
          :disabled="isSavingProductOrder"
        >
          <option
            v-for="category in eligibleCategories"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>
      </div>

      <div v-if="isLoadingProducts" class="py-6 flex justify-center">
        <UiLoadingDots size="10px" aria-hidden="true" />
      </div>

      <div
        v-else-if="productsError"
        class="rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive"
      >
        {{ t('negocio.onlineMenuProducts.loadError') }}
      </div>

      <div
        v-else-if="eligibleProducts.length === 0"
        class="rounded-lg border border-border bg-surface-secondary px-4 py-6 text-center"
      >
        <p class="text-sm font-semibold text-text-primary">
          {{ t('negocio.onlineMenuProducts.emptyTitle') }}
        </p>
        <p class="mt-1 text-xs text-text-secondary">
          {{ t('negocio.onlineMenuProducts.emptyDescription') }}
        </p>
      </div>

      <template v-else>
        <section
          class="rounded-xl border border-data-table-border bg-data-table-container-bg shadow-sm overflow-hidden"
          :aria-label="t('negocio.onlineMenuProducts.title')"
        >
          <div v-if="productOrderError" class="border-b border-destructive/20 bg-destructive/8 px-4 py-3">
            <p class="text-sm font-medium text-destructive">{{ productOrderError }}</p>
          </div>

          <div
            v-if="eligibleProducts.length < 2"
            class="border-b border-data-table-border px-4 py-3"
          >
            <p class="text-xs text-text-secondary">{{ productDragDisabledReason }}</p>
          </div>

          <Draggable
            v-model="productOrderDraft"
            item-key="id"
            tag="ol"
            handle=".product-order-handle"
            :disabled="isProductDragDisabled"
            ghost-class="opacity-50"
            chosen-class="bg-data-table-row-hover-bg"
            drag-class="shadow-lg"
            class="divide-y divide-data-table-border"
            @start="onProductOrderDragStart"
            @end="onProductOrderDragEnd"
          >
            <template #item="{ element: product, index }">
              <li
                class="grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-data-table-row-hover-bg"
                :class="productRowClass(index)"
              >
                <button
                  type="button"
                  class="product-order-handle flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-tertiary transition-colors"
                  :class="isProductDragDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab hover:bg-surface-secondary hover:text-text-primary active:cursor-grabbing'"
                  :title="productDragDisabledReason"
                  :aria-label="t('negocio.onlineMenuProducts.dragHandleAria', { name: product.name })"
                  :disabled="isProductDragDisabled"
                >
                  <span class="text-lg font-black leading-none tracking-tight" aria-hidden="true">⋮⋮</span>
                </button>

                <div class="min-w-0 flex items-center gap-2">
                  <span class="text-xs font-black text-text-tertiary tabular-nums">{{ index + 1 }}</span>
                  <span class="truncate text-sm font-bold text-text-primary">{{ product.name }}</span>
                </div>
              </li>
            </template>
          </Draggable>
        </section>

        <p
          v-if="eligibleProducts.length >= 2 && !isProductDragDisabled"
          class="mt-3 text-xs text-text-secondary"
        >
          {{ productDragDisabledReason }}
        </p>
      </template>
    </template>
  </div>
</template>
