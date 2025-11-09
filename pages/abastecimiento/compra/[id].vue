<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <div class="text-xl font-semibold text-text-primary mb-2">Error cargando orden</div>
        <div class="text-sm text-text-secondary">{{ error }}</div>
        <button @click="refresh" class="mt-4 btn-primary px-4 py-2 rounded-lg">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Edit Form -->
    <div v-else class="page-layout">
      <!-- Header -->
      <div class="bg-surface border-border border rounded-lg">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-text-primary">Editar Orden de Compra</h2>
              <p class="text-sm text-text-secondary mt-1">
                Modificar orden: <span class="font-medium">{{ form.numero }}</span>
              </p>
            </div>
            <div class="flex space-x-2">
              <UiStatusBadge
                :value="getStatusText(orderData?.estado)"
                format="text"
                :variant="getStatusVariant(orderData?.estado)"
                size="lg"
              />
              <NuxtLink 
                to="/abastecimiento/compras" 
                class="btn-secondary px-4 py-2 rounded-lg text-sm">
                Volver
              </NuxtLink>
            </div>
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
                    readonly
                    class="input-base w-full px-4 py-2 bg-surface-secondary"
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

            <!-- Estado de la Orden -->
            <div>
              <h3 class="text-lg font-semibold text-text-primary mb-4">Estado de la Orden</h3>
              <select
                v-model="form.estado"
                class="input-base w-full md:w-1/3 px-4 py-2"
              >
                <option value="pending">Pendiente</option>
                <option value="sent">Enviada</option>
                <option value="received">Recibida</option>
                <option value="invoiced">Facturada</option>
                <option value="overdue">Vencida</option>
              </select>
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
            <div class="flex justify-between pt-6 border-t border-border">
              <button 
                type="button"
                @click="handleDelete"
                :disabled="isDeleting"
                class="btn-destructive px-6 py-2 rounded-lg disabled:opacity-50">
                {{ isDeleting ? 'Eliminando...' : 'Eliminar Orden' }}
              </button>
              
              <div class="flex space-x-4">
                <NuxtLink 
                  to="/abastecimiento/compras" 
                  class="btn-secondary px-6 py-2 rounded-lg">
                  Cancelar
                </NuxtLink>
                <button 
                  type="submit" 
                  :disabled="isSubmitting"
                  class="btn-primary px-6 py-2 rounded-lg disabled:opacity-50">
                  {{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'dashboard'
})

// Get order ID from route
const route = useRoute()
const orderId = route.params.id

useHead({
  title: `Editar Orden ${orderId} - Abastecimiento`
})

// Form state
const form = ref({
  numero: '',
  proveedor: '',
  fecha: '',
  fechaEntrega: '',
  estado: 'pending',
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
const isDeleting = ref(false)

// Fetch order data
const { data: orderData, pending: isLoading, error, refresh } = useAsyncData(`order-${orderId}`, () => {
  console.log('🔍 Fetching order data for ID:', orderId)
  
  // TODO: Replace with actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock order data based on ID
      const mockOrders = [
        {
          id: 1,
          numero: 'PO-2025-001',
          proveedor: 'Frutas del Valle',
          fecha: '2025-11-01',
          fechaEntrega: '2025-11-08',
          estado: 'received',
          observaciones: 'Entrega urgente requerida',
          items: [
            { producto: 'Bananos', cantidad: 50, precioUnitario: 1500 },
            { producto: 'Manzanas', cantidad: 30, precioUnitario: 2500 }
          ]
        },
        {
          id: 2,
          numero: 'PO-2025-002',
          proveedor: 'COCA COLA FEMSA',
          fecha: '2025-11-03',
          fechaEntrega: '2025-11-10',
          estado: 'sent',
          observaciones: '',
          items: [
            { producto: 'Coca-Cola 1.5L', cantidad: 100, precioUnitario: 5417 }
          ]
        }
      ]
      
      const order = mockOrders.find(o => o.id == orderId)
      if (order) {
        resolve({ success: true, data: order })
      } else {
        throw new Error('Orden no encontrada')
      }
    }, 500)
  })
}, {
  server: false,
  transform: (response) => {
    if (response?.success && response.data) {
      // Populate form with existing data
      Object.assign(form.value, response.data)
      return response.data
    }
    throw new Error('Error loading order data')
  }
})


// Helper functions for status
function getStatusVariant(status) {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'sent':
      return 'info'
    case 'received':
      return 'success'
    case 'invoiced':
      return 'secondary'
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function getStatusText(status) {
  const texts = {
    pending: 'Pendiente',
    sent: 'Enviada',
    received: 'Recibida',
    invoiced: 'Facturada',
    overdue: 'Vencida'
  }
  return texts[status] || 'Desconocido'
}

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
    
    // TODO: API call to update order
    console.log('Updating order:', {
      id: orderId,
      ...form.value
    })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')
    
  } catch (error) {
    console.error('Error updating order:', error)
    // TODO: Show error message
  } finally {
    isSubmitting.value = false
  }
}

// Handle order deletion
const handleDelete = async () => {
  if (!confirm('¿Está seguro de que desea eliminar esta orden? Esta acción no se puede deshacer.')) {
    return
  }
  
  try {
    isDeleting.value = true
    
    // TODO: API call to delete order
    console.log('Deleting order:', orderId)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')
    
  } catch (error) {
    console.error('Error deleting order:', error)
    // TODO: Show error message
  } finally {
    isDeleting.value = false
  }
}
</script>