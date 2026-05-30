<template>
  <div>
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Creando grupo de modificadores..."
      hint="Estamos guardando la configuración y opciones del grupo."
      variant="glass"
      indicator="matrix"
    />

    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <div v-else class="space-y-6">
      <form @submit.prevent="submitGroup" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
        <div class="xl:col-span-2 space-y-6">
          <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
            <UiFormSection title="Datos del grupo">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Productos *
                  </label>
                  <div class="border border-border rounded-lg p-3 max-h-60 overflow-y-auto bg-surface">
                    <div v-if="loadingProducts" class="flex items-center justify-center py-8">
                      <div class="inline-flex items-center gap-2 text-text-secondary">
                        <UiLoadingDots size="10px" />
                        <span class="text-sm">Cargando productos...</span>
                      </div>
                    </div>
                    <div v-else-if="products.length === 0" class="text-center py-4 text-text-secondary text-sm">
                      No hay productos disponibles
                    </div>
                    <div v-else class="space-y-2">
                      <label
                        v-for="product in products"
                        :key="product.id"
                        class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors"
                        :class="{ 'bg-primary/5 border border-primary/20': form.product_ids.includes(product.id) }"
                      >
                        <input
                          type="checkbox"
                          :value="product.id"
                          v-model="form.product_ids"
                          class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span class="text-sm text-text-primary">{{ product.name }}</span>
                        <span v-if="product.category?.name" class="text-xs text-text-secondary ml-auto">
                          {{ product.category.name }}
                        </span>
                      </label>
                    </div>
                  </div>
                  <p class="text-xs text-text-tertiary mt-1">
                    {{ form.product_ids.length }} producto(s) seleccionado(s)
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    v-model="form.name"
                    placeholder="Ej. extras, tamaño, sin..."
                    class="input-base w-full px-4 py-2"
                    :class="nameError ? 'border-destructive focus:ring-destructive' : ''"
                    required
                    @input="nameError = ''"
                  />
                  <p v-if="nameError" role="alert" class="text-xs text-destructive mt-1 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    {{ nameError }}
                  </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                      Selección mínima *
                    </label>
                    <input
                      type="number"
                      v-model.number="form.min_qty"
                      placeholder="0"
                      min="0"
                      class="input-base w-full px-4 py-2"
                      required
                    />
                    <p class="text-xs text-text-tertiary mt-1">Mínimo de opciones a elegir</p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                      Selección máxima *
                    </label>
                    <input
                      type="number"
                      v-model.number="form.max_qty"
                      placeholder="1"
                      min="1"
                      class="input-base w-full px-4 py-2"
                      required
                    />
                    <p class="text-xs text-text-tertiary mt-1">Máximo de opciones a elegir</p>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Orden de visualización <span class="text-text-tertiary font-normal">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    v-model.number="form.sort_order"
                    placeholder="0"
                    min="0"
                    class="input-base w-full px-4 py-2"
                  />
                  <p class="text-xs text-text-tertiary mt-1">Menor número aparece primero</p>
                </div>

                <div class="flex items-start gap-3">
                  <input
                    type="checkbox"
                    v-model="form.is_required"
                    id="is_required"
                    class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
                  />
                  <div>
                    <label for="is_required" class="text-sm font-medium text-text-primary cursor-pointer">
                      Obligatorio
                    </label>
                    <p class="text-xs text-text-tertiary mt-0.5">
                      El cliente debe seleccionar al menos una opción
                    </p>
                  </div>
                </div>
              </div>
            </UiFormSection>

            <UiFormSection title="Opciones">
              <template #actions>
                <button
                  type="button"
                  @click="addModifier"
                  class="btn-secondary px-3 py-1.5 rounded-lg text-sm"
                >
                  + Agregar
                </button>
              </template>

              <MenuCatalogInlineCreateBusyOverlay
                :busy="inlineCatalogBusy"
                :label="inlineCatalogBusyLabel"
                :hint="inlineCatalogBusyHint"
              >
                <MenuIngredientProductHint class="mb-4" />

                <div v-if="form.modifiers.length === 0" class="text-center py-10 text-text-secondary border border-dashed border-border rounded-lg">
                  <svg class="w-12 h-12 mx-auto mb-3 text-text-tertiary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p class="text-sm font-medium mb-0.5">Sin opciones agregadas</p>
                  <p class="text-xs text-text-tertiary">Agrega modificadores que el cliente pueda elegir</p>
                </div>

                <div v-else class="space-y-3">
                  <div
                    v-for="(modifier, index) in form.modifiers"
                    :key="index"
                    class="border border-border rounded-lg p-3 sm:p-4 bg-background"
                  >
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                      <div class="md:col-span-4">
                        <label class="block text-xs font-medium text-text-secondary mb-1">Ingrediente o reventa *</label>
                        <UiIngredientSearchInput
                          :allow-create="true"
                          @select="(ing) => selectIngredient(modifier, ing)"
                          @create="(name) => openCustomIngModal(name, index)"
                        />
                        <p v-if="modifier.ingredient_id" class="text-xs text-text-secondary mt-1">
                          Costo: {{ formatCurrency(getIngredientById(modifier.ingredient_id)?.costo_unitario || 0) }}/{{ getIngredientById(modifier.ingredient_id)?.unit }}
                        </p>
                      </div>

                      <div class="md:col-span-1">
                        <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad</label>
                        <input
                          type="number"
                          v-model.number="modifier.ingredient_quantity"
                          placeholder="50"
                          min="0.01"
                          step="any"
                          class="input-base w-full px-3 py-2 text-sm"
                        />
                      </div>

                      <div class="md:col-span-2">
                        <label class="block text-xs font-medium text-text-secondary mb-1">Unidad</label>
                        <div class="relative">
                          <select
                            v-model="modifier.ingredient_unit"
                            :disabled="modifier.ingredient_id && loadingUnits.has(modifier.ingredient_id)"
                            class="input-base w-full py-2 pr-3 text-sm disabled:opacity-50"
                            :class="modifier.ingredient_id && loadingUnits.has(modifier.ingredient_id) ? 'pl-7' : 'pl-3'"
                          >
                            <option
                              v-for="opt in getIngredientUnitOptions(modifier.ingredient_id)"
                              :key="opt.value"
                              :value="opt.value"
                            >{{ opt.label }}</option>
                          </select>
                          <span v-if="modifier.ingredient_id && loadingUnits.has(modifier.ingredient_id)" class="absolute left-2 top-2.5 pointer-events-none text-text-secondary">
                            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                          </span>
                        </div>
                      </div>

                      <div class="md:col-span-2">
                        <label class="block text-xs font-medium text-text-secondary mb-1">Precio venta</label>
                        <div class="relative">
                          <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm">$</span>
                          <input
                            type="number"
                            v-model.number="modifier.price"
                            placeholder="0"
                            step="100"
                            class="input-base w-full pl-8 pr-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div class="md:col-span-1">
                        <label class="block text-xs font-medium text-text-secondary mb-1">Máx</label>
                        <input
                          type="number"
                          v-model.number="modifier.max_limit"
                          placeholder="1"
                          min="1"
                          class="input-base w-full px-3 py-2 text-sm"
                        />
                      </div>

                      <div class="md:col-span-1">
                        <label class="block text-xs font-medium text-text-secondary mb-1">Orden</label>
                        <input
                          type="number"
                          v-model.number="modifier.sort_order"
                          placeholder="0"
                          min="0"
                          class="input-base w-full px-3 py-2 text-sm"
                        />
                      </div>

                      <div class="md:col-span-1">
                        <label class="block text-xs font-medium text-text-secondary mb-1 invisible select-none" aria-hidden="true">&nbsp;</label>
                        <button
                          type="button"
                          @click="removeModifier(index)"
                          class="flex items-center justify-center w-full h-[38px] text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
                          title="Eliminar opción"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-4 text-sm">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          v-model="modifier.is_default"
                          class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span class="text-text-primary">Predeterminado</span>
                      </label>

                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          v-model="modifier.is_available"
                          class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span class="text-text-primary">Disponible</span>
                      </label>
                    </div>
                  </div>
                </div>
              </MenuCatalogInlineCreateBusyOverlay>
            </UiFormSection>
          </div>
        </div>

        <div class="xl:col-span-1 space-y-6">
          <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
            <h3 class="text-lg font-semibold text-text-primary mb-4">Resumen</h3>

            <div class="space-y-3">
              <div class="flex justify-between text-sm gap-2">
                <span class="text-text-secondary">Nombre:</span>
                <span class="font-semibold text-text-primary text-right truncate">{{ form.name || '—' }}</span>
              </div>

              <div class="flex justify-between text-sm items-center gap-2">
                <span class="text-text-secondary">Tipo:</span>
                <UiStatusBadge
                  :value="form.is_required ? 'Obligatorio' : 'Opcional'"
                  format="text"
                  :variant="form.is_required ? 'warning' : 'secondary'"
                  size="sm"
                />
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">Selección:</span>
                <span class="font-semibold text-text-primary">{{ form.min_qty }} – {{ form.max_qty }} opciones</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">Productos:</span>
                <span class="font-semibold text-text-primary">{{ form.product_ids.length }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">Total opciones:</span>
                <span class="font-semibold text-text-primary">{{ form.modifiers.length }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">Con ingrediente:</span>
                <span class="font-semibold text-text-primary">{{ form.modifiers.filter(m => m.ingredient_id).length }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">Con costo adicional:</span>
                <span class="font-semibold text-text-primary">{{ form.modifiers.filter(m => m.price > 0).length }}</span>
              </div>
            </div>

            <div class="mt-6 pt-6 border-t border-border space-y-3">
              <p v-if="submitError" role="alert" class="text-sm text-destructive flex items-center gap-1">
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                {{ submitError }}
              </p>
              <UiButton
                type="submit"
                variant="default"
                size="lg"
                class="w-full"
                :disabled="isSubmitting"
              >
                <Icon v-if="!isSubmitting" name="heroicons:check" class="h-5 w-5 mr-2" />
                <Icon v-else name="heroicons:arrow-path" class="h-5 w-5 mr-2 animate-spin" />
                {{ isSubmitting ? 'Creando...' : 'Crear grupo' }}
              </UiButton>

              <UiButton
                type="button"
                variant="outline"
                size="default"
                class="w-full"
                :disabled="isSubmitting"
                @click="router.push('/menu/modificadores')"
              >
                Cancelar
              </UiButton>
            </div>
          </div>
        </div>
      </form>
    </div>

    <MenuInlineCatalogCreateShell
      ref="inlineCreateShell"
      v-model:busy="inlineCatalogBusy"
      v-model:busy-label="inlineCatalogBusyLabel"
      v-model:busy-hint="inlineCatalogBusyHint"
      context="modifier"
      :on-ingredient-saved="onCustomIngredientCreated"
      :on-product-saved="onInlineProductCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Crear Modificador' })

const router = useRouter()
const { currentTenant } = useTenantReactive()

const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const nameError = ref('')

const form = ref({
  product_ids: [] as string[],
  name: '',
  min_qty: 0,
  max_qty: 1,
  is_required: false,
  sort_order: 0,
  modifiers: [] as Array<{
    name: string
    price: number
    max_limit: number
    is_default: boolean
    is_available: boolean
    sort_order: number
    ingredient_id: string | null
    ingredient_quantity: number | null
    ingredient_unit: string | null
  }>,
  tenant_id: currentTenant.value?.id || ''
})

const { data: productsData, pending: loadingProducts } = useAsyncData(
  `products-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/products', {
    query: { limit: 250 }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

const products = computed(() => productsData.value?.data || [])

const isLoadingData = computed(() => {
  return !productsData.value
})

function addModifier() {
  form.value.modifiers.push({
    name: '',
    price: 0,
    max_limit: 1,
    is_default: false,
    is_available: true,
    sort_order: form.value.modifiers.length,
    ingredient_id: null,
    ingredient_quantity: null,
    ingredient_unit: null
  })
}

const ingredientCache = ref<Record<string, any>>({})
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
const loadingUnits = ref<Set<string>>(new Set())

const { getIngredientUnitOptions: buildUnitOptions, defaultUnitForIngredient } = useIngredientUnitOptions()

function getIngredientUnitOptions(ingredientId: string | null) {
  return buildUnitOptions(ingredientId || '', {
    ingredientCache: ingredientCache.value,
    purchaseUnitsCache: purchaseUnitsCache.value,
  })
}

function getIngredientById(id: string) {
  return ingredientCache.value[id]
}

async function loadPurchaseUnits(ingredientId: string) {
  if (!ingredientId || purchaseUnitsCache.value.has(ingredientId)) return
  loadingUnits.value = new Set([...loadingUnits.value, ingredientId])
  try {
    const res = await $fetch<any>(`/api/suppliers/ingredient-purchase-units/ingredient/${ingredientId}`)
    const updated = new Map(purchaseUnitsCache.value)
    updated.set(ingredientId, res.data || [])
    purchaseUnitsCache.value = updated
  } catch {
    const updated = new Map(purchaseUnitsCache.value)
    updated.set(ingredientId, [])
    purchaseUnitsCache.value = updated
  } finally {
    const next = new Set(loadingUnits.value)
    next.delete(ingredientId)
    loadingUnits.value = next
  }
}

function selectIngredient(modifier: any, ing: any) {
  modifier.ingredient_id = ing.id
  modifier.name = ing.name
  ingredientCache.value[ing.id] = ing
  modifier.ingredient_unit = defaultUnitForIngredient(ingredientCache.value[ing.id])
  loadPurchaseUnits(ing.id)
}

const inlineCreateShell = ref<{ openFromSearch: (name: string) => void } | null>(null)
const customIngModalModIndex = ref(-1)
const inlineCatalogBusy = ref(false)
const inlineCatalogBusyLabel = ref('')
const inlineCatalogBusyHint = ref('')

function openCustomIngModal(name: string, index: number) {
  customIngModalModIndex.value = index
  inlineCreateShell.value?.openFromSearch(name)
}

function onCustomIngredientCreated(ingredient: any) {
  const index = customIngModalModIndex.value
  if (index < 0 || index >= form.value.modifiers.length) return
  selectIngredient(form.value.modifiers[index], ingredient)
  customIngModalModIndex.value = -1
}

const { linkCreatedProductToRow } = useInlineCatalogProductLink()

async function onInlineProductCreated(product: Record<string, unknown>) {
  const index = customIngModalModIndex.value
  if (index < 0 || index >= form.value.modifiers.length) return
  await linkCreatedProductToRow(product, async (ingredient) => {
    selectIngredient(form.value.modifiers[index], ingredient)
    customIngModalModIndex.value = -1
  })
}

function removeModifier(index: number) {
  form.value.modifiers.splice(index, 1)
}

async function validateForm(): Promise<boolean> {
  submitError.value = null
  nameError.value = ''

  if (form.value.product_ids.length === 0) {
    submitError.value = 'Selecciona al menos un producto.'
    return false
  }

  if (!form.value.name.trim()) {
    nameError.value = 'El nombre es obligatorio.'
    return false
  }

  if (form.value.max_qty < form.value.min_qty) {
    submitError.value = 'La selección máxima debe ser mayor o igual a la mínima.'
    return false
  }

  const res = await $fetch<{ available: boolean }>(
    `/api/menu/check-name?entity=modifier-groups&name=${encodeURIComponent(form.value.name.trim())}`,
  )
  if (!res.available) {
    nameError.value = 'Ya existe un grupo de modificadores con ese nombre.'
    return false
  }

  if (form.value.modifiers.length === 0) {
    submitError.value = 'Agrega al menos un modificador al grupo.'
    return false
  }

  const invalidModifiers = form.value.modifiers.some(m => !m.ingredient_id || !m.name)
  if (invalidModifiers) {
    submitError.value = 'Completa todos los modificadores con ingrediente o reventa.'
    return false
  }

  return true
}

async function submitGroup() {
  if (isSubmitting.value) return
  if (!(await validateForm())) return

  isSubmitting.value = true
  submitError.value = null

  try {
    form.value.tenant_id = currentTenant.value?.id || ''

    await $fetch('/api/menu/modifier-groups', {
      method: 'POST',
      body: form.value
    })

    // clearNuxtData()
    await router.push('/menu/modificadores')
  } catch (error: any) {
    console.error('Error creating modifier group:', error)
    submitError.value = error.data?.detail || error.message || 'Error al crear el grupo. Por favor intenta de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}

function formatCurrency(value: number) {
  if (!value && value !== 0) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}
</script>

<style scoped>
.input-base {
  @apply border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-surface;
}
</style>
