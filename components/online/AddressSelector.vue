<template>
  <div class="w-full">
    <h3 class="text-lg font-bold text-foreground mb-4">Dirección de Entrega</h3>

    <!-- Address List -->
    <div v-if="addresses.length > 0" class="flex flex-col gap-3 mb-4">
      <button
        v-for="address in addresses"
        :key="address.id"
        class="relative flex flex-col sm:flex-row gap-3 p-4 bg-background border-2 border-border rounded-xl
               text-left cursor-pointer transition-all duration-200 w-full
               hover:border-action-outline-focus-ring hover:shadow-sm"
        :class="{ 'border-action-primary-border bg-badge-primary-bg': selectedId === address.id }"
        @click="$emit('select', address.id)"
      >
        <!-- Selection Indicator -->
        <div class="absolute top-4 right-4 sm:static sm:flex-shrink-0 sm:pt-1">
          <div
            class="w-5 h-5 rounded-full border-2 transition-all"
            :class="selectedId === address.id ? 'border-primary border-[6px]' : 'border-border'"
          />
        </div>

        <!-- Address Content -->
        <div class="flex-1 min-w-0 pr-8 sm:pr-0">
          <!-- Type Badge & Default -->
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-xl"
              :class="{
                'bg-badge-info-bg text-badge-info-text': address.address_type === 'home',
                'bg-badge-warning-bg text-badge-warning-text': address.address_type === 'work',
                'bg-muted text-muted-foreground': address.address_type === 'other',
              }"
            >
              {{ getTypeIcon(address.address_type) }} {{ getTypeLabel(address.address_type) }}
            </span>
            <span
              v-if="address.is_default"
              class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-badge-success-bg text-badge-success-text"
            >
              Predeterminada
            </span>
          </div>

          <!-- Address Lines -->
          <div class="mb-2">
            <p class="text-sm font-semibold text-foreground mb-1">{{ address.address_line1 }}</p>
            <p v-if="address.address_line2" class="text-sm text-muted-foreground mb-1">
              {{ address.address_line2 }}
            </p>
            <p class="text-sm text-muted-foreground">
              {{ address.city }}, {{ address.state }}
            </p>
          </div>

          <!-- Delivery Notes -->
          <p v-if="address.delivery_notes" class="text-xs text-muted-foreground italic mt-2 pt-2 border-t border-muted">
            📝 {{ address.delivery_notes }}
          </p>
        </div>

        <!-- Actions (hidden in readonly mode) -->
        <div v-if="!readonly" class="flex gap-1.5 items-start" @click.stop>
          <button
            class="min-h-[44px] min-w-[44px] flex items-center justify-center bg-background border border-border rounded-lg
                   transition-all text-icon-button-primary-text hover:bg-icon-button-primary-hover-bg hover:border-action-outline-focus-ring"
            @click="$emit('edit', address.id)"
            aria-label="Editar dirección"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            class="min-h-[44px] min-w-[44px] flex items-center justify-center bg-background border border-border rounded-lg
                   transition-all text-icon-button-destructive-text hover:bg-icon-button-destructive-hover-bg hover:border-action-destructive-border"
            @click="$emit('delete', address.id)"
            aria-label="Eliminar dirección"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </button>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 px-6 bg-muted/30 rounded-xl mb-4">
      <div class="text-5xl mb-3 opacity-50">📍</div>
      <p class="text-muted-foreground">No tienes direcciones guardadas</p>
    </div>

    <!-- Add New Address Button (shown when canAdd is true) -->
    <button
      v-if="canAdd"
      class="w-full flex items-center justify-center gap-2 py-3.5 px-5
             bg-background border-2 border-dashed border-border rounded-xl
             text-primary text-sm font-semibold cursor-pointer transition-all
             hover:border-action-outline-focus-ring hover:bg-action-outline-hover-bg"
      @click="$emit('add-new')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Agregar Nueva Dirección
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Address } from '~/stores/address'

defineProps<{
  addresses: Address[]
  selectedId: string | null
  readonly?: boolean
  canAdd?: boolean
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
  (e: 'add-new'): void
}>()

const getTypeIcon = (type: string) => {
  const icons = {
    home: '🏠',
    work: '💼',
    other: '📍',
  }
  return icons[type as keyof typeof icons] || '📍'
}

const getTypeLabel = (type: string) => {
  const labels = {
    home: 'Casa',
    work: 'Trabajo',
    other: 'Otro',
  }
  return labels[type as keyof typeof labels] || 'Otro'
}
</script>
