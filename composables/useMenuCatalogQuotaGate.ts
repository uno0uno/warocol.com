/**
 * Menú catalog create gating (warocol.com#1796 / #1798 / #1800 / #1806).
 * Productos, Categorías, Modificadores, and Recetas each use their own growth quota.
 */
import type {
  BillingRemainingUsage,
  BillingUsageMetric,
  OperationalQuotaKey,
} from '~/composables/useBilling'
import {
  BILLING_QUOTA_RESOURCE_CONFIG,
  resolveOperationalQuota,
  useBilling,
} from '~/composables/useBilling'

export function useMenuCatalogQuotaGate() {
  const { t } = useI18n({ useScope: 'global' })
  const toast = useToast()
  const { getOperationalQuota, fetchBillingOverview, remainingUsage } = useBilling()

  /** Fresh remaining-usage snapshot for menu pages that may lack `mi_plan` billing cache. */
  const categoriesQuotaFresh = ref<{
    blocked: boolean
    message: string
  } | null>(null)

  const categoriesLimitModalOpen = ref(false)
  const categoriesLimitModalMessage = ref('')

  const menuProductsQuota = computed(() => getOperationalQuota('menu_products'))
  const menuCategoriesQuota = computed(() => getOperationalQuota('menu_categories'))
  const modifierGroupsQuota = computed(() => getOperationalQuota('modifier_groups'))
  const recipeBasesQuota = computed(() => getOperationalQuota('recipe_bases'))

  const isProductsCreateBlocked = computed(() => menuProductsQuota.value.blocked)
  /** Modificadores: own group cap OR shared catalog product cap exhausted. */
  const isModifiersCreateBlocked = computed(
    () => menuProductsQuota.value.blocked || modifierGroupsQuota.value.blocked,
  )
  const isRecipesCreateBlocked = computed(() => recipeBasesQuota.value.blocked)
  const isCategoriesCreateBlocked = computed(
    () => categoriesQuotaFresh.value?.blocked === true || menuCategoriesQuota.value.blocked,
  )
  /** Legacy shared gate: menu catalog product cap. */
  const isSharedCatalogCreateBlocked = computed(() => menuProductsQuota.value.blocked)

  const formatMetricMessage = (resource: OperationalQuotaKey, metric: BillingUsageMetric | null | undefined) => {
    const result = resolveOperationalQuota(resource, metric ?? null)
    if (!metric || metric.limit === null) return result.message
    return `${result.message} Uso actual: ${metric.used.toLocaleString('es-CO')} de ${metric.limit.toLocaleString('es-CO')} ${result.unit}. Revisa Mi Plan para ampliar tu cupo.`
  }

  const formatBlockedMessage = (resource: OperationalQuotaKey) => {
    if (resource === 'menu_categories' && categoriesQuotaFresh.value?.message) {
      return categoriesQuotaFresh.value.message
    }
    const quota = getOperationalQuota(resource)
    const metric = quota.metric ?? remainingUsage.value?.quota_usage?.[resource] ?? null
    return formatMetricMessage(resource, metric)
  }

  const productsCreateBlockedMessage = computed(() => formatBlockedMessage('menu_products'))
  const categoriesCreateBlockedMessage = computed(() => formatBlockedMessage('menu_categories'))
  const modifiersCreateBlockedMessage = computed(() => {
    if (menuProductsQuota.value.blocked) return formatBlockedMessage('menu_products')
    return formatBlockedMessage('modifier_groups')
  })
  const recipesCreateBlockedMessage = computed(() => formatBlockedMessage('recipe_bases'))
  const sharedCatalogCreateBlockedMessage = computed(() => productsCreateBlockedMessage.value)

  const showBlockedToast = (message: string) => {
    toast.warning(message, {
      title: t('menu.common.quotaBlocked', 'Cupo del plan alcanzado'),
    })
  }

  const showProductsCreateBlocked = () => showBlockedToast(productsCreateBlockedMessage.value)
  const showCategoriesCreateBlocked = () => showBlockedToast(categoriesCreateBlockedMessage.value)
  const showModifiersCreateBlocked = () => showBlockedToast(modifiersCreateBlockedMessage.value)
  const showRecipesCreateBlocked = () => showBlockedToast(recipesCreateBlockedMessage.value)
  const showSharedCatalogCreateBlocked = () => showBlockedToast(sharedCatalogCreateBlockedMessage.value)

  const fetchRemainingUsage = async () => {
    return await $fetch<BillingRemainingUsage>('/api/billing/remaining-usage')
  }

  /** Refresh categories gate from remaining-usage (works without mi_plan billing overview). */
  const refreshCategoriesCreateGate = async () => {
    try {
      const usage = await fetchRemainingUsage()
      const metric = usage.quota_usage?.menu_categories ?? null
      const blocked = resolveOperationalQuota('menu_categories', metric).blocked
      categoriesQuotaFresh.value = {
        blocked,
        message: formatMetricMessage('menu_categories', metric),
      }
      return blocked
    } catch {
      // Keep last known; API CREATE still enforces 429.
      return categoriesQuotaFresh.value?.blocked === true
    }
  }

  const ensureBillingOverview = async () => {
    await fetchBillingOverview()
    await refreshCategoriesCreateGate()
  }

  const fetchQuotaBlocked = async (resource: OperationalQuotaKey) => {
    try {
      const usage = await fetchRemainingUsage()
      const metric = usage.quota_usage?.[resource] ?? null
      const blocked = resolveOperationalQuota(resource, metric).blocked
      if (resource === 'menu_categories') {
        categoriesQuotaFresh.value = {
          blocked,
          message: formatMetricMessage('menu_categories', metric),
        }
      }
      return blocked
    } catch {
      // Fail open — API CREATE still enforces 429.
      return false
    }
  }

  const openCategoriesLimitModal = async (opts?: { skipRefresh?: boolean }) => {
    if (!opts?.skipRefresh) {
      await refreshCategoriesCreateGate()
    }
    categoriesLimitModalMessage.value = categoriesCreateBlockedMessage.value
      || BILLING_QUOTA_RESOURCE_CONFIG.menu_categories?.blockedMessage
      || t('menu.common.quotaBlocked', 'Cupo del plan alcanzado')
    categoriesLimitModalOpen.value = true
  }

  const closeCategoriesLimitModal = () => {
    categoriesLimitModalOpen.value = false
  }

  const goToBillingFromCategoriesLimitModal = async () => {
    categoriesLimitModalOpen.value = false
    await navigateTo('/gestion/billing')
  }

  /** Inline product flows: allow click, show modal instead of create panel when blocked. */
  const handleInlineCategoryCreate = async (typedName: string, openCreate: (name: string) => void) => {
    if (await fetchQuotaBlocked('menu_categories')) {
      await openCategoriesLimitModal({ skipRefresh: true })
      return false
    }
    openCreate(typedName)
    return true
  }

  const redirectIfProductsCreateBlocked = async (listPath = '/menu/productos') => {
    if (await fetchQuotaBlocked('menu_products')) {
      showProductsCreateBlocked()
      await navigateTo(listPath)
      return true
    }
    return false
  }

  const redirectIfModifiersCreateBlocked = async (listPath = '/menu/modificadores') => {
    const productsBlocked = await fetchQuotaBlocked('menu_products')
    const groupsBlocked = productsBlocked ? true : await fetchQuotaBlocked('modifier_groups')
    if (productsBlocked || groupsBlocked) {
      showModifiersCreateBlocked()
      await navigateTo(listPath)
      return true
    }
    return false
  }

  const redirectIfRecipesCreateBlocked = async (listPath = '/menu/recetas') => {
    if (await fetchQuotaBlocked('recipe_bases')) {
      showRecipesCreateBlocked()
      await navigateTo(listPath)
      return true
    }
    return false
  }

  const redirectIfSharedCatalogCreateBlocked = async (listPath: string) => {
    if (await fetchQuotaBlocked('menu_products')) {
      showSharedCatalogCreateBlocked()
      await navigateTo(listPath)
      return true
    }
    return false
  }

  return {
    menuProductsQuota,
    menuCategoriesQuota,
    modifierGroupsQuota,
    recipeBasesQuota,
    isProductsCreateBlocked,
    isCategoriesCreateBlocked,
    isModifiersCreateBlocked,
    isRecipesCreateBlocked,
    isSharedCatalogCreateBlocked,
    productsCreateBlockedMessage,
    categoriesCreateBlockedMessage,
    modifiersCreateBlockedMessage,
    recipesCreateBlockedMessage,
    sharedCatalogCreateBlockedMessage,
    showProductsCreateBlocked,
    showCategoriesCreateBlocked,
    showModifiersCreateBlocked,
    showRecipesCreateBlocked,
    showSharedCatalogCreateBlocked,
    ensureBillingOverview,
    refreshCategoriesCreateGate,
    fetchQuotaBlocked,
    handleInlineCategoryCreate,
    categoriesLimitModalOpen,
    categoriesLimitModalMessage,
    openCategoriesLimitModal,
    closeCategoriesLimitModal,
    goToBillingFromCategoriesLimitModal,
    redirectIfProductsCreateBlocked,
    redirectIfModifiersCreateBlocked,
    redirectIfRecipesCreateBlocked,
    redirectIfSharedCatalogCreateBlocked,
  }
}
