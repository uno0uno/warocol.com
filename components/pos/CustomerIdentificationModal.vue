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

          <!-- Name (Optional) -->
          <div>
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
            <p class="mt-1 text-xs text-text-secondary">
              Si el cliente ya existe, se usará su información guardada
            </p>
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
            Continuar
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

// Methods
const handleSubmit = async () => {
  if (!form.value.phone_number) return

  try {
    isLoading.value = true
    errorMessage.value = ''

    // Use $fetch for POST requests
    const response = await $fetch('/api/customers/search-or-create', {
      method: 'POST',
      body: {
        phone_number: form.value.phone_number,
        name: form.value.name || null
      }
    }) as {
      success: boolean
      data: Customer
      is_new: boolean
    }

    if (response.success) {
      emit('customer-identified', response.data)
      emit('update:modelValue', false)

      // Reset form
      form.value = {
        phone_number: '',
        name: ''
      }
    }
  } catch (error: any) {
    console.error('Error creating/finding customer:', error)
    errorMessage.value = error.data?.message || error.message || 'Error al procesar el cliente'
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
