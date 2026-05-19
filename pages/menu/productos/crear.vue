<template>
  <div class="page-layout">
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
    <div v-else>
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
                  class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                  :class="nameError ? 'border-destructive focus:ring-destructive' : 'border-border'"
                  required
                  @input="nameError = ''"
                />
                <p v-if="nameError" role="alert" class="text-xs text-destructive mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                  {{ nameError }}
                </p>
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

              <!-- Image (issue #465) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">Imagen</label>
                <div class="flex items-center gap-4">
                  <div class="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-surface-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img
                      v-if="form.image_url"
                      :src="form.image_url"
                      :alt="form.name || 'Imagen del producto'"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <svg v-else class="w-8 h-8 text-text-secondary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div class="flex flex-col gap-2">
                    <button
                      type="button"
                      @click="showImageModal = true"
                      class="min-h-[44px] px-3 py-2 text-sm border border-border rounded-lg hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {{ form.image_url ? 'Cambiar imagen' : 'Subir imagen' }}
                    </button>
                    <button
                      v-if="form.image_url"
                      type="button"
                      @click="form.image_url = ''"
                      class="text-xs text-destructive hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>

              <!-- Category — search + inline create (issue #458) -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Categoría *
                </label>
                <UiCategorySearchInput
                  :allow-create="true"
                  :initial-value="selectedCategoryName"
                  placeholder="Buscar o crear categoría..."
                  @select="onCategorySelected"
                  @create="onCategoryCreateRequested"
                />
              </div>

              <!-- Inherited kitchen station (read-only, comandas only) -->
              <div v-if="businessProfile?.comandas_enabled">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Cocina heredada
                </label>
                <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm">
                  <template v-if="inheritedStation">
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: inheritedStation.color ?? '#94a3b8' }" />
                    <span class="font-semibold text-text-primary">{{ inheritedStation.name }}</span>
                    <span class="text-text-tertiary text-xs ml-1">(vía categoría)</span>
                  </template>
                  <template v-else>
                    <span class="text-text-tertiary">Sin comanda — asigna una estación a la categoría</span>
                    <button
                      type="button"
                      @click="showNewStationModal = true"
                      class="ml-auto text-xs font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-2 py-1"
                    >
                      + Crear estación
                    </button>
                  </template>
                </div>
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

                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.is_available_online"
                    class="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  />
                  <div>
                    <span class="text-sm font-medium text-text-primary">Disponible para domicilios</span>
                    <p class="text-xs text-text-secondary mt-0.5">Aparece en el menú de pedidos online (delivery/pickup)</p>
                  </div>
                </label>

                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.is_available_table_qr"
                    class="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  />
                  <div>
                    <span class="text-sm font-medium text-text-primary">Pedido en mesa (QR)</span>
                    <p class="text-xs text-text-secondary mt-0.5">Independiente de domicilios. Solo aparece en el menú QR de la mesa.</p>
                  </div>
                </label>

                <!-- REMOVED: Controlar stock - Now ALL products control inventory automatically -->
                <!-- REMOVED: Es combo - Combos are now managed through product_base_recipes -->
              </div>
            </div>

            <!-- Categoría de Impuesto — solo visible cuando el tenant tiene impuestos activos -->
            <div v-if="hasTaxes" class="mt-6">
              <h4 class="text-sm font-semibold text-text-primary mb-1">Categoría de Impuesto</h4>
              <p class="text-sm text-text-secondary mb-3">
                Define cómo se aplica el impuesto a este producto según la configuración del negocio.
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" aria-label="Categoría de impuesto">
                <button
                  type="button"
                  @click="form.tax_category = 'standard'"
                  :class="[
                    'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                    form.tax_category === 'standard'
                      ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                      : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                  ]"
                >
                  <span class="text-sm font-semibold">Alimento / Bebida</span>
                  <span class="text-xs leading-snug">INC 8% o IVA 19% según configuración del negocio</span>
                </button>
                <button
                  type="button"
                  @click="form.tax_category = 'liquor'"
                  :class="[
                    'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                    form.tax_category === 'liquor'
                      ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                      : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                  ]"
                >
                  <span class="text-sm font-semibold">Licor para llevar</span>
                  <span class="text-xs leading-snug">IVA licores 5% — botellas o licores para llevar</span>
                </button>
                <button
                  type="button"
                  @click="form.tax_category = 'exempt'"
                  :class="[
                    'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                    form.tax_category === 'exempt'
                      ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                      : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                  ]"
                >
                  <span class="text-sm font-semibold">Exento</span>
                  <span class="text-xs leading-snug">Sin impuesto — alimentos básicos sin transformación</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Receta / Ingredientes -->
        <div v-else-if="currentStep === 2" key="step-2" class="bg-surface border border-border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4">Receta / Ingredientes</h3>

            <!-- Toggle: ¿Este producto controla inventario? -->
            <div class="flex items-start gap-3 p-4 mb-6 bg-surface-secondary border border-border rounded-lg">
              <button
                type="button"
                role="switch"
                :aria-checked="tracksInventory"
                @click="tracksInventory = !tracksInventory"
                :class="[
                  'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  tracksInventory ? 'bg-primary' : 'bg-border'
                ]"
              >
                <span
                  :class="[
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    tracksInventory ? 'translate-x-5' : 'translate-x-0.5'
                  ]"
                />
              </button>
              <div class="flex-1">
                <p class="text-sm font-semibold text-text-primary">Este producto controla inventario</p>
                <p class="text-xs text-text-secondary mt-1">
                  <template v-if="tracksInventory">
                    Define la receta del producto. Cada venta descontará los ingredientes del inventario.
                  </template>
                  <template v-else>
                    No se descontará nada del inventario al venderlo. Útil para servicios (cargo de domicilio, propina), promos o productos sin trazabilidad de costo.
                  </template>
                </p>
              </div>
            </div>

            <!-- Recetas Base (Opcional) -->
            <template v-if="tracksInventory">
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
              <div v-if="form.recipe_bases.length > 0" class="space-y-3 mb-4">
                <div
                  v-for="(link, index) in form.recipe_bases"
                  :key="index"
                  class="flex items-start gap-3 p-3 bg-surface-secondary rounded-lg border border-border"
                >
                  <div class="flex-1">
                    <div class="flex flex-col sm:flex-row gap-2">
                      <select
                        v-model="link.recipe_base_id"
                        class="flex-1 min-h-[44px] px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
                        @change="onRecipeBaseChange"
                        :aria-label="`Receta base ${index + 1}`"
                      >
                        <option value="">Seleccionar receta base...</option>
                        <option v-for="recipe in recipeBases" :key="recipe.id" :value="recipe.id">
                          {{ recipe.name }}
                        </option>
                      </select>
                      <div class="flex items-center gap-1.5 sm:w-32">
                        <input
                          v-model.number="link.quantity"
                          type="number"
                          min="0"
                          step="any"
                          inputmode="decimal"
                          class="w-full min-h-[44px] px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
                          :aria-label="`Cantidad de la receta ${index + 1}`"
                          :title="'Cuántas unidades de esta receta consume el producto (ej. 2× = doble del rendimiento)'"
                        />
                        <span class="text-xs text-text-secondary whitespace-nowrap">× receta</span>
                      </div>
                    </div>

                    <!-- Ingredientes de esta receta base -->
                    <div v-if="link.recipe_base_id && getRecipeBaseIngredients(link.recipe_base_id).length > 0" class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <div class="text-xs space-y-1">
                        <div
                          v-for="ing in getRecipeBaseIngredients(link.recipe_base_id)"
                          :key="ing.id"
                          class="flex justify-between text-text-secondary"
                        >
                          <span>{{ ing.ingredient_name }}</span>
                          <span>{{ (Number(ing.base_quantity) * (Number(link.quantity) || 1)).toFixed(2) }} {{ ing.unit }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="removeRecipeBase(index)"
                    class="min-h-[44px] min-w-[44px] p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    :aria-label="`Eliminar receta base ${index + 1}`"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                    <UiIngredientSearchInput
                      :allow-create="true"
                      @select="(ing) => selectIngredient(ing, index)"
                      @create="(name) => openCustomIngModal(name, index)"
                    />
                  </div>

                  <!-- Quantity -->
                  <div class="md:col-span-3">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad</label>
                    <input
                      type="number"
                      v-model.number="ingredient.quantity"
                      @input="updateIngredientCost(index)"
                      placeholder="0"
                      min="0.01"
                      step="any"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                    />
                  </div>

                  <!-- Unit -->
                  <div class="md:col-span-3">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Unidad</label>
                    <div class="relative">
                      <select
                        v-model="ingredient.unit"
                        :disabled="loadingUnits.has(ingredient.ingredient_id)"
                        class="w-full py-2 pr-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface disabled:opacity-50"
                        :class="loadingUnits.has(ingredient.ingredient_id) ? 'pl-7' : 'pl-3'"
                      >
                        <option
                          v-for="opt in getIngredientUnitOptions(ingredient.ingredient_id)"
                          :key="opt.value"
                          :value="opt.value"
                        >
                          {{ opt.label }}
                        </option>
                      </select>
                      <span v-if="loadingUnits.has(ingredient.ingredient_id)" class="absolute left-2 top-2.5 pointer-events-none text-text-secondary">
                        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                      </span>
                    </div>
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
            </template>
          </div>
        </div>

        <!-- Step 3: Review - Product Summary -->
        <div v-else-if="currentStep === 3" key="step-3">
          <!-- Header compacto -->
          <div class="bg-surface border border-border rounded-lg px-4 sm:px-6 py-3 mb-3 flex items-center justify-between">
            <div>
              <p class="text-xs text-text-secondary uppercase tracking-wide font-semibold">Nuevo Producto · Resumen</p>
              <p class="text-base font-bold text-text-primary">{{ form.name }}</p>
            </div>
            <p class="text-xs text-text-secondary">{{ new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) }}</p>
          </div>

          <!-- Layout dos columnas -->
          <div class="flex flex-col lg:flex-row gap-4 items-start">

            <!-- Columna izquierda: recetas + ingredientes -->
            <div class="w-full lg:flex-1 space-y-4">

              <!-- Recetas Base -->
              <div v-if="form.recipe_bases.length > 0" class="bg-surface border border-border rounded-lg p-4">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Recetas Base ({{ form.recipe_bases.length }})
                </p>
                <div class="space-y-3">
                  <div
                    v-for="(link, index) in form.recipe_bases"
                    :key="index"
                    class="border border-border rounded-lg p-3 bg-background"
                  >
                    <h4 class="font-semibold text-text-primary mb-2 flex items-center gap-2 text-sm">
                      📋 {{ getRecipeBaseName(link.recipe_base_id) }}
                      <span v-if="Number(link.quantity) !== 1" class="text-xs font-normal text-text-secondary">
                        × {{ Number(link.quantity) }}
                      </span>
                    </h4>
                    <div class="space-y-1">
                      <div
                        v-for="ing in getRecipeBaseIngredients(link.recipe_base_id)"
                        :key="ing.id"
                        class="flex justify-between text-xs py-1 border-b border-border last:border-0"
                      >
                        <span class="text-text-primary">{{ ing.ingredient_name }}</span>
                        <span class="text-text-secondary">{{ (Number(ing.base_quantity) * (Number(link.quantity) || 1)).toFixed(2) }} {{ ing.unit }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Ingredientes adicionales -->
              <div class="bg-surface border border-border rounded-lg p-4">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Ingredientes Adicionales ({{ form.ingredients.length }})
                </p>
                <div v-if="form.ingredients.length === 0" class="text-sm text-text-secondary">
                  Sin ingredientes adicionales
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="(ingredient, index) in form.ingredients"
                    :key="index"
                    class="flex items-center justify-between p-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <span class="font-medium text-text-primary">{{ getIngredientName(ingredient.ingredient_id) }}</span>
                    <div class="flex items-center gap-4 text-text-secondary">
                      <span>{{ ingredient.quantity }} {{ ingredient.unit }}</span>
                      <span class="font-semibold text-text-primary">{{ formatCurrency(getIngredientCost(ingredient)) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Columna derecha: info + precios -->
            <div class="w-full lg:w-72 xl:w-80 space-y-4 lg:sticky lg:top-4">

              <!-- Producto -->
              <div class="bg-surface border border-border rounded-lg p-4">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Producto</p>
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Categoría</span>
                    <span class="text-sm font-semibold text-text-primary">{{ getCategoryName(form.category_id) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Disponible</span>
                    <UiStatusBadge
                      :value="form.is_available ? 'Disponible' : 'No disponible'"
                      format="text"
                      :variant="form.is_available ? 'success' : 'default'"
                      size="sm"
                    />
                  </div>
                  <div v-if="form.description" class="pt-2 border-t border-border">
                    <p class="text-xs text-text-secondary">{{ form.description }}</p>
                  </div>
                </div>
              </div>

              <!-- Precios -->
              <div class="bg-surface border border-border rounded-lg p-4">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Información de Precios</p>
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Precio de Venta</span>
                    <span class="text-sm font-bold text-text-primary">{{ formatCurrency(form.price) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Costo Calculado</span>
                    <span class="text-sm font-semibold text-text-primary">
                      {{ calculatedCost === null ? '—' : formatCurrency(calculatedCost) }}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Margen</span>
                    <span class="text-sm font-semibold text-crocus-600">{{ formatMarginPercent }}</span>
                  </div>
                  <div class="flex justify-between items-center pt-2 border-t border-border">
                    <span class="text-sm font-semibold text-text-primary">Ganancia</span>
                    <span class="text-base font-bold text-crocus-600">
                      {{ marginValue === null ? '—' : formatCurrency(marginValue) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </Transition>

      </form>

      <!-- Navigation Buttons -->
      <div class="bg-surface border-t border-border shadow-lg mt-6">
        <div class="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
          <div class="flex justify-between items-center gap-3">
            <button
              v-if="currentStep > 1"
              type="button"
              @click="previousStep"
              class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
            >
              <span class="hidden sm:inline">← Anterior</span>
              <span class="sm:hidden">←</span>
            </button>
            <NuxtLink
              v-else
              to="/menu/productos"
              class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
            >
              Cancelar
            </NuxtLink>

            <button
              v-if="currentStep < 3"
              type="button"
              @click="handleNext"
              :disabled="!canProceed"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg transition-opacity text-sm sm:text-base"
              :class="{ 'opacity-50 cursor-not-allowed': !canProceed }"
            >
              <span class="hidden sm:inline">Siguiente →</span>
              <span class="sm:hidden">→</span>
            </button>
            <div v-else class="flex flex-col items-end gap-2">
              <p v-if="submitError" role="alert" class="text-sm text-destructive">{{ submitError }}</p>
              <button
                type="button"
                @click="submitProduct"
                :disabled="isSubmitting"
                class="btn-primary px-4 sm:px-6 py-2 rounded-lg transition-opacity text-sm sm:text-base"
                :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }"
              >
                <span class="hidden sm:inline">{{ isSubmitting ? 'Creando...' : 'Crear Producto' }}</span>
                <span class="sm:hidden">{{ isSubmitting ? '...' : 'Crear' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <IngredientesIngredientePropioPanel
      v-model="showCustomIngModal"
      :initial-name="customIngModalName"
      @saved="onCustomIngredientCreated"
    />

    <CategoriasCategoriaPanel
      v-model="showNewCategoryModal"
      :initial-name="newCategoryName"
      @saved="onCategoryCreated"
    />

    <CocinaStationPanel
      v-model="showNewStationModal"
      @saved="onStationCreated"
    />

    <CommonsImageUploadModal
      v-if="showImageModal"
      image-type="product"
      upload-endpoint="/api/menu/products/upload-image"
      @upload="onImageUploaded"
      @close="showImageModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryCache } from '@pinia/colada'
import { useMenuIngredientsQuery } from '@/composables/queries/useMenuIngredients'
import { useActiveStationsQuery } from '@/composables/queries/useActiveStations'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Crear Producto' })

const router = useRouter()
const cache = useQueryCache()
const toast = useToast()
const { currentTenant, businessProfile } = useTenantReactive()

// Tax config — only show selector when tenant has taxes enabled
const { data: taxConfigData } = useQuery({
  key: () => ['tenant', 'tax-config', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/tax-config'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const taxConfig = computed(() => taxConfigData.value?.data ?? null)
const hasTaxes = computed(() =>
  !!(taxConfig.value?.inc_applicable || taxConfig.value?.iva_applicable || taxConfig.value?.liquor_tax_applicable)
)

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const nameError = ref('')
// Toggle for "this product tracks inventory". Default ON (backward compatible).
// When OFF, Step 2 is skipped at submit (recipe_base_ids and ingredients sent empty).
const tracksInventory = ref(true)

// Form data
const form = ref({
  name: '',
  description: '',
  image_url: '',
  price: 0,
  category_id: '',
  recipe_bases: [] as Array<{ recipe_base_id: string; quantity: number }>,
  preparation_time: null,
  controla_stock: true,
  is_available: true,
  is_available_online: true,
  is_available_table_qr: false,
  is_combo: false,
  allow_modifiers: true,
  tax_category: 'standard' as 'standard' | 'liquor' | 'exempt',
  ingredients: [] as Array<{
    ingredient_id: string
    quantity: number
    unit: string
  }>,
  tenant_id: currentTenant.value?.id || '',
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

// Shared ingredients — kept for recipe-base cost calculation only (loads in background)
const { availableIngredients } = useMenuIngredientsQuery()

// Read-only: which station the selected category maps to
const { activeStations } = useActiveStationsQuery()
const { data: categoryStationsData } = useAsyncData(
  'category-stations',
  () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations/categories'),
  { server: false, watch: [currentTenant] }
)
const categoryStations = computed(() => (categoryStationsData.value as any)?.data ?? [])
const inheritedStation = computed(() => {
  if (!form.value.category_id) return null
  const mapping = categoryStations.value.find((m: any) => m.category_id === form.value.category_id)
  if (!mapping?.station_id) return null
  return activeStations.value.find((s: any) => s.id === mapping.station_id) ?? null
})

// Cache populated when user selects an ingredient via UiIngredientSearchInput
const ingredientCache = ref<Record<string, any>>({})

// Purchase units cache per ingredient
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())

// Tracks which ingredient IDs are currently fetching their purchase units
const loadingUnits = ref<Set<string>>(new Set())

const unitLabels: Record<string, string> = {
  g: 'Gramos (g)',
  gr: 'Gramos (gr)',
  kg: 'Kilogramos (kg)',
  ml: 'Mililitros (ml)',
  l: 'Litros (l)',
  u: 'Unidades (u)',
  und: 'Unidades (und)',
  lb: 'Libras (lb)',
}

function getIngredientUnitOptions(ingredientId: string) {
  if (!ingredientId) return Object.entries(unitLabels).map(([value, label]) => ({ value, label }))
  const ingredient = ingredientCache.value[ingredientId]
  const baseUnit = ingredient?.unit || 'g'
  const purchaseUnits = purchaseUnitsCache.value.get(ingredientId) || []
  const unitSet = new Set<string>([baseUnit])
  purchaseUnits.forEach((pu: any) => { if (pu.purchase_unit) unitSet.add(pu.purchase_unit) })
  return Array.from(unitSet).map(u => ({ value: u, label: unitLabels[u] || u }))
}

async function onIngredientChange(index: number, ingredientId: string) {
  if (!ingredientId) return
  const ingredient = ingredientCache.value[ingredientId]
  form.value.ingredients[index].unit = ingredient?.unit || 'g'
  if (!purchaseUnitsCache.value.has(ingredientId)) {
    loadingUnits.value = new Set([...loadingUnits.value, ingredientId])
    try {
      const res = await $fetch<any>(`/api/suppliers/ingredient-purchase-units/ingredient/${ingredientId}`)
      const updated = new Map(purchaseUnitsCache.value)
      updated.set(ingredientId, res.data || [])
      purchaseUnitsCache.value = updated
    } catch {
      const updated = new Map(purchaseUnitsCache.value)
      updated.set(ingredientId, [])
      purchaseUnitsCache.value = updated
    } finally {
      const next = new Set(loadingUnits.value)
      next.delete(ingredientId)
      loadingUnits.value = next
    }
  }
}

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
const recipeBases = computed(() => recipeBasesData.value?.data || [])

// Computed: Get all ingredients from all selected recipe bases
// Issue #517: each ingredient quantity is multiplied by the per-product
// recipe quantity so the cost preview matches what the backend computes.
const selectedRecipeBaseIngredients = computed(() => {
  const allIngredients: any[] = []
  form.value.recipe_bases.forEach(link => {
    if (!link.recipe_base_id) return
    const selectedRecipe = recipeBases.value.find((r: any) => r.id === link.recipe_base_id)
    if (!selectedRecipe?.ingredients) return
    const multiplier = Number(link.quantity) || 1
    selectedRecipe.ingredients.forEach((ing: any) => {
      allIngredients.push({
        ...ing,
        base_quantity: Number(ing.base_quantity) * multiplier,
      })
    })
  })
  return allIngredients
})

const isLoadingData = computed(() => {
  return !categoriesData.value
})

// Returns null when the product has no recipe (toggle off or empty lists).
// null is rendered as "—" in the UI and means "no aplica" in cost reports.
const calculatedCost = computed<number | null>(() => {
  if (!tracksInventory.value) return null
  if (
    selectedRecipeBaseIngredients.value.length === 0 &&
    form.value.ingredients.length === 0
  ) {
    return null
  }

  let totalCost = 0

  if (selectedRecipeBaseIngredients.value.length > 0) {
    totalCost += selectedRecipeBaseIngredients.value.reduce((sum: number, ing: any) => {
      const ingredient = availableIngredients.value.find((i: any) => i.id === ing.ingredient_id)
      return sum + (ing.base_quantity * Number(ingredient?.costo_unitario || ingredient?.price || 0))
    }, 0)
  }

  totalCost += form.value.ingredients.reduce((sum, ing) => {
    const cached = ingredientCache.value[ing.ingredient_id]
    const ingredient = cached || availableIngredients.value.find((i: any) => i.id === ing.ingredient_id)
    if (!ingredient) return sum
    return sum + (ing.quantity * (ingredient.price || 0))
  }, 0)

  return totalCost
})

const marginValue = computed<number | null>(() => {
  if (calculatedCost.value === null) return null
  return form.value.price - calculatedCost.value
})

const formatMarginPercent = computed(() => {
  const cost = calculatedCost.value
  if (!form.value.price || cost === null || cost <= 0) return '—'
  const margin = ((form.value.price - cost) / cost * 100)
  return `${margin.toFixed(1)}%`
})

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return form.value.name && form.value.category_id && form.value.price > 0
  }
  if (currentStep.value === 2) {
    // Toggle off → no recipe required, can always proceed
    if (!tracksInventory.value) return true
    return form.value.ingredients.length === 0 ||
           form.value.ingredients.every(i => i.ingredient_id && i.quantity > 0)
  }
  return true
})

// Methods
function getCategoryName(categoryId: string) {
  const category = categories.value.find((c: any) => c.id === categoryId)
  return category?.name || ''
}

function getIngredientName(ingredientId: string) {
  const cached = ingredientCache.value[ingredientId]
  if (cached) return cached.name
  const ing = availableIngredients.value.find((i: any) => i.id === ingredientId)
  return ing?.name || 'Ingrediente desconocido'
}

function getIngredientCost(ingredient: any) {
  const cached = ingredientCache.value[ingredient.ingredient_id]
  if (cached) return ingredient.quantity * (cached.price || 0)
  const ing = availableIngredients.value.find((i: any) => i.id === ingredient.ingredient_id)
  if (!ing) return 0
  return ingredient.quantity * (ing.price || 0)
}

function selectIngredient(ing: any, index: number) {
  form.value.ingredients[index].ingredient_id = ing.id
  ingredientCache.value[ing.id] = ing
  onIngredientChange(index, ing.id)
  form.value.ingredients = [...form.value.ingredients]
}

const showCustomIngModal = ref(false)
const customIngModalName = ref('')
const customIngModalIndex = ref(-1)

function openCustomIngModal(name: string, index: number) {
  customIngModalIndex.value = index
  customIngModalName.value = name
  showCustomIngModal.value = true
}

function onCustomIngredientCreated(ingredient: any) {
  const index = customIngModalIndex.value
  if (index < 0 || index >= form.value.ingredients.length) return
  selectIngredient(ingredient, index)
  customIngModalIndex.value = -1
}

// ── Category search + create flow (issue #458) ────────────────────────────
const showNewCategoryModal = ref(false)
const newCategoryName = ref('')
const selectedCategoryName = ref('')

function onCategorySelected(cat: { id: string; name: string }) {
  form.value.category_id = cat.id
  selectedCategoryName.value = cat.name
}

function onCategoryCreateRequested(typedName: string) {
  newCategoryName.value = typedName
  showNewCategoryModal.value = true
}

function onCategoryCreated(cat: { id: string; name: string }) {
  form.value.category_id = cat.id
  selectedCategoryName.value = cat.name
}

// ── Image upload (issue #465) ─────────────────────────────────────────────
const showImageModal = ref(false)

function onImageUploaded(url: string) {
  form.value.image_url = url
  showImageModal.value = false
}

// ── Kitchen station inline create flow (issue #463) ───────────────────────
const showNewStationModal = ref(false)

function onStationCreated(station: { id: string; name: string }) {
  toast.success(
    `Estación "${station.name}" creada. Asígnala a una categoría desde Operaciones › Comandas.`,
    { title: 'Estación creada' }
  )
  cache.invalidateQueries({ key: ['tenant', 'stations', currentTenant.value?.id] })
  cache.invalidateQueries({ key: ['tenant', 'category-stations', currentTenant.value?.id] })
}

function addIngredient() {
  // Adding an ingredient implies the product tracks inventory.
  tracksInventory.value = true
  form.value.ingredients.push({
    ingredient_id: '',
    quantity: 0,
    unit: 'g'
  })
}

function removeIngredient(index: number) {
  form.value.ingredients.splice(index, 1)
}


function addRecipeBase() {
  // Adding a recipe base implies the product tracks inventory.
  tracksInventory.value = true
  form.value.recipe_bases.push({ recipe_base_id: '', quantity: 1 })
}

function removeRecipeBase(index: number) {
  form.value.recipe_bases.splice(index, 1)
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
  console.log('Recipe bases:', form.value.recipe_bases)
}

async function handleNext() {
  if (!canProceed.value || currentStep.value >= 3) return
  if (currentStep.value === 1) {
    const res = await $fetch<{ available: boolean }>(`/api/menu/check-name?entity=products&name=${encodeURIComponent(form.value.name.trim())}`)
    if (!res.available) {
      nameError.value = 'Ya existe un producto con ese nombre.'
      return
    }
  }
  currentStep.value++
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function submitProduct() {
  if (isSubmitting.value) return

  isSubmitting.value = true
  submitError.value = null

  try {
    // Validate no duplicate recipe bases and positive quantity
    const validLinks = form.value.recipe_bases.filter(l => l.recipe_base_id !== '')
    const seenIds = new Set<string>()
    for (const link of validLinks) {
      if (seenIds.has(link.recipe_base_id)) {
        submitError.value = 'No puedes agregar la misma receta base más de una vez.'
        isSubmitting.value = false
        return
      }
      if (!Number.isFinite(Number(link.quantity)) || Number(link.quantity) <= 0) {
        submitError.value = 'La cantidad de cada receta debe ser mayor que 0.'
        isSubmitting.value = false
        return
      }
      seenIds.add(link.recipe_base_id)
    }

    form.value.tenant_id = currentTenant.value?.id || ''

    // When toggle is OFF, force empty recipe arrays — product won't track inventory.
    // Normalise image_url empty string → null so backend stores NULL (issue #465).
    // recipe_bases is the new shape (Issue #517); recipe_base_ids is kept for
    // backwards compat with any older backend / proxy that still expects it.
    const cleanedRecipeBases = tracksInventory.value
      ? validLinks.map(l => ({ recipe_base_id: l.recipe_base_id, quantity: Number(l.quantity) }))
      : []
    const cleanedForm = {
      ...form.value,
      recipe_bases: cleanedRecipeBases,
      recipe_base_ids: cleanedRecipeBases.map(l => l.recipe_base_id),
      ingredients: tracksInventory.value ? form.value.ingredients : [],
      image_url: form.value.image_url || null,
    }

    await $fetch('/api/menu/products', {
      method: 'POST',
      body: cleanedForm
    })

    cache.invalidateQueries()

    await router.push('/menu/productos')
  } catch (error: any) {
    console.error('Error creating product:', error)
    const detail = error.data?.detail
    if (Array.isArray(detail)) {
      submitError.value = 'Error de validación: revisa que todos los campos estén completos y con valores válidos.'
    } else {
      submitError.value = detail || error.message || 'Error al crear el producto. Por favor intenta de nuevo.'
    }
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
