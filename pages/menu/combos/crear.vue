<template>
  <div class="w-full">
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Creando combo...</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex w-full flex-col">
      <!-- Header Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-4 sm:p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <!-- Combo Name -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Nuevo Combo</p>
                <p class="text-lg font-semibold text-text-primary">{{ form.name || 'Sin nombre' }}</p>
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
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Categoría</p>
                <p class="text-sm sm:text-lg font-semibold text-text-primary">{{ getCategoryName(form.category_id) || 'Sin categoría' }}</p>
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
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Estado</p>
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
                  <span class="hidden sm:inline">Información del Combo</span>
                  <span class="sm:hidden">Info</span>
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Datos básicos</p>
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
                  Productos
                </p>
                <p class="text-xs text-text-secondary hidden sm:block">Items del combo</p>
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
        <!-- Step 1: Información del Combo -->
        <Transition name="fade" mode="out-in">
        <div v-if="currentStep === 1" key="step-1" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6">Información del Combo</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <!-- Combo Name -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Nombre del Combo *
                </label>
                <input
                  type="text"
                  v-model="form.name"
                  placeholder="Ej: Combo Familiar"
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
                  placeholder="Describe el combo..."
                  rows="3"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary resize-none"
                />
              </div>

              <!-- Category -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Categoría
                </label>
                <select
                  v-model="form.category_id"
                  class="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-surface"
                >
                  <option value="">Sin categoría</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </div>

              <!-- Price -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Precio del Combo *
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    type="number"
                    v-model.number="form.price"
                    placeholder="45000"
                    min="0"
                    step="100"
                    class="w-full pl-8 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                    required
                  />
                </div>
              </div>

              <!-- Is Available -->
              <div class="md:col-span-2">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.is_available"
                    class="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  />
                  <span class="text-sm font-medium text-text-primary">Disponible para venta</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Productos del Combo -->
        <div v-else-if="currentStep === 2" key="step-2" class="bg-surface border border-border rounded-lg">
          <div class="p-4 sm:p-6">
            <div class="flex justify-between items-center mb-4 sm:mb-6">
              <h3 class="text-base sm:text-lg font-semibold text-text-primary">Productos del Combo</h3>
              <button
                type="button"
                @click="addItem"
                class="btn-secondary px-3 sm:px-4 py-2 rounded-lg text-sm"
              >
                + Agregar Producto
              </button>
            </div>

            <!-- Empty State -->
            <div v-if="form.items.length === 0" class="text-center py-12 text-text-secondary">
              <svg class="w-16 h-16 mx-auto mb-4 text-titan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p class="text-base font-medium mb-1">No hay productos agregados</p>
              <p class="text-sm">Agrega productos para crear el combo</p>
            </div>

            <!-- Items List -->
            <div v-else class="space-y-4">
              <div
                v-for="(item, index) in form.items"
                :key="index"
                class="border border-border rounded-lg p-4 bg-background"
              >
                <div class="grid grid-cols-1 gap-3">
                  <!-- Product -->
                  <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">Producto *</label>
                    <select
                      v-model="item.item_product_id"
                      @change="updateItemPrices(index)"
                      class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
                      required
                    >
                      <option value="">Seleccionar producto...</option>
                      <option v-for="product in products" :key="product.id" :value="product.id">
                        {{ product.name }} ({{ formatCurrency(product.price) }})
                      </option>
                    </select>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <!-- Quantity -->
                    <div class="md:col-span-2">
                      <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad *</label>
                      <input
                        type="number"
                        v-model.number="item.quantity"
                        @input="calculateDiscount(index)"
                        placeholder="1"
                        min="0.01"
                        step="0.01"
                        class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                        required
                      />
                    </div>

                    <!-- Individual Price -->
                    <div class="md:col-span-3">
                      <label class="block text-xs font-medium text-text-secondary mb-1">Precio Individual</label>
                      <div class="relative">
                        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm">$</span>
                        <input
                          type="number"
                          v-model.number="item.individual_price"
                          @input="calculateDiscount(index)"
                          placeholder="0"
                          step="100"
                          class="w-full pl-8 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                        />
                      </div>
                    </div>

                    <!-- Combo Price -->
                    <div class="md:col-span-3">
                      <label class="block text-xs font-medium text-text-secondary mb-1">Precio en Combo *</label>
                      <div class="relative">
                        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm">$</span>
                        <input
                          type="number"
                          v-model.number="item.combo_price"
                          @input="calculateDiscount(index)"
                          placeholder="0"
                          step="100"
                          class="w-full pl-8 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary"
                          required
                        />
                      </div>
                    </div>

                    <!-- Discount -->
                    <div class="md:col-span-3">
                      <label class="block text-xs font-medium text-text-secondary mb-1">Descuento</label>
                      <div class="relative">
                        <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm">$</span>
                        <input
                          type="number"
                          v-model.number="item.discount_amount"
                          placeholder="0"
                          step="100"
                          class="w-full pl-8 pr-3 py-2 border border-border rounded-lg bg-titan-50 text-sm text-text-primary"
                          readonly
                        />
                      </div>
                    </div>

                    <!-- Delete Button -->
                    <div class="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        @click="removeItem(index)"
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
                        v-model="item.is_optional"
                        class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span class="text-text-primary">Opcional</span>
                    </label>

                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        v-model="item.is_customizable"
                        class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span class="text-text-primary">Personalizable</span>
                    </label>
                  </div>
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
                <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary mb-2">NUEVO COMBO</h1>
                <p class="text-xs sm:text-sm text-text-secondary">Resumen del combo a crear</p>
              </div>
            </div>
          </div>

          <!-- Combo Info -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Combo</p>
                <p class="text-lg font-bold text-text-primary">{{ form.name }}</p>
                <p v-if="form.description" class="text-sm text-text-secondary mt-2">{{ form.description }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Información</p>
                <p v-if="form.category_id" class="text-sm text-text-secondary">Categoría: {{ getCategoryName(form.category_id) }}</p>
                <div class="flex gap-2 mt-3">
                  <UiStatusBadge
                    :value="form.is_available ? 'Disponible' : 'No disponible'"
                    format="text"
                    :variant="form.is_available ? 'success' : 'default'"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Pricing Summary -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border bg-background/50">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 sm:mb-4">
              Resumen de Precios
            </p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <p class="text-sm text-text-secondary mb-1">Precio Combo</p>
                <p class="text-lg font-bold text-text-primary">{{ formatCurrency(form.price) }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">Precio Individual Total</p>
                <p class="text-lg font-bold text-text-primary">{{ formatCurrency(totalIndividualPrice) }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">Ahorro Total</p>
                <p class="text-lg font-bold text-green-600">{{ formatCurrency(totalSavings) }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">% Descuento</p>
                <p class="text-lg font-bold text-green-600">{{ savingsPercentage }}%</p>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">
              Productos del Combo ({{ form.items.length }})
            </p>

            <!-- Mobile: Cards View -->
            <div class="md:hidden space-y-3">
              <div
                v-for="(item, index) in form.items"
                :key="index"
                class="border border-border rounded-lg p-3 bg-background"
              >
                <div class="mb-2">
                  <p class="font-medium text-text-primary text-sm">{{ getProductName(item.item_product_id) }}</p>
                  <p class="text-xs text-text-secondary">Cantidad: {{ item.quantity }}</p>
                  <div class="flex gap-2 mt-2">
                    <UiStatusBadge
                      v-if="item.is_optional"
                      value="Opcional"
                      format="text"
                      variant="default"
                      size="sm"
                    />
                    <UiStatusBadge
                      v-if="item.is_customizable"
                      value="Personalizable"
                      format="text"
                      variant="info"
                      size="sm"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
                  <div>
                    <p class="text-xs text-text-secondary mb-1">Precio Individual</p>
                    <p class="text-sm text-text-primary font-semibold">
                      {{ formatCurrency(item.individual_price || 0) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-text-secondary mb-1">En Combo</p>
                    <p class="text-sm text-green-600 font-semibold">
                      {{ formatCurrency(item.combo_price) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs text-text-secondary mb-1">Ahorro</p>
                    <p class="text-sm text-green-600 font-semibold">
                      {{ formatCurrency(item.discount_amount || 0) }}
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
                    Producto
                  </th>
                  <th class="text-center py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Cantidad
                  </th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Precio Individual
                  </th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Precio en Combo
                  </th>
                  <th class="text-right py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Ahorro
                  </th>
                  <th class="text-center py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Opciones
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in form.items"
                  :key="index"
                  class="border-b border-border"
                >
                  <td class="py-4">
                    <p class="font-medium text-text-primary">{{ getProductName(item.item_product_id) }}</p>
                  </td>
                  <td class="text-center py-4 text-text-primary">
                    {{ item.quantity }}
                  </td>
                  <td class="text-right py-4 text-text-primary font-semibold">
                    {{ formatCurrency(item.individual_price || 0) }}
                  </td>
                  <td class="text-right py-4 text-green-600 font-semibold">
                    {{ formatCurrency(item.combo_price) }}
                  </td>
                  <td class="text-right py-4 text-green-600 font-semibold">
                    {{ formatCurrency(item.discount_amount || 0) }}
                  </td>
                  <td class="text-center py-4">
                    <div class="flex gap-2 justify-center">
                      <UiStatusBadge
                        v-if="item.is_optional"
                        value="Opcional"
                        format="text"
                        variant="default"
                        size="sm"
                      />
                      <UiStatusBadge
                        v-if="item.is_customizable"
                        value="Personalizable"
                        format="text"
                        variant="info"
                        size="sm"
                      />
                    </div>
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
            @click="submitCombo"
            :disabled="isSubmitting"
            class="btn-primary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear Combo
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
  is_available: true,
  items: [] as Array<{
    item_product_id: string
    quantity: number
    is_optional: boolean
    is_customizable: boolean
    sort_order: number
    individual_price: number
    combo_price: number
    discount_amount: number
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

// Fetch products
const { data: productsData } = useAsyncData(
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
const categories = computed(() => categoriesData.value?.data || [])
const products = computed(() => productsData.value?.data || [])

const isLoadingData = computed(() => {
  return !categoriesData.value || !productsData.value
})

const totalIndividualPrice = computed(() => {
  return form.value.items.reduce((sum, item) => {
    return sum + ((item.individual_price || 0) * item.quantity)
  }, 0)
})

const totalSavings = computed(() => {
  return form.value.items.reduce((sum, item) => {
    return sum + (item.discount_amount || 0)
  }, 0)
})

const savingsPercentage = computed(() => {
  if (totalIndividualPrice.value === 0) return 0
  return ((totalSavings.value / totalIndividualPrice.value) * 100).toFixed(1)
})

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return form.value.name && form.value.price > 0
  }
  if (currentStep.value === 2) {
    return form.value.items.length > 0 && form.value.items.every(item =>
      item.item_product_id && item.quantity > 0 && item.combo_price >= 0
    )
  }
  return true
})

// Methods
function getCategoryName(categoryId: string) {
  const category = categories.value.find((c: any) => c.id === categoryId)
  return category?.name || ''
}

function getProductName(productId: string) {
  const product = products.value.find((p: any) => p.id === productId)
  return product?.name || 'Producto desconocido'
}

function addItem() {
  form.value.items.push({
    item_product_id: '',
    quantity: 1,
    is_optional: false,
    is_customizable: false,
    sort_order: form.value.items.length,
    individual_price: 0,
    combo_price: 0,
    discount_amount: 0
  })
}

function removeItem(index: number) {
  form.value.items.splice(index, 1)
  // Update sort order
  form.value.items.forEach((item, idx) => {
    item.sort_order = idx
  })
}

function updateItemPrices(index: number) {
  const item = form.value.items[index]
  const product = products.value.find((p: any) => p.id === item.item_product_id)

  if (product) {
    item.individual_price = product.price || 0
    // Set combo price to same as individual by default
    if (item.combo_price === 0) {
      item.combo_price = product.price || 0
    }
    calculateDiscount(index)
  }
}

function calculateDiscount(index: number) {
  const item = form.value.items[index]
  const individualTotal = (item.individual_price || 0) * item.quantity
  const comboTotal = item.combo_price * item.quantity
  item.discount_amount = Math.max(0, individualTotal - comboTotal)
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

async function submitCombo() {
  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    form.value.tenant_id = currentTenant.value?.id || ''

    await $fetch('/api/menu/combos', {
      method: 'POST',
      body: form.value
    })

    router.push('/menu/combos')
  } catch (error: any) {
    console.error('Error creating combo:', error)
    alert(`Error al crear el combo: ${error.message || 'Por favor intenta de nuevo.'}`)
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
