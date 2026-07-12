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
            <h3 class="text-lg font-semibold text-text-primary mb-6">{{ t('abastecimiento.proveedorDetalle.basicInfo') }}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('abastecimiento.proveedorDetalle.supplierNameRequired') }}
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="input-base w-full px-4 py-2"
                  :placeholder="t('abastecimiento.proveedorDetalle.namePlaceholder')"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('abastecimiento.proveedorDetalle.taxIdRequired') }}
                </label>
                <input
                  v-model="form.tax_id"
                  type="text"
                  required
                  class="input-base w-full px-4 py-2"
                  :placeholder="t('abastecimiento.proveedorDetalle.taxIdPlaceholder')"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('abastecimiento.proveedorDetalle.description') }}
                </label>
                <textarea
                  v-model="form.description"
                  class="input-base w-full px-4 py-2 min-h-[80px]"
                  :placeholder="t('abastecimiento.proveedorDetalle.descriptionPlaceholder')"
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('abastecimiento.common.email') }}
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  class="input-base w-full px-4 py-2"
                  :placeholder="t('abastecimiento.proveedorDetalle.emailPlaceholder')"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('abastecimiento.common.telefono') }}
                </label>
                <input
                  v-model="form.phone"
                  type="tel"
                  class="input-base w-full px-4 py-2"
                  :placeholder="t('abastecimiento.proveedorDetalle.phonePlaceholder')"
                />
              </div>
            </div>
          </div>

          <!-- Acuerdos de Pago Automáticos -->
          <div class="mt-8">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-text-primary">{{ t('abastecimiento.proveedorDetalle.automaticAgreements') }}</h3>
              <button
                type="button"
                @click="openAgreementModal()"
                class="px-4 py-2 bg-shell-icon-bg text-shell-icon-text rounded-lg hover:bg-shell-icon-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring text-sm font-medium"
              >
                {{ t('abastecimiento.proveedorDetalle.newAgreement') }}
              </button>
            </div>

            <!-- Lista de Acuerdos -->
            <div v-if="paymentAgreements.length === 0" class="text-center py-8 bg-background rounded-lg border border-border">
              <p class="text-text-secondary">{{ t('abastecimiento.proveedorDetalle.noAgreements') }}</p>
              <p class="text-sm text-text-tertiary mt-2">{{ t('abastecimiento.proveedorDetalle.createAgreementHelp') }}</p>
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
                        {{ agreement.is_active ? t('abastecimiento.proveedorDetalle.active') : t('abastecimiento.proveedorDetalle.inactive') }}
                      </span>
                      <span
                        v-if="agreement.auto_apply"
                        class="px-2 py-0.5 rounded text-xs font-medium bg-state-info-bg text-state-info-text"
                      >
                        {{ t('abastecimiento.proveedorDetalle.autoApply') }}
                      </span>
                    </div>
                    <p class="text-sm text-text-secondary mb-3">{{ agreement.description }}</p>
                    <div class="flex flex-wrap gap-4 text-sm">
                      <div class="flex items-center gap-1 text-text-tertiary">
                        <span class="font-medium">{{ t('abastecimiento.proveedorDetalle.type') }}</span>
                        <span>{{ formatAgreementType(agreement.agreement_type) }}</span>
                      </div>
                      <div v-if="agreement.specific_day" class="flex items-center gap-1 text-text-tertiary">
                        <span class="font-medium">{{ t('abastecimiento.proveedorDetalle.day') }}</span>
                        <span>{{ agreement.specific_day }}</span>
                      </div>
                      <div v-if="agreement.days_offset" class="flex items-center gap-1 text-text-tertiary">
                        <span class="font-medium">{{ t('abastecimiento.proveedorDetalle.days') }}</span>
                        <span>{{ agreement.days_offset }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      @click="openAgreementModal(agreement)"
                      class="p-2 text-text-secondary hover:text-primary hover:bg-background-secondary rounded-lg transition-colors"
                      :title="t('abastecimiento.proveedorDetalle.edit')"
                    >
                      <Icon name="heroicons:pencil-square" class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      @click="deleteAgreement(agreement.id)"
                      class="p-2 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      :title="t('abastecimiento.proveedorDetalle.delete')"
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
            <h3 class="text-lg font-semibold text-text-primary mb-6">{{ t('abastecimiento.proveedorDetalle.status') }}</h3>
            <div class="flex items-center space-x-3">
              <input
                v-model="form.is_active"
                type="checkbox"
                id="is_active"
                class="h-4 w-4 text-primary focus:ring-action-primary-focus-ring border-border rounded"
              />
              <label for="is_active" class="text-sm font-medium text-text-primary">
                {{ t('abastecimiento.proveedorDetalle.supplierActive') }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Summary & Actions -->
      <div class="xl:col-span-1">
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">{{ t('abastecimiento.proveedorDetalle.summary') }}</h3>

          <div class="bg-background rounded-lg p-4 border border-border mb-6">
            <div class="space-y-3">
              <div>
                <p class="text-sm text-text-secondary mb-1">{{ t('abastecimiento.common.nombre') }}</p>
                <p class="font-medium text-text-primary">{{ form.name || t('abastecimiento.proveedorDetalle.noName') }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">{{ t('abastecimiento.proveedorDetalle.taxIdRequired').replace(' *', '') }}</p>
                <p class="font-medium text-text-primary">{{ form.tax_id || t('abastecimiento.proveedorDetalle.noTaxId') }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">{{ t('abastecimiento.proveedorDetalle.status') }}</p>
                <span v-if="form.is_active" class="px-2 py-1 rounded text-xs font-medium bg-success/10 text-success">
                  {{ t('abastecimiento.proveedorDetalle.active') }}
                </span>
                <span v-else class="px-2 py-1 rounded text-xs font-medium bg-destructive/10 text-destructive">
                  {{ t('abastecimiento.proveedorDetalle.inactive') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="w-full py-3 bg-shell-cta-bg text-shell-cta-text rounded-lg hover:bg-shell-cta-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold">
              <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
              <span>{{ isSubmitting ? t('abastecimiento.proveedorDetalle.saving') : t('abastecimiento.proveedorDetalle.saveChanges') }}</span>
            </button>
            
            <NuxtLink 
              to="/abastecimiento/proveedores" 
              class="w-full py-3 rounded-lg bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring font-medium block text-center">
              {{ t('abastecimiento.proveedorDetalle.cancel') }}
            </NuxtLink>

            <button 
              type="button"
              @click="requestDelete"
              :disabled="isDeleting"
              class="w-full py-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/15 transition-all focus:outline-none focus:ring-2 focus:ring-destructive/30 disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold">
              <UiLoadingDots v-if="isDeleting" size="9px" color="currentColor" />
              <span>{{ isDeleting ? t('abastecimiento.proveedorDetalle.deleting') : t('abastecimiento.proveedorDetalle.deleteSupplier') }}</span>
            </button>
          </div>
        </div>
      </div>
    </form>

    <!-- Modal para Acuerdos de Pago -->
    <div
      v-if="showAgreementModal"
      class="fixed inset-0 bg-overlay-backdrop/50 flex items-center justify-center z-50 p-4"
      @click.self="closeAgreementModal"
    >
      <div class="bg-surface rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-border">
          <h3 class="text-xl font-semibold text-text-primary">
            {{ editingAgreement ? t('abastecimiento.proveedorDetalle.editAgreementTitle') : t('abastecimiento.proveedorDetalle.newAgreementTitle') }}
          </h3>
        </div>

        <form @submit.prevent="saveAgreement" class="p-6 space-y-6">
          <!-- Nombre -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              {{ t('abastecimiento.proveedorDetalle.agreementNameRequired') }}
            </label>
            <input
              v-model="agreementForm.name"
              type="text"
              required
              class="input-base w-full px-4 py-2"
              :placeholder="t('abastecimiento.proveedorDetalle.agreementNamePlaceholder')"
            />
          </div>

          <!-- Descripción -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              {{ t('abastecimiento.proveedorDetalle.agreementDescription') }}
            </label>
            <textarea
              v-model="agreementForm.description"
              class="input-base w-full px-4 py-2 min-h-[80px]"
              :placeholder="t('abastecimiento.proveedorDetalle.agreementDescriptionPlaceholder')"
            ></textarea>
          </div>

          <!-- Tipo de Acuerdo -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              {{ t('abastecimiento.proveedorDetalle.agreementTypeRequired') }}
            </label>
            <select
              v-model="agreementForm.agreement_type"
              required
              class="input-base w-full px-4 py-2"
              @change="resetAgreementFields"
            >
              <option value="">{{ t('abastecimiento.proveedorDetalle.selectType') }}</option>
              <option value="same_day">{{ t('abastecimiento.proveedorDetalle.sameDay') }}</option>
              <option value="days_after_delivery">{{ t('abastecimiento.proveedorDetalle.daysAfterDelivery') }}</option>
              <option value="specific_day_month">{{ t('abastecimiento.proveedorDetalle.specificDayMonth') }}</option>
              <option value="end_of_month">{{ t('abastecimiento.proveedorDetalle.endOfMonth') }}</option>
            </select>
          </div>

          <!-- Campos condicionales según el tipo -->
          <div v-if="agreementForm.agreement_type === 'days_after_delivery'">
            <label class="block text-sm font-medium text-text-primary mb-2">
              {{ t('abastecimiento.proveedorDetalle.daysAfterDeliveryRequired') }}
            </label>
            <input
              v-model.number="agreementForm.days_offset"
              type="number"
              min="1"
              required
              class="input-base w-full px-4 py-2"
              :placeholder="t('abastecimiento.proveedorDetalle.daysExample')"
            />
            <p class="text-xs text-text-tertiary mt-1">
              {{ t('abastecimiento.proveedorDetalle.daysAfterDeliveryHelp') }}
            </p>
          </div>

          <div v-if="agreementForm.agreement_type === 'specific_day_month'">
            <label class="block text-sm font-medium text-text-primary mb-2">
              {{ t('abastecimiento.proveedorDetalle.dayOfMonthRequired') }}
            </label>
            <select
              v-model.number="agreementForm.specific_day"
              required
              class="input-base w-full px-4 py-2"
            >
              <option value="">{{ t('abastecimiento.proveedorDetalle.selectDay') }}</option>
              <option v-for="day in 31" :key="day" :value="day">
                {{ t('abastecimiento.proveedorDetalle.dayLabel', { day }) }}
              </option>
            </select>
            <p class="text-xs text-text-tertiary mt-1">
              {{ t('abastecimiento.proveedorDetalle.specificDayHelp') }}
            </p>
          </div>

          <!-- Opciones adicionales -->
          <div class="flex items-center gap-4">
            <div class="flex items-center">
              <input
                v-model="agreementForm.is_active"
                type="checkbox"
                id="agreement_active"
                class="h-4 w-4 text-primary focus:ring-action-primary-focus-ring border-border rounded"
              />
              <label for="agreement_active" class="ml-2 text-sm font-medium text-text-primary">
                {{ t('abastecimiento.proveedorDetalle.agreementActive') }}
              </label>
            </div>

            <div class="flex items-center">
              <input
                v-model="agreementForm.auto_apply"
                type="checkbox"
                id="agreement_auto_apply"
                class="h-4 w-4 text-primary focus:ring-action-primary-focus-ring border-border rounded"
              />
              <label for="agreement_auto_apply" class="ml-2 text-sm font-medium text-text-primary">
                {{ t('abastecimiento.proveedorDetalle.autoApply') }}
              </label>
            </div>
          </div>

          <!-- Botones -->
          <div class="flex gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              :disabled="isSavingAgreement"
              class="flex-1 py-2 bg-shell-cta-bg text-shell-cta-text rounded-lg hover:bg-shell-cta-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring disabled:opacity-50 font-medium"
            >
              {{ isSavingAgreement ? t('abastecimiento.proveedorDetalle.savingAgreement') : t('abastecimiento.proveedorDetalle.saveAgreement') }}
            </button>
            <button
              type="button"
              @click="closeAgreementModal"
              class="flex-1 py-2 bg-shell-icon-bg text-shell-icon-text rounded-lg hover:bg-shell-icon-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring font-medium"
            >
              {{ t('abastecimiento.proveedorDetalle.cancel') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

    <UiConfirmActionModal
      v-model="showDeleteConfirm"
      :title="t('abastecimiento.proveedorDetalle.deleteConfirmTitle')"
      :message="t('abastecimiento.proveedorDetalle.deleteConfirmMessage')"
      :confirm-label="t('abastecimiento.proveedorDetalle.deleteConfirm')"
      :loading-label="t('abastecimiento.proveedorDetalle.deleting')"
      variant="destructive"
      :loading="isDeleting"
      @confirm="performDelete"
    />

    <UiErrorAlertModal
      v-model="errorModal.open"
      :title="errorModal.title"
      :message="errorModal.message"
      :dependents="errorModal.dependents"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, inject, onMounted } from 'vue'
import { useRoute, useRouter, navigateTo } from '#app'

const route = useRoute()
const router = useRouter()
const supplierId = route.params.id
const { t } = useI18n({ useScope: 'global' })

useHead({
  title: () => t('abastecimiento.head.proveedores')
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
const showDeleteConfirm = ref(false)

interface ErrorModalDependent {
  label: string
  count: number
}

const errorModal = ref<{
  open: boolean
  title: string
  message: string
  dependents: ErrorModalDependent[]
}>({
  open: false,
  title: '',
  message: '',
  dependents: [],
})

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
    
    await navigateTo('/abastecimiento/proveedores')
    
  } catch (err) {
    console.error('Error updating supplier:', err)
    alert(t('abastecimiento.proveedorDetalle.updateError'))
  } finally {
    isSubmitting.value = false
  }
}

// Handle provider deletion — opens confirmation modal; performDelete runs on confirm
const requestDelete = () => {
  if (isDeleting.value) return
  showDeleteConfirm.value = true
}

const performDelete = async () => {
  isDeleting.value = true
  try {
    await $fetch(`/api/suppliers/providers/${supplierId}`, {
      method: 'DELETE',
    })

    showDeleteConfirm.value = false
    await navigateTo('/abastecimiento/proveedores')

  } catch (err: any) {
    console.error('Error deleting supplier:', err)
    const detail = err?.data?.detail
    const isStructured409 =
      err?.status === 409 &&
      detail &&
      typeof detail === 'object' &&
      (detail.code === 'supplier_has_dependents' || detail.code === 'supplier_has_dependents_unknown')

    const dependents: ErrorModalDependent[] = isStructured409 && detail.counts
      ? [
          { label: t('abastecimiento.proveedorDetalle.purchaseOrders'), count: detail.counts.purchases ?? 0 },
          { label: t('abastecimiento.proveedorDetalle.registeredPrices'), count: detail.counts.supplier_prices ?? 0 },
        ].filter((dep) => dep.count > 0)
      : []

    showDeleteConfirm.value = false
    errorModal.value = {
      open: true,
      title: t('abastecimiento.proveedorDetalle.deleteErrorTitle'),
      message: isStructured409 && typeof detail.message === 'string'
        ? detail.message
        : t('abastecimiento.proveedorDetalle.deleteErrorMessage'),
      dependents,
    }
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
    } else {
      // Create new agreement
      await $fetch(`/api/suppliers/providers/${supplierId}/payment-agreements`, {
        method: 'POST',
        body: payload
      })
    }

    await refreshAgreements()
    closeAgreementModal()
  } catch (err) {
    console.error('Error saving agreement:', err)
    alert(t('abastecimiento.proveedorDetalle.saveError'))
  } finally {
    isSavingAgreement.value = false
  }
}

const deleteAgreement = async (agreementId) => {
  if (!confirm(t('abastecimiento.proveedorDetalle.agreementDeleteConfirm'))) {
    return
  }

  try {
    await $fetch(`/api/suppliers/providers/${supplierId}/payment-agreements/${agreementId}`, {
      method: 'DELETE'
    })
    await refreshAgreements()
  } catch (err) {
    console.error('Error deleting agreement:', err)
    alert(t('abastecimiento.proveedorDetalle.deleteError'))
  }
}

const formatAgreementType = (type) => {
  const types = {
    same_day: t('abastecimiento.proveedorDetalle.agreementTypes.same_day'),
    days_after_delivery: t('abastecimiento.proveedorDetalle.agreementTypes.days_after_delivery'),
    specific_day_month: t('abastecimiento.proveedorDetalle.agreementTypes.specific_day_month'),
    end_of_month: t('abastecimiento.proveedorDetalle.agreementTypes.end_of_month')
  }
  return types[type] || type
}
</script>
