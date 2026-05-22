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
      <div
        v-if="modelValue"
        class="fixed inset-0 z-40 bg-black/40"
        @click="close"
        aria-hidden="true"
      />
    </Transition>

    <!-- Panel: bottom sheet on mobile, slide-over on desktop -->
    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="isEdit ? `Editar categoría: ${category?.name}` : 'Crear categoría'"
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
                <TagIcon class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ isEdit ? 'Editar categoría' : 'Nueva categoría' }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ isEdit ? category?.name : 'Agrupa productos para tu menú y comandas' }}
                </p>
              </div>
            </div>
            <button
              @click="close"
              type="button"
              aria-label="Cerrar panel"
              :disabled="saving"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-colors"
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
            <label :for="nameId" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-destructive">*</span>
            </label>
            <input
              :id="nameId"
              ref="nameInput"
              v-model="form.name"
              type="text"
              maxlength="100"
              placeholder="Ej: Entradas, Bebidas, Postres..."
              :class="inputClass"
              @input="clearError('name')"
              @keydown.enter.prevent="submit"
            />
            <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
          </div>

          <!-- Descripción -->
          <div class="flex flex-col gap-1.5">
            <label :for="descId" class="text-sm font-medium text-text-primary">
              Descripción
              <span class="text-xs text-text-secondary font-normal">(opcional)</span>
            </label>
            <textarea
              :id="descId"
              v-model="form.description"
              rows="3"
              maxlength="500"
              placeholder="Texto interno para identificar la categoría"
              class="input-base w-full px-4 py-2 resize-none"
            />
          </div>

          <!-- General error -->
          <p v-if="errors.general" class="text-sm text-destructive">{{ errors.general }}</p>
        </div>

        <!-- Sticky footer -->
        <div class="flex-shrink-0 border-t border-border bg-surface px-6 py-4">
          <div class="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              :disabled="saving"
              class="flex-1 min-h-[44px] py-3 px-4 border-2 border-border rounded-lg text-text-primary font-medium hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="saving || !form.name.trim()"
              class="flex-1 min-h-[44px] py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2"
              @click="submit"
            >
              <UiLoadingDots v-if="saving" size="8px" color="currentColor" />
              <span>{{ saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear categoría') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { TagIcon } from '@heroicons/vue/24/outline'

interface Category {
  id: string
  name: string
  description: string | null
  tenant_id: string | null
}

interface Props {
  modelValue: boolean
  category?: Category | null
}

const props = withDefaults(defineProps<Props>(), {
  category: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', category: Category): void
}>()

const toast = useToast()
const isEdit = computed(() => !!props.category)

const uid = useId()
const nameId = `cat-panel-name-${uid}`
const descId = `cat-panel-desc-${uid}`

const inputClass = 'input-base w-full px-4 py-2'

const form = ref<{ name: string; description: string }>({
  name: '',
  description: '',
})

const saving = ref(false)
const errors = ref<Record<string, string>>({})

const nameInput = ref<HTMLInputElement | null>(null)

const clearError = (field: string) => {
  delete errors.value[field]
  delete errors.value.general
}

const resetForm = () => {
  form.value = {
    name: props.category?.name ?? '',
    description: props.category?.description ?? '',
  }
  errors.value = {}
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    resetForm()
    await nextTick()
    nameInput.value?.focus()
  },
)

watch(
  () => props.category,
  () => {
    if (props.modelValue) resetForm()
  },
)

const close = () => {
  if (saving.value) return
  emit('update:modelValue', false)
}

const submit = async () => {
  const name = form.value.name.trim()
  if (!name) {
    errors.value = { name: 'El nombre es obligatorio' }
    return
  }

  saving.value = true
  errors.value = {}
  try {
    const description = form.value.description.trim() || null
    const payload: Record<string, unknown> = { name }
    if (description !== null || isEdit.value) payload.description = description

    const response = isEdit.value
      ? await $fetch<{ success: boolean; data: Category }>(
          `/api/menu/categories/${props.category!.id}`,
          { method: 'PUT', body: payload },
        )
      : await $fetch<{ success: boolean; data: Category }>(
          '/api/menu/categories',
          { method: 'POST', body: payload },
        )

    emit('saved', response.data)
    toast.success(
      isEdit.value ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente',
      { title: 'Guardado' },
    )
    if (!isEdit.value) {
      emit('update:modelValue', false)
    }
  } catch (err: any) {
    if (err?.status === 409) {
      const detail = err?.data?.detail
      errors.value = {
        name: typeof detail === 'string' ? detail : 'Ya existe una categoría con ese nombre',
      }
    } else {
      errors.value = {
        general: err?.data?.detail || 'No se pudo guardar la categoría. Inténtalo de nuevo.',
      }
    }
  } finally {
    saving.value = false
  }
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
