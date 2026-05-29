<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { usePOSStore } from '~/stores/usePOSStore'
import type { CartModifier } from '~/stores/online_cart'
import {
  ShoppingCartIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

import { formatPromoTypeLabel } from '~/utils/promotionPreview'
import { linePromoSavingsForProduct, promoBadgeForProduct } from '~/utils/promoProductMatch'

definePageMeta({
  layout: 'dashboard',
  module: 'pos',
})

useHead({ title: 'Producto POS' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

const route = useRoute()
const router = useRouter()
const posStore = usePOSStore()
const { activePromos } = useActivePromotions()

// Inject subtitle setter from layout
const setPageSubtitle = inject<(subtitle: string | undefined) => void>('setPageSubtitle', () => {})

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
const isAdding = ref(false)

// Edit mode detection
const editCartIndex = computed(() => {
  const editParam = route.query.edit
  return editParam !== undefined ? parseInt(editParam as string) : null
})

const isEditMode = computed(() => editCartIndex.value !== null)

// Type definitions
interface ModifierOption {
  id: string
  name: string
  price: number
  max_limit: number
  icon?: string
}

interface ModifierGroup {
  id: string
  name: string
  required: boolean
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
        maxSelections: group.max_qty || 1,
        options: (group.modifiers || [])
          .filter((mod: any) => mod && mod.is_available !== false)
          .map((mod: any) => ({
            id: mod.id,
            name: mod.name,
            price: Number(mod.price) || 0,
            max_limit: Number(mod.max_limit) || 1,
            icon: getModifierIcon(mod.name)
          }))
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      }))
      .sort((a, b) => (a.group_sort_order || 0) - (b.group_sort_order || 0))
  } catch (error) {
    return []
  }
})

const modifierLineTotal = (mod: CartModifier) => Number(mod.price) * (mod.quantity ?? 1)

// Computed
const totalPrice = computed(() => {
  if (!product.value) return 0
  const basePrice = Number(product.value.price) || 0
  const modifiersPrice = selectedModifiers.value.reduce((sum, mod) => sum + modifierLineTotal(mod), 0)
  return basePrice + modifiersPrice // Always 1 item
})

const promoSavings = computed(() => {
  if (!product.value || activePromos.value.length === 0) return 0
  return linePromoSavingsForProduct(
    activePromos.value,
    product.value.id,
    { subtotal: totalPrice.value, quantity: 1 },
    product.value.category_id,
  )
})

const netTotalPrice = computed(() => Math.max(0, totalPrice.value - promoSavings.value))

// Methods
const getModifierQty = (modifierId: string) =>
  selectedModifiers.value.find(m => m.id === modifierId)?.quantity ?? 0

const isSingleSelectGroup = (group: ModifierGroup) => group.maxSelections === 1

const selectRadioModifier = (modifier: ModifierOption, groupId: string) => {
  const group = modifierGroups.value.find(g => g.id === groupId)
  if (!group) return

  selectedModifiers.value = selectedModifiers.value.filter(m =>
    !group.options.some(opt => opt.id === m.id)
  )
  selectedModifiers.value.push({ id: modifier.id, name: modifier.name, price: modifier.price, quantity: 1 })
}

const canIncrementModifier = (option: ModifierOption, groupId: string) => {
  const group = modifierGroups.value.find(g => g.id === groupId)
  if (!group) return false

  const index = selectedModifiers.value.findIndex(m => m.id === option.id)
  const currentQty = index === -1 ? 0 : (selectedModifiers.value[index].quantity ?? 1)
  if (currentQty >= option.max_limit) return false

  if (index === -1) {
    const distinctInGroup = selectedModifiers.value.filter(m =>
      group.options.some(opt => opt.id === m.id) && (m.quantity ?? 0) > 0
    ).length
    if (distinctInGroup >= group.maxSelections) return false
  }

  return true
}

const incrementModifier = (option: ModifierOption, groupId: string) => {
  if (!canIncrementModifier(option, groupId)) return

  const index = selectedModifiers.value.findIndex(m => m.id === option.id)
  if (index === -1) {
    selectedModifiers.value.push({
      id: option.id,
      name: option.name,
      price: option.price,
      quantity: 1,
    })
    return
  }

  const currentQty = selectedModifiers.value[index].quantity ?? 1
  selectedModifiers.value[index] = {
    ...selectedModifiers.value[index],
    quantity: currentQty + 1,
  }
}

const decrementModifier = (option: ModifierOption, groupId: string) => {
  const index = selectedModifiers.value.findIndex(m => m.id === option.id)
  if (index === -1) return

  const currentQty = selectedModifiers.value[index].quantity ?? 1
  if (currentQty <= 1) {
    selectedModifiers.value.splice(index, 1)
  } else {
    selectedModifiers.value[index] = {
      ...selectedModifiers.value[index],
      quantity: currentQty - 1,
    }
  }
}

const isModifierSelected = (modifierId: string) => getModifierQty(modifierId) > 0

const addToCart = async () => {
  if (!product.value || isAdding.value) return

  isAdding.value = true

  try {
    const cartItemData = {
      product: {
        id: product.value.id,
        name: product.value.name,
        price: product.value.price,
        image: product.value.image,
        category: product.value.category
      },
      modifiers: selectedModifiers.value,
      quantity: 1, // Always 1 for individual personalization
      notes: notes.value || undefined
    }

    if (isEditMode.value && editCartIndex.value !== null) {
      // Update existing cart item
      await posStore.updateCartItem(editCartIndex.value, cartItemData)
    } else {
      // Add new cart item
      await posStore.addToCart(cartItemData)
    }

    // Navigate back to POS
    router.push('/pos')
  } finally {
    isAdding.value = false
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

// Update page subtitle when product changes
watch(product, (newProduct) => {
  if (newProduct) {
    setPageSubtitle(newProduct.name)
  }
}, { immediate: true })

// Watch for product availability - redirect if not in cache
watch(cachedProduct, (p) => {
  if (!p) {
    router.push('/pos')
  }
}, { immediate: true })

// Load cart item data if in edit mode
watch(product, (newProduct) => {
  if (newProduct && isEditMode.value && editCartIndex.value !== null) {
    const cartItem = posStore.getCartItem(editCartIndex.value)
    if (cartItem) {
      // Don't load quantity - always work with quantity 1
      selectedModifiers.value = cartItem.modifiers.map(m => ({
        ...m,
        quantity: m.quantity ?? 1,
      }))
      notes.value = cartItem.notes || ''
    }
  }
}, { immediate: true })

// Clear subtitle on unmount
onUnmounted(() => {
  setPageSubtitle(undefined)
})
</script>

<template>
  <div class="product-customization-page flex flex-col bg-gradient-to-br from-background via-background to-surface/30 min-h-full">
    <!-- Loading State -->
    <div v-if="loadingProduct || !product" class="flex items-center justify-center min-h-[70vh]">
      <div class="text-center">
        <CommonsTheCustomLoader size="large" />
        <p class="text-text-secondary font-medium mt-6">Cargando producto...</p>
      </div>
    </div>

    <!-- Product Content -->
    <div v-else class="flex flex-col lg:flex-row gap-4 md:gap-6 pb-4">
      <!-- Left Column: Product Details & Customization -->
      <div class="flex-1 space-y-4 md:space-y-6 lg:pr-4">
        
        <!-- Product Card Hero -->
        <div class="bg-surface rounded-2xl p-4 md:p-6 border border-border relative overflow-hidden">
          <!-- Popular Badge -->
          <div class="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-bl-xl z-10">
            POPULAR
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
                  class="text-xs font-semibold bg-emerald-500/90 text-white px-2 py-0.5 rounded-full"
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

        <!-- Modifier Groups -->
        <section v-for="group in modifierGroups" :key="group.id">
          <div class="flex items-center justify-between mb-3 md:mb-4">
            <h3 class="text-base md:text-lg font-bold text-text-primary">{{ group.name }}</h3>
            <span class="text-xs font-medium bg-surface-secondary text-text-secondary px-2 py-1 rounded">
              {{ group.required ? 'Obligatorio' : 'Opcional' }} • Máx {{ group.maxSelections }}
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
                @change="selectRadioModifier(option, group.id)"
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
                  :class="option.price > 0 ? 'text-primary' : option.price < 0 ? 'text-success' : 'text-text-secondary'"
                >
                  {{ option.price > 0 ? '+ ' : '' }}{{ option.price !== 0 ? formatCurrency(option.price) : 'Incluido' }}
                </div>
                <div class="text-xs text-text-tertiary mt-0.5 md:mt-1">
                  {{ option.name === 'Pequeño' ? '4 Porciones' : option.name === 'Mediano' ? '8 Porciones' : '12 Porciones' }}
                </div>
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
                  <div class="text-xs text-primary font-semibold mt-0.5">+ {{ formatCurrency(option.price) }}</div>
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
                  :aria-label="`Reducir ${option.name}`"
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
                  :aria-label="`Aumentar ${option.name}`"
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
          <h3 class="text-base md:text-lg font-bold text-text-primary mb-3">Notas Especiales</h3>
          <textarea
            v-model="notes"
            placeholder="Ej: Sin cebolla, término medio, cortar en cuadros..."
            class="w-full border border-border rounded-xl p-3 md:p-4 text-xs md:text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none shadow-sm placeholder:text-muted-foreground bg-surface"
            rows="3"
          />
        </section>
      </div>

      <!-- Right Column: Summary (Desktop Sticky) -->
      <div class="hidden lg:block lg:w-96 flex-shrink-0">
        <div class="sticky top-6 bg-surface rounded-2xl p-6 shadow-lg border border-border">
          <h3 class="text-base md:text-lg font-bold text-text-primary mb-4">Resumen</h3>

          <!-- Summary Items -->
          <div class="space-y-3 mb-6 border-b border-border pb-6">
            <div class="flex justify-between text-xs md:text-sm">
              <span class="text-text-secondary">{{ product.name }}</span>
              <span class="font-medium text-text-primary">{{ formatCurrency(product.price) }}</span>
            </div>

            <!-- Selected Modifiers -->
            <div v-for="modifier in selectedModifiers" :key="modifier.id" class="flex justify-between text-xs md:text-sm text-text-secondary">
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
            <span class="text-text-secondary font-medium text-sm md:text-base">Total</span>
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
          <button
            @click="addToCart"
            :disabled="isAdding"
            class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <template v-if="isAdding">
              <svg class="animate-spin h-4 md:h-5 w-4 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Agregando...
            </template>
            <template v-else>
              <ShoppingCartIcon class="h-4 md:h-5 w-4 md:w-5" />
              {{ isEditMode ? 'Guardar Cambios' : 'Agregar al Carrito' }}
            </template>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile/Tablet Bottom Summary -->
    <div v-if="!loadingProduct && product" class="lg:hidden mt-4 md:mt-6 pb-4">
      <div class="bg-surface rounded-xl p-4 md:p-6 shadow-lg border border-border">
        <h3 class="text-base md:text-lg font-bold text-text-primary mb-3 md:mb-4">Resumen</h3>

        <!-- Summary Items -->
        <div class="space-y-2 md:space-y-3 mb-4 md:mb-6 border-b border-border pb-4 md:pb-6">
          <div class="flex justify-between text-xs md:text-sm">
            <span class="text-text-secondary">{{ product.name }}</span>
            <span class="font-medium text-text-primary">{{ formatCurrency(product.price) }}</span>
          </div>

          <!-- Selected Modifiers -->
          <div v-for="modifier in selectedModifiers" :key="modifier.id" class="flex justify-between text-xs md:text-sm text-text-secondary">
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
          <span class="text-text-secondary font-medium text-sm md:text-base">Total</span>
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
        <button
          @click="addToCart"
          :disabled="isAdding"
          class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <template v-if="isAdding">
            <svg class="animate-spin h-4 md:h-5 w-4 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Agregando...
          </template>
          <template v-else>
            <ShoppingCartIcon class="h-4 md:h-5 w-4 md:w-5" />
            {{ isEditMode ? 'Guardar Cambios' : 'Agregar al Carrito' }}
          </template>
        </button>
      </div>
    </div>
  </div>
</template>
