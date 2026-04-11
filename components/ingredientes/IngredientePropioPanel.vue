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
        class="fixed z-50 flex flex-col bg-surface shadow-2xl relative
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

          <!-- Archived banner -->
          <div
            v-if="isEdit && ingredient?.is_active === false"
            class="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200"
          >
            <svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
            </svg>
            <div>
              <p class="text-sm font-semibold text-amber-800">Ingrediente archivado</p>
              <p class="text-xs text-amber-700 mt-0.5 leading-relaxed">
                No aparece en recetas ni pedidos nuevos. El historial de compras y ventas queda intacto.
              </p>
            </div>
          </div>

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

          <!-- CREACIÓN: selector de tipo de medida -->
          <div v-if="!isEdit" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">
              Tipo de medida <span class="text-destructive">*</span>
            </label>
            <div class="grid grid-cols-3 gap-2" role="group" aria-label="Tipo de medida">
              <!-- Peso -->
              <button
                type="button"
                @click="setUnitType('peso')"
                :class="[
                  'flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all focus:outline-none',
                  unitType === 'peso'
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 6l9 2 9-2M3 6v12l9 2 9-2V6M12 8v10" />
                </svg>
                <span class="text-xs font-bold tracking-wide">Peso</span>
                <span :class="['text-[10px] font-mono px-2 py-0.5 rounded-full', unitType === 'peso' ? 'bg-primary/15 text-primary' : 'bg-surface-secondary text-text-tertiary']">gr / kg</span>
              </button>

              <!-- Volumen -->
              <button
                type="button"
                @click="setUnitType('volumen')"
                :class="[
                  'flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all focus:outline-none',
                  unitType === 'volumen'
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 2C12 2 5 10 5 14a7 7 0 0014 0c0-4-7-12-7-12z" />
                </svg>
                <span class="text-xs font-bold tracking-wide">Volumen</span>
                <span :class="['text-[10px] font-mono px-2 py-0.5 rounded-full', unitType === 'volumen' ? 'bg-primary/15 text-primary' : 'bg-surface-secondary text-text-tertiary']">ml / lt</span>
              </button>

              <!-- Pieza -->
              <button
                type="button"
                @click="setUnitType('pieza')"
                :class="[
                  'flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all focus:outline-none',
                  unitType === 'pieza'
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                </svg>
                <span class="text-xs font-bold tracking-wide">Pieza</span>
                <span :class="['text-[10px] font-mono px-2 py-0.5 rounded-full', unitType === 'pieza' ? 'bg-primary/15 text-primary' : 'bg-surface-secondary text-text-tertiary']">und</span>
              </button>
            </div>
            <p v-if="errors.unit" class="text-xs text-destructive">{{ errors.unit }}</p>
          </div>

          <!-- CREACIÓN: unidades de compra informativas (Peso / Volumen) -->
          <div v-if="!isEdit && unitType && currentSuggestions.length > 0" class="flex flex-col gap-1.5">
            <p class="text-xs font-medium text-text-secondary">Unidades de compra que se crearán automáticamente</p>
            <div class="rounded-xl border border-border divide-y divide-border overflow-hidden bg-surface-secondary/30">
              <div
                v-for="(s, i) in currentSuggestions"
                :key="i"
                class="flex items-center justify-between px-3 py-2"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <svg class="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-sm text-text-primary">{{ s.label }}</span>
                  <span v-if="i === 0" class="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0">predeterminado</span>
                </div>
                <span class="text-xs text-text-tertiary font-mono flex-shrink-0 ml-2">
                  {{ s.conversion_factor.toLocaleString('es-CO') }} {{ form.unit }}
                </span>
              </div>
            </div>
          </div>

          <!-- CREACIÓN: nota para Pieza -->
          <div v-if="!isEdit && unitType === 'pieza'" class="text-xs text-text-tertiary bg-surface-secondary/50 rounded-lg px-3 py-2.5 leading-relaxed">
            Las unidades de compra (docena, paquete, caja…) se configuran en
            <strong class="text-text-secondary">Compras Directas</strong>
            al registrar la primera compra del ingrediente.
          </div>

          <!-- EDICIÓN: unidad de solo lectura -->
          <div v-if="isEdit" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">Unidad</label>
            <div class="h-10 flex items-center px-3 rounded-lg border border-border bg-surface-secondary/60 text-sm text-text-secondary select-none">
              {{ UNIT_LABELS[form.unit] || form.unit }}
            </div>
          </div>

          <!-- EDICIÓN: unidades de compra existentes -->
          <div v-if="isEdit && !loadingExistingUnits && existingPurchaseUnits.length > 0" class="flex flex-col gap-1.5">
            <p class="text-xs font-medium text-text-secondary">Unidades de compra</p>
            <div class="rounded-xl border border-border divide-y divide-border overflow-hidden bg-surface-secondary/30">
              <div v-for="(u, i) in existingPurchaseUnits" :key="i" class="flex items-center justify-between px-3 py-2">
                <div class="flex items-center gap-2 min-w-0">
                  <svg class="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-sm text-text-primary">{{ u.purchase_unit_label }}</span>
                  <span v-if="u.is_default" class="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0">predeterminado</span>
                </div>
                <span class="text-xs text-text-tertiary font-mono flex-shrink-0 ml-2">
                  {{ Number(u.conversion_factor).toLocaleString('es-CO') }} {{ form.unit }}
                </span>
              </div>
            </div>
          </div>

          <!-- EDICIÓN: sin unidades → muestra las que se crearán al guardar -->
          <div v-if="isEdit && !loadingExistingUnits && existingPurchaseUnits.length === 0 && editSuggestions.length > 0" class="flex flex-col gap-1.5">
            <p class="text-xs font-medium text-text-secondary">Unidades de compra que se crearán al guardar</p>
            <div class="rounded-xl border border-primary/30 divide-y divide-border overflow-hidden bg-primary/5">
              <div v-for="(s, i) in editSuggestions" :key="i" class="flex items-center justify-between px-3 py-2">
                <div class="flex items-center gap-2 min-w-0">
                  <svg class="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span class="text-sm text-text-primary">{{ s.label }}</span>
                  <span v-if="i === 0" class="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0">predeterminado</span>
                </div>
                <span class="text-xs text-text-tertiary font-mono flex-shrink-0 ml-2">
                  {{ s.conversion_factor.toLocaleString('es-CO') }} {{ form.unit }}
                </span>
              </div>
            </div>
          </div>

          <!-- Reventa -->
          <div class="flex items-center justify-between rounded-xl border border-border px-4 py-3 bg-surface-secondary/30">
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-text-primary">Vender como reventa</span>
              <span class="text-xs text-text-tertiary">Aparece en POS y domicilios con precio directo</span>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="form.isResale"
              @click="form.isResale = !form.isResale"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                form.isResale ? 'bg-primary' : 'bg-border'
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
                  form.isResale ? 'translate-x-5' : 'translate-x-0'
                ]"
              />
            </button>
          </div>

          <!-- Categoría -->
          <div class="flex flex-col gap-1.5">
            <label for="ing-category" class="text-sm font-medium text-text-primary">
              Categoría <span class="text-destructive">*</span>
            </label>
            <input
              id="ing-category"
              v-model="form.category"
              type="text"
              list="ing-category-list"
              placeholder="Ej: Carnes, Salsas, Lácteos..."
              :class="inputClass"
              @input="clearError('category')"
            />
            <datalist id="ing-category-list">
              <option value="Aceites" />
              <option value="Azúcares" />
              <option value="Bebidas" />
              <option value="Café" />
              <option value="Carnes" />
              <option value="Condimentos" />
              <option value="Embutidos" />
              <option value="Empaques" />
              <option value="Endulzantes" />
              <option value="Especias" />
              <option value="Frutas" />
              <option value="Granos" />
              <option value="Harinas" />
              <option value="Huevos" />
              <option value="Lácteos" />
              <option value="Mariscos" />
              <option value="Panadería" />
              <option value="Pastas" />
              <option value="Proteínas" />
              <option value="Salsas" />
              <option value="Snacks" />
              <option value="Tubérculos" />
              <option value="Vegetales" />
              <option value="Otros" />
            </datalist>
            <p v-if="errors.category" class="text-xs text-destructive">{{ errors.category }}</p>
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
        <div class="flex-shrink-0 bg-surface-secondary/40 border-t border-border px-6 py-4 flex flex-col gap-2">
          <div class="flex gap-3">
            <button
              type="button"
              @click="close"
              class="h-11 px-5 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Cancelar
            </button>
            <button
              v-if="ingredient?.is_active !== false"
              type="button"
              @click="submit"
              :disabled="saving"
              class="flex-1 h-11 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-primary/30"
            >
              <span v-if="saving">Guardando...</span>
              <span v-else>{{ isEdit ? 'Guardar cambios' : 'Crear ingrediente' }}</span>
            </button>
          </div>

          <!-- Archive / Restore actions (edit mode only) -->
          <button
            v-if="isEdit && ingredient?.is_active !== false"
            type="button"
            @click="showArchiveConfirm = true"
            class="h-10 w-full rounded-lg border border-amber-300 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300/40"
          >
            Archivar ingrediente
          </button>
          <button
            v-if="isEdit && ingredient?.is_active === false"
            type="button"
            @click="restoreIngredient"
            :disabled="restoring"
            class="h-10 w-full rounded-lg border border-primary/40 text-sm font-medium text-primary hover:bg-primary/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            <span v-if="restoring">Restaurando...</span>
            <span v-else>Restaurar ingrediente</span>
          </button>
        </div>

        <!-- Archive confirmation (inside panel) -->
        <Transition enter-active-class="transition-opacity duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <div v-if="showArchiveConfirm" class="absolute inset-0 z-10 flex items-end md:items-center justify-center bg-black/30 rounded-t-2xl md:rounded-none">
            <div class="bg-surface w-full md:mx-6 md:rounded-2xl shadow-2xl p-6 flex flex-col gap-4 rounded-t-2xl">
              <h3 class="text-base font-bold text-text-primary">Archivar "{{ ingredient?.name }}"</h3>
              <p class="text-sm text-text-secondary leading-relaxed">
                Se eliminará de todas las recetas, modificadores y reventa activos.
                <strong class="text-text-primary">El historial queda intacto.</strong>
              </p>
              <p class="text-xs text-text-tertiary bg-surface-secondary/60 rounded-lg px-3 py-2">
                Puedes restaurarlo desde la vista de archivados.
              </p>
              <div class="flex gap-3">
                <button type="button" @click="showArchiveConfirm = false" class="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors">
                  Cancelar
                </button>
                <button type="button" @click="archiveIngredient" :disabled="archiving" class="flex-1 h-10 rounded-lg bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50">
                  <span v-if="archiving">Archivando...</span>
                  <span v-else>Archivar</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: boolean
  ingredient?: any    // null/undefined = create mode, object = edit mode
  initialName?: string  // pre-fill name when creating from search box
}

interface Emits {
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved', ingredient: any): void
  (e: 'archived', ingredient: any): void
  (e: 'restored', ingredient: any): void
}

const props = withDefaults(defineProps<Props>(), { ingredient: null, initialName: '' })
const emit = defineEmits<Emits>()

// Archive / restore state
const showArchiveConfirm = ref(false)
const archiving = ref(false)
const restoring = ref(false)

async function archiveIngredient() {
  if (!props.ingredient?.id) return
  archiving.value = true
  try {
    await $fetch(`/api/suppliers/ingredients/${props.ingredient.id}/archive`, { method: 'PATCH' })
    emit('archived', props.ingredient)
    close()
  } catch (err: any) {
    console.error('Archive failed', err)
  } finally {
    archiving.value = false
    showArchiveConfirm.value = false
  }
}

async function restoreIngredient() {
  if (!props.ingredient?.id) return
  restoring.value = true
  try {
    await $fetch(`/api/suppliers/ingredients/${props.ingredient.id}/restore`, { method: 'PATCH' })
    emit('restored', props.ingredient)
    close()
  } catch (err: any) {
    console.error('Restore failed', err)
  } finally {
    restoring.value = false
  }
}

const isEdit = computed(() => !!props.ingredient)

const inputClass = 'h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const UNIT_LABELS: Record<string, string> = {
  gr: 'gr — gramos',
  kg: 'kg — kilogramos',
  ml: 'ml — mililitros',
  lt: 'lt — litros',
  und: 'und — unidades',
}

const UNIT_TYPES = [
  {
    key: 'peso' as const,
    label: 'Peso',
    unit: 'gr',
    suggestions: [
      { purchase_unit: 'kg',        label: 'Kilogramo',     conversion_factor: 1000  },
      { purchase_unit: 'libra',     label: 'Libra',         conversion_factor: 500   },
      { purchase_unit: 'arroba',    label: 'Arroba',        conversion_factor: 12500 },
      { purchase_unit: 'bulto_25kg',label: 'Bulto (25 kg)', conversion_factor: 25000 },
    ],
  },
  {
    key: 'volumen' as const,
    label: 'Volumen',
    unit: 'ml',
    suggestions: [
      { purchase_unit: 'lt',      label: 'Litro',   conversion_factor: 1000 },
      { purchase_unit: 'botella', label: 'Botella', conversion_factor: 750  },
      { purchase_unit: 'galon',   label: 'Galón',   conversion_factor: 3785 },
    ],
  },
  {
    key: 'pieza' as const,
    label: 'Pieza',
    unit: 'und',
    suggestions: [],
  },
]

type UnitTypeKey = 'peso' | 'volumen' | 'pieza' | ''

// --- State ---
const unitType = ref<UnitTypeKey>('')
const form = ref({ name: '', unit: '', category: '', parentId: null as string | null, parentName: '', isResale: false })
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const existingPurchaseUnits = ref<any[]>([])
const loadingExistingUnits = ref(false)

// --- Computed ---
const currentSuggestions = computed(() =>
  UNIT_TYPES.find(t => t.key === unitType.value)?.suggestions ?? []
)

// Suggestions inferred from the ingredient's base unit (for edit mode)
const editSuggestions = computed(() =>
  UNIT_TYPES.find(t => t.unit === form.value.unit)?.suggestions ?? []
)

// --- Unit type selection ---
const setUnitType = (key: UnitTypeKey) => {
  unitType.value = key
  const t = UNIT_TYPES.find(u => u.key === key)
  if (t) form.value.unit = t.unit
  clearError('unit')
}

// --- Form reset helpers ---
const resetCreate = () => {
  form.value = { name: props.initialName ?? '', unit: '', category: '', parentId: null, parentName: '', isResale: false }
  unitType.value = ''
  errors.value = {}
}

// Populate form when ingredient changes
watch(() => props.ingredient, (ing) => {
  if (ing) {
    form.value = {
      name: ing.name ?? '',
      unit: ing.unit ?? '',
      category: ing.category ?? '',
      parentId: null,
      parentName: ing.parent_name ?? '',
      isResale: ing.is_resale ?? false,
    }
    unitType.value = ''
    existingPurchaseUnits.value = []
  } else {
    resetCreate()
  }
  errors.value = {}
}, { immediate: true })

// Reset when panel opens; fetch existing purchase units in edit mode
watch(() => props.modelValue, async (open) => {
  if (!open) return
  if (!props.ingredient) {
    resetCreate()
    return
  }
  existingPurchaseUnits.value = []
  loadingExistingUnits.value = true
  try {
    const res: any = await $fetch(`/api/suppliers/ingredient-purchase-units/ingredient/${props.ingredient.id}`)
    existingPurchaseUnits.value = res?.data ?? []
  } catch {
    existingPurchaseUnits.value = []
  } finally {
    loadingExistingUnits.value = false
  }
})

// --- Parent ingredient ---
const onParentSelect = (ing: any) => {
  form.value.parentId = ing.id
  form.value.parentName = ing.name
}

const onParentClear = () => {
  form.value.parentId = ''
  form.value.parentName = ''
}

const clearError = (field: string) => {
  delete errors.value[field]
}

// --- Validation ---
function validate() {
  const e: Record<string, string> = {}
  if (!form.value.name.trim()) e.name = 'El nombre es obligatorio'
  if (!form.value.unit) e.unit = 'Selecciona un tipo de medida'
  if (!form.value.category.trim()) e.category = 'La categoría es obligatoria'
  errors.value = e
  return Object.keys(e).length === 0
}

// --- Submit ---
async function submit() {
  if (!validate()) return
  saving.value = true
  errors.value = {}

  try {
    const body: Record<string, any> = {
      name: form.value.name.trim(),
      unit: form.value.unit,
      category: form.value.category.trim(),
      is_resale: form.value.isResale,
    }
    if (form.value.parentId !== null) body.parent_id = form.value.parentId

    let result: any
    if (isEdit.value) {
      if (existingPurchaseUnits.value.length === 0 && editSuggestions.value.length > 0) {
        body.purchase_units = editSuggestions.value.map((s, i) => ({
          purchase_unit: s.purchase_unit,
          is_default: i === 0,
        }))
      }
      result = await $fetch(`/api/suppliers/ingredients/${props.ingredient.id}`, { method: 'PATCH', body })
    } else {
      body.purchase_units = currentSuggestions.value.map((s, i) => ({
        purchase_unit: s.purchase_unit,
        is_default: i === 0,
      }))
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
