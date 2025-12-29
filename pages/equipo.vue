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

    <!-- Responsive Data View -->
    <UiResponsiveDataView
      v-else
      :columns="teamMembersTableColumns"
      :data="teamMembers"
      title="Miembros del equipo"
      empty-message="No hay miembros en este equipo"
      empty-sub-message="Los miembros apareceran aqui cuando sean agregados"
      variant="default"
    >
      <!-- Mobile Actions -->
      <template #mobileActions>
        <button @click="openInviteModal" class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium w-full justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Invitar miembro
        </button>
      </template>

      <!-- Mobile Card -->
      <template #card="{ item }">
        <TeamMemberCard :member="item" />
      </template>

      <!-- Desktop Header -->
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold text-text-primary">Miembros del equipo</h3>
          <button @click="openInviteModal" class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Invitar miembro
          </button>
        </div>
      </template>

      <!-- Desktop Table Cells -->
      <template #cell-name="{ value, row }">
        <div class="flex items-center gap-3">
          <!-- Avatar with image or initials -->
          <div v-if="row.avatar" class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <img :src="row.avatar" :alt="row.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
            :style="{ backgroundColor: row.color }">
            {{ row.initials }}
          </div>
          <div class="text-sm font-medium text-text-primary">{{ value }}</div>
        </div>
      </template>

      <template #cell-email="{ value }">
        <div class="text-sm text-text-primary">{{ value }}</div>
      </template>

      <template #cell-role="{ value }">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="{
            'bg-amber-100 text-amber-800': value === 'superuser',
            'bg-blue-100 text-blue-800': value === 'admin',
            'bg-gray-100 text-gray-800': value === 'employee',
            'bg-green-100 text-green-800': !['superuser', 'admin', 'employee'].includes(value)
          }"
        >
          {{ value === 'superuser' ? 'Super Usuario' :
             value === 'admin' ? 'Administrador' :
             value === 'employee' ? 'Empleado' : 'Miembro' }}
        </span>
      </template>

      <template #cell-actions="{ row }">
        <button
          @click="openDeleteModal(row)"
          class="text-red-500 hover:text-red-700 transition-colors p-1"
          title="Eliminar miembro"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </template>
    </UiResponsiveDataView>

    <!-- Invite Modal -->
    <Teleport to="body">
      <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeInviteModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-text-primary">Invitar miembro</h2>
            <button @click="closeInviteModal" class="text-text-secondary hover:text-text-primary">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="sendInvitation" class="space-y-4">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Nombre</label>
              <input
                v-model="inviteForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Nombre completo"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Email</label>
              <input
                v-model="inviteForm.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Telefono</label>
              <input
                v-model="inviteForm.phone"
                type="tel"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="3001234567"
              />
            </div>

            <!-- Role -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Rol</label>
              <select
                v-model="inviteForm.role"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="admin">Administrador</option>
                <option value="superuser">Super Usuario</option>
              </select>
            </div>

            <!-- Error message -->
            <div v-if="inviteError" class="text-sm text-error bg-red-50 p-3 rounded-lg">
              {{ inviteError }}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeInviteModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="inviteSending"
                class="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {{ inviteSending ? 'Enviando...' : 'Enviar invitacion' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeDeleteModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
          <div class="text-center">
            <!-- Warning Icon -->
            <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 class="text-lg font-bold text-text-primary mb-2">Eliminar miembro</h3>
            <p class="text-sm text-text-secondary mb-6">
              ¿Estás seguro de eliminar a <strong>{{ memberToDelete?.name }}</strong> del equipo? Esta acción no se puede deshacer.
            </p>

            <div class="flex gap-3">
              <button
                @click="closeDeleteModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                @click="deleteMember"
                :disabled="deleting"
                class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {{ deleting ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
// Layout configuration
definePageMeta({
  layout: 'dashboard'
})

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const toast = useToast()

// Helper function to get initials from name
const getInitials = (name, userName) => {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  if (userName) {
    return userName.slice(0, 2).toUpperCase()
  }
  return '??'
}

// Helper function to generate color from string
const getColorFromString = (str) => {
  const colors = [
    '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6',
    '#ef4444', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6'
  ]
  const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Fetch tenant members using useAsyncData
const { data: membersData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `team-members-${currentTenant.value?.id || 'default'}`,
  () => {
    console.log('Fetching team members for tenant:', currentTenant.value?.id)
    return $fetch('/api/tenants/members')
  },
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ success: true, data: [] }),
    transform: (response) => {
      if (response?.success && response.data) {
        // Transform API data to UI format
        return response.data.map(member => {
          const displayName = member.profile.name || member.profile.user_name || 'Usuario sin nombre'
          return {
            id: member.id,
            name: displayName,
            email: member.profile.email,
            position: member.role === 'superuser' ? 'Super Usuario' :
                     member.role === 'admin' ? 'Administrador' :
                     member.role === 'employee' ? 'Empleado' : 'Miembro',
            role: member.role,
            active: true,
            initials: getInitials(member.profile.name, member.profile.user_name),
            color: getColorFromString(member.profile.email),
            avatar: member.profile.logo_avatar
          }
        })
      }
      return []
    }
  }
)

// Team members computed from data
const teamMembers = computed(() => membersData.value || [])

// Error message
const error = computed(() => fetchError.value ? 'Error al cargar los miembros del equipo' : null)

// Table columns configuration
const teamMembersTableColumns = [
  {
    key: 'name',
    title: 'Miembro',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'email',
    title: 'Email',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'role',
    title: 'Rol',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'actions',
    title: '',
    sortable: false,
    format: 'text',
    align: 'center'
  }
]

// Invite Modal State
const showInviteModal = ref(false)
const inviteSending = ref(false)
const inviteError = ref('')
const inviteForm = reactive({
  name: '',
  email: '',
  phone: '',
  role: 'admin'
})

// Delete Modal State
const showDeleteModal = ref(false)
const memberToDelete = ref(null)
const deleting = ref(false)

const openInviteModal = () => {
  inviteForm.name = ''
  inviteForm.email = ''
  inviteForm.phone = ''
  inviteForm.role = 'admin'
  inviteError.value = ''
  showInviteModal.value = true
}

const closeInviteModal = () => {
  showInviteModal.value = false
}

const sendInvitation = async () => {
  inviteSending.value = true
  inviteError.value = ''

  try {
    const response = await $fetch('/api/invitations/send', {
      method: 'POST',
      body: {
        name: inviteForm.name,
        email: inviteForm.email,
        phone: inviteForm.phone,
        role: inviteForm.role
      }
    })

    if (response.success) {
      toast.success(`Invitación enviada a ${inviteForm.email}`, {
        title: 'Invitación enviada'
      })
      closeInviteModal()
      refresh()
    } else {
      inviteError.value = response.message || 'Error al enviar la invitacion'
    }
  } catch (err) {
    console.error('Error sending invitation:', err)
    inviteError.value = err.data?.message || err.message || 'Error al enviar la invitacion'
  } finally {
    inviteSending.value = false
  }
}

// Delete member functions
const openDeleteModal = (member) => {
  memberToDelete.value = member
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  memberToDelete.value = null
}

const deleteMember = async () => {
  if (!memberToDelete.value) return

  deleting.value = true
  try {
    const response = await $fetch(`/api/tenants/members/${memberToDelete.value.id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      toast.success(`${memberToDelete.value.name} ha sido eliminado del equipo`)
      closeDeleteModal()
      refresh()
    } else {
      toast.error(response.message || 'Error al eliminar miembro')
    }
  } catch (err) {
    console.error('Error deleting member:', err)
    toast.error(err.data?.message || err.message || 'Error al eliminar miembro')
  } finally {
    deleting.value = false
  }
}

// Inject refresh handler setter from layout
const setRefreshHandler = inject('setRefreshHandler', () => {})

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refresh)
})
</script>
