<template>
  <div class="w-full">
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Creando producto...</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex w-full flex-col ">
      <!-- Product Information Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-4 sm:p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <!-- Product Name -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Nuevo Producto
                </p>
                <p class="text-lg font-semibold text-text-primary">
                  {{ form.name || 'Sin nombre' }}
                </p>
              </div>
            </div>

            <!-- Category -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Categoría
                </p>
                <p class="text-sm sm:text-lg font-semibold text-text-primary">
                  {{ getCategoryName(form.category_id) || 'Sin categoría' }}
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
                    :value="form.is_available ? 'Disponible' : 'No disponible'"
                    format="text"
                    :variant="form.is_available ? 'success' : 'default'"
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
                <p class="text-xs text-text-secondary hidden sm:block">Datos básicos del producto</p>
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
                  Receta
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Ingredientes y costos</p>
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

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <!-- Product Name -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  v-model="form.name"
                  placeholder="Ej: Pizza Margarita"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                  required
                />
              </div>

              <!-- Description -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Descripción
                </label>
                <textarea
                  v-model="form.description"
                  placeholder="Describe tu producto..."
                  rows="3"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary resize-none"
                />
              </div>

              <!-- Category -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Categoría *
                </label>
                <select
                  v-model="form.category_id"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-surface"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </div>

              <!-- Preparation Time -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Tiempo de Preparación (min)
                </label>
                <input
                  type="number"
                  v-model.number="form.preparation_time"
                  placeholder="15"
                  min="0"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                />
              </div>

              <!-- Price -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Precio de Venta *
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    type="number"
                    v-model.number="form.price"
                    placeholder="25000"
                    min="0"
                    step="100"
                    class="w-full pl-8 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                    required
                  />
                </div>
              </div>

              <!-- Checkboxes -->
              <div class="space-y-3">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.is_available"
                    class="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  />
                  <span class="text-sm font-medium text-text-primary">Disponible para venta</span>
                </label>

                <!-- REMOVED: Controlar stock - Now ALL products control inventory automatically -->

                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.is_combo"
                    class="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  />
                  <span class="text-sm font-medium text-text-primary">Es combo</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Receta / Ingredientes -->
        <div v-else-if="currentStep === 2" key="step-2" class="bg-surface border border-border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4">Receta / Ingredientes</h3>

            <!-- Recetas Base (Opcional) -->
            <div class="mb-6">
              <div class="flex justify-between items-center mb-2">
                <label class="block text-sm font-medium text-text-primary">
                  Recetas Base (Opcional)
                </label>
                <button
                  type="button"
                  @click="addRecipeBase"
                  class="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                >
                  + Agregar Receta Base
                </button>
              </div>
              <p class="text-xs text-text-secondary mb-3">
                Selecciona una o más recetas base para usar sus ingredientes predefinidos.
              </p>

              <!-- Lista de recetas base seleccionadas -->
              <div v-if="form.recipe_base_ids.length > 0" class="space-y-3 mb-4">
                <div
                  v-for="(recipeBaseId, index) in form.recipe_base_ids"
                  :key="index"
                  class="flex items-start gap-3 p-3 bg-surface-secondary rounded-lg border border-border"
                >
                  <div class="flex-1">
                    <select
                      v-model="form.recipe_base_ids[index]"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
                      @change="onRecipeBaseChange"
                    >
                      <option value="">Seleccionar receta base...</option>
                      <option v-for="recipe in recipeBases" :key="recipe.id" :value="recipe.id">
                        {{ recipe.name }}
                      </option>
                    </select>

                    <!-- Ingredientes de esta receta base -->
                    <div v-if="recipeBaseId && getRecipeBaseIngredients(recipeBaseId).length > 0" class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <div class="text-xs space-y-1">
                        <div
                          v-for="ing in getRecipeBaseIngredients(recipeBaseId)"
                          :key="ing.id"
                          class="flex justify-between text-text-secondary"
                        >
                          <span>{{ ing.ingredient_name }}</span>
                          <span>{{ ing.base_quantity }} {{ ing.unit }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="removeRecipeBase(index)"
                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar receta base"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else class="text-center py-6 text-text-secondary border border-dashed border-border rounded-lg">
                <p class="text-sm">No hay recetas base agregadas</p>
                <p class="text-xs mt-1">Haz clic en "+ Agregar Receta Base" para comenzar</p>
              </div>
            </div>

            <!-- Ingredientes Adicionales -->
            <div class="flex justify-between items-center mb-4">
              <h4 class="text-sm font-semibold text-text-primary">Ingredientes Adicionales</h4>
              <button
                type="button"
                @click="addIngredient"
                class="btn-secondary px-3 sm:px-4 py-2 rounded-lg text-sm"
              >
                + Agregar Ingrediente
              </button>
            </div>

            <!-- Empty State -->
            <div v-if="form.ingredients.length === 0" class="text-center py-12 text-text-secondary">
              <svg class="w-16 h-16 mx-auto mb-4 text-titan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p class="text-base font-medium mb-1">No hay ingredientes agregados</p>
              <p class="text-sm">Agrega ingredientes para calcular el costo del producto</p>
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
                  <div class="md:col-span-5">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Ingrediente</label>
                    <select
                      v-model="ingredient.ingredient_id"
                      @change="updateIngredientCost(index)"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
                    >
                      <option value="">Seleccionar...</option>
                      <option v-for="ing in availableIngredients" :key="ing.id" :value="ing.id">
                        {{ ing.name }} ({{ formatCurrency(ing.price || 0) }}/{{ ing.unit }})
                      </option>
                    </select>
                  </div>

                  <!-- Quantity -->
                  <div class="md:col-span-3">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad</label>
                    <input
                      type="number"
                      v-model.number="ingredient.quantity"
                      @input="updateIngredientCost(index)"
                      placeholder="0"
                      min="0"
                      step="0.1"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                    />
                  </div>

                  <!-- Unit -->
                  <div class="md:col-span-3">
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
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Review - Product Summary -->
        <div v-else-if="currentStep === 3" key="step-3" class="bg-surface border border-border rounded-lg">
          <!-- Header -->
          <div class="border-b border-border p-4 sm:p-6 md:p-8">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary mb-2">NUEVO PRODUCTO</h1>
                <p class="text-xs sm:text-sm text-text-secondary">Resumen del producto a crear</p>
              </div>
            </div>
          </div>

          <!-- Product Info -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Producto</p>
                <p class="text-lg font-bold text-text-primary">{{ form.name }}</p>
                <p v-if="form.description" class="text-sm text-text-secondary mt-2">{{ form.description }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Categoría</p>
                <p class="text-base font-semibold text-text-primary">{{ getCategoryName(form.category_id) }}</p>
                <div class="flex gap-2 mt-3">
                  <UiStatusBadge
                    :value="form.is_available ? 'Disponible' : 'No disponible'"
                    format="text"
                    :variant="form.is_available ? 'success' : 'default'"
                    size="sm"
                  />
                  <UiStatusBadge
                    v-if="form.is_combo"
                    value="Combo"
                    format="text"
                    variant="info"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Pricing Information -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border bg-background/50">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 sm:mb-4">
              Información de Precios
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <p class="text-sm text-text-secondary mb-1">Precio de Venta</p>
                <p class="text-lg font-bold text-text-primary">{{ formatCurrency(form.price) }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">Costo Calculado</p>
                <p class="text-lg font-bold text-text-primary">{{ formatCurrency(calculatedCost) }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">Margen</p>
                <p class="text-lg font-bold text-crocus-600">{{ formatMarginPercent }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">Ganancia</p>
                <p class="text-lg font-bold text-crocus-600">{{ formatCurrency(marginValue) }}</p>
              </div>
            </div>
          </div>

          <!-- Recipe Bases Section -->
          <div v-if="form.recipe_base_ids.length > 0" class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border bg-blue-50/30 dark:bg-blue-900/10">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">
              Recetas Base ({{ form.recipe_base_ids.length }})
            </p>
            <div class="space-y-4">
              <div
                v-for="(recipeBaseId, index) in form.recipe_base_ids"
                :key="index"
                class="bg-white dark:bg-surface border border-blue-200 dark:border-blue-800 rounded-lg p-4"
              >
                <h4 class="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  📋 {{ getRecipeBaseName(recipeBaseId) }}
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="ing in getRecipeBaseIngredients(recipeBaseId)"
                    :key="ing.id"
                    class="flex justify-between text-sm py-1 border-b border-border last:border-0"
                  >
                    <span class="text-text-primary">{{ ing.ingredient_name }}</span>
                    <span class="text-text-secondary">{{ ing.base_quantity }} {{ ing.unit }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ingredients Table -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">
              Ingredientes Adicionales ({{ form.ingredients.length }})
            </p>

            <!-- Mobile: Cards View -->
            <div class="md:hidden space-y-3">
              <div
                v-for="(ingredient, index) in form.ingredients"
                :key="index"
                class="border border-border rounded-lg p-3 bg-background"
              >
                <div class="mb-2">
                  <p class="font-medium text-text-primary text-sm">{{ getIngredientName(ingredient.ingredient_id) }}</p>
                </div>
                <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                  <div>
                    <p class="text-xs text-text-secondary mb-1">Cantidad</p>
                    <p class="text-sm text-text-primary font-semibold">
                      {{ ingredient.quantity }} {{ ingredient.unit }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-text-secondary mb-1">Costo</p>
                    <p class="text-sm text-text-primary font-semibold">
                      {{ formatCurrency(getIngredientCost(ingredient)) }}
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
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Cantidad
                  </th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Costo Unitario
                  </th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Costo Total
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
                  </td>
                  <td class="text-right py-4 text-text-primary font-semibold">
                    {{ ingredient.quantity }} {{ ingredient.unit }}
                  </td>
                  <td class="text-right py-4 text-text-secondary text-sm">
                    {{ formatCurrency(getIngredientUnitCost(ingredient.ingredient_id)) }}
                  </td>
                  <td class="text-right py-4 text-text-primary font-semibold">
                    {{ formatCurrency(getIngredientCost(ingredient)) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-border">
                  <td colspan="3" class="py-4 text-right font-semibold text-text-primary">
                    COSTO TOTAL:
                  </td>
                  <td class="py-4 text-right text-xl font-bold text-text-primary">
                    {{ formatCurrency(calculatedCost) }}
                  </td>
                </tr>
              </tfoot>
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
            @click="submitProduct"
            :disabled="isSubmitting"
            class="btn-primary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear Producto
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Crear Producto' })

const router = useRouter()
const { currentTenant } = useTenantReactive()

// State
const currentStep = ref(1)
const isSubmitting = ref(false)

// Form data
const form = ref({
  name: '',
  description: '',
  price: 0,
  category_id: '',
  recipe_base_ids: [] as string[],
  preparation_time: null,
  controla_stock: true,
  is_available: true,
  is_combo: false,
  allow_modifiers: true,
  ingredients: [] as Array<{
    ingredient_id: string
    quantity: number
    unit: string
  }>,
  tenant_id: currentTenant.value?.id || ''
})

// Fetch categories
const { data: categoriesData } = useAsyncData(
  `categories-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/categories'),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

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

// Fetch recipe bases
const { data: recipeBasesData } = useAsyncData(
  `recipe-bases-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/recipe-bases', {
    query: {
      limit: 250,
      is_active: true,
      include_ingredients: true
    }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Computed
const categories = computed(() => categoriesData.value?.data || [])
const availableIngredients = computed(() => ingredientsData.value?.data || [])
const recipeBases = computed(() => recipeBasesData.value?.data || [])

// Computed: Get all ingredients from all selected recipe bases
const selectedRecipeBaseIngredients = computed(() => {
  const allIngredients: any[] = []
  form.value.recipe_base_ids.forEach((recipeBaseId: string) => {
    if (recipeBaseId) {
      const selectedRecipe = recipeBases.value.find((r: any) => r.id === recipeBaseId)
      if (selectedRecipe?.ingredients) {
        allIngredients.push(...selectedRecipe.ingredients)
      }
    }
  })
  return allIngredients
})

const isLoadingData = computed(() => {
  return !categoriesData.value || !ingredientsData.value
})

const calculatedCost = computed(() => {
  let totalCost = 0

  // Add cost from all recipe base ingredients
  if (selectedRecipeBaseIngredients.value.length > 0) {
    totalCost += selectedRecipeBaseIngredients.value.reduce((sum: number, ing: any) => {
      const ingredient = availableIngredients.value.find((i: any) => i.id === ing.ingredient_id)
      return sum + (ing.base_quantity * Number(ingredient?.costo_unitario || ingredient?.price || 0))
    }, 0)
  }

  // Add cost from additional ingredients
  totalCost += form.value.ingredients.reduce((sum, ing) => {
    const ingredient = availableIngredients.value.find((i: any) => i.id === ing.ingredient_id)
    if (!ingredient) return sum
    return sum + (ing.quantity * (ingredient.price || 0))
  }, 0)

  return totalCost
})

const marginValue = computed(() => {
  return form.value.price - calculatedCost.value
})

const formatMarginPercent = computed(() => {
  if (!form.value.price || !calculatedCost.value) return '—'
  const margin = ((form.value.price - calculatedCost.value) / calculatedCost.value * 100)
  return `${margin.toFixed(1)}%`
})

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return form.value.name && form.value.category_id && form.value.price > 0
  }
  return true
})

// Methods
function getCategoryName(categoryId: string) {
  const category = categories.value.find((c: any) => c.id === categoryId)
  return category?.name || ''
}

function getIngredientName(ingredientId: string) {
  const ingredient = availableIngredients.value.find((i: any) => i.id === ingredientId)
  return ingredient?.name || 'Ingrediente desconocido'
}

function getIngredientUnitCost(ingredientId: string) {
  const ingredient = availableIngredients.value.find((i: any) => i.id === ingredientId)
  return ingredient?.price || 0
}

function getIngredientCost(ingredient: any) {
  const ing = availableIngredients.value.find((i: any) => i.id === ingredient.ingredient_id)
  if (!ing) return 0
  return ingredient.quantity * (ing.price || 0)
}

function addIngredient() {
  form.value.ingredients.push({
    ingredient_id: '',
    quantity: 0,
    unit: 'g'
  })
}

function removeIngredient(index: number) {
  form.value.ingredients.splice(index, 1)
}

function updateIngredientCost(index: number) {
  form.value.ingredients = [...form.value.ingredients]
}

function addRecipeBase() {
  form.value.recipe_base_ids.push('')
}

function removeRecipeBase(index: number) {
  form.value.recipe_base_ids.splice(index, 1)
}

function getRecipeBaseIngredients(recipeBaseId: string) {
  if (!recipeBaseId) return []
  const recipe = recipeBases.value.find((r: any) => r.id === recipeBaseId)
  return recipe?.ingredients || []
}

function getRecipeBaseName(recipeBaseId: string) {
  if (!recipeBaseId) return 'Receta sin nombre'
  const recipe = recipeBases.value.find((r: any) => r.id === recipeBaseId)
  return recipe?.name || 'Receta sin nombre'
}

function onRecipeBaseChange() {
  // Trigger reactivity when recipe base changes
  console.log('Recipe bases:', form.value.recipe_base_ids)
}

function handleNext() {
  if (canProceed.value && currentStep.value < 3) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function submitProduct() {
  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    // Validate no duplicate recipe bases
    const recipeBaseIds = form.value.recipe_base_ids.filter(id => id !== '')
    const uniqueRecipeBaseIds = [...new Set(recipeBaseIds)]

    if (recipeBaseIds.length !== uniqueRecipeBaseIds.length) {
      alert('Error: No puedes agregar la misma receta base más de una vez')
      isSubmitting.value = false
      return
    }

    form.value.tenant_id = currentTenant.value?.id || ''

    // Filter out empty recipe base IDs before sending
    const cleanedForm = {
      ...form.value,
      recipe_base_ids: uniqueRecipeBaseIds
    }

    await $fetch('/api/menu/products', {
      method: 'POST',
      body: cleanedForm
    })

    router.push('/menu/productos')
  } catch (error: any) {
    console.error('Error creating product:', error)
    alert(`Error al crear el producto: ${error.message || 'Por favor intenta de nuevo.'}`)
  } finally {
    isSubmitting.value = false
  }
}

function formatCurrency(value: number) {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
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
