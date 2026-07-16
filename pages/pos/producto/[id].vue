<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { $fetch } from 'ofetch'
import { usePOSStore } from '~/stores/usePOSStore'
import type { TabItem } from '~/stores/usePOSStore'
import type { CartModifier } from '~/stores/online_cart'
import {
  mapApiModifierToSaleOption,
  modifierLineTotal,
  formatSaleModifierPriceLabel,
  saleModifierPriceClass,
  type SaleModifierOption,
} from '~/utils/saleModifierOption'
import {
  ShoppingCartIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

import { formatPromoTypeLabel } from '~/utils/promotionPreview'
import {
  computePromoEligibleSubtotal,
  linePromoSavingsForProduct,
  promoBadgeForProduct,
} from '~/utils/promoProductMatch'
import { firstMissingRequiredModifierGroup } from '~/utils/modifierSelection'

definePageMeta({
  layout: 'dashboard',
  module: 'pos',
})

useHead({ title: () => t('pos.product.pageTitle') })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

const route = useRoute()
const router = useRouter()
const posStore = usePOSStore()
const { activePromos } = useActivePromotions()

// Product ID from route
const productId = computed(() => route.params.id as string)

// Obtener producto del cache (NO del backend)
const cachedProduct = computed(() => posStore.getProduct(productId.value))

// Si no hay producto en cache, redirigir a POS (el usuario navegó directamente)
const loadingProduct = ref(false)

onMounted(() => {
  if (!cachedProduct.value) {
    // No hay producto en cache - redirigir a POS para cargar productos
    router.push('/pos')
  }
})

// Redirect on tenant change
watch(() => currentTenant.value?.id, () => { router.push('/pos') })

// Product computed from cache
const product = computed(() => {
  if (!cachedProduct.value) return null

  const p = cachedProduct.value

  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    price: Number(p.price) || 0,
    category: p.category,
    category_id: p.category_id ?? null,
    image: p.image,
    image_url: p.image_url || null,
    available: p.is_available,
    modifier_groups: p.modifier_groups || []
  }
})

const productPromoBadge = computed(() => {
  if (!product.value) return null
  return promoBadgeForProduct(
    activePromos.value,
    product.value.id,
    product.value.category_id,
  )
})

// State
const selectedModifiers = ref<CartModifier[]>([])
const notes = ref('')
const quantity = ref(1)
const isAdding = ref(false)

interface WizardUnit {
  modifiers: CartModifier[]
  notes: string
}

const wizardMode = ref(false)
const wizardPending = ref(false)
const wizardStep = ref(0)
const wizardUnits = ref<WizardUnit[]>([])

const activeStepModifiers = computed<CartModifier[]>({
  get() {
    if (wizardMode.value && wizardUnits.value[wizardStep.value]) {
      return wizardUnits.value[wizardStep.value].modifiers
    }
    return selectedModifiers.value
  },
  set(val) {
    if (wizardMode.value && wizardUnits.value[wizardStep.value]) {
      wizardUnits.value[wizardStep.value].modifiers = val
    } else {
      selectedModifiers.value = val
    }
  },
})

const activeNotes = computed<string>({
  get() {
    if (wizardMode.value && wizardUnits.value[wizardStep.value]) {
      return wizardUnits.value[wizardStep.value].notes
    }
    return notes.value
  },
  set(val) {
    if (wizardMode.value && wizardUnits.value[wizardStep.value]) {
      wizardUnits.value[wizardStep.value].notes = val
    } else {
      notes.value = val
    }
  },
})

watch(quantity, (newQty) => {
  if (!wizardMode.value) return
  if (newQty > wizardUnits.value.length) {
    while (wizardUnits.value.length < newQty) {
      wizardUnits.value.push({ modifiers: [], notes: '' })
    }
  } else {
    wizardUnits.value = wizardUnits.value.slice(0, newQty)
    if (wizardStep.value >= newQty) wizardStep.value = Math.max(0, newQty - 1)
  }
})

const enableWizard = () => {
  wizardPending.value = !wizardPending.value
  if (wizardPending.value) {
    wizardUnits.value = Array.from({ length: quantity.value }, (_, i) => ({
      modifiers: i === 0 ? [...selectedModifiers.value] : [],
      notes: i === 0 ? notes.value : '',
    }))
    wizardStep.value = 0
    wizardMode.value = true
  } else {
    if (wizardUnits.value[0]) {
      selectedModifiers.value = [...wizardUnits.value[0].modifiers]
      notes.value = wizardUnits.value[0].notes
    }
    wizardMode.value = false
    wizardUnits.value = []
    wizardStep.value = 0
  }
}

const goToNextStep = () => {
  const missingGroup = missingRequiredModifierGroupFor(activeStepModifiers.value)
  if (missingGroup) {
    notifyMissingRequiredGroup(missingGroup, wizardStep.value + 1)
    return
  }
  wizardStep.value++
}

// Edit mode detection
const editCartIndex = computed(() => {
  const editParam = route.query.edit
  return editParam !== undefined ? parseInt(editParam as string) : null
})

const editTabItemId = computed(() => {
  const tabItemParam = route.query.tabItem
  return typeof tabItemParam === 'string' && tabItemParam ? tabItemParam : null
})

const isEditMode = computed(() => editCartIndex.value !== null)
const isTabItemEditMode = computed(() => editTabItemId.value !== null)
const isLineEditMode = computed(() => isEditMode.value || isTabItemEditMode.value)

// Type definitions
interface ModifierOption extends SaleModifierOption {
  icon?: string
}

interface ModifierGroup {
  id: string
  name: string
  required: boolean
  minQty: number
  maxSelections: number
  options: ModifierOption[]
}

// Icon mapping for modifiers - maps food names to Iconify icon names
// Uses simple, reliable icon sets (mdi, material-symbols, fluent)
const getModifierIcon = (name: string): string => {
  const iconMap: Record<string, string> = {
    // ========== QUESOS ==========
    'queso': 'material-symbols:restaurant',
    'queso extra': 'material-symbols:restaurant',
    'queso mozzarella': 'material-symbols:restaurant',
    'queso cheddar': 'material-symbols:restaurant',
    'queso parmesano': 'material-symbols:restaurant',
    'queso azul': 'material-symbols:restaurant',
    'crema': 'material-symbols:restaurant',

    // ========== CARNES Y PROTEÍNAS ==========
    'bacon': 'material-symbols:fastfood',
    'tocineta': 'material-symbols:fastfood',
    'tocino': 'material-symbols:fastfood',
    'jamón': 'material-symbols:fastfood',
    'jamon': 'material-symbols:fastfood',
    'pepperoni': 'material-symbols:local-pizza',
    'salami': 'material-symbols:fastfood',
    'pollo': 'material-symbols:restaurant-menu',
    'carne': 'material-symbols:restaurant-menu',
    'res': 'material-symbols:restaurant-menu',
    'cerdo': 'material-symbols:restaurant-menu',
    'chorizo': 'material-symbols:fastfood',
    'salchicha': 'material-symbols:fastfood',
    'costilla': 'material-symbols:restaurant-menu',
    'pechuga': 'material-symbols:restaurant-menu',
    'atún': 'material-symbols:set-meal',
    'atun': 'material-symbols:set-meal',
    'salmón': 'material-symbols:set-meal',
    'salmon': 'material-symbols:set-meal',
    'pescado': 'material-symbols:set-meal',
    'camarón': 'material-symbols:set-meal',
    'camaron': 'material-symbols:set-meal',
    'mariscos': 'material-symbols:set-meal',

    // ========== VEGETALES ==========
    'aguacate': 'material-symbols:eco',
    'palta': 'material-symbols:eco',
    'tomate': 'material-symbols:nutrition',
    'lechuga': 'material-symbols:eco',
    'cebolla': 'material-symbols:nutrition',
    'pimiento': 'material-symbols:local-fire-department',
    'pimientos': 'material-symbols:local-fire-department',
    'champiñón': 'material-symbols:nature',
    'champiñones': 'material-symbols:nature',
    'hongos': 'material-symbols:nature',
    'aceituna': 'material-symbols:circle',
    'aceitunas': 'material-symbols:circle',
    'jalapeño': 'material-symbols:local-fire-department',
    'jalapeno': 'material-symbols:local-fire-department',
    'chile': 'material-symbols:local-fire-department',
    'ají': 'material-symbols:local-fire-department',
    'aji': 'material-symbols:local-fire-department',
    'pepino': 'material-symbols:eco',
    'espinaca': 'material-symbols:eco',
    'zanahoria': 'material-symbols:nutrition',
    'maíz': 'material-symbols:nutrition',
    'maiz': 'material-symbols:nutrition',
    'elote': 'material-symbols:nutrition',
    'brócoli': 'material-symbols:eco',
    'brocoli': 'material-symbols:eco',
    'col': 'material-symbols:eco',
    'repollo': 'material-symbols:eco',
    'rúcula': 'material-symbols:eco',
    'rucula': 'material-symbols:eco',
    'arúgula': 'material-symbols:eco',
    'berenjena': 'material-symbols:nutrition',
    'calabacín': 'material-symbols:nutrition',
    'calabaza': 'material-symbols:nutrition',
    'remolacha': 'material-symbols:nutrition',
    'betabel': 'material-symbols:nutrition',

    // ========== SALSAS Y CONDIMENTOS ==========
    'salsa': 'material-symbols:water-drop',
    'salsa bbq': 'material-symbols:water-drop',
    'bbq': 'material-symbols:water-drop',
    'mayonesa': 'material-symbols:water-drop',
    'mostaza': 'material-symbols:water-drop',
    'ketchup': 'material-symbols:water-drop',
    'catsup': 'material-symbols:water-drop',
    'ranch': 'material-symbols:water-drop',
    'vinagreta': 'material-symbols:water-drop',
    'guacamole': 'material-symbols:eco',
    'pico de gallo': 'material-symbols:nutrition',
    'chimichurri': 'material-symbols:eco',
    'aioli': 'material-symbols:water-drop',
    'sriracha': 'material-symbols:local-fire-department',
    'tabasco': 'material-symbols:local-fire-department',
    'soya': 'material-symbols:water-drop',
    'teriyaki': 'material-symbols:water-drop',

    // ========== LÁCTEOS Y HUEVOS ==========
    'huevo': 'material-symbols:egg',
    'huevos': 'material-symbols:egg',
    'leche': 'material-symbols:local-cafe',
    'yogurt': 'material-symbols:local-cafe',
    'mantequilla': 'material-symbols:restaurant',
    'nata': 'material-symbols:local-cafe',
    'crema agria': 'material-symbols:local-cafe',

    // ========== CARBOHIDRATOS ==========
    'papa': 'material-symbols:restaurant-menu',
    'papas': 'material-symbols:restaurant-menu',
    'patata': 'material-symbols:restaurant-menu',
    'patatas': 'material-symbols:restaurant-menu',
    'arroz': 'material-symbols:rice-bowl',
    'pasta': 'material-symbols:restaurant',
    'fideos': 'material-symbols:restaurant',
    'pan': 'material-symbols:bakery-dining',
    'tortilla': 'material-symbols:bakery-dining',
    'tostada': 'material-symbols:bakery-dining',
    'bagel': 'material-symbols:bakery-dining',
    'croissant': 'material-symbols:bakery-dining',

    // ========== FRUTAS ==========
    'fresa': 'material-symbols:nutrition',
    'fresas': 'material-symbols:nutrition',
    'plátano': 'material-symbols:nutrition',
    'platano': 'material-symbols:nutrition',
    'banana': 'material-symbols:nutrition',
    'manzana': 'material-symbols:nutrition',
    'naranja': 'material-symbols:nutrition',
    'limón': 'material-symbols:nutrition',
    'limon': 'material-symbols:nutrition',
    'piña': 'material-symbols:nutrition',
    'pina': 'material-symbols:nutrition',
    'mango': 'material-symbols:nutrition',
    'uva': 'material-symbols:nutrition',
    'uvas': 'material-symbols:nutrition',
    'sandía': 'material-symbols:nutrition',
    'sandia': 'material-symbols:nutrition',
    'melón': 'material-symbols:nutrition',
    'melon': 'material-symbols:nutrition',
    'kiwi': 'material-symbols:nutrition',
    'durazno': 'material-symbols:nutrition',
    'cereza': 'material-symbols:nutrition',
    'cerezas': 'material-symbols:nutrition',

    // ========== FRUTOS SECOS ==========
    'almendra': 'material-symbols:eco',
    'almendras': 'material-symbols:eco',
    'nuez': 'material-symbols:eco',
    'nueces': 'material-symbols:eco',
    'maní': 'material-symbols:eco',
    'mani': 'material-symbols:eco',
    'cacahuate': 'material-symbols:eco',
    'pistacho': 'material-symbols:eco',
    'avellana': 'material-symbols:eco',

    // ========== BEBIDAS ==========
    'jugo': 'material-symbols:local-cafe',
    'refresco': 'material-symbols:local-cafe',
    'soda': 'material-symbols:local-cafe',
    'agua': 'material-symbols:water-drop',
    'té': 'material-symbols:local-cafe',
    'te': 'material-symbols:local-cafe',
    'café': 'material-symbols:local-cafe',
    'cafe': 'material-symbols:local-cafe',
    'cerveza': 'material-symbols:sports-bar',
    'vino': 'material-symbols:wine-bar',
    'cóctel': 'material-symbols:local-bar',
    'coctel': 'material-symbols:local-bar',

    // ========== POSTRES Y DULCES ==========
    'chocolate': 'material-symbols:cake',
    'caramelo': 'material-symbols:candy',
    'dulce': 'material-symbols:candy',
    'helado': 'material-symbols:icecream',
    'nieve': 'material-symbols:icecream',
    'pastel': 'material-symbols:cake',
    'tarta': 'material-symbols:cake',
    'galleta': 'material-symbols:cookie',
    'galletas': 'material-symbols:cookie',
    'brownie': 'material-symbols:cake',
    'cheesecake': 'material-symbols:cake',
    'flan': 'material-symbols:cake',
    'natilla': 'material-symbols:cake',
    'mermelada': 'material-symbols:water-drop',
    'miel': 'material-symbols:water-drop',

    // ========== ESPECIAS Y HIERBAS ==========
    'albahaca': 'material-symbols:eco',
    'cilantro': 'material-symbols:eco',
    'perejil': 'material-symbols:eco',
    'orégano': 'material-symbols:eco',
    'oregano': 'material-symbols:eco',
    'tomillo': 'material-symbols:eco',
    'romero': 'material-symbols:eco',
    'menta': 'material-symbols:eco',
    'canela': 'material-symbols:nutrition',
    'pimienta': 'material-symbols:nutrition',
    'comino': 'material-symbols:nutrition',
    'ajo': 'material-symbols:nutrition',
    'jengibre': 'material-symbols:nutrition',

    // ========== OTROS ==========
    'extra': 'material-symbols:add-circle',
    'adicional': 'material-symbols:add-circle',
    'doble': 'material-symbols:add-circle',
    'triple': 'material-symbols:add-circle',
    'sin': 'material-symbols:remove-circle',
    'menos': 'material-symbols:remove-circle'
  }

  const lowerName = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents for better matching

  // Buscar coincidencia exacta primero
  if (iconMap[lowerName]) {
    return iconMap[lowerName]
  }

  // Buscar coincidencia parcial (palabra completa)
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return icon
    }
  }

  // Default icon si no hay coincidencia
  return 'material-symbols:add-circle'
}

// Map modifier groups from API data
const modifierGroups = computed<ModifierGroup[]>(() => {
  if (!product.value?.modifier_groups || !Array.isArray(product.value.modifier_groups)) {
    return []
  }

  try {
    return product.value.modifier_groups
      .filter((group: any) => group && group.modifiers && Array.isArray(group.modifiers) && group.modifiers.length > 0)
      .map((group: any) => ({
        id: group.id,
        name: group.name,
        required: group.is_required || false,
        minQty: Math.max(0, Number(group.min_qty) || 0),
        maxSelections: group.max_qty || 1,
        options: (group.modifiers || [])
          .filter((mod: any) => mod && mod.is_available !== false)
          .map((mod: any) => {
            const mapped = mapApiModifierToSaleOption(mod as Record<string, unknown>)
            return {
              ...mapped,
              icon: getModifierIcon(mapped.name),
            }
          })
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      }))
      .sort((a, b) => (a.group_sort_order || 0) - (b.group_sort_order || 0))
  } catch (error) {
    return []
  }
})

// Computed
const totalPrice = computed(() => {
  if (!product.value) return 0
  const basePrice = Number(product.value.price) || 0
  if (wizardMode.value) {
    return wizardUnits.value.reduce((sum, unit) => {
      const modifiersPrice = unit.modifiers.reduce((modSum, mod) => modSum + modifierLineTotal(mod), 0)
      return sum + basePrice + modifiersPrice
    }, 0)
  }
  const modifiersPrice = selectedModifiers.value.reduce((sum, mod) => sum + modifierLineTotal(mod), 0)
  return (basePrice + modifiersPrice) * quantity.value
})

const promoSavings = computed(() => {
  if (!product.value || activePromos.value.length === 0) return 0
  if (wizardMode.value) {
    const basePrice = Number(product.value.price) || 0
    return wizardUnits.value.reduce((sum, unit) => {
      const modifiersPrice = unit.modifiers.reduce((modSum, mod) => modSum + modifierLineTotal(mod), 0)
      const subtotal = basePrice + modifiersPrice
      return sum + linePromoSavingsForProduct(
        activePromos.value,
        product.value!.id,
        {
          subtotal,
          eligibleSubtotal: computePromoEligibleSubtotal(
            basePrice,
            unit.modifiers,
            product.value!.modifier_groups,
            1,
          ),
          quantity: 1,
        },
        product.value!.category_id,
      )
    }, 0)
  }
  const modifiersPrice = selectedModifiers.value.reduce((sum, mod) => sum + modifierLineTotal(mod), 0)
  const unitSubtotal = basePriceFromProduct() + modifiersPrice
  const subtotal = unitSubtotal * quantity.value
  return linePromoSavingsForProduct(
    activePromos.value,
    product.value.id,
    {
      subtotal,
      eligibleSubtotal: computePromoEligibleSubtotal(
        basePriceFromProduct(),
        selectedModifiers.value,
        product.value.modifier_groups,
        quantity.value,
      ),
      quantity: quantity.value,
    },
    product.value.category_id,
  )
})

const basePriceFromProduct = () => Number(product.value?.price) || 0

const netTotalPrice = computed(() => Math.max(0, totalPrice.value - promoSavings.value))

const addToCartLabel = computed(() => {
  if (isLineEditMode.value) return t('pos.product.saveChanges')
  if (quantity.value > 1) return t('pos.product.addMultipleToCart', { count: quantity.value })
  return t('pos.product.addToCart')
})

const modifierGroupMetaLabel = (group: ModifierGroup) => {
  const parts = [
    group.required || group.minQty > 0 ? t('pos.product.required') : t('pos.product.optional'),
  ]
  if (group.minQty > 1) parts.push(t('pos.product.minShort', { count: group.minQty }))
  parts.push(t('pos.product.maxShort', { count: group.maxSelections }))
  return parts.join(' • ')
}

// Methods
const getModifierQty = (modifierId: string) =>
  activeStepModifiers.value.find(m => m.id === modifierId)?.quantity ?? 0

const isSingleSelectGroup = (group: ModifierGroup) => group.maxSelections === 1

const missingRequiredModifierGroupFor = (modifiers: CartModifier[]) =>
  firstMissingRequiredModifierGroup(
    modifiers,
    modifierGroups.value.map(group => ({
      id: group.id,
      name: group.name,
      required: group.required,
      minQty: group.minQty,
      optionIds: group.options.map(option => option.id),
    })),
  )

const notifyMissingRequiredGroup = (group: { name: string }, unitNumber?: number) => {
  useToast().warning(t(
    unitNumber ? 'pos.product.missingRequiredForItem' : 'pos.product.missingRequired',
    { number: unitNumber, group: group.name },
  ), {
    title: t('pos.product.missingRequiredTitle'),
  })
}

const selectRadioModifier = (modifier: ModifierOption, groupId: string) => {
  const group = modifierGroups.value.find(g => g.id === groupId)
  if (!group) return
  const isSelected = isModifierSelected(modifier.id)

  if (!group.required && group.minQty <= 0 && isSelected) {
    activeStepModifiers.value = activeStepModifiers.value.filter(m => m.id !== modifier.id)
    return
  }

  activeStepModifiers.value = activeStepModifiers.value.filter(m =>
    !group.options.some(opt => opt.id === m.id)
  )
  activeStepModifiers.value = [
    ...activeStepModifiers.value,
    {
      id: modifier.id,
      name: modifier.name,
      price: modifier.price,
      quantity: 1,
      included_quantity: modifier.included_quantity,
    },
  ]
}

const canIncrementModifier = (option: ModifierOption, groupId: string) => {
  const group = modifierGroups.value.find(g => g.id === groupId)
  if (!group) return false

  const index = activeStepModifiers.value.findIndex(m => m.id === option.id)
  const currentQty = index === -1 ? 0 : (activeStepModifiers.value[index].quantity ?? 1)
  if (currentQty >= option.max_limit) return false

  if (index === -1) {
    const distinctInGroup = activeStepModifiers.value.filter(m =>
      group.options.some(opt => opt.id === m.id) && (m.quantity ?? 0) > 0
    ).length
    if (distinctInGroup >= group.maxSelections) return false
  }

  return true
}

const incrementModifier = (option: ModifierOption, groupId: string) => {
  if (!canIncrementModifier(option, groupId)) return

  const index = activeStepModifiers.value.findIndex(m => m.id === option.id)
  if (index === -1) {
    activeStepModifiers.value = [
      ...activeStepModifiers.value,
      {
        id: option.id,
        name: option.name,
        price: option.price,
        quantity: 1,
        included_quantity: option.included_quantity,
      },
    ]
    return
  }

  const currentQty = activeStepModifiers.value[index].quantity ?? 1
  const next = [...activeStepModifiers.value]
  next[index] = {
    ...next[index],
    quantity: currentQty + 1,
  }
  activeStepModifiers.value = next
}

const decrementModifier = (option: ModifierOption, groupId: string) => {
  const index = activeStepModifiers.value.findIndex(m => m.id === option.id)
  if (index === -1) return

  const currentQty = activeStepModifiers.value[index].quantity ?? 1
  if (currentQty <= 1) {
    activeStepModifiers.value = activeStepModifiers.value.filter(m => m.id !== option.id)
  } else {
    const next = [...activeStepModifiers.value]
    next[index] = {
      ...next[index],
      quantity: currentQty - 1,
    }
    activeStepModifiers.value = next
  }
}

const isModifierSelected = (modifierId: string) => getModifierQty(modifierId) > 0

const addToCart = async () => {
  if (!product.value || isAdding.value) return

  if (wizardMode.value) {
    const invalidUnitIndex = wizardUnits.value.findIndex(unit =>
      missingRequiredModifierGroupFor(unit.modifiers)
    )
    if (invalidUnitIndex !== -1) {
      wizardStep.value = invalidUnitIndex
      const missingGroup = missingRequiredModifierGroupFor(wizardUnits.value[invalidUnitIndex].modifiers)
      if (missingGroup) notifyMissingRequiredGroup(missingGroup, invalidUnitIndex + 1)
      return
    }
  } else {
    const missingGroup = missingRequiredModifierGroupFor(selectedModifiers.value)
    if (missingGroup) {
      notifyMissingRequiredGroup(missingGroup)
      return
    }
  }

  isAdding.value = true

  try {
    const productPayload = {
      id: product.value.id,
      name: product.value.name,
      price: product.value.price,
      image: product.value.image,
      category: product.value.category,
    }

    if (isTabItemEditMode.value && editTabItemId.value) {
      const tableId = posStore.activeTableSession?.tableId
      if (!tableId) {
        router.push('/pos')
        return
      }
      const res = await $fetch<{ success: boolean; data: { subtotal: number; notes: string | null; modifiers: TabItem['modifiers'] } }>(
        `/api/tables/${tableId}/tab/items/${editTabItemId.value}/content`,
        {
          method: 'PATCH',
          body: {
            modifiers: selectedModifiers.value.map(m => ({
              id: m.id,
              name: m.name,
              price: m.price,
              quantity: m.quantity ?? 1,
            })),
            notes: notes.value || null,
          },
        },
      )
      const patch = res?.data
      if (patch) {
        posStore.setTabItems(
          posStore.tabItems.map((item) =>
            item.orderItemId === editTabItemId.value
              ? {
                  ...item,
                  subtotal: patch.subtotal,
                  notes: patch.notes,
                  modifiers: (patch.modifiers ?? []).map(m => ({
                    id: m.id ?? '',
                    name: m.name,
                    price: Number(m.price) || 0,
                    quantity: Number(m.quantity) || 1,
                    included_quantity: Math.max(0, Number(m.included_quantity) || 0),
                  })),
                }
              : item,
          ),
        )
      }
    } else if (isEditMode.value && editCartIndex.value !== null) {
      const existingItem = posStore.getCartItem(editCartIndex.value)
      await posStore.updateCartItem(editCartIndex.value, {
        product: productPayload,
        modifiers: [...selectedModifiers.value],
        notes: notes.value || undefined,
        quantity: quantity.value || existingItem?.quantity || 1,
      })
    } else if (wizardMode.value) {
      await posStore.addCartItemsBatch(
        productPayload,
        wizardUnits.value.map(unit => ({
          modifiers: unit.modifiers.map(m => ({ ...m, quantity: m.quantity ?? 1 })),
          notes: unit.notes || undefined,
        })),
      )
    } else {
      await posStore.addToCart({
        product: productPayload,
        modifiers: selectedModifiers.value,
        quantity: quantity.value,
        notes: notes.value || undefined,
      })
    }

    router.push('/pos')
  } finally {
    isAdding.value = false
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(toNumberLocaleTag(locale.value), {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const modifierPriceLabel = (modifier: ModifierOption) => {
  const included = Math.max(0, Number(modifier.included_quantity) || 0)
  return formatSaleModifierPriceLabel(modifier.price, formatCurrency, included, {
    included: t('pos.product.modifierIncluded', { count: included }),
    perAdditional: t('pos.product.perAdditional'),
    noAdditionalCost: t('pos.product.noAdditionalCost'),
  })
}

// Watch for product availability - redirect if not in cache
watch(cachedProduct, (p) => {
  if (!p) {
    router.push('/pos')
  }
}, { immediate: true })

// Load cart or tab item data in edit mode
watch(product, (newProduct) => {
  if (!newProduct) return
  if (isEditMode.value && editCartIndex.value !== null) {
    const cartItem = posStore.getCartItem(editCartIndex.value)
    if (cartItem) {
      quantity.value = cartItem.quantity || 1
      selectedModifiers.value = cartItem.modifiers.map(m => ({
        ...m,
        quantity: m.quantity ?? 1,
      }))
      notes.value = cartItem.notes || ''
    }
    return
  }
  if (isTabItemEditMode.value && editTabItemId.value) {
    const tabItem = posStore.tabItems.find(i => i.orderItemId === editTabItemId.value)
    if (tabItem) {
      if ((tabItem.fulfillmentStatus ?? 'new') !== 'new') {
        router.push('/pos')
        return
      }
      quantity.value = tabItem.quantity || 1
      selectedModifiers.value = (tabItem.modifiers ?? []).map(m => ({
        id: m.id,
        name: m.name,
        price: m.price,
        quantity: m.quantity ?? 1,
        included_quantity: Math.max(0, Number(m.included_quantity) || 0),
      }))
      notes.value = tabItem.notes || ''
    }
  }
}, { immediate: true })

</script>

<template>
  <div class="product-customization-page flex flex-col bg-gradient-to-br from-background via-background to-surface/30 min-h-full">
    <!-- Loading State -->
    <div v-if="loadingProduct || !product" class="flex items-center justify-center min-h-[70vh]">
      <div class="text-center">
        <CommonsTheCustomLoader size="large" />
        <p class="text-text-secondary font-medium mt-6">{{ t('pos.product.loading') }}</p>
      </div>
    </div>

    <!-- Product Content -->
    <div v-else class="flex flex-col lg:flex-row gap-4 md:gap-6 pb-4">
      <!-- Left Column: Product Details & Customization -->
      <div class="flex-1 space-y-4 md:space-y-6 lg:pe-4">
        
        <!-- Product Card Hero -->
        <div class="bg-surface rounded-2xl p-4 md:p-6 border border-border relative overflow-hidden">
          <!-- Popular Badge -->
          <div class="absolute top-0 end-0 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-bl-xl z-10">
            {{ t('pos.product.popular') }}
          </div>

          <div class="flex flex-col sm:flex-row gap-4 md:gap-6 items-start sm:items-center">
            <!-- Product Image/Emoji — real image preserves natural aspect (#469); emoji fallback keeps fixed square -->
            <template v-if="product.image_url && product.image_url.startsWith('http')">
              <div class="w-fit max-w-full sm:max-w-40 flex-shrink-0 bg-surface-secondary rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  :src="product.image_url"
                  :alt="product.name"
                  loading="lazy"
                  class="w-auto max-w-full max-h-32 md:max-h-40 object-contain"
                />
              </div>
            </template>
            <template v-else>
              <div class="w-full sm:w-32 md:w-40 h-32 md:h-40 flex-shrink-0 bg-surface-secondary rounded-xl overflow-hidden relative flex items-center justify-center">
                <div class="text-6xl md:text-8xl">{{ product.image }}</div>
              </div>
            </template>

            <!-- Product Info -->
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {{ product.category }}
                </span>
                <span
                  v-if="productPromoBadge"
                  class="text-xs font-semibold bg-badge-success-bg text-badge-success-text px-2 py-0.5 rounded-full"
                  :title="productPromoBadge.title || productPromoBadge.label"
                >
                  {{ productPromoBadge.label }}
                </span>
              </div>
              <h2 class="text-xl md:text-2xl font-bold text-text-primary mb-2">{{ product.name }}</h2>
              <p
                v-if="product.description"
                class="text-text-secondary text-sm md:text-base mb-3 md:mb-4 leading-relaxed"
              >
                {{ product.description }}
              </p>
              <div class="text-lg md:text-xl font-bold text-primary">
                {{ formatCurrency(product.price) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Quantity + per-unit wizard (online cart parity #1023) -->
        <section v-if="!isTabItemEditMode" class="bg-surface rounded-2xl p-4 md:p-6 border border-border space-y-4">
          <div v-if="wizardMode" class="flex items-center justify-between">
            <h3 class="text-base md:text-lg font-bold text-text-primary">
              {{ t('pos.product.itemStep', { current: wizardStep + 1, total: quantity }) }}
            </h3>
            <span class="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
              {{ t('pos.product.individualCustomization') }}
            </span>
          </div>

          <div v-if="!wizardMode" class="flex items-center justify-between">
            <span class="text-sm font-semibold text-text-primary">{{ t('pos.product.quantity') }}</span>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="w-9 h-9 rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40"
                :disabled="quantity <= 1"
                @click="quantity = Math.max(1, quantity - 1)"
              >−</button>
              <span class="min-w-[2rem] text-center font-bold tabular-nums">{{ quantity }}</span>
              <button
                type="button"
                class="w-9 h-9 rounded-lg border border-border text-text-secondary hover:bg-surface-secondary"
                @click="quantity++"
              >+</button>
            </div>
          </div>

          <div
            v-if="quantity > 1 && modifierGroups.length > 0 && !wizardMode"
            class="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3"
          >
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-action-primary-focus-ring/30"
                :checked="wizardPending"
                @change="enableWizard"
              />
              <span>
                <span class="block text-sm font-semibold text-text-primary">{{ t('pos.product.customizeEach') }}</span>
                <span class="block text-xs text-text-secondary mt-0.5">{{ t('pos.product.customizeEachHint') }}</span>
              </span>
            </label>
          </div>
        </section>

        <!-- Modifier Groups -->
        <section v-for="group in modifierGroups" :key="group.id">
          <div class="flex items-center justify-between mb-3 md:mb-4">
            <h3 class="text-base md:text-lg font-bold text-text-primary">{{ group.name }}</h3>
            <span class="text-xs font-medium bg-surface-secondary text-text-secondary px-2 py-1 rounded">
              {{ modifierGroupMetaLabel(group) }}
            </span>
          </div>

          <!-- Single-select groups (radio style) -->
          <div v-if="isSingleSelectGroup(group)" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <label
              v-for="option in group.options"
              :key="option.id"
              class="cursor-pointer relative"
            >
              <input
                type="radio"
                :name="'group-' + group.id"
                class="sr-only"
                :checked="isModifierSelected(option.id)"
                @click.prevent="selectRadioModifier(option, group.id)"
              />
              <div
                class="border-2 rounded-xl p-3 md:p-4 transition-all duration-200 bg-surface h-full flex flex-col justify-between"
                :class="isModifierSelected(option.id)
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50'"
              >
                <div class="flex justify-between items-start w-full">
                  <div class="flex items-center gap-1.5 md:gap-2">
                    <div class="bg-surface-secondary p-1 md:p-1.5 rounded-lg text-text-secondary">
                      <svg class="h-3 md:h-4 w-3 md:w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                      </svg>
                    </div>
                    <span class="font-semibold text-text-primary text-xs md:text-sm">{{ option.name }}</span>
                  </div>
                  <svg
                    class="h-4 md:h-5 w-4 md:w-5 text-primary transition-all duration-200 flex-shrink-0"
                    :class="isModifierSelected(option.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div
                  class="mt-1.5 md:mt-2 text-xs md:text-sm font-medium"
                  :class="saleModifierPriceClass(option.price)"
                >
                  {{ modifierPriceLabel(option) }}
                </div>
                <p
                  v-if="option.option_type !== 'INGREDIENT'"
                  class="text-xs text-text-tertiary mt-0.5 md:mt-1"
                >
                  {{ option.type_label }}
                </p>
              </div>
            </label>
          </div>

          <!-- Multi-select adiciones (stepper below label) -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div
              v-for="option in group.options"
              :key="option.id"
              class="border rounded-xl p-3 md:p-4 flex flex-col gap-3 transition-all bg-surface"
              :class="getModifierQty(option.id) > 0
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border'"
            >
              <div class="flex items-start gap-2.5 min-w-0">
                <div class="bg-surface-secondary p-1.5 md:p-2 rounded-lg text-text-secondary flex-shrink-0">
                  <svg class="h-4 md:h-5 w-4 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-text-primary text-sm leading-snug">{{ option.name }}</div>
                  <div
                    class="text-xs font-semibold mt-0.5"
                    :class="saleModifierPriceClass(option.price)"
                  >
                    {{ modifierPriceLabel(option) }}
                  </div>
                  <p
                    v-if="option.option_type !== 'INGREDIENT'"
                    class="text-xs text-text-tertiary"
                  >
                    {{ option.type_label }}
                  </p>
                </div>
              </div>
              <div
                class="flex items-center justify-between w-full rounded-xl border border-border/80 bg-surface-secondary/40 p-0.5"
                :class="getModifierQty(option.id) > 0 ? 'border-primary/30' : ''"
              >
                <button
                  type="button"
                  class="flex-1 min-h-[40px] flex items-center justify-center text-lg font-medium text-text-secondary hover:bg-surface hover:text-text-primary rounded-lg transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  :disabled="getModifierQty(option.id) <= 0"
                  :aria-label="t('pos.product.decreaseModifierAria', { name: option.name })"
                  @click="decrementModifier(option, group.id)"
                >
                  −
                </button>
                <span
                  class="min-w-[2rem] px-1 text-center text-sm font-semibold text-text-primary tabular-nums"
                  :class="getModifierQty(option.id) > 0 ? 'text-primary' : ''"
                >
                  {{ getModifierQty(option.id) }}
                </span>
                <button
                  type="button"
                  class="flex-1 min-h-[40px] flex items-center justify-center text-lg font-medium text-text-secondary hover:bg-surface hover:text-primary rounded-lg transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  :disabled="!canIncrementModifier(option, group.id)"
                  :aria-label="t('pos.product.increaseModifierAria', { name: option.name })"
                  @click="incrementModifier(option, group.id)"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Notes Section -->
        <section>
          <h3 class="text-base md:text-lg font-bold text-text-primary mb-3">
            {{ wizardMode ? t('pos.product.itemNotes', { number: wizardStep + 1 }) : t('pos.product.specialNotes') }}
          </h3>
          <textarea
            v-model="activeNotes"
            :placeholder="t('pos.product.notesPlaceholder')"
            class="w-full border border-border rounded-xl p-3 md:p-4 text-xs md:text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none shadow-sm placeholder:text-muted-foreground bg-surface"
            rows="3"
          />
        </section>
      </div>

      <!-- Right Column: Summary (Desktop Sticky) -->
      <div class="hidden lg:block lg:w-96 flex-shrink-0">
        <div class="sticky top-6 bg-surface rounded-2xl p-6 shadow-lg border border-border">
          <h3 class="text-base md:text-lg font-bold text-text-primary mb-4">{{ t('pos.product.summary') }}</h3>

          <!-- Summary Items -->
          <div class="space-y-3 mb-6 border-b border-border pb-6">
            <div class="flex justify-between text-xs md:text-sm">
              <span class="text-text-secondary">{{ product.name }}</span>
              <span class="font-medium text-text-primary">{{ formatCurrency(product.price) }}</span>
            </div>

            <!-- Selected Modifiers -->
            <div v-for="modifier in (wizardMode ? activeStepModifiers : selectedModifiers)" :key="modifier.id" class="flex justify-between text-xs md:text-sm text-text-secondary">
              <span>+ {{ modifier.name }}<template v-if="(modifier.quantity ?? 1) > 1"> ×{{ modifier.quantity }}</template></span>
              <span>{{ formatCurrency(modifierLineTotal(modifier)) }}</span>
            </div>
            <div
              v-if="promoSavings > 0 && productPromoBadge"
              class="flex justify-between text-xs md:text-sm text-emerald-700"
            >
              <span>{{ productPromoBadge.title || productPromoBadge.label }}</span>
              <span class="font-medium">- {{ formatCurrency(promoSavings) }}</span>
            </div>
          </div>

          <!-- Total -->
          <div class="flex justify-between items-center mb-6">
            <span class="text-text-secondary font-medium text-sm md:text-base">{{ t('pos.cart.total') }}</span>
            <div class="flex flex-col items-end">
              <span
                v-if="promoSavings > 0"
                class="text-sm text-text-tertiary line-through tabular-nums"
              >{{ formatCurrency(totalPrice) }}</span>
              <span
                class="text-xl md:text-2xl font-bold tabular-nums"
                :class="promoSavings > 0 ? 'text-emerald-700' : 'text-text-primary'"
              >{{ formatCurrency(netTotalPrice) }}</span>
            </div>
          </div>

          <!-- Add to Cart Button -->
          <template v-if="wizardMode && !isLineEditMode">
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 border border-border text-text-primary font-semibold py-3 rounded-xl disabled:opacity-40"
                :disabled="wizardStep === 0"
                @click="wizardStep--"
              >
                ← {{ t('pos.product.previous') }}
              </button>
              <button
                v-if="wizardStep < quantity - 1"
                type="button"
                class="flex-[2] bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-3 rounded-xl"
                @click="goToNextStep"
              >
                {{ t('pos.product.next') }} →
              </button>
              <button
                v-else
                @click="addToCart"
                :disabled="isAdding"
                class="flex-[2] bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {{ t('pos.product.addItems', { count: quantity }) }}
              </button>
            </div>
          </template>
          <button
            v-else
            @click="addToCart"
            :disabled="isAdding"
            class="w-full bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <template v-if="isAdding">
              <svg class="animate-spin h-4 md:h-5 w-4 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('pos.product.adding') }}
            </template>
            <template v-else>
              <ShoppingCartIcon class="h-4 md:h-5 w-4 md:w-5" />
              {{ addToCartLabel }}
            </template>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile/Tablet Bottom Summary -->
    <div v-if="!loadingProduct && product" class="lg:hidden mt-4 md:mt-6 pb-4">
      <div class="bg-surface rounded-xl p-4 md:p-6 shadow-lg border border-border">
        <h3 class="text-base md:text-lg font-bold text-text-primary mb-3 md:mb-4">{{ t('pos.product.summary') }}</h3>

        <!-- Summary Items -->
        <div class="space-y-2 md:space-y-3 mb-4 md:mb-6 border-b border-border pb-4 md:pb-6">
          <div class="flex justify-between text-xs md:text-sm">
            <span class="text-text-secondary">{{ product.name }}</span>
            <span class="font-medium text-text-primary">{{ formatCurrency(product.price) }}</span>
          </div>

          <!-- Selected Modifiers -->
          <div v-for="modifier in (wizardMode ? activeStepModifiers : selectedModifiers)" :key="modifier.id" class="flex justify-between text-xs md:text-sm text-text-secondary">
            <span>+ {{ modifier.name }}<template v-if="(modifier.quantity ?? 1) > 1"> ×{{ modifier.quantity }}</template></span>
            <span>{{ formatCurrency(modifierLineTotal(modifier)) }}</span>
          </div>
          <div
            v-if="promoSavings > 0 && productPromoBadge"
            class="flex justify-between text-xs md:text-sm text-emerald-700"
          >
            <span>{{ productPromoBadge.title || productPromoBadge.label }}</span>
            <span class="font-medium">- {{ formatCurrency(promoSavings) }}</span>
          </div>
        </div>

        <!-- Total -->
        <div class="flex justify-between items-center mb-4 md:mb-6">
          <span class="text-text-secondary font-medium text-sm md:text-base">{{ t('pos.cart.total') }}</span>
          <div class="flex flex-col items-end">
            <span
              v-if="promoSavings > 0"
              class="text-sm text-text-tertiary line-through tabular-nums"
            >{{ formatCurrency(totalPrice) }}</span>
            <span
              class="text-xl md:text-2xl font-bold tabular-nums"
              :class="promoSavings > 0 ? 'text-emerald-700' : 'text-text-primary'"
            >{{ formatCurrency(netTotalPrice) }}</span>
          </div>
        </div>

        <!-- Add to Cart Button -->
        <template v-if="wizardMode && !isLineEditMode">
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 border border-border text-text-primary font-semibold py-3 rounded-xl disabled:opacity-40"
              :disabled="wizardStep === 0"
              @click="wizardStep--"
            >
              ← {{ t('pos.product.previous') }}
            </button>
            <button
              v-if="wizardStep < quantity - 1"
              type="button"
              class="flex-[2] bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-3 rounded-xl"
              @click="goToNextStep"
            >
              {{ t('pos.product.next') }} →
            </button>
            <button
              v-else
              @click="addToCart"
              :disabled="isAdding"
              class="flex-[2] bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-50"
            >
              {{ t('pos.product.addItems', { count: quantity }) }}
            </button>
          </div>
        </template>
        <button
          v-else
          @click="addToCart"
          :disabled="isAdding"
          class="w-full bg-primary hover:bg-action-primary-hover-bg text-primary-foreground font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <template v-if="isAdding">
            <svg class="animate-spin h-4 md:h-5 w-4 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ t('pos.product.adding') }}
          </template>
          <template v-else>
            <ShoppingCartIcon class="h-4 md:h-5 w-4 md:w-5" />
            {{ addToCartLabel }}
          </template>
        </button>
      </div>
    </div>
  </div>
</template>
