<template>
  <form class="address-form" @submit.prevent="handleSubmit">
    <h3 class="form-title">{{ isEdit ? 'Editar Dirección' : 'Nueva Dirección' }}</h3>

    <!-- Address Type -->
    <div class="form-group">
      <label class="form-label">Tipo de dirección</label>
      <div class="type-buttons">
        <button
          v-for="type in addressTypes"
          :key="type.value"
          type="button"
          class="type-btn"
          :class="{ active: formData.address_type === type.value }"
          @click="formData.address_type = type.value"
        >
          {{ type.icon }} {{ type.label }}
        </button>
      </div>
    </div>

    <!-- Address Line 1 -->
    <div class="form-group">
      <label for="address_line1" class="form-label">
        Dirección *
      </label>
      <input
        id="address_line1"
        v-model="formData.address_line1"
        type="text"
        class="form-input"
        placeholder="Calle 100 # 20-30"
        required
      />
    </div>

    <!-- Address Line 2 -->
    <div class="form-group">
      <label for="address_line2" class="form-label">
        Apartamento, suite, etc.
      </label>
      <input
        id="address_line2"
        v-model="formData.address_line2"
        type="text"
        class="form-input"
        placeholder="Apto 501, Torre B (opcional)"
      />
    </div>

    <!-- City & State -->
    <div class="form-row">
      <div class="form-group">
        <label for="city" class="form-label">
          Ciudad *
        </label>
        <input
          id="city"
          v-model="formData.city"
          type="text"
          class="form-input"
          placeholder="Bogotá"
          required
        />
      </div>

      <div class="form-group">
        <label for="state" class="form-label">
          Departamento *
        </label>
        <input
          id="state"
          v-model="formData.state"
          type="text"
          class="form-input"
          placeholder="Cundinamarca"
          required
        />
      </div>
    </div>

    <!-- Postal Code -->
    <div class="form-group">
      <label for="postal_code" class="form-label">
        Código Postal *
      </label>
      <input
        id="postal_code"
        v-model="formData.postal_code"
        type="text"
        class="form-input"
        placeholder="110111"
        required
        maxlength="10"
      />
    </div>

    <!-- Delivery Notes -->
    <div class="form-group">
      <label for="delivery_notes" class="form-label">
        Instrucciones de entrega
      </label>
      <textarea
        id="delivery_notes"
        v-model="formData.delivery_notes"
        class="form-textarea"
        placeholder="Ej: Portería con citófono - timbre 501, entregar al portero"
        rows="3"
        maxlength="500"
      ></textarea>
      <span class="char-count">{{ formData.delivery_notes?.length || 0 }}/500</span>
    </div>

    <!-- Set as Default -->
    <div class="form-group">
      <label class="checkbox-label">
        <input
          v-model="formData.is_default"
          type="checkbox"
          class="checkbox-input"
        />
        <span class="checkbox-text">Establecer como dirección predeterminada</span>
      </label>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-alert">
      ⚠️ {{ error }}
    </div>

    <!-- Actions -->
    <div class="form-actions">
      <button
        type="button"
        class="btn btn-secondary"
        @click="$emit('cancel')"
        :disabled="loading"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="loading || !isFormValid"
      >
        <span v-if="!loading">{{ isEdit ? 'Guardar Cambios' : 'Guardar Dirección' }}</span>
        <span v-else>Guardando...</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
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
      formData.postal_code = address.postal_code
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
    formData.state.trim().length >= 2 &&
    formData.postal_code.trim().length >= 4
  )
})

const handleSubmit = () => {
  if (!isFormValid.value) {
    error.value = 'Por favor completa todos los campos requeridos'
    return
  }

  error.value = null
  emit('submit', { ...formData })
}
</script>

<style scoped>
.address-form {
  width: 100%;
  max-width: 600px;
}

.form-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 24px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  color: #111827;
  background: white;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #9ca3af;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.type-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.type-btn {
  padding: 12px 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.type-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.type-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #667eea;
}

.checkbox-text {
  font-size: 15px;
  color: #374151;
  user-select: none;
}

.error-alert {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 14px;
  margin-bottom: 20px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
}

.btn {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Mobile styles */
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .type-buttons {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
  }
}
</style>
