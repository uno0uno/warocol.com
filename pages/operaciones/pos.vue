<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'dashboard', module: 'operaciones' })

useHead({ title: () => t('operaciones.head.pos') })

const { currentTenant } = useTenantReactive()
const cache = useQueryCache()
const toast = useToast()

const { data: profileData, asyncStatus: profileAsyncStatus, error: fetchError, refetch: refreshProfile } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const businessProfile = computed(() => profileData.value?.data ?? null)
const isLoading = computed(() => !profileData.value && !fetchError.value)
const isRefreshing = computed(
  () => profileAsyncStatus.value === 'loading' && profileData.value != null,
)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(refreshProfile))
onUnmounted(() => clearRefreshHandler(refreshProfile))

const invalidateContextCaches = async () => {
  await cache.invalidateQueries({ key: ['operaciones', 'restaurant-context'] })
  await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
}

type CatalogLayout = 'grid' | 'list'

const catalogLayout = computed<CatalogLayout>(() => {
  const value = businessProfile.value?.pos_catalog_layout_default
  return value === 'list' ? 'list' : 'grid'
})
const showProductImage = computed(() => businessProfile.value?.pos_show_product_image !== false)
const showSearch = computed(() => businessProfile.value?.pos_show_search !== false)

const isSavingLayout = ref(false)
const isTogglingImages = ref(false)
const isTogglingSearch = ref(false)

const setCatalogLayout = async (layout: CatalogLayout) => {
  if (!businessProfile.value || isSavingLayout.value || catalogLayout.value === layout) return
  isSavingLayout.value = true
  try {
    await $fetch('/api/operaciones/pos-catalog-layout', {
      method: 'PATCH',
      body: { layout },
    })
    await invalidateContextCaches()
    toast.success(
      layout === 'list'
        ? t('operaciones.pos.layoutListSaved')
        : t('operaciones.pos.layoutGridSaved'),
      { title: t('operaciones.comandas.savedTitle') },
    )
  } catch (error: any) {
    toast.error(error?.data?.detail || t('operaciones.pos.saveError'), {
      title: t('operaciones.comandas.error'),
    })
  } finally {
    isSavingLayout.value = false
  }
}

const toggleShowProductImage = async () => {
  if (!businessProfile.value || isTogglingImages.value) return
  const newState = !showProductImage.value
  isTogglingImages.value = true
  try {
    await $fetch('/api/operaciones/toggles/pos-show-product-image', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateContextCaches()
    toast.success(
      newState ? t('operaciones.pos.imagesOn') : t('operaciones.pos.imagesOff'),
      { title: t('operaciones.comandas.savedTitle') },
    )
  } catch (error: any) {
    toast.error(error?.data?.detail || t('operaciones.pos.saveError'), {
      title: t('operaciones.comandas.error'),
    })
  } finally {
    isTogglingImages.value = false
  }
}

const toggleShowSearch = async () => {
  if (!businessProfile.value || isTogglingSearch.value) return
  const newState = !showSearch.value
  isTogglingSearch.value = true
  try {
    await $fetch('/api/operaciones/toggles/pos-show-search', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateContextCaches()
    toast.success(
      newState ? t('operaciones.pos.searchOn') : t('operaciones.pos.searchOff'),
      { title: t('operaciones.comandas.savedTitle') },
    )
  } catch (error: any) {
    toast.error(error?.data?.detail || t('operaciones.pos.saveError'), {
      title: t('operaciones.comandas.error'),
    })
  } finally {
    isTogglingSearch.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else-if="businessProfile" class="flex flex-col gap-3 md:gap-4">
      <div class="rounded-xl border-2 border-border bg-surface px-4 py-3">
        <p class="text-sm font-semibold leading-snug text-text-primary">
          {{ t('operaciones.pos.layoutTitle') }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2" :class="isSavingLayout ? 'opacity-50 pointer-events-none' : ''">
          <button
            type="button"
            class="min-h-9 rounded-lg border px-3 text-sm font-semibold transition-colors"
            :class="catalogLayout === 'grid'
              ? 'border-action-primary-border bg-action-primary-bg text-action-primary-text'
              : 'border-border bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text-primary'"
            :disabled="isSavingLayout"
            @click="setCatalogLayout('grid')"
          >
            {{ t('operaciones.pos.layoutGrid') }}
          </button>
          <button
            type="button"
            class="min-h-9 rounded-lg border px-3 text-sm font-semibold transition-colors"
            :class="catalogLayout === 'list'
              ? 'border-action-primary-border bg-action-primary-bg text-action-primary-text'
              : 'border-border bg-surface text-text-secondary hover:bg-surface-secondary hover:text-text-primary'"
            :disabled="isSavingLayout"
            @click="setCatalogLayout('list')"
          >
            {{ t('operaciones.pos.layoutList') }}
          </button>
        </div>
      </div>

      <div class="flex min-h-[64px] items-center justify-between gap-4 rounded-xl border-2 border-border bg-surface px-4 py-3">
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-snug text-text-primary">
            {{ t('operaciones.pos.showImages') }}
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingImages ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="showProductImage ? t('operaciones.pos.disableImages') : t('operaciones.pos.enableImages')"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="showProductImage"
            :disabled="isTogglingImages"
            @change="toggleShowProductImage"
          >
          <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <div class="flex min-h-[64px] items-center justify-between gap-4 rounded-xl border-2 border-border bg-surface px-4 py-3">
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-snug text-text-primary">
            {{ t('operaciones.pos.showSearch') }}
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingSearch ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="showSearch ? t('operaciones.pos.disableSearch') : t('operaciones.pos.enableSearch')"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="showSearch"
            :disabled="isTogglingSearch"
            @change="toggleShowSearch"
          >
          <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>
    </div>
  </div>
</template>
