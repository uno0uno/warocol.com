<template>
  <div class="bg-surface rounded-xl shadow-md hover:shadow-lg transition-shadow border border-border">
    <div class="p-5">
      <!-- Main Content with Dashed Border -->
      <div class="border-2 border-dashed border-border rounded-lg p-5">
        <!-- Header with Badge -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <h3 class="text-[17px] font-semibold text-text-primary mb-1">{{ supplier.name }}</h3>
            <p class="text-sm font-normal text-text-primary opacity-50 truncate">{{ supplier.tax_id }}</p>
          </div>

          <!-- Status Badge -->
          <UiStatusBadge
            :value="supplier.is_active ? 'Activo' : 'Inactivo'"
            format="text"
            :variant="supplier.is_active ? 'success' : 'destructive'"
            size="sm"
            class="flex-shrink-0"
          />
        </div>

        <!-- Description -->
        <div v-if="supplier.description" class="mt-3">
          <p class="text-sm text-text-secondary line-clamp-2">{{ supplier.description }}</p>
        </div>

        <!-- Contact Info -->
        <div class="pt-3 mt-4 border-t border-border space-y-1.5">
          <p class="text-[13px] font-medium text-text-primary opacity-70">Contacto</p>
          <p class="text-sm font-normal text-text-primary opacity-65">{{ supplier.email || 'No especificado' }}</p>
          <p class="text-sm font-normal text-text-primary opacity-65">{{ supplier.phone || 'No especificado' }}</p>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between mt-4">
        <!-- Payment Terms -->
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-text-primary opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-medium text-text-primary opacity-70">{{ supplier.payment_terms || 'Contado' }}</span>
        </div>

        <!-- Edit Actions -->
        <div class="flex items-center gap-3">
          <button
            @click="$emit('copy-link', supplier)"
            class="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded-md text-primary hover:bg-accent transition-colors"
            title="Copiar enlace del portal"
          >
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          <button
            @click="$emit('edit', supplier)"
            class="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded-md text-primary hover:bg-accent transition-colors"
            title="Editar proveedor"
          >
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Supplier {
  id: string
  name: string
  description?: string
  tax_id?: string
  email?: string
  phone?: string
  payment_terms?: string
  is_active: boolean
}

interface Props {
  supplier: Supplier
}

interface Emits {
  (e: 'edit', supplier: Supplier): void
  (e: 'copy-link', supplier: Supplier): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>
