<template>
  <div class="page-layout">

    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
      <div class="flex flex-col gap-4">

        <!-- Group cards -->
        <div
          v-for="group in groups"
          :key="group.id"
          class="bg-surface border-2 border-border rounded-lg"
        >
          <!-- Group header -->
          <div class="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-sm font-semibold text-text-primary">{{ group.name }}</h3>
              <span class="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary">
                {{ group.slug }}
              </span>
              <span
                v-if="group.tenantId === null"
                class="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary"
              >
                predeterminado
              </span>
              <span
                v-if="group.triggersCartera"
                class="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5"
              >
                genera cartera
              </span>
            </div>
            <span class="text-xs text-text-secondary whitespace-nowrap flex-shrink-0">
              {{ methodsForGroup(group.id).length }} método{{ methodsForGroup(group.id).length !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Method rows -->
          <div class="divide-y divide-border">
            <div
              v-for="method in methodsForGroup(group.id)"
              :key="method.id"
              class="flex items-center gap-3 px-4 py-2.5"
            >
              <!-- Inline rename form -->
              <template v-if="editingMethodId === method.id">
                <input
                  v-model="editingMethodName"
                  class="flex-1 text-sm border border-border rounded px-2 py-1 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  :aria-label="`Nuevo nombre para ${method.name}`"
                  @keydown.enter="saveRename(method)"
                  @keydown.escape="cancelEdit"
                />
                <button
                  :disabled="savingId === method.id || !editingMethodName.trim()"
                  class="text-xs px-3 py-1.5 rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[32px]"
                  @click="saveRename(method)"
                >
                  {{ savingId === method.id ? '...' : 'Guardar' }}
                </button>
                <button
                  class="text-xs px-3 py-1.5 rounded border border-border text-text-secondary hover:text-text-primary transition-colors min-h-[32px]"
                  @click="cancelEdit"
                >
                  Cancelar
                </button>
              </template>

              <!-- Normal row -->
              <template v-else>
                <span
                  class="flex-1 text-sm"
                  :class="method.isActive ? 'text-text-primary' : 'text-text-secondary line-through'"
                >
                  {{ method.name }}
                </span>

                <!-- Active toggle -->
                <button
                  :disabled="savingId === method.id"
                  class="text-xs px-2.5 py-1.5 rounded border transition-colors min-h-[32px] disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="method.isActive
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-border bg-background text-text-secondary hover:text-text-primary'"
                  :aria-label="method.isActive ? `Desactivar ${method.name}` : `Activar ${method.name}`"
                  @click="toggleActive(method)"
                >
                  {{ method.isActive ? 'Activo' : 'Inactivo' }}
                </button>

                <!-- Rename -->
                <button
                  class="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-background transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                  :aria-label="`Renombrar ${method.name}`"
                  @click="startEdit(method)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <!-- Delete -->
                <button
                  :disabled="savingId === method.id"
                  class="p-2 rounded text-text-secondary hover:text-destructive hover:bg-background transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  :aria-label="`Eliminar ${method.name}`"
                  @click="deleteMethod(method)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </template>
            </div>

            <!-- Empty state -->
            <div
              v-if="methodsForGroup(group.id).length === 0 && addingToGroup !== group.id"
              class="px-4 py-4 text-sm text-text-secondary"
            >
              No hay métodos configurados. Agrega uno para que aparezca en el POS.
            </div>

            <!-- Inline add form -->
            <div v-if="addingToGroup === group.id" class="px-4 py-3 flex items-center gap-2">
              <input
                ref="addInput"
                v-model="newMethodName"
                class="flex-1 text-sm border border-border rounded px-2 py-1.5 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nombre del método (ej: Nequi)"
                :aria-label="`Nombre del nuevo método en ${group.name}`"
                @keydown.enter="saveNewMethod(group.id)"
                @keydown.escape="cancelAdd"
              />
              <button
                :disabled="savingAdd || !newMethodName.trim()"
                class="text-xs px-3 py-1.5 rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[32px]"
                @click="saveNewMethod(group.id)"
              >
                {{ savingAdd ? '...' : 'Guardar' }}
              </button>
              <button
                class="text-xs px-3 py-1.5 rounded border border-border text-text-secondary hover:text-text-primary transition-colors min-h-[32px]"
                @click="cancelAdd"
              >
                Cancelar
              </button>
            </div>
          </div>

          <!-- Add method button -->
          <div v-if="addingToGroup !== group.id" class="px-4 py-2.5 border-t border-border">
            <button
              class="text-sm text-primary hover:text-primary/80 font-medium transition-colors min-h-[36px] flex items-center gap-1"
              @click="startAdd(group.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Agregar método
            </button>
          </div>
        </div>

        <!-- Empty state: no groups -->
        <div v-if="groups.length === 0" class="bg-surface border-2 border-border rounded-lg p-8 text-center">
          <p class="text-sm text-text-secondary">No hay grupos de pago configurados.</p>
        </div>

      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Métodos de pago - Warocol' })

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

interface PaymentGroup {
  id: string
  tenantId: string | null
  name: string
  slug: string
  triggersCartera: boolean
  isActive: boolean
  sortOrder: number
  methodCount: number
}

interface PaymentMethod {
  id: string
  tenantId: string
  groupId: string
  name: string
  isActive: boolean
  sortOrder: number
}

// ── Data fetching ─────────────────────────────────────────────────────────────

const {
  data: groupsData,
  status: groupsStatus,
  error: groupsError,
  refetch: refetchGroups,
} = useQuery({
  key: () => ['payments', 'groups', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PaymentGroup[] }>('/api/finanzas/metodos-pago/grupos'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const {
  data: methodsData,
  asyncStatus: methodsAsyncStatus,
  error: methodsError,
  refetch: refetchMethods,
} = useQuery({
  key: () => ['payments', 'methods', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PaymentMethod[] }>('/api/finanzas/metodos-pago'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const groups = computed<PaymentGroup[]>(() =>
  (groupsData.value?.data ?? []).filter(g => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
)
const methods = computed<PaymentMethod[]>(() => methodsData.value?.data ?? [])

const isLoading = computed(() => groupsStatus.value === 'pending' && !groupsData.value)
const isRefreshing = computed(() => methodsAsyncStatus.value === 'loading' && methodsData.value != null)
const fetchError = computed(() => groupsError.value || methodsError.value)

const methodsForGroup = (groupId: string) =>
  methods.value.filter(m => m.groupId === groupId).sort((a, b) => a.sortOrder - b.sortOrder)

registerProgressiveLoading(isRefreshing)

const refetch = () => { refetchGroups(); refetchMethods() }
onMounted(() => setRefreshHandler(refetch))
onUnmounted(() => clearRefreshHandler(refetch))

// ── Add method ────────────────────────────────────────────────────────────────

const addingToGroup = ref<string | null>(null)
const newMethodName = ref('')
const savingAdd = ref(false)
const addInput = ref<HTMLInputElement | null>(null)

const startAdd = async (groupId: string) => {
  addingToGroup.value = groupId
  newMethodName.value = ''
  await nextTick()
  addInput.value?.focus()
}

const cancelAdd = () => {
  addingToGroup.value = null
  newMethodName.value = ''
}

const saveNewMethod = async (groupId: string) => {
  if (!newMethodName.value.trim() || savingAdd.value) return
  savingAdd.value = true
  try {
    await $fetch('/api/finanzas/metodos-pago', {
      method: 'POST',
      body: { groupId, name: newMethodName.value.trim(), sortOrder: 0 },
    })
    cancelAdd()
    await refetchMethods()
  } finally {
    savingAdd.value = false
  }
}

// ── Toggle active ─────────────────────────────────────────────────────────────

const savingId = ref<string | null>(null)

const toggleActive = async (method: PaymentMethod) => {
  if (savingId.value) return
  savingId.value = method.id
  try {
    await $fetch(`/api/finanzas/metodos-pago/${method.id}`, {
      method: 'PATCH',
      body: { isActive: !method.isActive },
    })
    await refetchMethods()
  } finally {
    savingId.value = null
  }
}

// ── Rename ────────────────────────────────────────────────────────────────────

const editingMethodId = ref<string | null>(null)
const editingMethodName = ref('')

const startEdit = (method: PaymentMethod) => {
  editingMethodId.value = method.id
  editingMethodName.value = method.name
  savingId.value = null
}

const cancelEdit = () => {
  editingMethodId.value = null
  editingMethodName.value = ''
}

const saveRename = async (method: PaymentMethod) => {
  if (!editingMethodName.value.trim() || savingId.value) return
  savingId.value = method.id
  try {
    await $fetch(`/api/finanzas/metodos-pago/${method.id}`, {
      method: 'PATCH',
      body: { name: editingMethodName.value.trim() },
    })
    cancelEdit()
    await refetchMethods()
  } finally {
    savingId.value = null
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteMethod = async (method: PaymentMethod) => {
  if (savingId.value) return
  savingId.value = method.id
  try {
    await $fetch(`/api/finanzas/metodos-pago/${method.id}`, { method: 'DELETE' })
    await refetchMethods()
  } finally {
    savingId.value = null
  }
}
</script>
