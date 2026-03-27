<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="error" />

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

              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Descripción
                </label>
                <textarea
                  v-model="form.description"
                  class="input-base w-full px-4 py-2 min-h-[80px]"
                  placeholder="Breve descripción del proveedor, productos que ofrece, etc."
                ></textarea>
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

          <!-- Acuerdos de Pago Automáticos -->
          <div class="mt-8">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-text-primary">Acuerdos de Pago Automáticos</h3>
              <button
                type="button"
                @click="openAgreementModal()"
                class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                + Nuevo Acuerdo
              </button>
            </div>

            <!-- Lista de Acuerdos -->
            <div v-if="paymentAgreements.length === 0" class="text-center py-8 bg-background rounded-lg border border-border">
              <p class="text-text-secondary">No hay acuerdos de pago configurados</p>
              <p class="text-sm text-text-tertiary mt-2">Crea un acuerdo para automatizar los pagos</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="agreement in paymentAgreements"
                :key="agreement.id"
                class="bg-background rounded-lg border border-border p-4 hover:border-primary/50 transition-colors"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h4 class="font-semibold text-text-primary">{{ agreement.name }}</h4>
                      <span
                        :class="[
                          'px-2 py-0.5 rounded text-xs font-medium',
                          agreement.is_active
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        ]"
                      >
                        {{ agreement.is_active ? 'Activo' : 'Inactivo' }}
                      </span>
                      <span
                        v-if="agreement.auto_apply"
                        class="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600"
                      >
                        Auto-aplicar
                      </span>
                    </div>
                    <p class="text-sm text-text-secondary mb-3">{{ agreement.description }}</p>
                    <div class="flex flex-wrap gap-4 text-sm">
                      <div class="flex items-center gap-1 text-text-tertiary">
                        <span class="font-medium">Tipo:</span>
                        <span>{{ formatAgreementType(agreement.agreement_type) }}</span>
                      </div>
                      <div v-if="agreement.specific_day" class="flex items-center gap-1 text-text-tertiary">
                        <span class="font-medium">Día:</span>
                        <span>{{ agreement.specific_day }}</span>
                      </div>
                      <div v-if="agreement.days_offset" class="flex items-center gap-1 text-text-tertiary">
                        <span class="font-medium">Días:</span>
                        <span>{{ agreement.days_offset }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      @click="openAgreementModal(agreement)"
                      class="p-2 text-text-secondary hover:text-primary hover:bg-background-secondary rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Icon name="heroicons:pencil-square" class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      @click="deleteAgreement(agreement.id)"
                      class="p-2 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Icon name="heroicons:trash" class="h-4 w-4" />
                    </button>
                  </div>
                </div>
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

    <!-- Modal para Acuerdos de Pago -->
    <div
      v-if="showAgreementModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeAgreementModal"
    >
      <div class="bg-surface rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-border">
          <h3 class="text-xl font-semibold text-text-primary">
            {{ editingAgreement ? 'Editar Acuerdo' : 'Nuevo Acuerdo de Pago' }}
          </h3>
        </div>

        <form @submit.prevent="saveAgreement" class="p-6 space-y-6">
          <!-- Nombre -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Nombre del Acuerdo *
            </label>
            <input
              v-model="agreementForm.name"
              type="text"
              required
              class="input-base w-full px-4 py-2"
              placeholder="Ej: Pago el día 15 de cada mes"
            />
          </div>

          <!-- Descripción -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Descripción
            </label>
            <textarea
              v-model="agreementForm.description"
              class="input-base w-full px-4 py-2 min-h-[80px]"
              placeholder="Descripción opcional del acuerdo"
            ></textarea>
          </div>

          <!-- Tipo de Acuerdo -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Tipo de Acuerdo *
            </label>
            <select
              v-model="agreementForm.agreement_type"
              required
              class="input-base w-full px-4 py-2"
              @change="resetAgreementFields"
            >
              <option value="">Seleccionar tipo</option>
              <option value="same_day">Mismo día de entrega</option>
              <option value="days_after_delivery">Días después de entrega</option>
              <option value="specific_day_month">Día específico del mes</option>
              <option value="end_of_month">Fin de mes</option>
            </select>
          </div>

          <!-- Campos condicionales según el tipo -->
          <div v-if="agreementForm.agreement_type === 'days_after_delivery'">
            <label class="block text-sm font-medium text-text-primary mb-2">
              Días después de la entrega *
            </label>
            <input
              v-model.number="agreementForm.days_offset"
              type="number"
              min="1"
              required
              class="input-base w-full px-4 py-2"
              placeholder="Ej: 30"
            />
            <p class="text-xs text-text-tertiary mt-1">
              Cantidad de días después de recibir el producto
            </p>
          </div>

          <div v-if="agreementForm.agreement_type === 'specific_day_month'">
            <label class="block text-sm font-medium text-text-primary mb-2">
              Día del mes *
            </label>
            <select
              v-model.number="agreementForm.specific_day"
              required
              class="input-base w-full px-4 py-2"
            >
              <option value="">Seleccionar día</option>
              <option v-for="day in 31" :key="day" :value="day">
                Día {{ day }}
              </option>
            </select>
            <p class="text-xs text-text-tertiary mt-1">
              El pago se realizará este día cada mes
            </p>
          </div>

          <!-- Opciones adicionales -->
          <div class="flex items-center gap-4">
            <div class="flex items-center">
              <input
                v-model="agreementForm.is_active"
                type="checkbox"
                id="agreement_active"
                class="h-4 w-4 text-primary focus:ring-primary border-border rounded"
              />
              <label for="agreement_active" class="ml-2 text-sm font-medium text-text-primary">
                Acuerdo activo
              </label>
            </div>

            <div class="flex items-center">
              <input
                v-model="agreementForm.auto_apply"
                type="checkbox"
                id="agreement_auto_apply"
                class="h-4 w-4 text-primary focus:ring-primary border-border rounded"
              />
              <label for="agreement_auto_apply" class="ml-2 text-sm font-medium text-text-primary">
                Auto-aplicar
              </label>
            </div>
          </div>

          <!-- Botones -->
          <div class="flex gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              :disabled="isSavingAgreement"
              class="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
            >
              {{ isSavingAgreement ? 'Guardando...' : 'Guardar Acuerdo' }}
            </button>
            <button
              type="button"
              @click="closeAgreementModal"
              class="flex-1 py-2 border border-border rounded-lg hover:bg-background transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, inject, onMounted } from 'vue'
import { useRoute, useRouter, navigateTo } from '#app'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.id

useHead({
  title: `Editar Proveedor - Abastecimiento`
})

// Use reactive for the form object
const form = reactive({
  name: '',
  description: '',
  tax_id: '',
  email: '',
  phone: '',
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
const { setRefreshHandler } = useLayoutActions()

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

// Payment Agreements State
const paymentAgreements = ref([])
const showAgreementModal = ref(false)
const editingAgreement = ref(null)
const isSavingAgreement = ref(false)

const agreementForm = reactive({
  name: '',
  description: '',
  agreement_type: '',
  days_offset: null,
  specific_day: null,
  is_active: true,
  auto_apply: false
})

// Fetch payment agreements
const { data: agreementsData, refresh: refreshAgreements } = useAsyncData(
  `agreements-${supplierId}`,
  () => $fetch(`/api/suppliers/providers/${supplierId}/payment-agreements`),
  {
    server: false,
    default: () => [],
    transform: (response) => {
      paymentAgreements.value = response?.data || []
      return response?.data || []
    }
  }
)

// Agreement Modal Functions
const openAgreementModal = (agreement = null) => {
  if (agreement) {
    editingAgreement.value = agreement
    Object.assign(agreementForm, {
      name: agreement.name || '',
      description: agreement.description || '',
      agreement_type: agreement.agreement_type || '',
      days_offset: agreement.days_offset || null,
      specific_day: agreement.specific_day || null,
      is_active: agreement.is_active !== undefined ? agreement.is_active : true,
      auto_apply: agreement.auto_apply !== undefined ? agreement.auto_apply : false
    })
  } else {
    editingAgreement.value = null
    Object.assign(agreementForm, {
      name: '',
      description: '',
      agreement_type: '',
      days_offset: null,
      specific_day: null,
      is_active: true,
      auto_apply: false
    })
  }
  showAgreementModal.value = true
}

const closeAgreementModal = () => {
  showAgreementModal.value = false
  editingAgreement.value = null
}

const resetAgreementFields = () => {
  agreementForm.days_offset = null
  agreementForm.specific_day = null
}

const saveAgreement = async () => {
  isSavingAgreement.value = true
  try {
    const payload = {
      name: agreementForm.name,
      description: agreementForm.description,
      agreement_type: agreementForm.agreement_type,
      is_active: agreementForm.is_active,
      auto_apply: agreementForm.auto_apply
    }

    // Add conditional fields based on agreement type
    if (agreementForm.agreement_type === 'days_after_delivery') {
      payload.days_offset = agreementForm.days_offset
    } else if (agreementForm.agreement_type === 'specific_day_month') {
      payload.specific_day = agreementForm.specific_day
    }

    if (editingAgreement.value) {
      // Update existing agreement
      await $fetch(`/api/suppliers/providers/${supplierId}/payment-agreements/${editingAgreement.value.id}`, {
        method: 'PUT',
        body: payload
      })
      console.log('Acuerdo actualizado exitosamente')
    } else {
      // Create new agreement
      await $fetch(`/api/suppliers/providers/${supplierId}/payment-agreements`, {
        method: 'POST',
        body: payload
      })
      console.log('Acuerdo creado exitosamente')
    }

    await refreshAgreements()
    closeAgreementModal()
  } catch (err) {
    console.error('Error saving agreement:', err)
    alert('Error al guardar el acuerdo. Por favor intente nuevamente.')
  } finally {
    isSavingAgreement.value = false
  }
}

const deleteAgreement = async (agreementId) => {
  if (!confirm('¿Está seguro de que desea eliminar este acuerdo de pago?')) {
    return
  }

  try {
    await $fetch(`/api/suppliers/providers/${supplierId}/payment-agreements/${agreementId}`, {
      method: 'DELETE'
    })
    console.log('Acuerdo eliminado exitosamente')
    await refreshAgreements()
  } catch (err) {
    console.error('Error deleting agreement:', err)
    alert('Error al eliminar el acuerdo. Por favor intente nuevamente.')
  }
}

const formatAgreementType = (type) => {
  const types = {
    same_day: 'Mismo día',
    days_after_delivery: 'Días después',
    specific_day_month: 'Día del mes',
    end_of_month: 'Fin de mes'
  }
  return types[type] || type
}
</script>