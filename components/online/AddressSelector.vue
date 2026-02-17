<template>
  <div class="address-selector">
    <h3 class="selector-title">Dirección de Entrega</h3>

    <!-- Address List -->
    <div v-if="addresses.length > 0" class="address-list">
      <button
        v-for="address in addresses"
        :key="address.id"
        class="address-card"
        :class="{ selected: selectedId === address.id }"
        @click="$emit('select', address.id)"
      >
        <!-- Selection Indicator -->
        <div class="selection-indicator">
          <div class="radio-circle"></div>
        </div>

        <!-- Address Content -->
        <div class="address-content">
          <!-- Type Badge & Default -->
          <div class="address-header">
            <span class="address-type-badge" :class="`type-${address.address_type}`">
              {{ getTypeIcon(address.address_type) }} {{ getTypeLabel(address.address_type) }}
            </span>
            <span v-if="address.is_default" class="default-badge">Predeterminada</span>
          </div>

          <!-- Address Lines -->
          <div class="address-lines">
            <p class="address-line1">{{ address.address_line1 }}</p>
            <p v-if="address.address_line2" class="address-line2">
              {{ address.address_line2 }}
            </p>
            <p class="address-city">
              {{ address.city }}, {{ address.state }}
            </p>
          </div>

          <!-- Delivery Notes -->
          <p v-if="address.delivery_notes" class="delivery-notes">
            📝 {{ address.delivery_notes }}
          </p>
        </div>

        <!-- Actions -->
        <div class="address-actions" @click.stop>
          <button
            class="action-btn edit-btn"
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
            class="action-btn delete-btn"
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
    <div v-else class="empty-state">
      <div class="empty-icon">📍</div>
      <p>No tienes direcciones guardadas</p>
    </div>

    <!-- Add New Address Button -->
    <button class="add-address-btn" @click="$emit('add-new')">
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

<style scoped>
.address-selector {
  width: 100%;
}

.selector-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.address-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  width: 100%;
}

.address-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.address-card.selected {
  border-color: #667eea;
  background: #f0f4ff;
}

.selection-indicator {
  flex-shrink: 0;
  padding-top: 4px;
}

.radio-circle {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
}

.address-card.selected .radio-circle {
  border-color: #667eea;
  border-width: 6px;
}

.address-content {
  flex: 1;
  min-width: 0;
}

.address-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.address-type-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  background: #f3f4f6;
  color: #6b7280;
}

.address-type-badge.type-home {
  background: #dbeafe;
  color: #1e40af;
}

.address-type-badge.type-work {
  background: #fef3c7;
  color: #92400e;
}

.default-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 10px;
  background: #10b981;
  color: white;
}

.address-lines {
  margin-bottom: 8px;
}

.address-line1 {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px 0;
}

.address-line2 {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 4px 0;
}

.address-city {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.delivery-notes {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  margin: 8px 0 0 0;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}

.address-actions {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn {
  color: #667eea;
}

.edit-btn:hover {
  background: #f0f4ff;
  border-color: #667eea;
}

.delete-btn {
  color: #ef4444;
}

.delete-btn:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 16px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  color: #6b7280;
  margin: 0;
}

.add-address-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  color: #667eea;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-address-btn:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

/* Mobile styles */
@media (max-width: 640px) {
  .address-card {
    flex-direction: column;
    gap: 12px;
  }

  .selection-indicator {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  .address-content {
    padding-right: 32px;
  }

  .address-actions {
    justify-content: flex-start;
  }
}
</style>
