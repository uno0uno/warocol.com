<template>
  <Teleport to="body">
    <!-- Backdrop -->
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

    <!-- Panel: bottom sheet en mobile, slide-over en desktop -->
    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="isEdit ? `Editar ingrediente: ${ingredient?.name}` : 'Crear ingrediente personalizado'"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ isEdit ? 'Editar ingrediente' : 'Nuevo ingrediente' }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ isEdit ? ingredient?.name : 'Ingrediente personalizado de tu restaurante' }}
                </p>
              </div>
            </div>
            <button
              @click="close"
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <!-- Nombre -->
          <div class="flex flex-col gap-1.5">
            <label for="ing-name" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-destructive">*</span>
            </label>
            <input
              id="ing-name"
              v-model="form.name"
              type="text"
              placeholder="Ej: Carne Angus especial"
              :class="inputClass"
              @input="clearError('name')"
            />
            <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
          </div>

          <!-- Unidad -->
          <div class="flex flex-col gap-1.5">
            <label for="ing-unit" class="text-sm font-medium text-text-primary">
              Unidad <span class="text-destructive">*</span>
            </label>
            <select
              id="ing-unit"
              v-model="form.unit"
              :class="inputClass"
              @change="clearError('unit')"
            >
              <option value="">Seleccionar unidad</option>
              <option value="gr">gr — gramos</option>
              <option value="kg">kg — kilogramos</option>
              <option value="ml">ml — mililitros</option>
              <option value="lt">lt — litros</option>
              <option value="und">und — unidades</option>
            </select>
            <p v-if="errors.unit" class="text-xs text-destructive">{{ errors.unit }}</p>
          </div>

          <!-- Categoría -->
          <div class="flex flex-col gap-1.5">
            <label for="ing-category" class="text-sm font-medium text-text-primary">
              Categoría <span class="text-xs font-normal text-text-tertiary ml-1">(opcional)</span>
            </label>
            <input
              id="ing-category"
              v-model="form.category"
              type="text"
              placeholder="Ej: Carnes, Salsas, Lácteos..."
              :class="inputClass"
            />
          </div>

          <!-- Costo unitario -->
          <div class="flex flex-col gap-1.5">
            <label for="ing-cost" class="text-sm font-medium text-text-primary">
              Costo unitario <span class="text-xs font-normal text-text-tertiary ml-1">(opcional)</span>
            </label>
            <input
              id="ing-cost"
              v-model.number="form.costo_unitario"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              :class="inputClass"
            />
          </div>

          <!-- Basado en (ingrediente global) -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">
              Basado en <span class="text-xs font-normal text-text-tertiary ml-1">(opcional)</span>
            </label>
            <p class="text-xs text-text-tertiary -mt-1">Ingrediente del catálogo global en que se basa este ingrediente</p>
            <UiIngredientSearchInput
              :base-only="true"
              :initial-value="form.parentName"
              placeholder="Buscar ingrediente base..."
              @select="onParentSelect"
              @clear="onParentClear"
            />
          </div>

          <!-- Error general -->
          <p v-if="errors.general" class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {{ errors.general }}
          </p>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-t border-border px-6 py-4 flex gap-3">
          <button
            type="button"
            @click="close"
            class="h-11 px-5 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="submit"
            :disabled="saving"
            class="flex-1 h-11 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-primary/30"
          >
            <span v-if="saving">Guardando...</span>
            <span v-else>{{ isEdit ? 'Guardar cambios' : 'Crear ingrediente' }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: boolean
  ingredient?: any  // null/undefined = create mode, object = edit mode
}

interface Emits {
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved', ingredient: any): void
}

const props = withDefaults(defineProps<Props>(), { ingredient: null })
const emit = defineEmits<Emits>()

const isEdit = computed(() => !!props.ingredient)

const inputClass = 'h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const form = ref({ name: '', unit: '', category: '', costo_unitario: null as number | null, parentId: null as string | null, parentName: '' })
const errors = ref<Record<string, string>>({})
const saving = ref(false)

// Populate form when ingredient changes (edit mode)
watch(() => props.ingredient, (ing) => {
  if (ing) {
    form.value = {
      name: ing.name ?? '',
      unit: ing.unit ?? '',
      category: ing.category ?? '',
      costo_unitario: ing.price ?? null,
      parentId: null,   // parent_id not returned by list endpoint — only parent_name
      parentName: ing.parent_name ?? '',
    }
  } else {
    form.value = { name: '', unit: '', category: '', costo_unitario: null, parentId: null, parentName: '' }
  }
  errors.value = {}
}, { immediate: true })

// Also reset when panel opens fresh
watch(() => props.modelValue, (open) => {
  if (open && !props.ingredient) {
    form.value = { name: '', unit: '', category: '', costo_unitario: null, parentId: null, parentName: '' }
    errors.value = {}
  }
})

const onParentSelect = (ing: any) => {
  form.value.parentId = ing.id
  form.value.parentName = ing.name
}

const onParentClear = () => {
  form.value.parentId = ''   // empty string = clear in backend
  form.value.parentName = ''
}

const clearError = (field: string) => {
  delete errors.value[field]
}

function validate() {
  const e: Record<string, string> = {}
  if (!form.value.name.trim()) e.name = 'El nombre es obligatorio'
  if (!form.value.unit) e.unit = 'La unidad es obligatoria'
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  if (!validate()) return
  saving.value = true
  errors.value = {}

  try {
    const body: Record<string, any> = {
      name: form.value.name.trim(),
      unit: form.value.unit,
      category: form.value.category || null,
      costo_unitario: form.value.costo_unitario ?? null,
    }
    if (form.value.parentId !== null) body.parent_id = form.value.parentId

    let result: any
    if (isEdit.value) {
      result = await $fetch(`/api/suppliers/ingredients/${props.ingredient.id}`, { method: 'PATCH', body })
    } else {
      result = await $fetch('/api/suppliers/ingredients', { method: 'POST', body })
    }

    emit('saved', result.data)
    close()
  } catch (err: any) {
    const detail = err?.data?.detail ?? err?.message ?? 'Error al guardar'
    if (detail.toLowerCase().includes('already exists') || detail.toLowerCase().includes('ya existe')) {
      errors.value.name = 'Ya existe un ingrediente con ese nombre'
    } else {
      errors.value.general = detail
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
