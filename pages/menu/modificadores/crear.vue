<template>
  <div class="w-full">
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Creando grupo de modificadores...</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <div class="inline-flex items-center gap-2 text-text-secondary">
        <UiLoadingDots size="12px" />
        <span class="text-sm">Cargando datos...</span>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex w-full flex-col">
      <!-- Header Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-4 sm:p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <!-- Group Name -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Nuevo Grupo</p>
                <p class="text-lg font-semibold text-text-primary">{{ form.name || 'Sin nombre' }}</p>
              </div>
            </div>

            <!-- Products -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Productos</p>
                <p class="text-sm sm:text-lg font-semibold text-text-primary">{{ getSelectedProductsText() }}</p>
              </div>
            </div>

            <!-- Type Badge -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Tipo</p>
                <div class="pt-1">
                  <UiStatusBadge
                    :value="form.is_required ? 'Obligatorio' : 'Opcional'"
                    format="text"
                    :variant="form.is_required ? 'warning' : 'secondary'"
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
                  <span class="hidden sm:inline">Información del Grupo</span>
                  <span class="sm:hidden">Info</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Configuración básica</p>
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
                  Modificadores
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Opciones disponibles</p>
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
                  <span class="hidden sm:inline">Revisión</span>
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
        <!-- Step 1: Información del Grupo -->
        <Transition name="fade" mode="out-in">
        <div v-if="currentStep === 1" key="step-1" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6">Información del Grupo</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <!-- Products Selection (Multi-select) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Productos * <span class="text-text-secondary font-normal">(selecciona uno o más)</span>
                </label>
                <div class="border border-border rounded-lg p-3 max-h-60 overflow-y-auto bg-surface">
                  <!-- Loading state -->
                  <div v-if="loadingProducts" class="flex items-center justify-center py-8">
                    <div class="inline-flex items-center gap-2 text-text-secondary">
                      <UiLoadingDots size="10px" />
                      <span class="text-sm">Cargando productos...</span>
                    </div>
                  </div>
                  <!-- Empty state -->
                  <div v-else-if="products.length === 0" class="text-center py-4 text-text-secondary text-sm">
                    No hay productos disponibles
                  </div>
                  <!-- Products list -->
                  <div v-else class="space-y-2">
                    <label
                      v-for="product in products"
                      :key="product.id"
                      class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors"
                      :class="{ 'bg-primary/5 border border-primary/20': form.product_ids.includes(product.id) }"
                    >
                      <input
                        type="checkbox"
                        :value="product.id"
                        v-model="form.product_ids"
                        class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span class="text-sm text-text-primary">{{ product.name }}</span>
                      <span v-if="product.category?.name" class="text-xs text-text-secondary ml-auto">
                        {{ product.category.name }}
                      </span>
                    </label>
                  </div>
                </div>
                <p class="text-xs text-text-secondary mt-1">
                  {{ form.product_ids.length }} producto(s) seleccionado(s)
                </p>
              </div>

              <!-- Group Name -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  v-model="form.name"
                  placeholder="Ej: Extras, Tamaño, Sin..."
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

              <!-- Min Qty -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Selección Mínima *
                </label>
                <input
                  type="number"
                  v-model.number="form.min_qty"
                  placeholder="0"
                  min="0"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                  required
                />
                <p class="text-xs text-text-secondary mt-1">Cantidad mínima de opciones a seleccionar</p>
              </div>

              <!-- Max Qty -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Selección Máxima *
                </label>
                <input
                  type="number"
                  v-model.number="form.max_qty"
                  placeholder="1"
                  min="1"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                  required
                />
                <p class="text-xs text-text-secondary mt-1">Cantidad máxima de opciones a seleccionar</p>
              </div>

              <!-- Sort Order -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  v-model.number="form.sort_order"
                  placeholder="0"
                  min="0"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                />
                <p class="text-xs text-text-secondary mt-1">Menor número aparece primero</p>
              </div>

              <!-- Is Required -->
              <div class="flex items-start">
                <div class="flex items-center h-full pt-8">
                  <input
                    type="checkbox"
                    v-model="form.is_required"
                    id="is_required"
                    class="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  />
                  <label for="is_required" class="ml-3">
                    <span class="text-sm font-medium text-text-primary block">Es Obligatorio</span>
                    <span class="text-xs text-text-secondary">El cliente debe seleccionar al menos una opción</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Modificadores -->
        <div v-else-if="currentStep === 2" key="step-2" class="bg-surface border border-border rounded-lg">
          <MenuCatalogInlineCreateBusyOverlay
            :busy="inlineCatalogBusy"
            :label="inlineCatalogBusyLabel"
            :hint="inlineCatalogBusyHint"
          >
          <div class="p-4 sm:p-6">
            <MenuIngredientProductHint class="mb-4" />
            <div class="flex justify-between items-center mb-4 sm:mb-6">
              <h3 class="text-base sm:text-lg font-semibold text-text-primary">Modificadores</h3>
              <button
                type="button"
                @click="addModifier"
                class="btn-secondary px-3 sm:px-4 py-2 rounded-lg text-sm"
              >
                + Agregar Modificador
              </button>
            </div>

            <!-- Empty State -->
            <div v-if="form.modifiers.length === 0" class="text-center py-12 text-text-secondary">
              <svg class="w-16 h-16 mx-auto mb-4 text-titan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p class="text-base font-medium mb-1">No hay modificadores agregados</p>
              <p class="text-sm">Agrega opciones que los clientes puedan seleccionar</p>
            </div>

            <!-- Modifiers List -->
            <div class="space-y-4">
              <div
                v-for="(modifier, index) in form.modifiers"
                :key="index"
                class="border border-border rounded-lg p-4 bg-background"
              >
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                  <!-- Ingredient Selector -->
                  <div class="md:col-span-4">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Ingrediente o reventa *</label>
                    <UiIngredientSearchInput
                      :allow-create="true"
                      @select="(ing) => selectIngredient(modifier, ing)"
                      @create="(name) => openCustomIngModal(name, index)"
                    />
                    <!-- Show ingredient cost for reference -->
                    <p v-if="modifier.ingredient_id" class="text-xs text-text-secondary mt-1">
                      Costo: {{ formatCurrency(getIngredientById(modifier.ingredient_id)?.costo_unitario || 0) }}/{{ getIngredientById(modifier.ingredient_id)?.unit }}
                    </p>
                  </div>

                  <!-- Quantity -->
                  <div class="md:col-span-1">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad</label>
                    <input
                      type="number"
                      v-model.number="modifier.ingredient_quantity"
                      placeholder="50"
                      min="0.01"
                      step="any"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                    />
                  </div>

                  <!-- Unit -->
                  <div class="md:col-span-2">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Unidad</label>
                    <select
                      v-model="modifier.ingredient_unit"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
                    >
                      <option
                        v-for="opt in getIngredientUnitOptions(modifier.ingredient_id)"
                        :key="opt.value"
                        :value="opt.value"
                      >{{ opt.label }}</option>
                    </select>
                    <span v-if="modifier.ingredient_id && loadingUnits.has(modifier.ingredient_id)" class="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                      <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Cargando...
                    </span>
                  </div>

                  <!-- Price -->
                  <div class="md:col-span-2">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Precio Venta</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm">$</span>
                      <input
                        type="number"
                        v-model.number="modifier.price"
                        placeholder="0"
                        step="100"
                        class="w-full pl-8 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                      />
                    </div>
                  </div>

                  <!-- Max Limit -->
                  <div class="md:col-span-1">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Máx</label>
                    <input
                      type="number"
                      v-model.number="modifier.max_limit"
                      placeholder="1"
                      min="1"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                    />
                  </div>

                  <!-- Sort Order -->
                  <div class="md:col-span-1">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Orden</label>
                    <input
                      type="number"
                      v-model.number="modifier.sort_order"
                      placeholder="0"
                      min="0"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                    />
                  </div>

                  <!-- Delete Button -->
                  <div class="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      @click="removeModifier(index)"
                      class="w-full md:w-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Checkboxes -->
                <div class="flex flex-wrap gap-4 text-sm">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="modifier.is_default"
                      class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    />
                    <span class="text-text-primary">Predeterminado</span>
                  </label>

                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="modifier.is_available"
                      class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    />
                    <span class="text-text-primary">Disponible</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          </MenuCatalogInlineCreateBusyOverlay>
        </div>

        <!-- Step 3: Review -->
        <div v-else-if="currentStep === 3" key="step-3">
          <!-- Header compacto -->
          <div class="bg-surface border border-border rounded-lg px-4 sm:px-6 py-3 mb-3 flex items-center justify-between">
            <div>
              <p class="text-xs text-text-secondary uppercase tracking-wide font-semibold">Nuevo Grupo · Resumen</p>
              <p class="text-base font-bold text-text-primary">{{ form.name }}</p>
            </div>
            <p class="text-xs text-text-secondary">{{ new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) }}</p>
          </div>

          <!-- Layout dos columnas -->
          <div class="flex flex-col lg:flex-row gap-4 items-start">

            <!-- Columna izquierda: modificadores -->
            <div class="w-full lg:flex-1 space-y-4">
              <div class="bg-surface border border-border rounded-lg p-4">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Modificadores ({{ form.modifiers.length }})
                </p>

                <!-- Mobile: Cards View -->
                <div class="md:hidden space-y-3">
                  <div
                    v-for="(modifier, index) in form.modifiers"
                    :key="index"
                    class="border border-border rounded-lg p-3 bg-background"
                  >
                    <div class="mb-2">
                      <p class="font-medium text-text-primary text-sm">{{ modifier.name }}</p>
                      <p v-if="modifier.ingredient_quantity" class="text-xs text-text-secondary">
                        {{ modifier.ingredient_quantity }} {{ modifier.ingredient_unit }}
                      </p>
                      <div class="flex gap-2 mt-2">
                        <UiStatusBadge
                          v-if="modifier.is_default"
                          value="Predeterminado"
                          format="text"
                          variant="default"
                          size="sm"
                        />
                        <UiStatusBadge
                          :value="modifier.is_available ? 'Disponible' : 'No disponible'"
                          format="text"
                          :variant="modifier.is_available ? 'success' : 'destructive'"
                          size="sm"
                        />
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                      <div>
                        <p class="text-xs text-text-secondary mb-1">Precio</p>
                        <p class="text-sm text-text-primary font-semibold">{{ formatCurrency(modifier.price) }}</p>
                      </div>
                      <div>
                        <p class="text-xs text-text-secondary mb-1">Máx cantidad</p>
                        <p class="text-sm text-text-primary font-semibold">{{ modifier.max_limit }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Desktop: Table View -->
                <table class="w-full hidden md:table">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Modificador</th>
                      <th class="text-center py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Cantidad</th>
                      <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Precio</th>
                      <th class="text-center py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Máx</th>
                      <th class="text-center py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(modifier, index) in form.modifiers"
                      :key="index"
                      class="border-b border-border"
                    >
                      <td class="py-4">
                        <div class="flex items-center gap-2">
                          <p class="font-medium text-text-primary">{{ modifier.name }}</p>
                          <UiStatusBadge
                            v-if="modifier.is_default"
                            value="Predeterminado"
                            format="text"
                            variant="default"
                            size="sm"
                          />
                        </div>
                      </td>
                      <td class="text-center py-4 text-text-primary">
                        <span v-if="modifier.ingredient_quantity">{{ modifier.ingredient_quantity }} {{ modifier.ingredient_unit }}</span>
                        <span v-else class="text-text-secondary">-</span>
                      </td>
                      <td class="text-right py-4 text-text-primary font-semibold">{{ formatCurrency(modifier.price) }}</td>
                      <td class="text-center py-4 text-text-primary">{{ modifier.max_limit }}</td>
                      <td class="text-center py-4">
                        <UiStatusBadge
                          :value="modifier.is_available ? 'Disponible' : 'No disponible'"
                          format="text"
                          :variant="modifier.is_available ? 'success' : 'destructive'"
                          size="sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Columna derecha: configuración del grupo -->
            <div class="w-full lg:w-72 xl:w-80 space-y-4 lg:sticky lg:top-4">

              <!-- Grupo -->
              <div class="bg-surface border border-border rounded-lg p-4">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Grupo</p>
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Tipo</span>
                    <UiStatusBadge
                      :value="form.is_required ? 'Obligatorio' : 'Opcional'"
                      format="text"
                      :variant="form.is_required ? 'warning' : 'secondary'"
                      size="sm"
                    />
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Selección</span>
                    <span class="text-sm font-semibold text-text-primary">{{ form.min_qty }} – {{ form.max_qty }} opciones</span>
                  </div>
                </div>
                <div class="mt-3 pt-3 border-t border-border">
                  <p class="text-xs text-text-secondary mb-2">Productos asociados</p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="name in getSelectedProductNames()"
                      :key="name"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {{ name }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Resumen -->
              <div class="bg-surface border border-border rounded-lg p-4">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Resumen</p>
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Total modificadores</span>
                    <span class="text-sm font-bold text-text-primary">{{ form.modifiers.length }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Con ingrediente</span>
                    <span class="text-sm font-semibold text-text-primary">{{ form.modifiers.filter(m => m.ingredient_id).length }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-text-secondary">Con costo adicional</span>
                    <span class="text-sm font-semibold text-text-primary">{{ form.modifiers.filter(m => m.price > 0).length }}</span>
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
              to="/menu/modificadores"
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
                @click="submitGroup"
                :disabled="isSubmitting"
                class="btn-primary px-4 sm:px-6 py-2 rounded-lg transition-opacity text-sm sm:text-base"
                :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }"
              >
                <span class="hidden sm:inline">{{ isSubmitting ? 'Creando...' : 'Crear Grupo' }}</span>
                <span class="sm:hidden">{{ isSubmitting ? '...' : 'Crear' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <MenuInlineCatalogCreateShell
      ref="inlineCreateShell"
      v-model:busy="inlineCatalogBusy"
      v-model:busy-label="inlineCatalogBusyLabel"
      v-model:busy-hint="inlineCatalogBusyHint"
      context="modifier"
      :on-ingredient-saved="onCustomIngredientCreated"
      :on-product-saved="onInlineProductCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Crear Modificador' })

const router = useRouter()
const { currentTenant } = useTenantReactive()

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const nameError = ref('')

// Form data
const form = ref({
  product_ids: [] as string[],
  name: '',
  min_qty: 0,
  max_qty: 1,
  is_required: false,
  sort_order: 0,
  modifiers: [] as Array<{
    name: string
    price: number
    max_limit: number
    is_default: boolean
    is_available: boolean
    sort_order: number
    ingredient_id: string | null
    ingredient_quantity: number | null
    ingredient_unit: string | null
  }>,
  tenant_id: currentTenant.value?.id || ''
})

// Fetch products
const { data: productsData, pending: loadingProducts } = useAsyncData(
  `products-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/products', {
    query: { limit: 250 }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Computed
const products = computed(() => productsData.value?.data || [])

const isLoadingData = computed(() => {
  return !productsData.value
})

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return form.value.product_ids.length > 0 && form.value.name && form.value.max_qty >= form.value.min_qty
  }
  if (currentStep.value === 2) {
    return form.value.modifiers.length > 0 && form.value.modifiers.every(m => m.ingredient_id && m.name)
  }
  return true
})

// Methods
function getProductName(productId: string) {
  const product = products.value.find((p: any) => p.id === productId)
  return product?.name || ''
}

function getSelectedProductsText() {
  if (form.value.product_ids.length === 0) return 'Seleccionar'
  if (form.value.product_ids.length === 1) {
    return getProductName(form.value.product_ids[0])
  }
  return `${form.value.product_ids.length} productos`
}

function getSelectedProductNames() {
  return form.value.product_ids.map(id => getProductName(id)).filter(Boolean)
}

function addModifier() {
  form.value.modifiers.push({
    name: '',
    price: 0,
    max_limit: 1,
    is_default: false,
    is_available: true,
    sort_order: form.value.modifiers.length,
    ingredient_id: null,
    ingredient_quantity: null,
    ingredient_unit: null
  })
}

// Ingredient cache and purchase units
const ingredientCache = ref<Record<string, any>>({})
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
const loadingUnits = ref<Set<string>>(new Set())

const { getIngredientUnitOptions: buildUnitOptions, defaultUnitForIngredient } = useIngredientUnitOptions()

function getIngredientUnitOptions(ingredientId: string | null) {
  return buildUnitOptions(ingredientId || '', {
    ingredientCache: ingredientCache.value,
    purchaseUnitsCache: purchaseUnitsCache.value,
  })
}

function getIngredientById(id: string) {
  return ingredientCache.value[id]
}

async function loadPurchaseUnits(ingredientId: string) {
  if (!ingredientId || purchaseUnitsCache.value.has(ingredientId)) return
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

function selectIngredient(modifier: any, ing: any) {
  modifier.ingredient_id = ing.id
  modifier.name = ing.name
  ingredientCache.value[ing.id] = ing
  modifier.ingredient_unit = defaultUnitForIngredient(ingredientCache.value[ing.id])
  loadPurchaseUnits(ing.id)
}

const inlineCreateShell = ref<{ openFromSearch: (name: string) => void } | null>(null)
const customIngModalModIndex = ref(-1)
const inlineCatalogBusy = ref(false)
const inlineCatalogBusyLabel = ref('')
const inlineCatalogBusyHint = ref('')

function openCustomIngModal(name: string, index: number) {
  customIngModalModIndex.value = index
  inlineCreateShell.value?.openFromSearch(name)
}

function onCustomIngredientCreated(ingredient: any) {
  const index = customIngModalModIndex.value
  if (index < 0 || index >= form.value.modifiers.length) return
  selectIngredient(form.value.modifiers[index], ingredient)
  customIngModalModIndex.value = -1
}

const { linkCreatedProductToRow } = useInlineCatalogProductLink()

async function onInlineProductCreated(product: Record<string, unknown>) {
  const index = customIngModalModIndex.value
  if (index < 0 || index >= form.value.modifiers.length) return
  await linkCreatedProductToRow(product, async (ingredient) => {
    selectIngredient(form.value.modifiers[index], ingredient)
    customIngModalModIndex.value = -1
  })
}

function removeModifier(index: number) {
  form.value.modifiers.splice(index, 1)
}

async function handleNext() {
  if (!canProceed.value || currentStep.value >= 3) return
  if (currentStep.value === 1) {
    const res = await $fetch<{ available: boolean }>(`/api/menu/check-name?entity=modifier-groups&name=${encodeURIComponent(form.value.name.trim())}`)
    if (!res.available) {
      nameError.value = 'Ya existe un grupo de modificadores con ese nombre.'
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

async function submitGroup() {
  if (isSubmitting.value) return

  isSubmitting.value = true
  submitError.value = null

  try {
    form.value.tenant_id = currentTenant.value?.id || ''

    await $fetch('/api/menu/modifier-groups', {
      method: 'POST',
      body: form.value
    })

    // clearNuxtData()
    await router.push('/menu/modificadores')
  } catch (error: any) {
    console.error('Error creating modifier group:', error)
    submitError.value = error.data?.detail || error.message || 'Error al crear el grupo. Por favor intenta de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}

function formatCurrency(value: number) {
  if (!value && value !== 0) return '$0'
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
