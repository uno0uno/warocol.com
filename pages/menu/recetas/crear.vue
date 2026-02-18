<template>
  <div class="w-full">
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Creando receta base...</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex w-full flex-col">
      <!-- Recipe Base Information Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-4 sm:p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <!-- Recipe Base Name -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Nueva Receta Base
                </p>
                <p class="text-lg font-semibold text-text-primary">
                  {{ form.name || 'Sin nombre' }}
                </p>
              </div>
            </div>

            <!-- Ingredients Count -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Ingredientes
                </p>
                <p class="text-sm sm:text-lg font-semibold text-text-primary">
                  {{ form.ingredients.length }} ingrediente{{ form.ingredients.length !== 1 ? 's' : '' }}
                </p>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Estado
                </p>
                <div class="pt-1">
                  <UiStatusBadge
                    :value="form.is_active ? 'Activa' : 'Inactiva'"
                    format="text"
                    :variant="form.is_active ? 'success' : 'secondary'"
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="bg-surface border-border border rounded-lg mb-4 sm:mb-6">
        <div class="p-3 sm:p-6">
          <div class="flex items-center justify-between">
            <!-- Step 1 -->
            <div class="flex items-center flex-1">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 1,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 1,
                  'border-border text-text-secondary bg-transparent': currentStep < 1
                }"
              >
                <svg v-if="currentStep > 1" class="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">1</span>
              </div>
              <div class="ml-1 sm:ml-3 flex-1 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 1 ? 'text-text-primary' : 'text-text-secondary'">
                  <span class="hidden sm:inline">Información General</span>
                  <span class="sm:hidden">Info</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Datos básicos de la receta</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 1 ? 'bg-secondary' : 'bg-border'"></div>
            </div>

            <!-- Step 2 -->
            <div class="flex items-center flex-1">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 2,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 2,
                  'border-border text-text-secondary bg-transparent': currentStep < 2
                }"
              >
                <svg v-if="currentStep > 2" class="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else class="font-semibold text-sm sm:text-base">2</span>
              </div>
              <div class="ml-1 sm:ml-3 flex-1 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 2 ? 'text-text-primary' : 'text-text-secondary'">
                  Ingredientes
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Composición de la receta</p>
              </div>
              <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 2 ? 'bg-secondary' : 'bg-border'"></div>
            </div>

            <!-- Step 3 -->
            <div class="flex items-center">
              <div
                class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
                :class="{
                  'bg-primary text-primary-foreground border-primary': currentStep === 3,
                  'bg-secondary text-secondary-foreground border-secondary': currentStep > 3,
                  'border-border text-text-secondary bg-transparent': currentStep < 3
                }"
              >
                <span class="font-semibold text-sm sm:text-base">3</span>
              </div>
              <div class="ml-1 sm:ml-3 min-w-0">
                <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 3 ? 'text-text-primary' : 'text-text-secondary'">
                  <span class="hidden sm:inline">Revisión y Confirmación</span>
                  <span class="sm:hidden">Revisar</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Verificar y crear</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="handleNext">
        <!-- Step 1: Información General -->
        <Transition name="fade" mode="out-in">
        <div v-if="currentStep === 1" key="step-1" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6">Información General</h3>

            <div class="grid grid-cols-1 gap-4 sm:gap-6">
              <!-- Recipe Base Name -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Nombre del Tipo Base *
                </label>
                <input
                  type="text"
                  v-model="form.name"
                  placeholder="Ej: Pizza Italiana Clásica, Hamburguesa Premium, Arepa Tradicional"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                  required
                />
                <p class="text-xs text-text-secondary mt-1">Este será el nombre de la receta base que podrás asignar a múltiples productos</p>
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Descripción
                </label>
                <textarea
                  v-model="form.description"
                  placeholder="Describe la receta base, sus características principales..."
                  rows="3"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary resize-none"
                />
              </div>

              <!-- Active Status -->
              <div class="flex items-start space-x-3">
                <input
                  v-model="form.is_active"
                  type="checkbox"
                  id="is_active"
                  class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <label for="is_active" class="text-sm font-medium text-text-primary cursor-pointer">
                    Receta activa
                  </label>
                  <p class="text-xs text-text-secondary mt-1">
                    Las recetas activas pueden ser asignadas a nuevos productos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Ingredientes -->
        <div v-else-if="currentStep === 2" key="step-2" class="bg-surface border border-border rounded-lg">
          <div class="p-4 sm:p-6">
            <div class="flex justify-between items-center mb-4 sm:mb-6">
              <h3 class="text-base sm:text-lg font-semibold text-text-primary">Ingredientes de la Receta Base</h3>
              <button
                type="button"
                @click="addIngredient"
                class="btn-secondary px-3 sm:px-4 py-2 rounded-lg text-sm"
              >
                + Agregar
              </button>
            </div>

            <!-- Empty State -->
            <div v-if="form.ingredients.length === 0" class="text-center py-12 text-text-secondary">
              <svg class="w-16 h-16 mx-auto mb-4 text-titan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p class="text-base font-medium mb-1">No hay ingredientes agregados</p>
              <p class="text-sm">Agrega los ingredientes que componen esta receta base</p>
            </div>

            <!-- Ingredients List -->
            <div v-else class="space-y-3">
              <div
                v-for="(ingredient, index) in form.ingredients"
                :key="index"
                class="border border-border rounded-lg p-3 sm:p-4 bg-background"
              >
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <!-- Ingredient -->
                  <div class="md:col-span-4">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Ingrediente *</label>
                    <select
                      v-model="ingredient.ingredient_id"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      <option v-for="ing in availableIngredients" :key="ing.id" :value="ing.id">
                        {{ ing.name }} ({{ ing.unit }})
                      </option>
                    </select>
                  </div>

                  <!-- Quantity -->
                  <div class="md:col-span-3">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad *</label>
                    <input
                      type="number"
                      v-model.number="ingredient.base_quantity"
                      placeholder="0"
                      min="0"
                      step="0.1"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                      required
                    />
                  </div>

                  <!-- Unit -->
                  <div class="md:col-span-2">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Unidad</label>
                    <select
                      v-model="ingredient.unit"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
                    >
                      <option value="g">Gramos (g)</option>
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="l">Litros (l)</option>
                      <option value="u">Unidades (u)</option>
                    </select>
                  </div>

                  <!-- Required Checkbox -->
                  <div class="md:col-span-2 flex items-end">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        v-model="ingredient.is_required"
                        class="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span class="text-xs font-medium text-text-primary">Requerido</span>
                    </label>
                  </div>

                  <!-- Delete Button -->
                  <div class="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      @click="removeIngredient(index)"
                      class="w-full md:w-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Notes for this ingredient -->
                <div class="mt-3">
                  <label class="block text-xs font-medium text-text-secondary mb-1">Notas (opcional)</label>
                  <input
                    type="text"
                    v-model="ingredient.notes"
                    placeholder="Ej: Usar mozzarella de búfala, temperatura ambiente..."
                    class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                  />
                </div>
              </div>

              </div>
          </div>
        </div>

        <!-- Step 3: Review -->
        <div v-else-if="currentStep === 3" key="step-3" class="bg-surface border border-border rounded-lg">
          <!-- Header -->
          <div class="border-b border-border p-4 sm:p-6 md:p-8">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary mb-2">NUEVA RECETA BASE</h1>
                <p class="text-xs sm:text-sm text-text-secondary">Resumen de la receta base a crear</p>
              </div>
              <UiStatusBadge
                :value="form.is_active ? 'Activa' : 'Inactiva'"
                format="text"
                :variant="form.is_active ? 'success' : 'secondary'"
                size="lg"
              />
            </div>
          </div>

          <!-- Recipe Base Info -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border">
            <div class="grid grid-cols-1 gap-4 sm:gap-6">
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Tipo Base</p>
                <p class="text-lg font-bold text-text-primary">{{ form.name }}</p>
                <p v-if="form.description" class="text-sm text-text-secondary mt-2">{{ form.description }}</p>
              </div>
            </div>
          </div>

          <!-- Recipe Information -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border bg-background/50">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 sm:mb-4">
              Información de la Receta
            </p>
            <div class="grid grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p class="text-sm text-text-secondary mb-1">Total Ingredientes</p>
                <p class="text-lg font-bold text-text-primary">{{ form.ingredients.length }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">Ingredientes Requeridos</p>
                <p class="text-lg font-bold text-text-primary">
                  {{ form.ingredients.filter(i => i.is_required).length }}
                </p>
              </div>
            </div>
          </div>

          <!-- Ingredients Table -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">
              Composición de la Receta Base
            </p>

            <!-- Mobile: Cards View -->
            <div class="md:hidden space-y-3">
              <div
                v-for="(ingredient, index) in form.ingredients"
                :key="index"
                class="border border-border rounded-lg p-3 bg-background"
              >
                <div class="flex justify-between items-start mb-2">
                  <p class="font-medium text-text-primary text-sm">{{ getIngredientName(ingredient.ingredient_id) }}</p>
                  <UiStatusBadge
                    :value="ingredient.is_required ? 'Requerido' : 'Opcional'"
                    format="text"
                    :variant="ingredient.is_required ? 'success' : 'secondary'"
                    size="sm"
                  />
                </div>
                <p v-if="ingredient.notes" class="text-xs text-text-secondary mb-2">{{ ingredient.notes }}</p>
                <div class="grid grid-cols-1 gap-3 pt-2 border-t border-border">
                  <div>
                    <p class="text-xs text-text-secondary mb-1">Cantidad</p>
                    <p class="text-sm text-text-primary font-semibold">
                      {{ ingredient.base_quantity }} {{ ingredient.unit }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop: Table View -->
            <table class="w-full hidden md:table">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Ingrediente
                  </th>
                  <th class="text-center py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Estado
                  </th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Cantidad
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(ingredient, index) in form.ingredients"
                  :key="index"
                  class="border-b border-border"
                >
                  <td class="py-4">
                    <p class="font-medium text-text-primary">{{ getIngredientName(ingredient.ingredient_id) }}</p>
                    <p v-if="ingredient.notes" class="text-xs text-text-secondary mt-1">{{ ingredient.notes }}</p>
                  </td>
                  <td class="text-center py-4">
                    <UiStatusBadge
                      :value="ingredient.is_required ? 'Requerido' : 'Opcional'"
                      format="text"
                      :variant="ingredient.is_required ? 'success' : 'secondary'"
                      size="sm"
                    />
                  </td>
                  <td class="text-right py-4 text-text-primary font-semibold">
                    {{ ingredient.base_quantity }} {{ ingredient.unit }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </Transition>

        <!-- Navigation Buttons -->
        <div class="flex justify-between mt-4 sm:mt-6 gap-3">
          <button
            v-if="currentStep > 1"
            type="button"
            @click="previousStep"
            class="btn-secondary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium"
          >
            ← Anterior
          </button>
          <div v-else></div>

          <button
            v-if="currentStep < 3"
            type="submit"
            :disabled="!canProceed"
            class="btn-primary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente →
          </button>
          <button
            v-else
            type="button"
            @click="submitRecipe"
            :disabled="isSubmitting"
            class="btn-primary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear Receta Base
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Crear Receta' })

const router = useRouter()
const { currentTenant } = useTenantReactive()

// State
const currentStep = ref(1)
const isSubmitting = ref(false)

// Form data
const form = ref({
  name: '',
  description: '',
  is_active: true,
  ingredients: [] as Array<{
    ingredient_id: string
    base_quantity: number
    unit: string
    is_required: boolean
    notes: string
  }>,
  tenant_id: currentTenant.value?.id || ''
})

// Fetch ingredients
const { data: ingredientsData } = useAsyncData(
  `ingredients-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/suppliers/ingredients', {
    query: { limit: 250 }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Computed
const availableIngredients = computed(() => ingredientsData.value?.data || [])

const isLoadingData = computed(() => {
  return !ingredientsData.value
})

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return form.value.name.trim().length > 0
  }
  if (currentStep.value === 2) {
    return form.value.ingredients.length > 0 &&
           form.value.ingredients.every(i => i.ingredient_id && i.base_quantity > 0)
  }
  return true
})

// Methods
function getIngredientName(ingredientId: string) {
  const ingredient = availableIngredients.value.find((i: any) => i.id === ingredientId)
  return ingredient?.name || 'Ingrediente desconocido'
}

function addIngredient() {
  form.value.ingredients.push({
    ingredient_id: '',
    base_quantity: 0,
    unit: 'g',
    is_required: true,
    notes: ''
  })
}

function removeIngredient(index: number) {
  form.value.ingredients.splice(index, 1)
}

function handleNext() {
  if (canProceed.value && currentStep.value < 3) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

async function submitRecipe() {
  if (isSubmitting.value) return

  // Validate no duplicate ingredients
  const ingredientIds = form.value.ingredients
    .map(ing => ing.ingredient_id)
    .filter(id => id !== '') // Ignore empty selections

  const uniqueIds = new Set(ingredientIds)
  if (ingredientIds.length !== uniqueIds.size) {
    alert('Error: No puedes agregar el mismo ingrediente más de una vez en la misma receta.')
    return
  }

  isSubmitting.value = true

  try {
    form.value.tenant_id = currentTenant.value?.id || ''

    // Create the base recipe type and its ingredients
    const response = await $fetch('/api/menu/recipe-bases', {
      method: 'POST',
      body: {
        name: form.value.name,
        description: form.value.description,
        is_active: form.value.is_active,
        ingredients: form.value.ingredients.map(ing => ({
          ingredient_id: ing.ingredient_id,
          base_quantity: ing.base_quantity,
          unit: ing.unit,
          is_required: ing.is_required,
          notes: ing.notes
        })),
        tenant_id: form.value.tenant_id
      }
    })

    clearNuxtData()
    await router.push('/menu/recetas')
  } catch (error: any) {
    console.error('Error creating recipe base:', error)
    alert(`Error al crear la receta base: ${error.data?.detail || error.message || 'Por favor intenta de nuevo.'}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.page-layout {
  @apply max-w-6xl mx-auto p-4 md:p-6;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
