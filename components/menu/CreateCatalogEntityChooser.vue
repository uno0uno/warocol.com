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
      <div
        v-if="modelValue && showChooserUi"
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="onCancel"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="modelValue && showChooserUi"
        role="dialog"
        aria-modal="true"
        aria-label="Elegir tipo de ítem a crear"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  Crear nuevo
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  <template v-if="initialName.trim()">
                    “{{ initialName.trim() }}” no está en tu catálogo
                  </template>
                  <template v-else>
                    Elige si es un insumo o un producto de menú
                  </template>
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              class="flex-shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
              @click="onCancel"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p class="text-sm text-text-secondary">
            ¿Qué quieres crear?
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Tipo de ítem">
            <button
              type="button"
              :class="optionCardClass('supply')"
              :aria-pressed="selectedIntent === 'supply'"
              @click="selectAndConfirm('supply')"
            >
              <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span class="text-sm font-bold tracking-wide">Insumo</span>
              <span :class="optionDescClass('supply')">
                Recetas y compras · gr, ml, und
              </span>
            </button>

            <button
              type="button"
              :class="optionCardClass('menu-product')"
              :aria-pressed="selectedIntent === 'menu-product'"
              @click="selectAndConfirm('menu-product')"
            >
              <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span class="text-sm font-bold tracking-wide">Producto</span>
              <span :class="optionDescClass('menu-product')">
                Menú y POS · precio, categoría
              </span>
            </button>
          </div>
        </div>

        <div class="flex-shrink-0 border-t border-border bg-surface px-6 py-4">
          <div class="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              class="flex-1 min-h-[44px] py-3 px-4 border-2 border-border rounded-lg text-text-primary font-medium hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-95 transition-all"
              @click="onCancel"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="!selectedIntent"
              class="flex-1 min-h-[44px] py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-all"
              @click="confirmSelection"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  resolveCreationIntent,
  shouldShowCreationChooser,
  type CatalogCreationContext,
  type CatalogCreationIntent,
} from '@/composables/useCatalogEntityCreation'

interface Props {
  modelValue: boolean
  context: CatalogCreationContext
  initialName?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialName: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'intent', value: CatalogCreationIntent): void
  (e: 'cancel'): void
}>()

const selectedIntent = ref<CatalogCreationIntent | null>(null)
const showChooserUi = computed(() => shouldShowCreationChooser(props.context))

function optionCardClass(intent: CatalogCreationIntent): string {
  const selected = selectedIntent.value === intent
  return [
    'flex flex-col items-start gap-2 min-h-[44px] py-4 px-3 rounded-2xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-left w-full',
    selected
      ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
      : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60',
  ].join(' ')
}

function optionDescClass(intent: CatalogCreationIntent): string {
  const selected = selectedIntent.value === intent
  return [
    'text-xs leading-snug',
    selected ? 'text-primary/80' : 'text-text-tertiary',
  ].join(' ')
}

function close() {
  emit('update:modelValue', false)
}

function onCancel() {
  close()
  emit('cancel')
}

function emitIntent(intent: CatalogCreationIntent) {
  emit('intent', intent)
  close()
}

function confirmSelection() {
  if (!selectedIntent.value) return
  emitIntent(selectedIntent.value)
}

function selectAndConfirm(intent: CatalogCreationIntent) {
  selectedIntent.value = intent
  emitIntent(intent)
}

function tryAutoResolve() {
  const locked = resolveCreationIntent(props.context)
  if (locked) {
    emitIntent(locked)
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      selectedIntent.value = null
      return
    }
    if (!showChooserUi.value) {
      tryAutoResolve()
      return
    }
    selectedIntent.value = null
  },
)
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateY(100%);
  }
}

@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
