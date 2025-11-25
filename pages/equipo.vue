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
      empty-sub-message="Los miembros aparecerán aquí cuando sean agregados"
      variant="default"
    >
      <!-- Mobile Actions -->
      <template #mobileActions>
        <button class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium w-full justify-center">
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
          <button class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2">
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
          <div>
            <div class="text-sm font-medium text-text-primary">{{ value }}</div>
            <div class="text-xs text-text-secondary">{{ row.position }}</div>
          </div>
        </div>
      </template>

      <template #cell-email="{ value }">
        <div class="text-sm text-text-primary">{{ value }}</div>
      </template>

      <template #cell-role="{ value }">
        <UiStatusBadge
          :label="value === 'superuser' ? 'Super Usuario' :
                 value === 'admin' ? 'Administrador' :
                 value === 'employee' ? 'Empleado' : 'Miembro'"
          :variant="value === 'superuser' ? 'warning' :
                   value === 'admin' ? 'info' :
                   value === 'employee' ? 'default' : 'success'"
        />
      </template>

      <template #cell-active="{ value }">
        <span class="flex items-center gap-2 text-sm">
          <span class="w-2 h-2 rounded-full" :class="value ? 'bg-success' : 'bg-text-secondary'"></span>
          <span :class="value ? 'text-success' : 'text-text-secondary'">
            {{ value ? 'Activo' : 'Inactivo' }}
          </span>
        </span>
      </template>

      <template #cell-actions="{ row }">
        <button class="text-text-secondary hover:text-text-primary transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </template>
    </UiResponsiveDataView>
  </div>
</template>

<script setup>
// Layout configuration
definePageMeta({
  layout: 'dashboard'
})

// Tenant reactivity
const { currentTenant } = useTenantReactive()

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
    console.log('🔍 Fetching team members for tenant:', currentTenant.value?.id)
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
    key: 'active',
    title: 'Estado',
    sortable: true,
    format: 'boolean',
    align: 'center'
  },
  {
    key: 'actions',
    title: 'Acciones',
    sortable: false,
    format: 'text',
    align: 'center'
  }
]

// Inject refresh handler setter from layout
const setRefreshHandler = inject('setRefreshHandler', () => {})

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refresh)
})
</script>
