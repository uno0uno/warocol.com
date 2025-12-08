<template>
  <Transition name="modal-fade">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div class="bg-surface rounded-2xl shadow-2xl max-w-md w-full border-2 border-border" @click.stop>
        <!-- Header -->
        <div class="p-6 border-b border-border">
          <h2 class="text-2xl font-bold text-text-primary flex items-center gap-3">
            <span class="text-3xl">🎯</span>
            Nueva Venta
          </h2>
          <p class="text-sm text-text-secondary mt-2">
            Ingresa el número de teléfono del cliente
          </p>
        </div>

        <!-- Body -->
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <!-- Phone Number -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Número de Teléfono *
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
                📱
              </span>
              <input
                v-model="form.phone_number"
                type="tel"
                placeholder="3001234567"
                class="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary text-lg"
                required
                autofocus
                :disabled="isLoading"
              />
            </div>
          </div>

          <!-- Name (Optional) - Shows if customer is new -->
          <div v-if="showNameField">
            <label class="block text-sm font-medium text-text-primary mb-2">
              Nombre (opcional)
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
                👤
              </span>
              <input
                v-model="form.name"
                type="text"
                placeholder="Juan Pérez"
                class="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                :disabled="isLoading"
              />
            </div>
          </div>

          <!-- Customer Found Message -->
          <div v-if="customerFound" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <span class="text-2xl">✅</span>
              <div>
                <p class="font-semibold text-green-800 dark:text-green-200">
                  Cliente Encontrado
                </p>
                <p class="text-sm text-green-700 dark:text-green-300 mt-1">
                  {{ customerFound.name || 'Sin nombre' }}
                </p>
                <p class="text-xs text-green-600 dark:text-green-400 mt-1">
                  {{ customerFound.email || 'Sin email' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <span class="text-xl">⚠️</span>
              <p class="text-sm text-red-800 dark:text-red-200">
                {{ errorMessage }}
              </p>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="flex justify-center py-4">
            <CommonsTheCustomLoader size="medium" />
          </div>
        </form>

        <!-- Footer -->
        <div class="p-6 border-t border-border flex gap-3 justify-end">
          <button
            type="button"
            @click="handleCancel"
            class="px-6 py-3 rounded-lg font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
            :disabled="isLoading"
          >
            Cancelar
          </button>
          <button
            type="submit"
            @click="handleSubmit"
            class="px-6 py-3 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-crocus disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!form.phone_number || isLoading"
          >
            {{ customerFound ? 'Continuar' : 'Buscar Cliente' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Customer {
  id: string
  phone_number: string
  name: string | null
  email: string | null
}

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'customer-identified', customer: Customer): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const form = ref({
  phone_number: '',
  name: ''
})

const isLoading = ref(false)
const errorMessage = ref('')
const customerFound = ref<Customer | null>(null)
const showNameField = ref(false)

// Watch for phone number changes to search customer
watch(() => form.value.phone_number, async (newPhone) => {
  // Reset states
  customerFound.value = null
  showNameField.value = false
  errorMessage.value = ''

  // Only search if phone has at least 7 digits
  if (newPhone.length >= 7) {
    await searchCustomer(newPhone)
  }
})

// Methods
const searchCustomer = async (phone: string) => {
  try {
    isLoading.value = true
    errorMessage.value = ''

    const response = await $fetch<{
      success: boolean
      customer: Customer | null
      found: boolean
    }>('/api/customers/search', {
      query: { phone_number: phone }
    })

    if (response.found && response.customer) {
      customerFound.value = response.customer
      form.value.name = response.customer.name || ''
      showNameField.value = false
    } else {
      customerFound.value = null
      showNameField.value = true
    }
  } catch (error: any) {
    console.error('Error searching customer:', error)
    errorMessage.value = 'Error al buscar cliente'
    showNameField.value = true
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async () => {
  if (!form.value.phone_number) return

  try {
    isLoading.value = true
    errorMessage.value = ''

    const response = await $fetch<{
      success: boolean
      data: Customer
      is_new: boolean
    }>('/api/customers/search-or-create', {
      method: 'POST',
      body: {
        phone_number: form.value.phone_number,
        name: form.value.name || null
      }
    })

    if (response.success) {
      emit('customer-identified', response.data)
      emit('update:modelValue', false)

      // Reset form
      form.value = {
        phone_number: '',
        name: ''
      }
      customerFound.value = null
      showNameField.value = false
    }
  } catch (error: any) {
    console.error('Error creating/finding customer:', error)
    errorMessage.value = error.message || 'Error al procesar el cliente'
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  emit('update:modelValue', false)

  // Reset form
  form.value = {
    phone_number: '',
    name: ''
  }
  customerFound.value = null
  showNameField.value = false
  errorMessage.value = ''
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
