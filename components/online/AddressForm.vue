<template>
  <form class="w-full max-w-xl" @submit.prevent="handleSubmit">
    <h3 class="text-xl font-bold text-foreground mb-6">{{ isEdit ? 'Editar Dirección' : 'Nueva Dirección' }}</h3>

    <!-- Address Type -->
    <div class="mb-5">
      <label class="block text-sm font-semibold text-foreground mb-2">Tipo de dirección</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="type in addressTypes"
          :key="type.value"
          type="button"
          class="py-3 px-4 border-2 rounded-lg text-sm font-semibold text-center cursor-pointer transition-all"
          :class="formData.address_type === type.value
            ? 'bg-primary border-primary text-primary-foreground'
            : 'bg-background border-border text-muted-foreground hover:border-primary hover:text-primary'"
          @click="formData.address_type = type.value"
        >
          {{ type.icon }} {{ type.label }}
        </button>
      </div>
    </div>

    <!-- Address Line 1 -->
    <div class="mb-5">
      <label for="address_line1" class="block text-sm font-semibold text-foreground mb-2">
        Dirección *
      </label>
      <input
        id="address_line1"
        v-model="formData.address_line1"
        type="text"
        class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground
               placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
               focus:border-ring transition-all"
        placeholder="Calle 100 # 20-30"
        required
      />
    </div>

    <!-- Address Line 2 -->
    <div class="mb-5">
      <label for="address_line2" class="block text-sm font-semibold text-foreground mb-2">
        Apartamento, suite, etc.
      </label>
      <input
        id="address_line2"
        v-model="formData.address_line2"
        type="text"
        class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground
               placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
               focus:border-ring transition-all"
        placeholder="Apto 501, Torre B (opcional)"
      />
    </div>

    <!-- City & State -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
      <div>
        <label for="city" class="block text-sm font-semibold text-foreground mb-2">
          Ciudad *
        </label>
        <input
          id="city"
          v-model="formData.city"
          type="text"
          class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground
                 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                 focus:border-ring transition-all"
          placeholder="Bogotá"
          required
        />
      </div>

      <div>
        <label for="state" class="block text-sm font-semibold text-foreground mb-2">
          Departamento *
        </label>
        <input
          id="state"
          v-model="formData.state"
          type="text"
          class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground
                 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                 focus:border-ring transition-all"
          placeholder="Cundinamarca"
          required
        />
      </div>
    </div>

    <!-- Postal Code -->
    <div class="mb-5">
      <label for="postal_code" class="block text-sm font-semibold text-foreground mb-2">
        Código Postal (opcional)
      </label>
      <input
        id="postal_code"
        v-model="formData.postal_code"
        type="text"
        class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground
               placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
               focus:border-ring transition-all"
        placeholder="110111"
        maxlength="10"
      />
    </div>

    <!-- Delivery Notes -->
    <div class="mb-5">
      <label for="delivery_notes" class="block text-sm font-semibold text-foreground mb-2">
        Instrucciones de entrega
      </label>
      <textarea
        id="delivery_notes"
        v-model="formData.delivery_notes"
        class="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground
               placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
               focus:border-ring transition-all resize-y min-h-[80px] font-[inherit]"
        placeholder="Ej: Portería con citófono - timbre 501, entregar al portero"
        rows="3"
        maxlength="500"
      ></textarea>
      <span class="block text-right text-xs text-muted-foreground mt-1">{{ formData.delivery_notes?.length || 0 }}/500</span>
    </div>

    <!-- Set as Default -->
    <div class="mb-5">
      <label class="flex items-center gap-2.5 cursor-pointer">
        <input
          v-model="formData.is_default"
          type="checkbox"
          class="w-5 h-5 cursor-pointer accent-primary"
        />
        <span class="text-sm text-foreground select-none">Establecer como dirección predeterminada</span>
      </label>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm mb-5">
      ⚠️ {{ error }}
    </div>

    <!-- Actions -->
    <div class="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
      <button
        type="button"
        class="sm:w-auto w-full py-3 px-6 text-sm font-semibold rounded-lg transition-all
               bg-muted text-muted-foreground hover:bg-muted/80
               disabled:opacity-50 disabled:cursor-not-allowed"
        @click="$emit('cancel')"
        :disabled="loading"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="sm:w-auto w-full py-3 px-6 text-sm font-semibold rounded-lg transition-all
               bg-primary text-primary-foreground hover:bg-primary/90
               disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading || !isFormValid"
      >
        <span v-if="!loading">{{ isEdit ? 'Guardar Cambios' : 'Guardar Dirección' }}</span>
        <span v-else>Guardando...</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { Address, AddressCreate } from '~/stores/address'

const props = withDefaults(
  defineProps<{
    address?: Address | null
    loading?: boolean
  }>(),
  {
    address: null,
    loading: false,
  }
)

const emit = defineEmits<{
  (e: 'submit', data: AddressCreate): void
  (e: 'cancel'): void
}>()

const addressTypes = [
  { value: 'home', label: 'Casa', icon: '🏠' },
  { value: 'work', label: 'Trabajo', icon: '💼' },
  { value: 'other', label: 'Otro', icon: '📍' },
] as const

const isEdit = computed(() => !!props.address)

const error = ref<string | null>(null)

// Form data
const formData = reactive<AddressCreate>({
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'CO',
  is_default: false,
  address_type: 'home',
  delivery_notes: '',
})

// Load address data if editing
watch(
  () => props.address,
  address => {
    if (address) {
      formData.address_line1 = address.address_line1
      formData.address_line2 = address.address_line2 || ''
      formData.city = address.city
      formData.state = address.state
      formData.postal_code = address.postal_code ?? ''
      formData.country = address.country
      formData.is_default = address.is_default
      formData.address_type = address.address_type
      formData.delivery_notes = address.delivery_notes || ''
    }
  },
  { immediate: true }
)

const isFormValid = computed(() => {
  return (
    formData.address_line1.trim().length >= 5 &&
    formData.city.trim().length >= 2 &&
    formData.state.trim().length >= 2
  )
})

const handleSubmit = () => {
  if (!isFormValid.value) {
    error.value = 'Por favor completa todos los campos requeridos'
    return
  }

  error.value = null
  // Omit postal_code when empty so the backend stores NULL instead of "".
  const payload = { ...formData }
  if (!payload.postal_code?.trim()) {
    delete payload.postal_code
  } else {
    payload.postal_code = payload.postal_code.trim()
  }
  emit('submit', payload)
}
</script>
