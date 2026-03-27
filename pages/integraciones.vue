<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-sm text-error mb-3">{{ error }}</p>
        <button @click="refresh" class="text-sm text-primary hover:underline">
          Intentar de nuevo
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Info Banner -->
      <div class="bg-status-info-bg border border-status-info-text/20 rounded-xl px-4 py-3 flex items-center gap-3">
        <svg class="w-4 h-4 text-status-info-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-xs text-status-info-text">Usa tu API Key con el header <code class="font-mono font-medium">Authorization: Bearer waro_sk_...</code></p>
      </div>

      <!-- API Keys Table -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <h4 class="text-slate-600 font-medium">API Keys</h4>
          <button @click="openCreateModal" class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="hidden sm:inline">Crear API Key</span>
            <span class="sm:hidden">+ Nueva</span>
          </button>
        </div>
        <UiResponsiveDataView
          :columns="tableColumns"
          :data="activeTokens"
          empty-message="No tienes API keys activas"
          empty-sub-message="Crea una para comenzar a integrar"
          variant="default"
          row-size="sm"
        >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <div class="p-4 bg-surface rounded-lg border border-border">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-text-primary">{{ item.name }}</span>
              <UiStatusBadge value="Activa" variant="success" size="sm" />
            </div>
            <code class="text-sm text-text-secondary font-mono bg-surface-secondary px-2 py-0.5 rounded">{{ item.keyPrefix }}...</code>
            <p class="text-xs text-text-secondary mt-2">
              {{ item.expiresAt ? `Expira: ${formatDate(item.expiresAt)}` : 'Sin expiracion' }}
            </p>
            <div class="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <button @click="openRevokeModal(item)" class="flex-1 text-status-warning-text hover:opacity-80 py-2 text-sm font-medium">
                Revocar
              </button>
              <button @click="openDeleteModal(item)" class="flex-1 text-status-critical-text hover:opacity-80 py-2 text-sm font-medium">
                Eliminar
              </button>
            </div>
          </div>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-name="{ value }">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span class="font-medium text-text-primary">{{ value }}</span>
          </div>
        </template>

        <template #cell-keyPrefix="{ value }">
          <code class="text-sm text-text-secondary font-mono bg-gray-100 px-2 py-1 rounded">{{ value }}...</code>
        </template>

        <template #cell-status="{ row }">
          <UiStatusBadge value="Activa" variant="success" size="sm" />
        </template>

        <template #cell-expiresAt="{ value }">
          <span class="text-sm text-text-secondary">
            {{ value ? formatDate(value) : 'Sin expiracion' }}
          </span>
        </template>

        <template #cell-lastUsedAt="{ value }">
          <span class="text-sm text-text-secondary">
            {{ value ? formatDate(value) : 'Nunca' }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center gap-1">
            <button @click="openRevokeModal(row)" class="text-amber-600 hover:text-amber-700 p-2" title="Revocar">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
            <button @click="openDeleteModal(row)" class="text-red-500 hover:text-red-700 p-2" title="Eliminar">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </template>
        </UiResponsiveDataView>
      </div>
    </div>

    <!-- Create Token Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="!creating && closeCreateModal()"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <!-- Loading Overlay -->
          <div v-if="creating" class="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
            <div class="flex flex-col items-center gap-3">
              <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p class="text-sm font-medium text-text-secondary">Creando API Key...</p>
            </div>
          </div>

          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-text-primary">Crear API Key</h2>
            <button @click="closeCreateModal" :disabled="creating" class="text-text-secondary hover:text-text-primary disabled:opacity-50">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="createToken" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Nombre</label>
              <input v-model="createForm.name" type="text" required :disabled="creating"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                placeholder="Ej: App movil, Integracion POS" />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Expiracion</label>
              <select v-model="createForm.expiresInDays" :disabled="creating"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100">
                <option :value="null">Sin expiracion</option>
                <option :value="30">30 dias</option>
                <option :value="90">90 dias</option>
                <option :value="365">1 ano</option>
              </select>
            </div>

            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-sm text-text-secondary">
                <strong class="text-text-primary">Permisos:</strong> Esta API key tendra acceso completo (lectura, escritura y eliminacion) a todos los recursos del tenant.
              </p>
            </div>

            <div v-if="createError" class="text-sm text-error bg-red-50 p-3 rounded-lg">{{ createError }}</div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="closeCreateModal" :disabled="creating"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" :disabled="creating || !createForm.name.trim()"
                class="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50">
                {{ creating ? 'Creando...' : 'Crear API Key' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Show Secret Modal -->
    <Teleport to="body">
      <div v-if="showSecretModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
          <div class="text-center">
            <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary mb-2">API Key creada</h3>
            <p class="text-sm text-text-secondary mb-4">Guarda tu API key. No podras verla de nuevo.</p>

            <div class="bg-gray-100 rounded-lg p-4 mb-4">
              <div class="flex items-center justify-between gap-2">
                <code class="text-sm font-mono text-text-primary break-all">{{ createdSecret }}</code>
                <button @click="copyToClipboard" class="flex-shrink-0 p-2 text-primary hover:text-primary-dark">
                  <svg v-if="!copied" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <svg v-else class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p class="text-sm text-amber-800"><strong>Importante:</strong> Esta es la unica vez que veras esta key.</p>
            </div>

            <button @click="closeSecretModal" class="btn-primary px-6 py-2 rounded-lg">Entendido</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Revoke Modal -->
    <Teleport to="body">
      <div v-if="showRevokeModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeRevokeModal"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
          <div class="text-center">
            <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary mb-2">Revocar API Key</h3>
            <p class="text-sm text-text-secondary mb-6">
              ¿Revocar <strong>{{ tokenToRevoke?.name }}</strong>? Las integraciones dejaran de funcionar.
            </p>
            <div class="flex gap-3">
              <button @click="closeRevokeModal" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button @click="revokeToken" :disabled="revoking" class="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
                {{ revoking ? 'Revocando...' : 'Revocar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="!deleting && closeDeleteModal()"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
          <!-- Loading Overlay -->
          <div v-if="deleting" class="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
            <div class="flex flex-col items-center gap-3">
              <div class="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-sm font-medium text-text-secondary">Eliminando API Key...</p>
            </div>
          </div>

          <div class="text-center">
            <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary mb-2">Eliminar API Key</h3>
            <p class="text-sm text-text-secondary mb-6">¿Eliminar <strong>{{ tokenToDelete?.name }}</strong>? No se puede deshacer.</p>
            <div class="flex gap-3">
              <button @click="closeDeleteModal" :disabled="deleting" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
              <button @click="deleteToken" :disabled="deleting" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {{ deleting ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Integraciones - API Keys' })

const toast = useToast()
const { currentTenant } = useTenantReactive()

// Table columns configuration
const tableColumns = [
  { key: 'name', title: 'Nombre', sortable: true },
  { key: 'keyPrefix', title: 'API Key', sortable: false },
  { key: 'status', title: 'Estado', sortable: false },
  { key: 'expiresAt', title: 'Expiracion', sortable: true },
  { key: 'lastUsedAt', title: 'Ultimo uso', sortable: true },
  { key: 'actions', title: '', sortable: false }
]

// Todos los permisos por defecto
const allScopes = ['read', 'write', 'orders:read', 'orders:write', 'products:read', 'products:write', 'inventory:read', 'inventory:write', 'customers:read', 'customers:write']

// Fetch tokens
const {
  data: tokensData,
  status: queryStatus,
  asyncStatus: queryAsyncStatus,
  error: fetchError,
  refetch: refresh
} = useQuery({
  key: () => ['api-tokens', currentTenant.value?.id],
  query: () => $fetch('/api/api-tokens'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const activeTokens = computed(() => tokensData.value?.data?.filter(t => t.isActive) || [])
const isLoading = computed(() => !tokensData.value && !fetchError.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && tokensData.value != null)
const error = computed(() => fetchError.value ? 'Error al cargar los API tokens' : null)

// Create Modal
const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const createForm = reactive({ name: '', expiresInDays: null })

// Secret Modal
const showSecretModal = ref(false)
const createdSecret = ref('')
const copied = ref(false)

// Revoke Modal
const showRevokeModal = ref(false)
const tokenToRevoke = ref(null)
const revoking = ref(false)

// Delete Modal
const showDeleteModal = ref(false)
const tokenToDelete = ref(null)
const deleting = ref(false)

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

const openCreateModal = () => {
  createForm.name = ''
  createForm.expiresInDays = null
  createError.value = ''
  showCreateModal.value = true
}

const closeCreateModal = () => { showCreateModal.value = false }

const createToken = async () => {
  creating.value = true
  createError.value = ''
  try {
    const response = await $fetch('/api/api-tokens', {
      method: 'POST',
      body: {
        name: createForm.name,
        scopes: allScopes,
        expires_in_days: createForm.expiresInDays
      }
    })
    if (response.success) {
      closeCreateModal()
      createdSecret.value = response.data.secretKey
      showSecretModal.value = true
      refresh()
    } else {
      createError.value = response.message || 'Error al crear'
    }
  } catch (err) {
    createError.value = err.data?.message || 'Error al crear el token'
  } finally {
    creating.value = false
  }
}

const closeSecretModal = () => {
  showSecretModal.value = false
  createdSecret.value = ''
  copied.value = false
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(createdSecret.value)
    copied.value = true
    toast.success('Copiado')
    setTimeout(() => { copied.value = false }, 2000)
  } catch { toast.error('Error al copiar') }
}

const openRevokeModal = (token) => { tokenToRevoke.value = token; showRevokeModal.value = true }
const closeRevokeModal = () => { showRevokeModal.value = false; tokenToRevoke.value = null }

const revokeToken = async () => {
  revoking.value = true
  try {
    await $fetch(`/api/api-tokens/${tokenToRevoke.value.id}/revoke`, { method: 'POST' })
    toast.success('API Key revocada')
    closeRevokeModal()
    refresh()
  } catch (err) {
    toast.error(err.data?.message || 'Error')
  } finally {
    revoking.value = false
  }
}

const openDeleteModal = (token) => { tokenToDelete.value = token; showDeleteModal.value = true }
const closeDeleteModal = () => { showDeleteModal.value = false; tokenToDelete.value = null }

const deleteToken = async () => {
  deleting.value = true
  try {
    await $fetch(`/api/api-tokens/${tokenToDelete.value.id}`, { method: 'DELETE' })
    toast.success('API Key eliminada')
    closeDeleteModal()
    refresh()
  } catch (err) {
    toast.error(err.data?.message || 'Error')
  } finally {
    deleting.value = false
  }
}

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refresh) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(refresh) })
</script>
