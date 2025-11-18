<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center w-full min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center w-full min-h-[60vh]">
      <div class="max-w-md p-6 bg-surface border border-border rounded-lg text-center">
        <svg class="w-16 h-16 mx-auto text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="mt-4 text-xl font-bold text-text-primary">Acceso Denegado</h2>
        <p class="mt-2 text-text-secondary">{{ error }}</p>
      </div>
    </div>

    <!-- Portal Content -->
    <div v-else class="container mx-auto px-4 py-8">
          <!-- Header -->
          <div class="mb-6">
            <div class="flex justify-between items-start mb-2">
              <h2 class="text-2xl font-bold text-text-primary">Facturación</h2>
              <button
                @click="refresh"
                class="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                title="Refrescar"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <p class="text-sm text-text-secondary">Gestiona tus facturas y remisiones</p>
          </div>

          <!-- Coming Soon Message -->
          <div class="bg-surface border border-border rounded-lg p-12 text-center">
            <div class="max-w-md mx-auto">
              <div class="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-text-primary mb-2">Módulo de Facturación</h3>
              <p class="text-text-secondary">
                Este módulo estará disponible próximamente. Podrás gestionar tus facturas, remisiones y documentos tributarios desde aquí.
              </p>
            </div>
          </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const error = ref<string | null>(null)

// Use global state for supplier (shared with layout)
const supplier = useState<any>('supplier-portal-supplier', () => null)

async function loadSupplier() {
  try {
    const response = await $fetch(`/api/supplier-portal/${token}/verify`)
    if (response.success && response.data) {
      supplier.value = response.data.supplier
    }
  } catch (err: any) {
    error.value = err.data?.detail || 'No se pudo verificar el acceso'
  }
}

async function refresh() {
  loading.value = true
  await loadSupplier()
  loading.value = false
}

onMounted(async () => {
  try {
    await loadSupplier()
    loading.value = false
  } catch (err: any) {
    error.value = err.data?.detail || 'No se pudo verificar el acceso'
    loading.value = false
  }
})

definePageMeta({
  layout: 'supplier-portal'
})
</script>
