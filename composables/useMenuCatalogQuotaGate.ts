/**
 * Menú catalog create gating (warocol.com#1796 / #1798 / #1800 / #1806 / #1808).
 * Productos, Categorías, Modificadores, and Recetas each use their own growth quota.
 * Scoped line/option caps compare local editor counts to plan limits.
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

  /** Shared limit modal (categories inline, modifiers Nuevo, product add-line). */
  const quotaLimitModalOpen = ref(false)
  const quotaLimitModalMessage = ref('')
  const categoriesLimitModalOpen = quotaLimitModalOpen
  const categoriesLimitModalMessage = quotaLimitModalMessage

  const menuProductsQuota = computed(() => getOperationalQuota('menu_products'))
  const menuCategoriesQuota = computed(() => getOperationalQuota('menu_categories'))
  const modifierGroupsQuota = computed(() => getOperationalQuota('modifier_groups'))
  const recipeBasesQuota = computed(() => getOperationalQuota('recipe_bases'))

  const isProductsCreateBlocked = computed(() => menuProductsQuota.value.blocked)
  /** Modificadores: own group cap only (independent of menu_products — #1808). */
  const isModifiersCreateBlocked = computed(() => modifierGroupsQuota.value.blocked)
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

  const formatScopedCountMessage = (
    resource: 'recipe_lines_per_product' | 'modifier_options_per_group',
    currentCount: number,
    limit: number,
  ) => {
    return formatMetricMessage(resource, {
      used: currentCount,
      limit,
      remaining: Math.max(limit - currentCount, 0),
      period_start: '',
      period_end: '',
    })
  }

  const productsCreateBlockedMessage = computed(() => formatBlockedMessage('menu_products'))
  const categoriesCreateBlockedMessage = computed(() => formatBlockedMessage('menu_categories'))
  const modifiersCreateBlockedMessage = computed(() => formatBlockedMessage('modifier_groups'))
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

  const fetchQuotaStatus = async (resource: OperationalQuotaKey) => {
    try {
      const usage = await fetchRemainingUsage()
      const metric = usage.quota_usage?.[resource] ?? null
      const blocked = resolveOperationalQuota(resource, metric).blocked
      const message = formatMetricMessage(resource, metric)
      if (resource === 'menu_categories') {
        categoriesQuotaFresh.value = {
          blocked,
          message,
        }
      }
      return { blocked, message, metric }
    } catch {
      // Fail open — API CREATE still enforces 429.
      return { blocked: false, message: '', metric: null }
    }
  }

  /** Boolean helper for callers that only need blocked (categories list, redirects). */
  const fetchQuotaBlocked = async (resource: OperationalQuotaKey) => {
    return (await fetchQuotaStatus(resource)).blocked
  }

  const fetchScopedQuotaLimit = async (
    resource: 'recipe_lines_per_product' | 'modifier_options_per_group',
  ): Promise<number | null> => {
    const cached = remainingUsage.value?.quota_usage?.[resource]?.limit
    if (cached !== undefined) return cached
    try {
      const usage = await fetchRemainingUsage()
      return usage.quota_usage?.[resource]?.limit ?? null
    } catch {
      return null
    }
  }

  const openQuotaLimitModalWithMessage = (message: string) => {
    quotaLimitModalMessage.value = message
      || t('menu.common.quotaBlocked', 'Cupo del plan alcanzado')
    quotaLimitModalOpen.value = true
  }

  const openQuotaLimitModal = async (resource: OperationalQuotaKey, opts?: { skipRefresh?: boolean }) => {
    if (resource === 'menu_categories' && !opts?.skipRefresh) {
      await refreshCategoriesCreateGate()
    }
    const message = formatBlockedMessage(resource)
      || BILLING_QUOTA_RESOURCE_CONFIG[resource]?.blockedMessage
      || t('menu.common.quotaBlocked', 'Cupo del plan alcanzado')
    openQuotaLimitModalWithMessage(message)
  }

  const openCategoriesLimitModal = async (opts?: { skipRefresh?: boolean }) => {
    await openQuotaLimitModal('menu_categories', opts)
  }

  const closeQuotaLimitModal = () => {
    quotaLimitModalOpen.value = false
  }
  const closeCategoriesLimitModal = closeQuotaLimitModal

  const goToBillingFromQuotaLimitModal = async () => {
    quotaLimitModalOpen.value = false
    await navigateTo('/gestion/billing')
  }
  const goToBillingFromCategoriesLimitModal = goToBillingFromQuotaLimitModal

  /** Inline product flows: allow click, show modal instead of create panel when blocked. */
  const handleInlineCategoryCreate = async (typedName: string, openCreate: (name: string) => void) => {
    const result = await fetchQuotaStatus('menu_categories')
    if (result.blocked) {
      openQuotaLimitModalWithMessage(
        result.message
          || categoriesCreateBlockedMessage.value
          || BILLING_QUOTA_RESOURCE_CONFIG.menu_categories?.blockedMessage
          || t('menu.common.quotaBlocked', 'Cupo del plan alcanzado'),
      )
      return false
    }
    openCreate(typedName)
    return true
  }

  /** List Nuevo/Crear: stay clickable; open Mi Plan modal when quota exhausted. */
  const handleQuotaCreateClick = async (
    resource: OperationalQuotaKey,
    navigate: () => void,
  ) => {
    const result = await fetchQuotaStatus(resource)
    if (result.blocked) {
      openQuotaLimitModalWithMessage(
        result.message
          || BILLING_QUOTA_RESOURCE_CONFIG[resource]?.blockedMessage
          || t('menu.common.quotaBlocked', 'Cupo del plan alcanzado'),
      )
      return false
    }
    navigate()
    return true
  }

  const handleProductsCreateClick = (navigate: () => void) =>
    handleQuotaCreateClick('menu_products', navigate)

  const handleCategoriesCreateClick = (navigate: () => void) =>
    handleQuotaCreateClick('menu_categories', navigate)

  const handleRecipesCreateClick = (navigate: () => void) =>
    handleQuotaCreateClick('recipe_bases', navigate)

  /** Modificadores list Nuevo: stay clickable; open limit modal when groups cap reached. */
  const handleModifiersCreateClick = (navigate: () => void) =>
    handleQuotaCreateClick('modifier_groups', navigate)

  /**
   * Product recipe editor: stay clickable when at recipe_lines_per_product;
   * open limit modal instead of appending a line.
   */
  const handleAddProductRecipeLine = async (currentCount: number, add: () => void) => {
    const limit = await fetchScopedQuotaLimit('recipe_lines_per_product')
    if (limit !== null && currentCount >= limit) {
      openQuotaLimitModalWithMessage(
        formatScopedCountMessage('recipe_lines_per_product', currentCount, limit),
      )
      return false
    }
    add()
    return true
  }

  /**
   * Modifier option editor: stay clickable when at modifier_options_per_group;
   * open limit modal instead of appending an option.
   */
  const handleAddModifierOption = async (currentCount: number, add: () => void) => {
    const limit = await fetchScopedQuotaLimit('modifier_options_per_group')
    if (limit !== null && currentCount >= limit) {
      openQuotaLimitModalWithMessage(
        formatScopedCountMessage('modifier_options_per_group', currentCount, limit),
      )
      return false
    }
    add()
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
    if (await fetchQuotaBlocked('modifier_groups')) {
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
    handleProductsCreateClick,
    handleCategoriesCreateClick,
    handleRecipesCreateClick,
    handleModifiersCreateClick,
    handleAddProductRecipeLine,
    handleAddModifierOption,
    quotaLimitModalOpen,
    quotaLimitModalMessage,
    categoriesLimitModalOpen,
    categoriesLimitModalMessage,
    openQuotaLimitModal,
    openCategoriesLimitModal,
    closeQuotaLimitModal,
    closeCategoriesLimitModal,
    goToBillingFromQuotaLimitModal,
    goToBillingFromCategoriesLimitModal,
    redirectIfProductsCreateBlocked,
    redirectIfModifiersCreateBlocked,
    redirectIfRecipesCreateBlocked,
    redirectIfSharedCatalogCreateBlocked,
  }
}
