<template>
  <div class="bg-surface rounded-xl shadow-md hover:shadow-lg transition-shadow border border-border">
    <div class="p-5">
      <!-- Main Content with Dashed Border -->
      <div class="border-2 border-dashed border-border rounded-lg p-5">
        <!-- Header with Avatar and Status -->
        <div class="flex items-start justify-between gap-3 mb-4">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <!-- Avatar -->
            <div v-if="member.avatar" class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              <img :src="member.avatar" :alt="member.name" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white text-base flex-shrink-0"
              :style="{ backgroundColor: member.color }">
              {{ member.initials }}
            </div>

            <!-- Name and Info -->
            <div class="flex-1 min-w-0">
              <h3 class="text-[17px] font-semibold text-text-primary mb-1">{{ member.name }}</h3>
              <p class="text-sm font-normal text-text-primary opacity-50">{{ member.position }}</p>
            </div>
          </div>

          <!-- Status Badge -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="w-2 h-2 rounded-full" :class="member.active ? 'bg-success' : 'bg-text-secondary'"></span>
            <span class="text-xs font-medium" :class="member.active ? 'text-success' : 'text-text-secondary'">
              {{ member.active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </div>

        <!-- Contact and Role Info -->
        <div class="pt-3 mt-4 border-t border-border space-y-1.5">
          <p class="text-[13px] font-medium text-text-primary opacity-70">Contacto</p>
          <p class="text-sm font-normal text-text-primary opacity-65 truncate">{{ member.email }}</p>
        </div>
      </div>

      <!-- Footer with Role and Actions -->
      <div class="flex items-center justify-between mt-4">
        <!-- Role Badge -->
        <UiStatusBadge
          :label="getRoleLabel(member.role)"
          :variant="getRoleVariant(member.role)"
          size="sm"
        />

        <!-- Actions Button -->
        <button
          class="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded-md text-primary hover:bg-accent transition-colors"
          title="Ver acciones"
        >
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TeamMember {
  id: string
  name: string
  email: string
  position: string
  role: string
  active: boolean
  initials: string
  color: string
  avatar?: string
}

interface Props {
  member: TeamMember
}

const props = defineProps<Props>()

// Helper functions for role display
const getRoleLabel = (role: string) => {
  switch (role) {
    case 'superuser':
      return 'Super Usuario'
    case 'admin':
      return 'Administrador'
    case 'employee':
      return 'Empleado'
    default:
      return 'Miembro'
  }
}

const getRoleVariant = (role: string) => {
  switch (role) {
    case 'superuser':
      return 'warning'
    case 'admin':
      return 'info'
    case 'employee':
      return 'default'
    default:
      return 'success'
  }
}
</script>
