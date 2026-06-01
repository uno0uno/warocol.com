<template>
  <UiModal v-model="open" title="Nuevo cliente">
    <div class="px-6 py-5 space-y-4">
      <div class="flex flex-col gap-1.5">
        <label for="create-phone" class="text-sm font-medium text-text-primary">
          Teléfono <span class="text-red-600">*</span>
        </label>
        <input
          id="create-phone"
          v-model="form.phone_number"
          type="tel"
          placeholder="3001234567"
          class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          :disabled="isSaving"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="create-name" class="text-sm font-medium text-text-primary">Nombre</label>
        <input
          id="create-name"
          v-model="form.name"
          type="text"
          placeholder="Nombre completo"
          class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          :disabled="isSaving"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="create-email" class="text-sm font-medium text-text-primary">Correo</label>
        <input
          id="create-email"
          v-model="form.email"
          type="email"
          placeholder="cliente@email.com"
          class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          :disabled="isSaving"
        />
      </div>
      <p v-if="apiError" role="alert" class="text-sm text-red-600">{{ apiError }}</p>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-3 px-6 py-4">
        <button
          type="button"
          @click="open = false"
          class="min-h-[44px] px-4 text-sm font-medium text-text-secondary border-2 border-border rounded-lg hover:bg-surface-secondary"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving || !canSubmit"
          @click="handleSubmit"
          class="min-h-[44px] px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <UiLoadingDots v-if="isSaving" size="9px" />
          <span v-else>Crear cliente</span>
        </button>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'

interface CreatedCustomer {
  id: string
  name: string
  phone_number: string | null
}

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', customer: CreatedCustomer): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const form = reactive({ phone_number: '', name: '', email: '' })
const isSaving = ref(false)
const apiError = ref<string | null>(null)

watch(() => props.modelValue, (v) => {
  if (v) {
    form.phone_number = ''
    form.name = ''
    form.email = ''
    apiError.value = null
  }
})

const canSubmit = computed(() => form.phone_number.trim().length >= 7)

const handleSubmit = async () => {
  if (!canSubmit.value || isSaving.value) return
  isSaving.value = true
  apiError.value = null
  try {
    const response = await $fetch<{
      success: boolean
      data: { id: string; name: string; phone_number: string | null }
    }>('/api/customers/search-or-create', {
      method: 'POST',
      body: {
        phone_number: form.phone_number.trim(),
        name: form.name.trim() || null,
        email: form.email.trim() || null,
      },
    })
    if (response.success) {
      emit('created', {
        id: response.data.id,
        name: response.data.name,
        phone_number: response.data.phone_number,
      })
      open.value = false
    }
  } catch (e: any) {
    apiError.value = e?.data?.detail || e?.message || 'Error al crear el cliente'
  } finally {
    isSaving.value = false
  }
}
</script>
