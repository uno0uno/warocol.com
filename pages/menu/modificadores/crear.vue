<template>
  <div>
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Creando grupo de modificadores..."
      hint="Estamos guardando la configuración y opciones del grupo."
      variant="glass"
      indicator="matrix"
    />

    <div class="space-y-6">
      <form @submit.prevent="submitGroup" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
        <div class="xl:col-span-2 space-y-6">
          <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
            <UiFormSection title="Datos del grupo">
              <div class="space-y-4">
                <div>
                  <label :for="productSearchInputId" class="block text-sm font-medium text-text-primary mb-1">
                    Productos *
                  </label>
                  <UiProductMultiSelect
                    v-model="selectedProducts"
                    :input-id="productSearchInputId"
                  />
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
                  <MenuModifierOptionEditor
                    v-for="(modifier, index) in form.modifiers"
                    :key="index"
                    :modifier="modifier"
                    :index="index"
                    :recipe-bases="recipeBases"
                    :loading-units="loadingUnits"
                    :get-ingredient-unit-options="getIngredientUnitOptions"
                    :get-ingredient-by-id="getIngredientById"
                    @remove="removeModifier(index)"
                    @select-ingredient="(ing) => selectIngredient(modifier, ing)"
                    @create-ingredient="(name) => openCustomIngModal(name, index)"
                  />
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
                <span class="font-semibold text-text-primary">{{ selectedProducts.length }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">Total opciones:</span>
                <span class="font-semibold text-text-primary">{{ form.modifiers.length }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">Con composición:</span>
                <span class="font-semibold text-text-primary">{{ form.modifiers.filter(m => m.option_type !== 'NONE').length }}</span>
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
import { ref, computed, watch } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import {
  createEmptyModifier,
  serializeModifierForApi,
  validateModifierOption,
  type ModifierFormRow,
} from '~/composables/useModifierOptionForm'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Crear Modificador' })

const router = useRouter()
const { currentTenant } = useTenantReactive()

const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const nameError = ref('')
const productSearchInputId = 'modifier-create-product-search'
const selectedProducts = ref<{ id: string; name: string }[]>([])

const form = ref({
  product_ids: [] as string[],
  name: '',
  min_qty: 0,
  max_qty: 1,
  is_required: false,
  sort_order: 0,
  modifiers: [] as ModifierFormRow[],
  tenant_id: currentTenant.value?.id || ''
})

const { data: recipeBasesData } = useAsyncData(
  `recipe-bases-modifiers-create-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/recipe-bases', {
    query: { limit: 250, is_active: true, include_ingredients: true },
  }),
  { server: false, watch: [currentTenant], default: () => ({ data: [] }) },
)

const recipeBases = computed(() => recipeBasesData.value?.data || [])

watch(selectedProducts, (list) => {
  form.value.product_ids = list.map((p) => p.id)
}, { deep: true })

function addModifier() {
  form.value.modifiers.push(createEmptyModifier(form.value.modifiers.length))
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

function selectIngredient(modifier: ModifierFormRow, ing: any) {
  modifier.option_type = 'INGREDIENT'
  modifier.ingredient_id = ing.id
  modifier.ingredient_name = ing.name
  modifier.name = ing.name
  modifier.unit_cost = null
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

  if (selectedProducts.value.length === 0) {
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

  for (const m of form.value.modifiers) {
    const err = validateModifierOption(m)
    if (err) {
      submitError.value = err
      return false
    }
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
      body: {
        ...form.value,
        modifiers: form.value.modifiers.map(serializeModifierForApi),
      }
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

</script>

<style scoped>
.input-base {
  @apply border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-surface;
}
</style>
