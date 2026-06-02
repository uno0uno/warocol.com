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
        :aria-label="panelAriaLabel"
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
                  {{ isEdit ? WAREHOUSE_COPY.panelEditTitle : WAREHOUSE_COPY.panelNewTitle }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ isEdit ? ingredient?.name : WAREHOUSE_COPY.panelNewSubtitle }}
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
              <p class="text-sm font-semibold text-amber-800">{{ WAREHOUSE_COPY.panelArchived }}</p>
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

          <!-- CREACIÓN: selector de tipo (solo si no viene fijado del paso anterior) -->
          <div v-if="!isEdit && !lockIngredientType" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">
              Tipo <span class="text-destructive">*</span>
            </label>
            <p class="text-xs text-text-tertiary leading-snug">
              {{ WAREHOUSE_COPY.panelTypeHelper }}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" :aria-label="WAREHOUSE_COPY.warehouseItemType">
              <button
                type="button"
                @click="setIngredientType('food')"
                :class="typeCardClass('food')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 2a9 9 0 019 9c0 4.97-4.03 9-9 9S3 15.97 3 11a9 9 0 019-9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 11c0-2.21 1.79-4 4-4s4 1.79 4 4" />
                </svg>
                <span class="text-xs font-bold leading-tight">Alimento</span>
                <span :class="['text-[10px] leading-snug', form.type === 'food' ? 'text-primary/80' : 'text-text-tertiary']">Peso o volumen. Ej: carne, aceite</span>
              </button>
              <button
                type="button"
                @click="setIngredientType('supply')"
                :class="typeCardClass('supply')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                </svg>
                <span class="text-xs font-bold leading-tight">Insumo</span>
                <span :class="['text-[10px] leading-snug', form.type === 'supply' ? 'text-primary/80' : 'text-text-tertiary']">Siempre en und. Ej: icopor, bolsa</span>
              </button>
              <button
                type="button"
                @click="setIngredientType('service')"
                :class="typeCardClass('service')"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span class="text-xs font-bold leading-tight">Servicio</span>
                <span :class="['text-[10px] leading-snug', form.type === 'service' ? 'text-primary/80' : 'text-text-tertiary']">Siempre en horas. Ej: mano de obra</span>
              </button>
            </div>
          </div>

          <!-- EDICIÓN o creación con tipo fijado -->
          <div v-if="isEdit || lockIngredientType" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">Tipo</label>
            <div class="h-10 flex items-center px-3 rounded-lg border border-border bg-surface-secondary/60 text-sm text-text-secondary select-none gap-2">
              <template v-if="form.type === 'food'">
                <svg class="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 2a9 9 0 019 9c0 4.97-4.03 9-9 9S3 15.97 3 11a9 9 0 019-9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 11c0-2.21 1.79-4 4-4s4 1.79 4 4" />
                </svg>
                Alimento
              </template>
              <template v-else-if="form.type === 'supply'">
                <svg class="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                </svg>
                Insumo
              </template>
              <template v-else-if="form.type === 'service'">
                <svg class="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Servicio
              </template>
              <template v-else>{{ form.type }}</template>
              <span class="text-[10px] text-text-tertiary ml-auto">
                {{ isEdit ? 'No se puede cambiar' : 'Elegido en el paso anterior' }}
              </span>
            </div>
          </div>

          <!-- CREACIÓN: unidad fija (insumo / servicio) -->
          <div v-if="!isEdit && form.type === 'supply'" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">Unidad base</label>
            <div class="h-10 flex items-center px-3 rounded-lg border border-border bg-surface-secondary/60 text-sm text-text-secondary select-none">
              und — unidades (fijo para insumos)
            </div>
          </div>
          <div v-if="!isEdit && form.type === 'service'" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">Unidad base</label>
            <div class="h-10 flex items-center px-3 rounded-lg border border-border bg-surface-secondary/60 text-sm text-text-secondary select-none">
              hr — horas (fijo para servicios)
            </div>
          </div>

          <!-- CREACIÓN: selector de tipo de medida (solo alimento) -->
          <div v-if="!isEdit && form.type === 'food'" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">
              Tipo de medida <span class="text-destructive">*</span>
            </label>
            <div class="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de medida">
              <!-- Peso -->
              <button
                type="button"
                @click="setUnitType('peso')"
                :class="[
                  'flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border-2 transition-all focus:outline-none',
                  unitType === 'peso'
                    ? 'border-primary bg-primary/8 text-primary shadow-sm shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <span class="text-xs font-bold">Peso</span>
                <span :class="['text-[10px] font-mono', unitType === 'peso' ? 'text-primary' : 'text-text-tertiary']">gr / kg</span>
              </button>

              <!-- Volumen -->
              <button
                type="button"
                @click="setUnitType('volumen')"
                :class="[
                  'flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border-2 transition-all focus:outline-none',
                  unitType === 'volumen'
                    ? 'border-primary bg-primary/8 text-primary shadow-sm shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <span class="text-xs font-bold">Volumen</span>
                <span :class="['text-[10px] font-mono', unitType === 'volumen' ? 'text-primary' : 'text-text-tertiary']">ml / lt</span>
              </button>
            </div>
            <p v-if="errors.unit" class="text-xs text-destructive">{{ errors.unit }}</p>
          </div>

          <!-- CREACIÓN: unidades de compra (alimento peso/volumen) -->
          <IngredientesIngredientPurchaseUnitsField
            v-if="!isEdit && form.type === 'food' && (unitType === 'peso' || unitType === 'volumen')"
            v-model:draft-units="createPurchaseUnits"
            mode="create"
            :base-unit="form.unit"
          />

          <!-- CREACIÓN: unidades de compra (insumo — und personalizable) -->
          <IngredientesIngredientPurchaseUnitsField
            v-if="!isEdit && form.type === 'supply'"
            v-model:draft-units="createPurchaseUnits"
            mode="create"
            base-unit="und"
          />

          <!-- EDICIÓN: unidad de solo lectura -->
          <div v-if="isEdit" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">Unidad</label>
            <div class="h-10 flex items-center px-3 rounded-lg border border-border bg-surface-secondary/60 text-sm text-text-secondary select-none">
              {{ UNIT_LABELS[form.unit] || form.unit }}
            </div>
          </div>

          <!-- Reventa (solo edición de ingredientes und existentes) -->
          <div v-if="!hideResaleToggle && isEdit && form.unit === 'und'" class="flex items-center justify-between rounded-xl border border-border px-4 py-3 bg-surface-secondary/30">
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
                form.isResale ? 'bg-primary' : 'bg-border',
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

          <!-- Equivalencia por unidad (gr, ml o und) -->
          <div v-if="form.unit === 'und' || form.unit === 'gr' || form.unit === 'ml'" class="flex flex-col gap-1.5">
            <label for="ing-weight" class="text-sm font-medium text-text-primary">
              {{ form.unit === 'und' ? `${unitWeightUnit} por unidad` : `${form.unit} por unidad` }}
              <span class="text-xs text-text-tertiary font-normal">— conversión en recetas</span>
            </label>

            <!-- Para und: selector gr | ml + input -->
            <div v-if="form.unit === 'und'" class="flex gap-2">
              <!-- Toggle gr / ml -->
              <div class="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
                <button
                  type="button"
                  @click="unitWeightUnit = 'gr'"
                  :class="[
                    'px-3 py-2 text-sm font-medium transition-colors',
                    unitWeightUnit === 'gr' ? 'bg-primary text-white' : 'bg-background text-text-tertiary hover:bg-surface-secondary'
                  ]"
                >gr</button>
                <button
                  type="button"
                  @click="unitWeightUnit = 'ml'"
                  :class="[
                    'px-3 py-2 text-sm font-medium transition-colors border-l border-border',
                    unitWeightUnit === 'ml' ? 'bg-primary text-white' : 'bg-background text-text-tertiary hover:bg-surface-secondary'
                  ]"
                >ml</button>
              </div>
              <UiDecimalInput
                id="ing-weight"
                v-model="form.unitWeightGr"
                :min="0"
                :precision="1"
                :placeholder="`Ej: 400 (1 und = 400 ${unitWeightUnit})`"
                :class="inputClass + ' flex-1'"
              />
            </div>

            <!-- Para gr / ml: solo input -->
            <UiDecimalInput
              v-else
              id="ing-weight"
              v-model="form.unitWeightGr"
              :min="0"
              :precision="1"
              :placeholder="`Ej: 750 (1 und vendida = 750 ${form.unit})`"
              :class="inputClass"
            />

            <p class="text-xs text-text-tertiary">
              <template v-if="form.unit === 'und'">Si una receta usa este artículo de bodega en {{ unitWeightUnit }}, el sistema divide por este valor para descontar stock en und.</template>
              <template v-else>Si una receta usa este artículo de bodega en und, el sistema multiplica por este valor para descontar stock en {{ form.unit }}.</template>
            </p>
          </div>

          <!-- EDICIÓN: unidades de compra con CRUD -->
          <IngredientesIngredientPurchaseUnitsField
            v-if="isEdit"
            mode="edit"
            :ingredient-id="ingredient.id"
            :base-unit="form.unit"
            :pending-suggestions="editSuggestions"
          />

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

          <!-- Error general -->
          <p v-if="errors.general" class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {{ errors.general }}
          </p>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-t border-border px-6 py-4 flex flex-col gap-2">
          <div class="flex gap-2">
            <button
              v-if="showBackToChooser && !isEdit"
              type="button"
              aria-label="Volver al selector de tipo"
              class="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              @click="emit('back-to-chooser')"
            >
              Atrás
            </button>
            <button
              type="button"
              @click="close"
              class="h-11 px-4 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              <span v-else>{{ isEdit ? 'Guardar cambios' : WAREHOUSE_COPY.createWarehouseItem }}</span>
            </button>
          </div>

          <!-- Archive / Restore actions (edit mode only) -->
          <button
            v-if="isEdit && ingredient?.is_active !== false"
            type="button"
            @click="showArchiveConfirm = true"
            class="h-10 w-full rounded-lg border border-amber-300 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300/40"
          >
            {{ WAREHOUSE_COPY.archiveWarehouseItem }}
          </button>
          <button
            v-if="isEdit && ingredient?.is_active === false"
            type="button"
            @click="restoreIngredient"
            :disabled="restoring"
            class="h-10 w-full rounded-lg border border-primary/40 text-sm font-medium text-primary hover:bg-primary/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            <span v-if="restoring">Restaurando...</span>
            <span v-else>{{ WAREHOUSE_COPY.restoreWarehouseItem }}</span>
          </button>
        </div>

        <!-- Archive confirmation (inside panel) -->
        <Transition enter-active-class="transition-opacity duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <div v-if="showArchiveConfirm" class="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/40">
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
import { WAREHOUSE_COPY } from '~/constants/warehouseCopy'
import {
  defaultUndPurchaseUnitsDraft,
  persistDraftPurchaseUnits,
  suggestionsToDraftUnits,
  UND_PURCHASE_UNIT_SUGGESTIONS,
  usesCustomPurchaseUnitsDraft,
  type DraftPurchaseUnit,
} from '@/composables/useIngredientPurchaseUnitsDraft'

interface Props {
  modelValue: boolean
  ingredient?: any    // null/undefined = create mode, object = edit mode
  initialName?: string  // pre-fill name when creating from search box
  initialType?: string  // pre-select ingredient type when context is known (e.g. active tab in Compras Directas)
  lockIngredientType?: boolean  // hide type cards when type was chosen in a prior step
  hideResaleToggle?: boolean
  showBackToChooser?: boolean
}

interface Emits {
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved', ingredient: any): void
  (e: 'archived', ingredient: any): void
  (e: 'restored', ingredient: any): void
  (e: 'busy-change', busy: boolean): void
  (e: 'back-to-chooser'): void
}

const props = withDefaults(defineProps<Props>(), {
  ingredient: null,
  initialName: '',
  initialType: 'food',
  lockIngredientType: false,
  hideResaleToggle: false,
  showBackToChooser: false,
})
const emit = defineEmits<Emits>()

const isEdit = computed(() => !!props.ingredient?.id)

const panelAriaLabel = computed(() =>
  isEdit.value
    ? `${WAREHOUSE_COPY.panelEditTitle}: ${props.ingredient?.name ?? ''}`
    : WAREHOUSE_COPY.panelCreateAria,
)

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

const inputClass = 'h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const UNIT_LABELS: Record<string, string> = {
  gr: 'gr — gramos',
  kg: 'kg — kilogramos',
  ml: 'ml — mililitros',
  lt: 'lt — litros',
  und: 'und — unidades',
  hr: 'hr — horas',
}

type IngredientDbType = 'food' | 'supply' | 'service'

function normalizeIngredientType(value?: string): IngredientDbType {
  if (value === 'supply' || value === 'service') return value
  return 'food'
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
    suggestions: [
      { purchase_unit: 'und', label: 'Unidad', conversion_factor: 1 },
    ],
  },
]

type UnitTypeKey = 'peso' | 'volumen' | 'pieza' | ''

// --- State ---
const unitType = ref<UnitTypeKey>('')
const unitWeightUnit = ref<'gr' | 'ml'>('gr')
const form = ref({ name: '', unit: '', category: '', parentId: null as string | null, parentName: '', isResale: false, type: 'food', unitWeightGr: null as number | null })
const errors = ref<Record<string, string>>({})
const saving = ref(false)
watch(saving, value => emit('busy-change', value))
const createPurchaseUnits = ref<DraftPurchaseUnit[]>([])

// --- Computed ---
const currentSuggestions = computed(() =>
  UNIT_TYPES.find(t => t.key === unitType.value)?.suggestions ?? []
)

// Suggestions inferred from the ingredient's base unit (for edit mode)
const editSuggestions = computed(() =>
  UNIT_TYPES.find(t => t.unit === form.value.unit)?.suggestions ?? []
)

const typeCardClass = (type: IngredientDbType) => [
  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left min-h-[44px]',
  form.value.type === type
    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60',
]

const applyTypeUnitDefaults = (type: IngredientDbType) => {
  if (type === 'supply') {
    form.value.unit = 'und'
    if (createPurchaseUnits.value.length === 0) {
      createPurchaseUnits.value = defaultUndPurchaseUnitsDraft()
    }
  } else if (type === 'service') {
    form.value.unit = 'hr'
    createPurchaseUnits.value = []
  }
}

const setIngredientType = (type: IngredientDbType) => {
  if (form.value.type === type) return
  form.value.type = type
  unitType.value = ''
  form.value.unit = ''
  form.value.unitWeightGr = null
  createPurchaseUnits.value = []
  applyTypeUnitDefaults(type)
  clearError('unit')
}

// --- Unit type selection (alimento) ---
const setUnitType = (key: UnitTypeKey) => {
  if (key === 'pieza') return
  unitType.value = key
  const t = UNIT_TYPES.find(u => u.key === key)
  if (t) {
    form.value.unit = t.unit
    createPurchaseUnits.value = suggestionsToDraftUnits(t.suggestions)
  }
  clearError('unit')
}

// --- Form reset helpers ---
const resetCreate = () => {
  const type = normalizeIngredientType(props.initialType)
  form.value = {
    name: props.initialName ?? '',
    unit: '',
    category: '',
    parentId: null,
    parentName: '',
    isResale: false,
    type,
    unitWeightGr: null,
  }
  unitType.value = ''
  unitWeightUnit.value = 'gr'
  createPurchaseUnits.value = []
  errors.value = {}
  applyTypeUnitDefaults(type)
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
      type: ing.type ?? 'food',
      unitWeightGr: ing.unit_weight_gr ?? null,
    }
    unitWeightUnit.value = (ing.unit_weight_unit as 'gr' | 'ml') ?? 'gr'
    unitType.value = ''
  } else {
    resetCreate()
  }
  errors.value = {}
}, { immediate: true })

// Reset when panel opens in create mode
watch(() => props.modelValue, (open) => {
  if (!open || props.ingredient) return
  resetCreate()
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
  if (form.value.type === 'food' && !form.value.unit) {
    e.unit = 'Selecciona un tipo de medida'
  }
  if (form.value.type === 'supply' && form.value.unit !== 'und') {
    e.unit = 'Los insumos deben usar unidad und'
  }
  if (form.value.type === 'service' && form.value.unit !== 'hr') {
    e.unit = 'Los servicios deben usar unidad hr'
  }
  if (!form.value.category.trim()) e.category = 'La categoría es obligatoria'
  if (form.value.isResale && form.value.unit !== 'und') {
    e.general = WAREHOUSE_COPY.resaleWarehouseItemMustBeUnd
  }
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
    // unit_weight (both create and edit)
    if (form.value.unitWeightGr !== null) {
      body.unit_weight_gr = form.value.unitWeightGr
      body.unit_weight_unit = form.value.unit === 'und' ? unitWeightUnit.value : form.value.unit
    }

    if (isEdit.value) {
      // type is immutable — never include it in PATCH
      let existingCount = 0
      try {
        const unitsRes: any = await $fetch(`/api/suppliers/ingredient-purchase-units/ingredient/${props.ingredient.id}`)
        existingCount = (unitsRes?.data ?? []).length
      } catch { /* ignore */ }
      if (existingCount === 0 && editSuggestions.value.length > 0) {
        body.purchase_units = editSuggestions.value.map((s, i) => ({
          purchase_unit: s.purchase_unit,
          is_default: i === 0,
        }))
      }
      result = await $fetch(`/api/suppliers/ingredients/${props.ingredient.id}`, { method: 'PATCH', body })
    } else {
      body.type = form.value.type
      let useCustomUnits = false
      if (form.value.type === 'food') {
        useCustomUnits = usesCustomPurchaseUnitsDraft(createPurchaseUnits.value, currentSuggestions.value)
        if (!useCustomUnits) {
          body.purchase_units = currentSuggestions.value.map((s, i) => ({
            purchase_unit: s.purchase_unit,
            is_default: i === 0,
          }))
        }
      } else if (form.value.type === 'supply') {
        useCustomUnits = usesCustomPurchaseUnitsDraft(createPurchaseUnits.value, UND_PURCHASE_UNIT_SUGGESTIONS)
        if (!useCustomUnits) {
          body.purchase_units = UND_PURCHASE_UNIT_SUGGESTIONS.map((s, i) => ({
            purchase_unit: s.purchase_unit,
            is_default: i === 0,
          }))
        }
      }
      result = await $fetch('/api/suppliers/ingredients', { method: 'POST', body })
      const ingredientId = result?.data?.id ?? result?.id
      if (useCustomUnits && ingredientId && createPurchaseUnits.value.length > 0) {
        await persistDraftPurchaseUnits(String(ingredientId), createPurchaseUnits.value)
      }
    }

    emit('saved', result.data)
    close()
  } catch (err: any) {
    const detail = err?.data?.detail ?? err?.message ?? 'Error al guardar'
    if (detail.toLowerCase().includes('already exists') || detail.toLowerCase().includes('ya existe')) {
      errors.value.name = WAREHOUSE_COPY.duplicateWarehouseItemName
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
