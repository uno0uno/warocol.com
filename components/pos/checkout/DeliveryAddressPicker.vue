<script setup lang="ts">
import type { Address } from '~/stores/address'

defineProps<{
  addresses: Address[]
  selectedId: string | null
  loading?: boolean
}>()

defineEmits<{
  (e: 'update:selectedId', id: string): void
  (e: 'add-new'): void
}>()

const ADDRESS_TYPE_LABELS: Record<string, string> = {
  home: 'Hogar',
  work: 'Trabajo',
  other: 'Otro',
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Loading -->
    <div v-if="loading && !addresses.length" class="flex items-center justify-center py-4">
      <CommonsTheCustomLoader size="small" />
    </div>

    <!-- Empty state -->
    <p v-else-if="!addresses.length" class="text-sm text-text-secondary py-2">
      Este cliente no tiene direcciones guardadas. Agrega una nueva para continuar.
    </p>

    <!-- Address list -->
    <label
      v-for="address in addresses"
      :key="address.id"
      class="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors min-h-[60px]"
      :class="address.id === selectedId
        ? 'border-primary bg-primary/5'
        : 'border-border hover:bg-surface-secondary'"
    >
      <input
        type="radio"
        name="pos-delivery-address"
        :value="address.id"
        :checked="address.id === selectedId"
        class="mt-1 w-5 h-5 accent-primary cursor-pointer"
        @change="$emit('update:selectedId', address.id)"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-semibold text-text-primary">{{ address.address_line1 }}</span>
          <span class="text-xs px-2 py-0.5 bg-surface-secondary rounded-full text-text-secondary">
            {{ ADDRESS_TYPE_LABELS[address.address_type] ?? 'Otro' }}
          </span>
          <span
            v-if="address.is_default"
            class="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium"
          >
            Predeterminada
          </span>
        </div>
        <p v-if="address.address_line2" class="text-xs text-text-secondary mt-0.5">
          {{ address.address_line2 }}
        </p>
        <p class="text-xs text-text-secondary mt-0.5">
          {{ address.city }}{{ address.state ? ', ' + address.state : '' }}
        </p>
        <p v-if="address.delivery_notes" class="text-xs text-text-secondary mt-1 italic">
          "{{ address.delivery_notes }}"
        </p>
      </div>
    </label>

    <!-- Add new button -->
    <button
      type="button"
      class="w-full min-h-[44px] py-2.5 px-4 border-2 border-dashed border-border rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary-focus-ring/30"
      @click="$emit('add-new')"
    >
      + Agregar nueva dirección
    </button>
  </div>
</template>
