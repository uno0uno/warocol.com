<template>
  <div class="page-layout">
    <!-- Header -->
    <div class="bg-surface border-border border rounded-lg">
      <div class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-text-primary">Crear Nueva Orden de Compra</h2>
            <p class="text-sm text-text-secondary mt-1">Complete la información de la orden</p>
          </div>
          <NuxtLink 
            to="/abastecimiento/compras" 
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
          <!-- Información General -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-4">Información General</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Número de Orden *
                </label>
                <input
                  v-model="form.numero"
                  type="text"
                  required
                  class="input-base w-full px-4 py-2"
                  placeholder="Ej: PO-2025-001"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Proveedor *
                </label>
                <select
                  v-model="form.proveedor"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <option value="">Seleccionar proveedor</option>
                  <option value="Frutas del Valle">Frutas del Valle</option>
                  <option value="COCA COLA FEMSA">COCA COLA FEMSA</option>
                  <option value="Calypso del Caribe">Calypso del Caribe</option>
                  <option value="Abastos San Martín">Abastos San Martín</option>
                  <option value="Desechables Pradera">Desechables Pradera</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Fecha de Orden *
                </label>
                <input
                  v-model="form.fecha"
                  type="date"
                  required
                  class="input-base w-full px-4 py-2"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Fecha de Entrega
                </label>
                <input
                  v-model="form.fechaEntrega"
                  type="date"
                  class="input-base w-full px-4 py-2"
                />
              </div>
            </div>
          </div>

          <!-- Items de la Orden -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-4">Items de la Orden</h3>
            
            <div class="space-y-4">
              <div 
                v-for="(item, index) in form.items" 
                :key="index"
                class="p-4 border border-border rounded-lg"
              >
                <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Producto
                    </label>
                    <input
                      v-model="item.producto"
                      type="text"
                      required
                      class="input-base w-full px-4 py-2"
                      placeholder="Nombre del producto"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Cantidad
                    </label>
                    <input
                      v-model.number="item.cantidad"
                      type="number"
                      min="1"
                      required
                      class="input-base w-full px-4 py-2"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Precio Unitario
                    </label>
                    <input
                      v-model.number="item.precioUnitario"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      class="input-base w-full px-4 py-2"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Total
                    </label>
                    <input
                      :value="(item.cantidad * item.precioUnitario).toLocaleString()"
                      type="text"
                      readonly
                      class="input-base w-full px-4 py-2 bg-surface-secondary"
                    />
                  </div>
                  
                  <div class="flex items-end">
                    <button
                      type="button"
                      @click="removeItem(index)"
                      :disabled="form.items.length === 1"
                      class="btn-destructive px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              type="button"
              @click="addItem"
              class="btn-secondary px-4 py-2 rounded-lg text-sm mt-4"
            >
              + Agregar Item
            </button>
          </div>


          <!-- Observaciones -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-4">Observaciones</h3>
            <textarea
              v-model="form.observaciones"
              class="input-base w-full px-4 py-2"
              rows="3"
              placeholder="Observaciones adicionales sobre la orden..."
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end space-x-4 pt-6 border-t border-border">
            <NuxtLink 
              to="/abastecimiento/compras" 
              class="btn-secondary px-6 py-2 rounded-lg">
              Cancelar
            </NuxtLink>
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="btn-primary px-6 py-2 rounded-lg disabled:opacity-50">
              {{ isSubmitting ? 'Creando...' : 'Crear Orden' }}
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
  title: 'Crear Orden de Compra - Abastecimiento'
})

// Form state
const form = ref({
  numero: '',
  proveedor: '',
  fecha: new Date().toISOString().split('T')[0],
  fechaEntrega: '',
  observaciones: '',
  items: [
    {
      producto: '',
      cantidad: 1,
      precioUnitario: 0
    }
  ]
})

const isSubmitting = ref(false)


// Methods
const addItem = () => {
  form.value.items.push({
    producto: '',
    cantidad: 1,
    precioUnitario: 0
  })
}

const removeItem = (index) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

// Handle form submission
const handleSubmit = async () => {
  try {
    isSubmitting.value = true
    
    // TODO: API call to create order
    console.log('Creating order:', form.value)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')
    
  } catch (error) {
    console.error('Error creating order:', error)
    // TODO: Show error message
  } finally {
    isSubmitting.value = false
  }
}
</script>