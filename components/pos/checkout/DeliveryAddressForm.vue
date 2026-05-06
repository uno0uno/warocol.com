<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { AddressCreate } from '~/stores/address'

const props = defineProps<{
  customerId: string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'submit', payload: AddressCreate): void
  (e: 'cancel'): void
}>()

// Backend constraints (app/models/address_profile.py):
// - address_line1: required, min 5 chars
// - city, state: required, min 2 chars
// - postal_code: optional (DB column nullable; backend coerces empty → NULL)
// - country: max 2 chars (ISO code, e.g. "CO")
const form = reactive<AddressCreate>({
  address_line1: '',
  address_line2: '',
  city: 'Bogotá',
  state: 'Cundinamarca',
  postal_code: '',
  country: 'CO',
  address_type: 'home',
  delivery_notes: '',
  is_default: false,
})

const isValid = computed(
  () => form.address_line1.trim().length >= 5
    && form.city.trim().length >= 2
    && form.state.trim().length >= 2
)

const submit = () => {
  if (!isValid.value || props.loading) return
  const payload: AddressCreate = {
    address_line1: form.address_line1.trim(),
    city: form.city.trim(),
    state: (form.state ?? '').trim(),
    country: form.country,
    address_type: form.address_type,
    is_default: form.is_default,
  }
  const addr2 = form.address_line2?.trim()
  if (addr2) payload.address_line2 = addr2
  const notes = form.delivery_notes?.trim()
  if (notes) payload.delivery_notes = notes
  const postal = form.postal_code?.trim()
  if (postal) payload.postal_code = postal
  emit('submit', payload)
}
</script>

<template>
  <form class="flex flex-col gap-4 p-4 border-2 border-border rounded-xl bg-surface-secondary/30" @submit.prevent="submit">
    <h4 class="text-sm font-semibold text-text-primary">Nueva dirección</h4>

    <!-- Required: line 1 -->
    <div class="flex flex-col gap-1">
      <label for="addr-line1" class="text-sm font-medium text-text-primary">
        Dirección <span class="text-destructive">*</span>
      </label>
      <input
        id="addr-line1"
        v-model="form.address_line1"
        type="text"
        autocomplete="address-line1"
        placeholder="Ej: Cra 50 #10-20"
        class="input-base w-full px-3 py-2 text-sm"
        :disabled="loading"
        required
      />
    </div>

    <!-- Optional: line 2 -->
    <div class="flex flex-col gap-1">
      <label for="addr-line2" class="text-sm font-medium text-text-primary">
        Apto/Casa (opcional)
      </label>
      <input
        id="addr-line2"
        v-model="form.address_line2"
        type="text"
        autocomplete="address-line2"
        placeholder="Ej: Apto 305, Torre B"
        class="input-base w-full px-3 py-2 text-sm"
        :disabled="loading"
      />
    </div>

    <!-- City + state -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="addr-city" class="text-sm font-medium text-text-primary">
          Ciudad <span class="text-destructive">*</span>
        </label>
        <input
          id="addr-city"
          v-model="form.city"
          type="text"
          class="input-base w-full px-3 py-2 text-sm"
          :disabled="loading"
          required
        />
      </div>
      <div class="flex flex-col gap-1">
        <label for="addr-state" class="text-sm font-medium text-text-primary">
          Departamento <span class="text-destructive">*</span>
        </label>
        <input
          id="addr-state"
          v-model="form.state"
          type="text"
          class="input-base w-full px-3 py-2 text-sm"
          :disabled="loading"
          required
        />
      </div>
    </div>

    <!-- Type + postal -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="addr-type" class="text-sm font-medium text-text-primary">Tipo</label>
        <select
          id="addr-type"
          v-model="form.address_type"
          class="input-base w-full px-3 py-2 text-sm"
          :disabled="loading"
        >
          <option value="home">Hogar</option>
          <option value="work">Trabajo</option>
          <option value="other">Otro</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label for="addr-postal" class="text-sm font-medium text-text-primary">
          Código postal (opcional)
        </label>
        <input
          id="addr-postal"
          v-model="form.postal_code"
          type="text"
          placeholder="Ej: 110221"
          autocomplete="postal-code"
          class="input-base w-full px-3 py-2 text-sm"
          :disabled="loading"
        />
      </div>
    </div>

    <!-- Address-level notes -->
    <div class="flex flex-col gap-1">
      <label for="addr-notes" class="text-sm font-medium text-text-primary">
        Notas de la dirección (opcional)
      </label>
      <textarea
        id="addr-notes"
        v-model="form.delivery_notes"
        rows="2"
        maxlength="200"
        placeholder="Ej: portería en la calle 51, edificio amarillo"
        class="input-base w-full px-3 py-2 text-sm resize-none"
        :disabled="loading"
      />
    </div>

    <!-- Error -->
    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

    <!-- Actions -->
    <div class="flex items-center gap-2 justify-end">
      <button
        type="button"
        class="min-h-[44px] px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-secondary rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :disabled="loading"
        @click="$emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        class="min-h-[44px] px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        :disabled="!isValid || loading"
      >
        {{ loading ? 'Guardando...' : 'Guardar dirección' }}
      </button>
    </div>
  </form>
</template>
