<template>
  <div class="page-layout">
    <!-- Header -->
    <div class="bg-surface border-border border rounded-lg">
      <div class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-text-primary">Crear Nuevo Proveedor</h2>
            <p class="text-sm text-text-secondary mt-1">Complete la información del proveedor</p>
          </div>
          <NuxtLink 
            to="/abastecimiento/proveedores" 
            class="btn-secondary px-4 py-2 rounded-lg text-sm">
            Volver
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Form -->
    <div class="bg-surface border-border border rounded-lg">
      <div class="p-6">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Información Básica -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-4">Información Básica</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Nombre del Proveedor *
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="input-base w-full px-4 py-2"
                  placeholder="Ej: Frutas del Valle S.A.S"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  NIT/Cédula *
                </label>
                <input
                  v-model="form.tax_id"
                  type="text"
                  required
                  class="input-base w-full px-4 py-2"
                  placeholder="Ej: 900123456-7"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Email
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  class="input-base w-full px-4 py-2"
                  placeholder="contacto@proveedor.com"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Teléfono
                </label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="input-base w-full px-4 py-2"
                  placeholder="+57 300 123 4567"
                />
              </div>
            </div>
          </div>

          <!-- Términos Comerciales -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-4">Términos Comerciales</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Términos de Pago
                </label>
                <select
                  v-model="form.payment_terms"
                  class="input-base w-full px-4 py-2"
                >
                  <option value="">Seleccionar términos</option>
                  <option value="Contado">Contado</option>
                  <option value="15 días">15 días</option>
                  <option value="30 días">30 días</option>
                  <option value="45 días">45 días</option>
                  <option value="60 días">60 días</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Categoría
                </label>
                <select
                  v-model="form.categoria"
                  class="input-base w-full px-4 py-2"
                >
                  <option value="">Seleccionar categoría</option>
                  <option value="alimentos">Alimentos</option>
                  <option value="bebidas">Bebidas</option>
                  <option value="empaques">Empaques</option>
                  <option value="servicios">Servicios</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Estado -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-4">Estado</h3>
            <div class="flex items-center space-x-3">
              <input
                v-model="form.is_active"
                type="checkbox"
                id="is_active"
                class="h-4 w-4 text-primary focus:ring-primary border-border rounded"
              />
              <label for="is_active" class="text-sm font-medium text-text-primary">
                Proveedor activo
              </label>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end space-x-4 pt-6 border-t border-border">
            <NuxtLink 
              to="/abastecimiento/proveedores" 
              class="btn-secondary px-6 py-2 rounded-lg">
              Cancelar
            </NuxtLink>
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="btn-primary px-6 py-2 rounded-lg disabled:opacity-50">
              {{ isSubmitting ? 'Creando...' : 'Crear Proveedor' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Crear Proveedor - Abastecimiento'
})

// Form state
const form = ref({
  name: '',
  tax_id: '',
  email: '',
  phone: '',
  payment_terms: '30 días',
  categoria: 'alimentos',
  is_active: true
})

const isSubmitting = ref(false)

// Handle form submission
const handleSubmit = async () => {
  try {
    isSubmitting.value = true
    
    // TODO: API call to create provider
    console.log('Creating provider:', form.value)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Redirect back to providers list
    await navigateTo('/abastecimiento/proveedores')
    
  } catch (error) {
    console.error('Error creating provider:', error)
    // TODO: Show error message
  } finally {
    isSubmitting.value = false
  }
}
</script>