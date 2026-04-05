<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="close"
  >
    <div class="bg-surface rounded-xl max-w-md w-full shadow-xl">
      <!-- Header -->
      <div class="p-6 border-b border-border flex items-center justify-between">
        <h3 class="text-lg font-semibold text-text-primary">Nuevo ingrediente personalizado</h3>
        <button
          @click="close"
          :disabled="isSaving"
          aria-label="Cerrar modal"
          class="p-2 rounded-md hover:bg-surface-secondary transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5">
        <!-- Nombre -->
        <div>
          <label for="cci-name" class="block text-sm font-medium text-text-primary mb-2">
            Nombre <span class="text-destructive">*</span>
          </label>
          <input
            id="cci-name"
            v-model="form.name"
            type="text"
            required
            class="input-base w-full px-4 py-2"
            placeholder="Ej: Carne Angus especial"
          />
        </div>

        <!-- Unidad -->
        <div>
          <label for="cci-unit" class="block text-sm font-medium text-text-primary mb-2">
            Unidad <span class="text-destructive">*</span>
          </label>
          <select
            id="cci-unit"
            v-model="form.unit"
            required
            class="input-base w-full px-4 py-2"
          >
            <option value="" disabled>Selecciona una unidad</option>
            <option value="gr">gr — gramos</option>
            <option value="kg">kg — kilogramos</option>
            <option value="ml">ml — mililitros</option>
            <option value="lt">lt — litros</option>
            <option value="und">und — unidades</option>
          </select>
        </div>

        <!-- Categoría (opcional) -->
        <div>
          <label for="cci-category" class="block text-sm font-medium text-text-primary mb-2">
            Categoría <span class="text-xs text-text-secondary font-normal">(opcional)</span>
          </label>
          <input
            id="cci-category"
            v-model="form.category"
            type="text"
            class="input-base w-full px-4 py-2"
            placeholder="Ej: Carnes, Lácteos..."
          />
        </div>

        <!-- Costo unitario (opcional) -->
        <div>
          <label for="cci-cost" class="block text-sm font-medium text-text-primary mb-2">
            Costo unitario <span class="text-xs text-text-secondary font-normal">(opcional)</span>
          </label>
          <input
            id="cci-cost"
            v-model.number="form.costo_unitario"
            type="number"
            min="0"
            step="any"
            class="input-base w-full px-4 py-2"
            placeholder="0"
          />
        </div>

        <!-- Basado en (ingrediente global, opcional) -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-2">
            Basado en <span class="text-xs text-text-secondary font-normal">(opcional — ingrediente del catálogo global)</span>
          </label>
          <UiIngredientSearchInput
            :initial-value="''"
            placeholder="Buscar ingrediente base..."
            :base-only="true"
            @select="onParentSelected"
          />
          <p v-if="form.parentName" class="mt-1.5 text-xs text-success flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Basado en: <strong class="ml-0.5">{{ form.parentName }}</strong>
          </p>
          <button
            v-if="form.parentId"
            type="button"
            @click="clearParent"
            class="mt-1 text-xs text-text-secondary hover:text-destructive transition-colors"
          >
            Quitar base
          </button>
        </div>

        <!-- API error -->
        <div v-if="apiError" class="flex items-center gap-2 text-destructive text-sm">
          <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ apiError }}</span>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="close"
            :disabled="isSaving"
            class="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-secondary transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleSave"
            :disabled="isSaving || !form.name.trim() || !form.unit"
            class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity min-h-[44px] flex items-center gap-2"
          >
            <CommonsTheCustomLoader v-if="isSaving" size="small" />
            <span>{{ isSaving ? 'Guardando...' : 'Crear ingrediente' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  initialName?: string
}

interface Emits {
  (e: 'update:modelValue', v: boolean): void
  (e: 'created', ingredient: any): void
}

const props = withDefaults(defineProps<Props>(), {
  initialName: ''
})

const emit = defineEmits<Emits>()

const form = ref({
  name: '',
  unit: '',
  category: '',
  costo_unitario: null as number | null,
  parentId: null as string | null,
  parentName: null as string | null,
})
const isSaving = ref(false)
const apiError = ref('')

watch(() => props.modelValue, (open) => {
  if (open) {
    form.value = {
      name: props.initialName || '',
      unit: '',
      category: '',
      costo_unitario: null,
      parentId: null,
      parentName: null,
    }
    apiError.value = ''
  }
})

function onParentSelected(ingredient: any) {
  form.value.parentId = ingredient.id
  form.value.parentName = ingredient.name
}

function clearParent() {
  form.value.parentId = null
  form.value.parentName = null
}

async function handleSave() {
  if (!form.value.name.trim() || !form.value.unit) return
  isSaving.value = true
  apiError.value = ''

  try {
    const body: Record<string, any> = {
      name: form.value.name.trim(),
      unit: form.value.unit,
    }
    if (form.value.category?.trim()) body.category = form.value.category.trim()
    if (form.value.costo_unitario !== null && form.value.costo_unitario >= 0) {
      body.costo_unitario = form.value.costo_unitario
    }
    if (form.value.parentId) body.parent_id = form.value.parentId

    const res = await $fetch<any>('/api/suppliers/ingredients', {
      method: 'POST',
      body,
    })

    emit('created', res.data)
    emit('update:modelValue', false)
  } catch (err: any) {
    const status = err?.status || err?.statusCode
    if (status === 409) {
      apiError.value = `Ya existe un ingrediente con el nombre "${form.value.name.trim()}" en tu restaurante.`
    } else {
      apiError.value = err?.data?.detail || 'Error al crear el ingrediente.'
    }
  } finally {
    isSaving.value = false
  }
}

function close() {
  if (isSaving.value) return
  emit('update:modelValue', false)
}
</script>
