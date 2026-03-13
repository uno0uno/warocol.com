<template>
  <Transition name="sheet">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/50"
      @click.self="handleClose"
    >
      <div class="bottom-sheet-panel bg-surface w-full md:max-w-md border border-border flex flex-col rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[85vh] md:max-h-[90vh]" @click.stop>

        <!-- Mobile drag handle -->
        <div class="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0" aria-hidden="true">
          <div class="w-10 h-1 rounded-full bg-border"></div>
        </div>

        <!-- Header -->
        <div class="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 class="text-xl font-bold text-text-primary">
              {{ state === 'create' ? 'Nuevo cliente' : 'Buscar cliente' }}
            </h2>
            <p class="text-sm text-text-secondary mt-0.5">
              {{ state === 'create' ? 'Ingresa los datos del nuevo cliente' : 'Busca por nombre o teléfono' }}
            </p>
          </div>
          <button
            @click="handleClose"
            aria-label="Cerrar modal"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- STATE: Search -->
        <template v-if="state === 'search'">
          <!-- Search Input -->
          <div class="p-4 border-b border-border flex-shrink-0">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                placeholder="Nombre o teléfono..."
                class="w-full pl-10 pr-10 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base"
                autocomplete="off"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                aria-label="Limpiar búsqueda"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Results Area (scrollable) -->
          <div class="flex-1 overflow-y-auto min-h-[200px]">

            <!-- Empty state: no query -->
            <div v-if="!searchQuery" class="flex flex-col items-center justify-center h-full py-10 text-text-secondary">
              <svg class="h-12 w-12 mb-3 opacity-40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <p class="text-sm">Escribe para buscar un cliente</p>
            </div>

            <!-- Loading skeleton -->
            <div v-else-if="isSearching" class="p-4 space-y-3">
              <div v-for="i in 3" :key="i" class="flex items-center gap-3 animate-pulse">
                <div class="w-10 h-10 rounded-full bg-surface-secondary flex-shrink-0"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-surface-secondary rounded w-2/3"></div>
                  <div class="h-3 bg-surface-secondary rounded w-1/2"></div>
                </div>
              </div>
            </div>

            <!-- Results list -->
            <div v-else-if="searchResults.length > 0">
              <button
                v-for="customer in searchResults"
                :key="String(customer.id)"
                @click="selectCustomer(customer)"
                class="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors text-left min-h-[56px] border-b border-border/50 last:border-b-0"
              >
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {{ customerInitial(customer) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-text-primary truncate">{{ customer.name || 'Sin nombre' }}</p>
                  <p class="text-sm text-text-secondary truncate">{{ customer.phone_number || 'Sin teléfono' }}</p>
                </div>
                <svg class="h-4 w-4 text-text-tertiary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <!-- No results found -->
            <div v-else-if="debouncedQuery && !isSearching" class="p-6 text-center">
              <div class="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mx-auto mb-3">
                <svg class="h-6 w-6 text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                </svg>
              </div>
              <p class="font-medium text-text-primary mb-1">Sin resultados para "{{ debouncedQuery }}"</p>
              <p class="text-sm text-text-secondary mb-5">Puedes crear un nuevo cliente o continuar sin datos</p>

              <div class="space-y-3">
                <button
                  @click="state = 'create'"
                  class="w-full min-h-[44px] px-4 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 active:scale-95 transition-all"
                >
                  Crear cliente nuevo
                </button>
                <button
                  @click="selectGenericCustomer"
                  :disabled="isCreatingGeneric"
                  class="w-full min-h-[44px] px-4 py-3 bg-surface border border-border text-text-primary font-medium rounded-xl hover:bg-surface-secondary active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="isCreatingGeneric">Procesando...</span>
                  <span v-else>Continuar sin datos</span>
                </button>
              </div>
            </div>

          </div>

          <!-- Footer: always-visible actions as cards -->
          <div class="p-4 border-t border-border flex-shrink-0 grid grid-cols-2 gap-3">
            <!-- Nuevo cliente card -->
            <button
              @click="state = 'create'"
              class="flex flex-row items-center gap-3 px-4 py-3 min-h-[64px] bg-surface border-2 border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all text-left active:scale-95"
            >
              <div class="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="font-semibold text-sm text-text-primary leading-tight">Nuevo cliente</span>
                <span class="text-xs text-text-tertiary leading-tight">Registrar datos</span>
              </div>
            </button>

            <!-- Sin datos card -->
            <button
              @click="selectGenericCustomer"
              :disabled="isCreatingGeneric"
              class="flex flex-row items-center gap-3 px-4 py-3 min-h-[64px] bg-surface border-2 border-border rounded-xl hover:border-border hover:bg-surface-secondary transition-all text-left active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div class="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-secondary text-text-secondary flex items-center justify-center">
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="font-semibold text-sm text-text-primary leading-tight">
                  <span v-if="isCreatingGeneric">Procesando...</span>
                  <span v-else>Sin datos</span>
                </span>
                <span class="text-xs text-text-tertiary leading-tight">Venta rápida</span>
              </div>
            </button>
          </div>
        </template>

        <!-- STATE: Create new customer -->
        <template v-if="state === 'create'">
          <form @submit.prevent="handleCreate" class="flex flex-col flex-1 overflow-hidden">
            <div class="p-5 space-y-4 flex-1 overflow-y-auto">

              <!-- Phone -->
              <div class="flex flex-col gap-1">
                <label for="new-phone" class="text-sm font-medium text-text-primary">
                  Teléfono <span class="text-red-500">*</span>
                </label>
                <input
                  id="new-phone"
                  v-model="createForm.phone_number"
                  type="tel"
                  placeholder="3001234567"
                  required
                  :disabled="isCreating"
                  class="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                />
              </div>

              <!-- Name -->
              <div class="flex flex-col gap-1">
                <label for="new-name" class="text-sm font-medium text-text-primary">
                  Nombre <span class="text-text-tertiary text-xs">(opcional)</span>
                </label>
                <input
                  id="new-name"
                  v-model="createForm.name"
                  type="text"
                  placeholder="Juan Pérez"
                  :disabled="isCreating"
                  class="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base disabled:opacity-50"
                />
              </div>

              <!-- Error -->
              <div v-if="createError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                <svg class="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <p class="text-sm text-red-800 dark:text-red-200">{{ createError }}</p>
              </div>

            </div>

            <!-- Footer buttons -->
            <div class="p-4 border-t border-border flex-shrink-0 flex gap-3">
              <button
                type="button"
                @click="state = 'search'"
                class="min-h-[44px] px-4 py-3 bg-surface border border-border text-text-secondary font-medium rounded-xl hover:bg-surface-secondary transition-colors"
              >
                ← Volver
              </button>
              <button
                type="submit"
                :disabled="!createForm.phone_number || isCreating"
                class="flex-1 min-h-[44px] px-4 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CommonsTheCustomLoader v-if="isCreating" size="small" />
                <span>{{ isCreating ? 'Guardando...' : 'Guardar y continuar' }}</span>
              </button>
            </div>
          </form>
        </template>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { $fetch } from 'ofetch'

interface CustomerSummary {
  id: string
  name: string | null
  phone_number: string | null
}

interface SelectedCustomer {
  id: string
  name: string | null
  phone_number: string | null
}

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'customer-identified', customer: SelectedCustomer): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// UI state
const state = ref<'search' | 'create'>('search')
const searchInputRef = ref<HTMLInputElement | null>(null)

// Search state (two-tier: raw input + committed debounced value)
const searchQuery = ref('')
const debouncedQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<CustomerSummary[]>([])
const isCreatingGeneric = ref(false)

// Create form state
const createForm = ref({ phone_number: '', name: '' })
const isCreating = ref(false)
const createError = ref('')

// Debounced search — commits query and triggers fetch after 300ms
const commitSearch = useDebounceFn(async (q: string) => {
  debouncedQuery.value = q
  if (!q) {
    searchResults.value = []
    isSearching.value = false
    return
  }
  try {
    const data = await $fetch<{ success: boolean; data: CustomerSummary[] }>(
      '/api/customers/search-by-query',
      { query: { q, limit: 20 } }
    )
    searchResults.value = data?.data ?? []
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}, 300)

watch(searchQuery, (val) => {
  const trimmed = val.trim()
  if (!trimmed) {
    debouncedQuery.value = ''
    searchResults.value = []
    isSearching.value = false
    return
  }
  isSearching.value = true
  commitSearch(trimmed)
})

// Reset when modal opens
watch(() => props.modelValue, (open) => {
  if (open) {
    state.value = 'search'
    searchQuery.value = ''
    debouncedQuery.value = ''
    searchResults.value = []
    isSearching.value = false
    createForm.value = { phone_number: '', name: '' }
    createError.value = ''
    isCreatingGeneric.value = false
    nextTick(() => searchInputRef.value?.focus())
  }
})

// Helper
const customerInitial = (c: CustomerSummary) => {
  const n = c.name?.trim()
  if (n) return n.charAt(0).toUpperCase()
  const p = c.phone_number?.trim()
  if (p) return p.charAt(0)
  return '?'
}

// Select from results
const selectCustomer = (customer: CustomerSummary) => {
  emit('customer-identified', {
    id: String(customer.id),
    name: customer.name,
    phone_number: customer.phone_number
  })
  emit('update:modelValue', false)
}

// Generic/walk-in customer
const selectGenericCustomer = async () => {
  isCreatingGeneric.value = true
  try {
    const response = await $fetch<{
      success: boolean
      data: { id: string; name: string | null; phone_number: string | null }
    }>('/api/customers/search-or-create', {
      method: 'POST',
      body: { phone_number: '0000000000', name: 'Cliente sin datos' }
    })
    if (response.success) {
      emit('customer-identified', {
        id: response.data.id,
        name: 'Cliente sin datos',
        phone_number: null
      })
      emit('update:modelValue', false)
    }
  } catch (e: any) {
    // Fallback: still close and emit a sentinel so checkout can show feedback
    console.error('Error creating generic customer:', e)
  } finally {
    isCreatingGeneric.value = false
  }
}

// Create new customer
const handleCreate = async () => {
  if (!createForm.value.phone_number) return
  isCreating.value = true
  createError.value = ''
  try {
    const response = await $fetch<{
      success: boolean
      data: { id: string; name: string | null; phone_number: string | null }
    }>('/api/customers/search-or-create', {
      method: 'POST',
      body: {
        phone_number: createForm.value.phone_number,
        name: createForm.value.name || null
      }
    })
    if (response.success) {
      emit('customer-identified', {
        id: response.data.id,
        name: response.data.name,
        phone_number: response.data.phone_number
      })
      emit('update:modelValue', false)
    }
  } catch (e: any) {
    createError.value = e.data?.message || e.message || 'Error al guardar el cliente'
  } finally {
    isCreating.value = false
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* Backdrop fade */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

/* Panel — mobile: slide up from bottom */
.sheet-enter-active .bottom-sheet-panel,
.sheet-leave-active .bottom-sheet-panel {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from .bottom-sheet-panel,
.sheet-leave-to .bottom-sheet-panel {
  transform: translateY(100%);
}

/* Panel — desktop: no slide, just backdrop fade */
@media (min-width: 768px) {
  .sheet-enter-from .bottom-sheet-panel,
  .sheet-leave-to .bottom-sheet-panel {
    transform: translateY(0);
  }
}
</style>
