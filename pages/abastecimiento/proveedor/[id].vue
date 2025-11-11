<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <div class="text-xl font-semibold text-text-primary mb-2">Error cargando proveedor</div>
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
              <h2 class="text-2xl font-bold text-text-primary">Editar Proveedor</h2>
              <p class="text-sm text-text-secondary mt-1">
                Modificar información de: <span class="font-medium">{{ form.name }}</span>
              </p>
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
                              </div>              </div>
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
            <div class="flex justify-between pt-6 border-t border-border">
              <button 
                type="button"
                @click="handleDelete"
                :disabled="isDeleting"
                class="btn-destructive px-6 py-2 rounded-lg disabled:opacity-50">
                {{ isDeleting ? 'Eliminando...' : 'Eliminar Proveedor' }}
              </button>
              
              <div class="flex space-x-4">
                <NuxtLink 
                  to="/abastecimiento/proveedores" 
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
import { ref, reactive } from 'vue'
import { useRoute, useRouter, navigateTo } from '#app'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const supplierId = route.params.id

useHead({
  title: `Editar Proveedor - Abastecimiento`
})

// Use reactive for the form object
const form = reactive({
  name: '',
  tax_id: '',
  email: '',
  phone: '',
  payment_terms: '',
  is_active: true
})

const isSubmitting = ref(false)
const isDeleting = ref(false)

// Fetch provider data
const { data: supplierData, pending: isLoading, error, refresh } = useAsyncData(
  `supplier-${supplierId}`,
  () => $fetch(`/api/suppliers/${supplierId}`),
  {
    server: false,
    transform: (response) => {
      if (response?.data) {
        // Populate form with existing data
        Object.assign(form, response.data)
        return response.data
      }
      throw new Error('Error loading supplier data')
    }
  }
)

// Handle form submission (Update)
const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    await $fetch(`/api/suppliers/${supplierId}`, {
      method: 'PUT',
      body: form,
    })
    
    console.log('Proveedor actualizado exitosamente!') // Temporary feedback
    await navigateTo('/abastecimiento/proveedores')
    
  } catch (err) {
    console.error('Error updating supplier:', err)
    alert('Error al actualizar el proveedor.') // Temporary feedback
  } finally {
    isSubmitting.value = false
  }
}

// Handle provider deletion
const handleDelete = async () => {
  if (!confirm('¿Está seguro de que desea eliminar este proveedor? Esta acción no se puede deshacer.')) {
    return
  }
  
  isDeleting.value = true
  try {
    await $fetch(`/api/suppliers/${supplierId}`, {
      method: 'DELETE',
    })
    
    console.log('Proveedor eliminado exitosamente!') // Temporary feedback
    await navigateTo('/abastecimiento/proveedores')
    
  } catch (err) {
    console.error('Error deleting supplier:', err)
    alert('Error al eliminar el proveedor.') // Temporary feedback
  } finally {
    isDeleting.value = false
  }
}
</script>