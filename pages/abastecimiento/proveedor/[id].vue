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

    <!-- Edit Form with Split Layout -->
    <div v-else class="page-layout">
      <form @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <!-- Left Column: Form Content -->
      <div class="xl:col-span-2 space-y-6">
        <div class="bg-surface border-2 border-border rounded-xl p-6 md:p-8 shadow-sm">
          <!-- Información Básica -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-6">Información Básica</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          <div class="mt-8">
            <h3 class="text-lg font-semibold text-text-primary mb-6">Términos Comerciales</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
            </div>
          </div>

          <!-- Estado -->
          <div class="mt-8">
            <h3 class="text-lg font-semibold text-text-primary mb-6">Estado</h3>
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
        </div>
      </div>

      <!-- Right Column: Summary & Actions -->
      <div class="xl:col-span-1">
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Resumen del Proveedor</h3>

          <div class="bg-background rounded-lg p-4 border border-border mb-6">
            <div class="space-y-3">
              <div>
                <p class="text-sm text-text-secondary mb-1">Nombre</p>
                <p class="font-medium text-text-primary">{{ form.name || 'Sin nombre' }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">NIT/Cédula</p>
                <p class="font-medium text-text-primary">{{ form.tax_id || 'Sin NIT' }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">Estado</p>
                <span v-if="form.is_active" class="px-2 py-1 rounded text-xs font-medium bg-success/10 text-success">
                  Activo
                </span>
                <span v-else class="px-2 py-1 rounded text-xs font-medium bg-destructive/10 text-destructive">
                  Inactivo
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-emerald-500/20">
              <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
              <span>{{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}</span>
            </button>
            
            <NuxtLink 
              to="/abastecimiento/proveedores" 
              class="w-full py-3 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-colors font-medium block text-center">
              Cancelar
            </NuxtLink>

            <button 
              type="button"
              @click="handleDelete"
              :disabled="isDeleting"
              class="w-full py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold">
              <CommonsTheCustomLoader v-if="isDeleting" size="small" />
              <span>{{ isDeleting ? 'Eliminando...' : 'Eliminar Proveedor' }}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  </div>
  </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted } from 'vue'
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
  () => $fetch(`/api/suppliers/providers/${supplierId}`),
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

// Inject refresh handler setter from layout
const setRefreshHandler = inject('setRefreshHandler', () => {})

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refresh)
})

// Handle form submission (Update)
const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    await $fetch(`/api/suppliers/providers/${supplierId}`, {
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
    await $fetch(`/api/suppliers/providers/${supplierId}`, {
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