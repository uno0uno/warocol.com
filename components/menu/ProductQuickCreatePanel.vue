<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-40 bg-black/40" @click="close" aria-hidden="true" />
    </Transition>

    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        aria-label="Crear producto de venta directa"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">Nuevo producto</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  Se vende por pieza; el insumo de stock se crea automáticamente.
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="flex flex-col gap-1.5">
            <label for="product-quick-name" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-destructive">*</span>
            </label>
            <input
              id="product-quick-name"
              v-model="form.name"
              type="text"
              placeholder="Ej: Gaseosa 400 ml"
              :class="inputClass"
              @input="clearError('name')"
            />
            <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">
              Categoría del menú <span class="text-destructive">*</span>
            </label>
            <UiCategorySearchInput
              :allow-create="true"
              :initial-value="selectedCategoryName"
              placeholder="Buscar o crear categoría..."
              @select="onCategorySelected"
              @create="onCategoryCreateRequested"
            />
            <p v-if="errors.category_id" class="text-xs text-destructive">{{ errors.category_id }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="product-quick-price" class="text-sm font-medium text-text-primary">
              Precio de venta <span class="text-destructive">*</span>
            </label>
            <div class="relative">
              <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
              <UiDecimalInput
                id="product-quick-price"
                v-model="form.price"
                :min="0"
                :precision="0"
                placeholder="2500"
                class="h-10 w-full rounded-lg border-2 border-border bg-background ps-8 pe-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                @input="clearError('price')"
              />
            </div>
            <p v-if="errors.price" class="text-xs text-destructive">{{ errors.price }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="product-quick-costo" class="text-sm font-medium text-text-primary">
              Mi costo del plato
            </label>
            <div class="relative">
              <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
              <UiDecimalInput
                id="product-quick-costo"
                v-model="form.costo_percibido"
                :min="0"
                :precision="0"
                placeholder="Opcional"
                class="h-10 w-full rounded-lg border-2 border-border bg-background ps-8 pe-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
            <p class="text-xs text-text-tertiary">
              Costo operativo que tú defines; también se usa al crear el insumo de stock.
            </p>
          </div>

          <label class="flex items-center gap-3 cursor-pointer">
            <input
              v-model="form.is_available"
              type="checkbox"
              class="w-5 h-5 text-primary border-border rounded focus:ring-primary"
            />
            <span class="text-sm font-medium text-text-primary">Disponible para venta</span>
          </label>

          <MenuProductResaleCreateForm
            v-model:unit-weight-gr="unitWeightGr"
            v-model:unit-weight-unit="unitWeightUnit"
            v-model:draft-units="resalePurchaseUnits"
            :show-error="resaleWeightError"
            @clear-error="resaleWeightError = false"
          />

          <p v-if="errors.general" class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {{ errors.general }}
          </p>
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-t border-border px-6 py-4 flex gap-2">
          <button
            v-if="showBackToChooser"
            type="button"
            aria-label="Volver al selector de tipo"
            class="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            @click="emit('back-to-chooser')"
          >
            Atrás
          </button>
          <button
            type="button"
            class="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            @click="close"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="saving"
            class="flex-1 h-11 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-primary/30"
            @click="submit"
          >
            <span v-if="saving">Creando...</span>
            <span v-else>Crear producto</span>
          </button>
        </div>
      </div>
    </Transition>

    <CategoriasCategoriaPanel
      v-model="showNewCategoryModal"
      :initial-name="newCategoryName"
      @saved="onCategoryCreated"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useTenantReactive } from '@/composables/useTenantReactive'
import {
  defaultUndPurchaseUnitsDraft,
  syncResalePurchaseUnitsDraft,
  type DraftPurchaseUnit,
} from '@/composables/useIngredientPurchaseUnitsDraft'
import { resolveResaleIngredientId } from '@/composables/useResaleLinkedIngredient'

interface Props {
  modelValue: boolean
  initialName?: string
  showBackToChooser?: boolean
}

interface Emits {
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved', product: Record<string, unknown>): void
  (e: 'busy-change', busy: boolean): void
  (e: 'back-to-chooser'): void
}

const props = withDefaults(defineProps<Props>(), {
  initialName: '',
  showBackToChooser: false,
})
const emit = defineEmits<Emits>()

const cache = useQueryCache()
const toast = useToast()
const { currentTenant } = useTenantReactive()

const inputClass = 'h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const saving = ref(false)
watch(saving, value => emit('busy-change', value))
const errors = ref<Record<string, string>>({})
const resaleWeightError = ref(false)
const unitWeightGr = ref<number | null>(null)
const unitWeightUnit = ref<'gr' | 'ml'>('ml')
const resalePurchaseUnits = ref<DraftPurchaseUnit[]>(defaultUndPurchaseUnitsDraft())

const selectedCategoryName = ref('')
const showNewCategoryModal = ref(false)
const newCategoryName = ref('')

const form = ref({
  name: '',
  category_id: '',
  price: 0,
  costo_percibido: null as number | null,
  is_available: true,
})

function resetForm() {
  form.value = {
    name: props.initialName.trim(),
    category_id: '',
    price: 0,
    costo_percibido: null,
    is_available: true,
  }
  selectedCategoryName.value = ''
  unitWeightGr.value = null
  unitWeightUnit.value = 'ml'
  resalePurchaseUnits.value = defaultUndPurchaseUnitsDraft()
  errors.value = {}
  resaleWeightError.value = false
}

watch(() => props.modelValue, (open) => {
  if (open) resetForm()
})

watch(() => props.initialName, (name) => {
  if (props.modelValue && !form.value.name.trim()) {
    form.value.name = name.trim()
  }
})

function onCategorySelected(cat: { id: string; name: string }) {
  form.value.category_id = cat.id
  selectedCategoryName.value = cat.name
  clearError('category_id')
}

function onCategoryCreateRequested(typedName: string) {
  newCategoryName.value = typedName
  showNewCategoryModal.value = true
}

function onCategoryCreated(cat: { id: string; name: string }) {
  form.value.category_id = cat.id
  selectedCategoryName.value = cat.name
  clearError('category_id')
}

function clearError(field: string) {
  delete errors.value[field]
}

function validate() {
  const e: Record<string, string> = {}
  const name = form.value.name.trim()
  if (!name) e.name = 'El nombre es obligatorio'
  if (!form.value.category_id) e.category_id = 'Selecciona una categoría del menú'
  if (!Number.isFinite(form.value.price) || form.value.price <= 0) {
    e.price = 'Indica un precio mayor que 0'
  }
  const weight = Number(unitWeightGr.value)
  if (!Number.isFinite(weight) || weight <= 0) {
    resaleWeightError.value = true
    e.general = 'Indica cuántos gr o ml equivale cada unidad vendida.'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  if (!validate()) return

  saving.value = true
  errors.value = {}

  try {
    const name = form.value.name.trim()
    const nameCheck = await $fetch<{ available: boolean }>(
      `/api/menu/check-name?entity=products&name=${encodeURIComponent(name)}`,
    )
    if (!nameCheck.available) {
      errors.value.name = 'Ya existe un producto con ese nombre.'
      saving.value = false
      return
    }

    const weight = Number(unitWeightGr.value)
    const payload = {
      name,
      description: '',
      image_url: null,
      price: form.value.price,
      category_id: form.value.category_id,
      preparation_time: 0,
      is_available: form.value.is_available,
      is_available_online: form.value.is_available,
      is_available_table_qr: form.value.is_available,
      allow_modifiers: false,
      tax_category: 'standard' as const,
      costo_percibido: form.value.costo_percibido ?? null,
      tenant_id: currentTenant.value?.id || '',
      is_resale: true,
      auto_resale_ingredient: true,
      resale_unit_weight_gr: weight,
      resale_unit_weight_unit: unitWeightUnit.value,
      ingredients: [],
      recipe_bases: [],
      recipe_base_ids: [],
    }

    const res = await $fetch<any>('/api/menu/products', {
      method: 'POST',
      body: payload,
    })

    const productData = (res?.data ?? res) as Record<string, unknown>

    const ingredientId = await resolveResaleIngredientId(productData)
    if (ingredientId) {
      await syncResalePurchaseUnitsDraft(ingredientId, resalePurchaseUnits.value)
    }

    cache.invalidateQueries({ key: ['menu-ingredients', currentTenant.value?.id ?? 'default'] })
    cache.invalidateQueries()
    toast.success('Producto creado')
    emit('saved', {
      ...productData,
      resale_unit_weight_gr: productData.resale_unit_weight_gr ?? weight,
      resale_unit_weight_unit: productData.resale_unit_weight_unit ?? unitWeightUnit.value,
    })
    close()
  } catch (err: any) {
    const detail = err?.data?.detail ?? err?.message ?? 'Error al crear el producto'
    if (typeof detail === 'string' && (detail.toLowerCase().includes('already exists') || detail.toLowerCase().includes('ya existe'))) {
      errors.value.name = 'Ya existe un producto con ese nombre'
    } else {
      errors.value.general = typeof detail === 'string' ? detail : 'Error al crear el producto'
    }
  } finally {
    saving.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
