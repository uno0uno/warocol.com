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
        class="fixed inset-0 z-40 bg-foreground/40"
        @click="close"
        aria-hidden="true"
      />
    </Transition>

    <!-- Panel: bottom sheet en mobile, slide-over en desktop -->
    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        aria-label="Crear nueva categoría"
        @keydown.esc="close"
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
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">Nueva categoría</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  Solo será visible para tu restaurante
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

        <!-- Body -->
        <form @submit.prevent="submit" class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="flex flex-col gap-1.5">
            <label for="cat-name" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="cat-name"
              ref="nameInputRef"
              v-model="name"
              type="text"
              required
              maxlength="100"
              placeholder="Ej: Bebidas, Postres, Combos"
              class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
              autocomplete="off"
              :disabled="loading"
            />
            <p class="text-xs text-text-tertiary">
              {{ name.length }} / 100 caracteres
            </p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="cat-description" class="text-sm font-medium text-text-primary">
              Descripción <span class="text-text-tertiary text-xs font-normal">(opcional)</span>
            </label>
            <textarea
              id="cat-description"
              v-model="description"
              rows="3"
              maxlength="500"
              placeholder="Para qué se usa esta categoría"
              class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface resize-y"
              :disabled="loading"
            />
          </div>

          <p
            v-if="errorMsg"
            role="alert"
            class="flex items-start gap-2 text-sm text-destructive"
          >
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
            <span>{{ errorMsg }}</span>
          </p>
        </form>

        <!-- Footer -->
        <div class="flex-shrink-0 border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="close"
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="submit"
            :disabled="loading || !name.trim()"
            class="min-h-[44px] px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors flex items-center gap-2"
          >
            <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            {{ loading ? 'Creando…' : 'Crear categoría' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useTenantReactive } from '~/composables/useTenantReactive'
import type { CategoryRow } from '~/composables/useCategorySearch'

interface Props {
  modelValue: boolean
  initialName?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', category: CategoryRow): void
}

const props = withDefaults(defineProps<Props>(), {
  initialName: '',
})

const emit = defineEmits<Emits>()

const cache = useQueryCache()
const { currentTenant } = useTenantReactive()

const name = ref(props.initialName)
const description = ref('')
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)

// Reset state every time the panel opens; pre-fill name from parent.
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      name.value = props.initialName
      description.value = ''
      errorMsg.value = null
      loading.value = false
      await nextTick()
      nameInputRef.value?.focus()
    }
  },
)

function close() {
  if (loading.value) return
  emit('update:modelValue', false)
}

async function submit() {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    errorMsg.value = 'El nombre es obligatorio'
    return
  }
  if (trimmedName.length > 100) {
    errorMsg.value = 'El nombre no puede tener más de 100 caracteres'
    return
  }

  loading.value = true
  errorMsg.value = null
  try {
    const res = await $fetch<{ success: boolean; data: CategoryRow }>(
      '/api/menu/categories',
      {
        method: 'POST',
        body: {
          name: trimmedName,
          description: description.value.trim() || null,
        },
      },
    )
    // Invalidate the listing cache so any other place that consumes it refreshes.
    cache.invalidateQueries({ key: ['categories', currentTenant.value?.id] })
    emit('saved', res.data)
    emit('update:modelValue', false)
  } catch (e: any) {
    if (e?.response?.status === 409 || e?.statusCode === 409) {
      errorMsg.value = 'Ya existe una categoría con ese nombre'
    } else {
      errorMsg.value = e?.data?.detail || e?.message || 'Error al crear la categoría'
    }
  } finally {
    loading.value = false
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
