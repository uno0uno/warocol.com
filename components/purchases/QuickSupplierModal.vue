<template>
  <UiModal v-model="isOpen" title="Crear Proveedor">
    <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-primary mb-2">
          Nombre del Proveedor *
        </label>
        <input
          v-model="form.name"
          type="text"
          required
          class="input-base w-full px-4 py-2"
          placeholder="Ej: Distribuidora XYZ"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-text-primary mb-2">
          NIT/Cedula
        </label>
        <input
          v-model="form.tax_id"
          type="text"
          class="input-base w-full px-4 py-2"
          placeholder="Ej: 900123456-7"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-text-primary mb-2">
          Telefono
        </label>
        <input
          v-model="form.phone"
          type="tel"
          class="input-base w-full px-4 py-2"
          placeholder="+57 300 123 4567"
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
          placeholder="proveedor@email.com"
        />
      </div>
    </form>

    <template #footer>
      <div class="flex gap-3 p-4">
        <button
          type="button"
          @click="closeModal"
          class="flex-1 py-2 border border-border rounded-lg hover:bg-surface-secondary transition-colors font-medium"
        >
          Cancelar
        </button>
        <button
          @click="handleSubmit"
          :disabled="isSubmitting || !form.name"
          class="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
        >
          {{ isSubmitting ? 'Creando...' : 'Crear Proveedor' }}
        </button>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', supplier: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isSubmitting = ref(false)
const form = reactive({
  name: '',
  tax_id: '',
  phone: '',
  email: '',
  is_active: true
})

const closeModal = () => {
  emit('update:modelValue', false)
  resetForm()
}

const resetForm = () => {
  form.name = ''
  form.tax_id = ''
  form.phone = ''
  form.email = ''
}

const handleSubmit = async () => {
  if (!form.name || isSubmitting.value) return

  isSubmitting.value = true

  try {
    const response = await $fetch('/api/suppliers/providers', {
      method: 'POST',
      body: form
    })

    if (response.data) {
      emit('created', response.data)
      closeModal()
    }
  } catch (error: any) {
    console.error('Error creating supplier:', error)
    alert(error.response?._data?.detail || 'Error al crear el proveedor')
  } finally {
    isSubmitting.value = false
  }
}
</script>
