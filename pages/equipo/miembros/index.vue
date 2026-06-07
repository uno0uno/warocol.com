<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="error" />

    <!-- Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-fields="[]"
        search-placeholder="Buscar por nombre o correo..."
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="roleFilter"
            :class="[filterSelectClass, 'md:hidden']"
            aria-label="Filtrar por rol"
          >
            <option value="">Rol</option>
            <option v-for="option in roleFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </template>

        <template #trailing>
          <button @click="openInviteModal" class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium whitespace-nowrap">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Invitar miembro
          </button>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="teamMembersTableColumns"
        :data="teamMembers"
        empty-message="No hay miembros en este equipo"
        empty-sub-message="Los miembros apareceran aqui cuando sean agregados"
        variant="default"
        row-size="sm"
      >
      <template #header-role>
        <UiTableHeaderFilter
          v-model="roleFilter"
          title="Rol"
          filter-type="select"
          :options="roleFilterOptions"
          all-label="Todos"
        />
      </template>

      <!-- Mobile Card -->
      <template #card="{ item, index }">
        <div
          class="flex items-center gap-3 py-3 px-3 border-b border-border"
          :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
        >
          <!-- Avatar -->
          <div v-if="item.avatar" class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
            <img :src="item.avatar" :alt="item.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
            :style="{ backgroundColor: item.color }">
            {{ item.initials }}
          </div>

          <!-- Name + email -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-text-primary leading-tight truncate">{{ item.name }}</p>
            <p class="text-xs text-text-secondary truncate">{{ item.email }}</p>
          </div>

          <!-- Role badge -->
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
            :class="{
              'bg-amber-100 text-amber-800': item.role === 'superuser',
              'bg-blue-100 text-blue-800': item.role === 'admin',
              'bg-slate-100 text-slate-700': item.role === 'employee',
              'bg-green-100 text-green-800': !['superuser','admin','employee'].includes(item.role)
            }"
          >
            {{ item.role === 'superuser' ? 'Super' : item.role === 'admin' ? 'Admin' : item.role === 'employee' ? 'Empleado' : 'Miembro' }}
          </span>

          <!-- Actions -->
          <div class="flex items-center gap-0.5 flex-shrink-0">
            <!-- warocol.com#642 — Ver perfil → /equipo/miembros/[id] (tip totals + recent tips) -->
            <NuxtLink :to="`/equipo/miembros/${item.id}`"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-primary hover:bg-surface-secondary transition-colors"
              title="Ver perfil">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </NuxtLink>
            <button v-if="isCurrentUser(item)" @click="openEditProfileModal(item)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-primary hover:bg-surface-secondary transition-colors"
              title="Editar mi perfil">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button v-if="isSuperUser && !isCurrentUser(item)" @click="openEditRoleModal(item)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-primary hover:bg-surface-secondary transition-colors"
              title="Cambiar rol">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button v-if="!isCurrentUser(item)" @click="openDeleteModal(item)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              title="Eliminar miembro">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
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
        <div class="flex items-center gap-1">
          <!-- warocol.com#642 — Ver perfil → /equipo/miembros/[id] -->
          <NuxtLink
            :to="`/equipo/miembros/${row.id}`"
            class="text-primary hover:text-primary/70 transition-colors p-1"
            title="Ver perfil"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </NuxtLink>
          <!-- Edit Profile Button (for current user) -->
          <button
            v-if="isCurrentUser(row)"
            @click="openEditProfileModal(row)"
            class="text-blue-500 hover:text-blue-700 transition-colors p-1"
            title="Editar mi perfil"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <!-- Edit Role Button (only for superuser, not for self) -->
          <button
            v-if="isSuperUser && !isCurrentUser(row)"
            @click="openEditRoleModal(row)"
            class="text-blue-500 hover:text-blue-700 transition-colors p-1"
            title="Cambiar rol"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <!-- Delete Button (not for self) -->
          <button
            v-if="!isCurrentUser(row)"
            @click="openDeleteModal(row)"
            class="text-red-500 hover:text-red-700 transition-colors p-1"
            title="Eliminar miembro"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </template>
      </UiResponsiveDataView>

    <!-- Pending Invitations Section -->
    <div v-if="pendingInvitations.length > 0" class="bg-surface rounded-xl border border-border">
      <div class="p-4 border-b border-border">
        <h3 class="text-lg font-bold text-text-primary flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Invitaciones pendientes
          <span class="text-sm font-normal text-text-secondary">({{ pendingInvitations.length }})</span>
        </h3>
      </div>

      <!-- Desktop Table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Invitado</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Email</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Rol</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Expira</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="invitation in pendingInvitations" :key="invitation.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 bg-amber-500">
                    {{ getInitials(invitation.name, null) }}
                  </div>
                  <div class="text-sm font-medium text-text-primary">{{ invitation.name || 'Sin nombre' }}</div>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-text-primary">{{ invitation.email }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {{ getRoleLabel(invitation.role) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-text-secondary">{{ formatExpirationDate(invitation.expiresAt) }}</td>
              <td class="px-4 py-3 text-center">
                <button
                  @click="openCancelInvitationModal(invitation)"
                  class="text-red-500 hover:text-red-700 transition-colors p-1"
                  title="Cancelar invitacion"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden divide-y divide-border">
        <div v-for="invitation in pendingInvitations" :key="invitation.id" class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 bg-amber-500">
                {{ getInitials(invitation.name, null) }}
              </div>
              <div>
                <div class="text-sm font-medium text-text-primary">{{ invitation.name || 'Sin nombre' }}</div>
                <div class="text-xs text-text-secondary">{{ invitation.email }}</div>
              </div>
            </div>
            <button
              @click="openCancelInvitationModal(invitation)"
              class="text-red-500 hover:text-red-700 transition-colors p-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              {{ getRoleLabel(invitation.role) }}
            </span>
            <span class="text-xs text-text-secondary">Expira: {{ formatExpirationDate(invitation.expiresAt) }}</span>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Cancel Invitation Modal -->
    <Teleport to="body">
      <div v-if="showCancelInvitationModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeCancelInvitationModal"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
          <div class="text-center">
            <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary mb-2">Cancelar invitacion</h3>
            <p class="text-sm text-text-secondary mb-6">
              ¿Estas seguro de cancelar la invitacion para <strong>{{ invitationToCancel?.email }}</strong>?
            </p>
            <div class="flex gap-3">
              <button
                @click="closeCancelInvitationModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                No, mantener
              </button>
              <button
                @click="cancelInvitation"
                :disabled="cancelingInvitation"
                class="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {{ cancelingInvitation ? 'Cancelando...' : 'Si, cancelar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

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
              ¿Estas seguro de eliminar a <strong>{{ memberToDelete?.name }}</strong> del equipo? Esta accion no se puede deshacer.
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

    <!-- Edit Profile Modal -->
    <Teleport to="body">
      <div v-if="showEditProfileModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeEditProfileModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-text-primary">Editar mi perfil</h2>
            <button @click="closeEditProfileModal" class="text-text-secondary hover:text-text-primary">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="updateProfile" class="space-y-4">
            <!-- Avatar Preview -->
            <div class="flex justify-center">
              <div v-if="profileToEdit?.avatar" class="w-20 h-20 rounded-full overflow-hidden">
                <img :src="profileToEdit.avatar" :alt="profileToEdit.name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl text-white"
                :style="{ backgroundColor: profileToEdit?.color }">
                {{ profileToEdit?.initials }}
              </div>
            </div>

            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Nombre</label>
              <input
                v-model="editProfileForm.name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Tu nombre completo"
              />
            </div>

            <!-- Email (read-only) -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Email</label>
              <input
                :value="profileToEdit?.email"
                type="email"
                disabled
                class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-text-secondary cursor-not-allowed"
              />
              <p class="text-xs text-text-secondary mt-1">El email no se puede cambiar</p>
            </div>

            <!-- Error message -->
            <div v-if="editProfileError" class="text-sm text-error bg-red-50 p-3 rounded-lg">
              {{ editProfileError }}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeEditProfileModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="editProfileLoading"
                class="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {{ editProfileLoading ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Edit Role Modal -->
    <Teleport to="body">
      <div v-if="showEditRoleModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="closeEditRoleModal"></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-text-primary">Cambiar rol</h2>
            <button @click="closeEditRoleModal" class="text-text-secondary hover:text-text-primary">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="updateRole" class="space-y-4">
            <!-- Member Info -->
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div v-if="memberToEdit?.avatar" class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <img :src="memberToEdit.avatar" :alt="memberToEdit.name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
                :style="{ backgroundColor: memberToEdit?.color }">
                {{ memberToEdit?.initials }}
              </div>
              <div>
                <div class="font-medium text-text-primary">{{ memberToEdit?.name }}</div>
                <div class="text-sm text-text-secondary">{{ memberToEdit?.email }}</div>
              </div>
            </div>

            <!-- Current Role -->
            <div class="text-sm text-text-secondary">
              Rol actual: <span class="font-medium text-text-primary">{{ getRoleLabel(memberToEdit?.role) }}</span>
            </div>

            <!-- New Role Select -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Nuevo rol</label>
              <select
                v-model="editRoleForm.role"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="superuser">Super Usuario</option>
                <option value="admin">Administrador</option>
                <option value="employee">Empleado</option>
                <option value="member">Miembro</option>
              </select>
            </div>

            <!-- Error message -->
            <div v-if="editRoleError" class="text-sm text-error bg-red-50 p-3 rounded-lg">
              {{ editRoleError }}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeEditRoleModal"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-primary hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="editRoleLoading || editRoleForm.role === memberToEdit?.role"
                class="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {{ editRoleLoading ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useFormatters } from '~/composables/useFormatters'
import { filterSelectClass } from '~/composables/useFilterSelectClass'
const { formatDate: _fmtDate } = useFormatters()
useHead({ title: 'Miembros - Equipo' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const toast = useToast()
const authStore = useAuthStore()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const roleFilter = ref('')
const roleFilterOptions = [
  { label: 'Superusuario', value: 'superuser' },
  { label: 'Administrador', value: 'admin' },
  { label: 'Empleado', value: 'employee' },
  { label: 'Miembro', value: 'member' },
]

const performSearch = () => applySearch()

const hasActiveFilters = computed(
  () => !!localSearchTerm.value || !!appliedSearch.value || !!roleFilter.value,
)

const clearFilters = () => {
  clearSearch()
  roleFilter.value = ''
}

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

const normalizeMembersResponse = (response: any) => {
  const result = {
    members: [],
    pendingInvitations: []
  }

  if (response?.success && response.data) {
    result.members = response.data.map(member => {
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

  const invitations = response?.pending_invitations || response?.pendingInvitations || []
  result.pendingInvitations = invitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    name: inv.name,
    role: inv.role,
    status: inv.status,
    expiresAt: inv.expires_at || inv.expiresAt,
    invitedByName: inv.invited_by_name || inv.invitedByName
  }))

  return result
}

// Fetch tenant members using Pinia Colada
const {
  data: membersResponse,
  asyncStatus: queryAsyncStatus,
  error: fetchError,
  refetch: refresh
} = useQuery({
  key: () => ['team-members', currentTenant.value?.id],
  query: () => $fetch('/api/tenants/members'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const membersData = computed(() => normalizeMembersResponse(membersResponse.value))
const isLoading = computed(() => !membersResponse.value && !fetchError?.value)
const isRefreshing = computed(() => queryAsyncStatus?.value === 'loading' && membersResponse.value != null)

// Team members — client-side filter (API has no search/role params; see #880)
const teamMembers = computed(() => {
  let list = membersData.value.members || []
  const q = appliedSearch.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (m) =>
        m.name?.toLowerCase().includes(q)
        || m.email?.toLowerCase().includes(q),
    )
  }
  if (roleFilter.value) {
    list = list.filter((m) => m.role === roleFilter.value)
  }
  return list
})

// Pending invitations computed from data
const pendingInvitations = computed(() => membersData.value.pendingInvitations || [])

// Error message
const error = computed(() => fetchError?.value ? 'Error al cargar los miembros del equipo' : null)

// Session data for current user
const { data: sessionData } = useAsyncData(
  'current-session',
  () => $fetch('/api/auth/session'),
  { server: false }
)

// Current user email from multiple sources
const currentUserEmail = computed(() => {
  // Try multiple sources for current user email
  const email = sessionData.value?.user?.email ||
                authStore.displayUser?.email ||
                authStore.session?.user?.email ||
                authStore.user?.email
  return email || null
})

// Current user role in this tenant
const currentUserRole = computed(() => {
  if (!currentUserEmail.value || !teamMembers.value.length) return null
  const currentMember = teamMembers.value.find(m =>
    m.email?.toLowerCase() === currentUserEmail.value?.toLowerCase()
  )
  return currentMember?.role || null
})

// Check if current user is superuser
const isSuperUser = computed(() => {
  const result = currentUserRole.value === 'superuser'
  return result
})

// Check if a member is the current user
const isCurrentUser = (member) => {
  return member.email?.toLowerCase() === currentUserEmail.value?.toLowerCase()
}

// Get role label helper
const getRoleLabel = (role) => {
  const labels = {
    'superuser': 'Super Usuario',
    'admin': 'Administrador',
    'employee': 'Empleado',
    'member': 'Miembro'
  }
  return labels[role] || role
}

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
      toast.success(`Invitacion enviada a ${inviteForm.email}`, {
        title: 'Invitacion enviada'
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

// Edit Profile Modal State
const showEditProfileModal = ref(false)
const profileToEdit = ref(null)
const editProfileLoading = ref(false)
const editProfileError = ref('')
const editProfileForm = reactive({
  name: ''
})

const openEditProfileModal = (member) => {
  profileToEdit.value = member
  editProfileForm.name = member.name || ''
  editProfileError.value = ''
  showEditProfileModal.value = true
}

const closeEditProfileModal = () => {
  showEditProfileModal.value = false
  profileToEdit.value = null
}

const updateProfile = async () => {
  if (!profileToEdit.value) return

  editProfileLoading.value = true
  editProfileError.value = ''

  try {
    const response = await $fetch('/api/auth/update-profile', {
      method: 'PUT',
      body: {
        name: editProfileForm.name
      }
    })

    if (response.success) {
      toast.success('Perfil actualizado correctamente')
      closeEditProfileModal()
      refresh()
    } else {
      editProfileError.value = response.message || 'Error al actualizar perfil'
    }
  } catch (err) {
    console.error('Error updating profile:', err)
    editProfileError.value = err.data?.message || err.message || 'Error al actualizar perfil'
  } finally {
    editProfileLoading.value = false
  }
}

// Edit Role Modal State
const showEditRoleModal = ref(false)
const memberToEdit = ref(null)
const editRoleLoading = ref(false)
const editRoleError = ref('')
const editRoleForm = reactive({
  role: 'admin'
})

const openEditRoleModal = (member) => {
  memberToEdit.value = member
  editRoleForm.role = member.role
  editRoleError.value = ''
  showEditRoleModal.value = true
}

const closeEditRoleModal = () => {
  showEditRoleModal.value = false
  memberToEdit.value = null
}

const updateRole = async () => {
  if (!memberToEdit.value) return

  editRoleLoading.value = true
  editRoleError.value = ''

  try {
    const response = await $fetch(`/api/tenants/members/${memberToEdit.value.id}/role`, {
      method: 'PUT',
      body: {
        role: editRoleForm.role
      }
    })

    if (response.success) {
      toast.success(response.message || `Rol actualizado a ${getRoleLabel(editRoleForm.role)}`)
      closeEditRoleModal()
      refresh()
    } else {
      editRoleError.value = response.message || 'Error al actualizar rol'
    }
  } catch (err) {
    console.error('Error updating role:', err)
    editRoleError.value = err.data?.message || err.message || 'Error al actualizar rol'
  } finally {
    editRoleLoading.value = false
  }
}

// Cancel Invitation Modal State
const showCancelInvitationModal = ref(false)
const invitationToCancel = ref(null)
const cancelingInvitation = ref(false)

const openCancelInvitationModal = (invitation) => {
  invitationToCancel.value = invitation
  showCancelInvitationModal.value = true
}

const closeCancelInvitationModal = () => {
  showCancelInvitationModal.value = false
  invitationToCancel.value = null
}

const cancelInvitation = async () => {
  if (!invitationToCancel.value) return

  cancelingInvitation.value = true
  try {
    const response = await $fetch(`/api/invitations/${invitationToCancel.value.id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      toast.success(`Invitacion para ${invitationToCancel.value.email} cancelada`)
      closeCancelInvitationModal()
      refresh()
    } else {
      toast.error(response.message || 'Error al cancelar invitacion')
    }
  } catch (err) {
    console.error('Error canceling invitation:', err)
    toast.error(err.data?.message || err.message || 'Error al cancelar invitacion')
  } finally {
    cancelingInvitation.value = false
  }
}

// Format expiration date
const formatExpirationDate = (dateString) => {
  if (!dateString) return 'Sin fecha'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Expirada'
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Manana'
  if (diffDays <= 7) return `${diffDays} dias`

  return _fmtDate(date.toISOString())
}

// Inject refresh handler setter from layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refresh)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refresh)
})
</script>
